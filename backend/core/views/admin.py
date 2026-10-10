"""Admin panel API. Every view declares its permission through `perm_map` (RBAC-02)."""

from __future__ import annotations

from typing import Any

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import PermByMethod
from core.icons import ICON_NAMES
from core.models import ContentPage, MenuItem, ModuleState, Permission, Role, SnippetRecord, User
from core.registry import registered_pages
from core.selectors import content_page_paths
from core.serializers import (
    BlockPreviewIn,
    MenuIn,
    MenuMoveIn,
    ModuleUpdateIn,
    PageCreateIn,
    PageUpdateIn,
    RoleCreateIn,
    RoleUpdateIn,
    SnippetCreateIn,
    UserCreateIn,
    UserUpdateIn,
    menu_out,
    module_out,
    role_out,
    user_out,
)
from core.services import access as access_service
from core.services import blocks as block_service
from core.services import datasets as dataset_service
from core.services import menu as menu_service
from core.services import modules as module_service
from core.services import pages as page_service
from core.services import roles as role_service
from core.services import snippet_admin
from core.services import users as user_service

ROLES, USERS, MODULES, MENU = (
    "core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage",
)  # fmt: skip


def _roles_qs() -> Any:
    return Role.objects.prefetch_related("role_permissions__permission")


class AdminView(APIView):
    permission_classes = [PermByMethod]
    perm_map: dict[str, str] = {}


# ---- Roles & permissions -------------------------------------------------------------------


class PermissionListView(AdminView):
    perm_map = {"GET": ROLES}

    def get(self, request: Request) -> Response:
        groups = []
        for module in ModuleState.objects.prefetch_related("permissions"):
            perms = [{"code": p.code, "name": p.name} for p in module.permissions.all()]
            if perms:
                groups.append(
                    {"module": {"code": module.code, "name": module.name, "is_active": module.is_active},
                     "permissions": perms}
                )  # fmt: skip
        return Response(groups)


class RoleListView(AdminView):
    perm_map = {"GET": ROLES, "POST": ROLES}

    def get(self, request: Request) -> Response:
        return Response([role_out(r) for r in _roles_qs()])

    def post(self, request: Request) -> Response:
        data = RoleCreateIn(data=request.data)
        data.is_valid(raise_exception=True)
        role = role_service.create_role(**data.validated_data)
        return Response(role_out(_roles_qs().get(pk=role.pk)), status=201)


class RoleDetailView(AdminView):
    perm_map = {"GET": ROLES, "PATCH": ROLES, "DELETE": ROLES}

    def get(self, request: Request, pk: int) -> Response:
        return Response(role_out(get_object_or_404(_roles_qs(), pk=pk)))

    def patch(self, request: Request, pk: int) -> Response:
        role = get_object_or_404(Role, pk=pk)
        data = RoleUpdateIn(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        role_service.update_role(request.user, role, data.validated_data)  # type: ignore[arg-type]
        return Response(role_out(_roles_qs().get(pk=pk)))

    def delete(self, request: Request, pk: int) -> Response:
        role_service.delete_role(request.user, get_object_or_404(Role, pk=pk))  # type: ignore[arg-type]
        return Response(status=204)


# ---- Users ---------------------------------------------------------------------------------


def _users_qs() -> Any:
    return User.objects.prefetch_related("user_roles__role")


class UserOptionsView(AdminView):
    perm_map = {"GET": USERS}

    def get(self, request: Request) -> Response:
        return Response({"roles": list(Role.objects.order_by("name").values("code", "name"))})


class UserListView(AdminView, GenericAPIView[User]):
    perm_map = {"GET": USERS, "POST": USERS}

    def get(self, request: Request) -> Response:
        qs = _users_qs().order_by("username")
        term = request.query_params.get("q", "").strip()
        if term:
            qs = qs.filter(
                Q(username__icontains=term) | Q(full_name__icontains=term) | Q(identifier__icontains=term)
            )
        role = request.query_params.get("role", "").strip()
        if role:
            qs = qs.filter(user_roles__role__code=role)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response([user_out(u) for u in page or []])

    def post(self, request: Request) -> Response:
        data = UserCreateIn(data=request.data)
        data.is_valid(raise_exception=True)
        user, generated = user_service.create_user(**data.validated_data)
        return Response(
            {"user": user_out(_users_qs().get(pk=user.pk)), "temporary_password": generated}, status=201
        )


class UserDetailView(AdminView):
    perm_map = {"GET": USERS, "PATCH": USERS}

    def get(self, request: Request, pk: int) -> Response:
        return Response(user_out(get_object_or_404(_users_qs(), pk=pk)))

    def patch(self, request: Request, pk: int) -> Response:
        user = get_object_or_404(User, pk=pk)
        data = UserUpdateIn(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        user_service.update_user(request.user, user, data.validated_data)  # type: ignore[arg-type]
        return Response(user_out(_users_qs().get(pk=pk)))


class UserResetPasswordView(AdminView):
    perm_map = {"POST": USERS}

    def post(self, request: Request, pk: int) -> Response:
        user = get_object_or_404(User, pk=pk)
        return Response({"temporary_password": user_service.reset_password(user)})


# ---- Modules -------------------------------------------------------------------------------


class ModuleListView(AdminView):
    perm_map = {"GET": MODULES}

    def get(self, request: Request) -> Response:
        return Response([module_out(m) for m in ModuleState.objects.prefetch_related("permissions")])


class ModuleDetailView(AdminView):
    perm_map = {"PATCH": MODULES}

    def patch(self, request: Request, code: str) -> Response:
        module = get_object_or_404(ModuleState, code=code)
        data = ModuleUpdateIn(data=request.data)
        data.is_valid(raise_exception=True)
        module_service.set_module_active(module, data.validated_data["is_active"])
        return Response(module_out(module))


# ---- Menu ----------------------------------------------------------------------------------


def _menu_qs() -> Any:
    return MenuItem.objects.select_related("permission")


def _menu_list() -> list[dict[str, Any]]:
    items = list(_menu_qs().order_by("order", "id"))
    mapping = access_service.roles_by_permission(i.permission_id for i in items)
    slugs = set(ContentPage.objects.values_list("slug", flat=True))
    return [menu_out(i, mapping, slugs) for i in items]


def _menu_one(pk: int) -> dict[str, Any]:
    item = _menu_qs().get(pk=pk)
    slugs = set(ContentPage.objects.values_list("slug", flat=True))
    return menu_out(item, access_service.roles_by_permission([item.permission_id]), slugs)


class MenuOptionsView(AdminView):
    perm_map = {"GET": MENU}

    def get(self, request: Request) -> Response:
        written = content_page_paths()
        pages = {**registered_pages(), **written}
        return Response(
            {
                "pages": [
                    {"path": path, "title": title, "written": path in written}
                    for path, title in sorted(pages.items())
                ],
                "permissions": [
                    {"code": p.code, "name": p.name, "module": p.module_id} for p in Permission.objects.all()
                ],
                "modules": list(ModuleState.objects.values("code", "name")),
                "roles": list(Role.objects.order_by("name").values("code", "name")),
                "icons": list(ICON_NAMES),
            }
        )


class MenuListView(AdminView):
    perm_map = {"GET": MENU, "POST": MENU}

    def get(self, request: Request) -> Response:
        return Response(_menu_list())

    def post(self, request: Request) -> Response:
        data = MenuIn(data=request.data)
        data.is_valid(raise_exception=True)
        item = menu_service.create_item(data.validated_data)
        return Response(_menu_one(item.pk), status=201)


class MenuDetailView(AdminView):
    perm_map = {"PATCH": MENU, "DELETE": MENU}

    def patch(self, request: Request, pk: int) -> Response:
        item = get_object_or_404(MenuItem, pk=pk)
        data = MenuIn(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        menu_service.update_item(item, data.validated_data)
        return Response(_menu_one(pk))

    def delete(self, request: Request, pk: int) -> Response:
        menu_service.delete_item(get_object_or_404(MenuItem, pk=pk))
        return Response(status=204)


class MenuMoveView(AdminView):
    perm_map = {"POST": MENU}

    def post(self, request: Request, pk: int) -> Response:
        item = get_object_or_404(MenuItem, pk=pk)
        data = MenuMoveIn(data=request.data)
        data.is_valid(raise_exception=True)
        menu_service.move_item(item, data.validated_data["direction"])
        return Response(_menu_list())


# ---- Pages written by admins + access map ------------------------------------------------------


def _page_one(page: ContentPage) -> dict[str, Any]:
    page = ContentPage.objects.select_related("permission").get(pk=page.pk)
    return page_service.page_out(page, access_service.roles_by_permission([page.permission_id]))


class AccessMapView(AdminView):
    perm_map = {"GET": MENU}

    def get(self, request: Request) -> Response:
        return Response(page_service.access_map())


class PageListView(AdminView):
    perm_map = {"POST": MENU}

    def post(self, request: Request) -> Response:
        data = PageCreateIn(data=request.data)
        data.is_valid(raise_exception=True)
        page = page_service.create_page(data.validated_data)
        return Response(_page_one(page), status=201)


class PageDetailAdminView(AdminView):
    perm_map = {"GET": MENU, "PATCH": MENU, "DELETE": MENU}

    def get(self, request: Request, pk: int) -> Response:
        return Response(_page_one(get_object_or_404(ContentPage, pk=pk)))

    def patch(self, request: Request, pk: int) -> Response:
        page = get_object_or_404(ContentPage, pk=pk)
        data = PageUpdateIn(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        page_service.update_page(page, data.validated_data)
        return Response(_page_one(page))

    def delete(self, request: Request, pk: int) -> Response:
        page_service.delete_page(get_object_or_404(ContentPage, pk=pk))
        return Response(status=204)


# ---- Blocks preview + datasets ------------------------------------------------------------------


class DatasetListView(AdminView):
    perm_map = {"GET": MENU}

    def get(self, request: Request) -> Response:
        return Response([dataset_service.dataset_out(d) for d in dataset_service.all_datasets().values()])


class BlockPreviewView(AdminView):
    """Validate one block and compute its data with the admin's own permissions (editor preview)."""

    perm_map = {"POST": MENU}

    def post(self, request: Request) -> Response:
        data = BlockPreviewIn(data=request.data)
        data.is_valid(raise_exception=True)
        block = block_service.validate_blocks([data.validated_data["block"]])[0]
        return Response(block_service.run_block(block, request.user))  # type: ignore[arg-type]


# ---- Snippets (scaffold from the web; soft delete) ------------------------------------------------


class SnippetListView(AdminView):
    perm_map = {"GET": MENU, "POST": MENU}

    def get(self, request: Request) -> Response:
        snippet_admin.sync_with_files()
        return Response([snippet_admin.snippet_out(r) for r in SnippetRecord.objects.all()])

    def post(self, request: Request) -> Response:
        data = SnippetCreateIn(data=request.data)
        data.is_valid(raise_exception=True)
        record = snippet_admin.create_snippet(data.validated_data)
        return Response(snippet_admin.snippet_out(record), status=201)


class SnippetDetailView(AdminView):
    perm_map = {"DELETE": MENU}

    def delete(self, request: Request, pk: int) -> Response:
        record = snippet_admin.delete_snippet(get_object_or_404(SnippetRecord, pk=pk))
        return Response(snippet_admin.snippet_out(record))


class SnippetRestoreView(AdminView):
    perm_map = {"POST": MENU}

    def post(self, request: Request, pk: int) -> Response:
        record = snippet_admin.restore_snippet(get_object_or_404(SnippetRecord, pk=pk))
        return Response(snippet_admin.snippet_out(record))
