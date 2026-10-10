"""Input serializers (strict) and output builders (explicit fields only)."""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from core.api import StrictSerializer
from core.models import MenuItem, ModuleState, Role, User


class LoginIn(StrictSerializer):
    username = serializers.CharField(max_length=50)
    password = serializers.CharField(max_length=256, trim_whitespace=False)


class PasswordChangeIn(StrictSerializer):
    current_password = serializers.CharField(max_length=256, trim_whitespace=False)
    new_password = serializers.CharField(max_length=256, trim_whitespace=False)


class RoleCreateIn(StrictSerializer):
    code = serializers.CharField(max_length=40)
    name = serializers.CharField(max_length=60)
    description = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
    permissions = serializers.ListField(child=serializers.CharField(max_length=100), default=list)


class RoleUpdateIn(StrictSerializer):
    name = serializers.CharField(max_length=60, required=False)
    description = serializers.CharField(max_length=255, allow_blank=True, required=False)
    permissions = serializers.ListField(child=serializers.CharField(max_length=100), required=False)


class UserCreateIn(StrictSerializer):
    username = serializers.RegexField(r"^[a-zA-Z0-9._-]{3,50}$", error_messages={
        "invalid": "Username 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung."
    })  # fmt: skip
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(allow_blank=True, required=False, default="")
    identifier = serializers.CharField(max_length=30, allow_blank=True, required=False, default="")
    password = serializers.CharField(max_length=256, allow_blank=True, required=False, trim_whitespace=False)
    roles = serializers.ListField(child=serializers.CharField(max_length=40), default=list)


class UserUpdateIn(StrictSerializer):
    full_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(allow_blank=True, required=False)
    identifier = serializers.CharField(max_length=30, allow_blank=True, required=False)
    is_active = serializers.BooleanField(required=False)
    roles = serializers.ListField(child=serializers.CharField(max_length=40), required=False)


class ModuleUpdateIn(StrictSerializer):
    is_active = serializers.BooleanField()


class MenuIn(StrictSerializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    hint = serializers.CharField(max_length=500, required=False, allow_blank=True)
    icon = serializers.CharField(max_length=40, required=False, allow_blank=True)
    to = serializers.CharField(max_length=300, required=False, allow_blank=True)
    parent = serializers.IntegerField(required=False, allow_null=True)  # type: ignore[assignment]
    module = serializers.CharField(max_length=30, required=False, allow_null=True, allow_blank=True)
    permission = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    roles = serializers.ListField(child=serializers.CharField(max_length=40), required=False)
    is_active = serializers.BooleanField(required=False)
    order = serializers.IntegerField(required=False)


class MenuMoveIn(StrictSerializer):
    direction = serializers.ChoiceField(choices=["up", "down"])


class PageCreateIn(StrictSerializer):
    slug = serializers.RegexField(
        r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        max_length=60,
        error_messages={
            "invalid": "Alamat hanya huruf kecil, angka, dan tanda hubung (contoh: panduan-krs)."
        },
    )
    title = serializers.CharField(max_length=80)
    blocks = serializers.ListField(child=serializers.DictField(), max_length=60, required=False, default=list)
    roles = serializers.ListField(child=serializers.CharField(max_length=40), required=False, default=list)
    is_published = serializers.BooleanField(required=False, default=True)
    menu_enabled = serializers.BooleanField(required=False, default=False)
    menu_parent = serializers.IntegerField(required=False, allow_null=True, default=None)
    menu_title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")


class PageUpdateIn(StrictSerializer):
    title = serializers.CharField(max_length=80, required=False)
    blocks = serializers.ListField(child=serializers.DictField(), max_length=60, required=False)
    roles = serializers.ListField(child=serializers.CharField(max_length=40), required=False)
    is_published = serializers.BooleanField(required=False)
    menu_enabled = serializers.BooleanField(required=False)
    menu_parent = serializers.IntegerField(required=False, allow_null=True)
    menu_title = serializers.CharField(max_length=200, required=False, allow_blank=True)


class BlockPreviewIn(StrictSerializer):
    block = serializers.DictField()


class SnippetParamIn(StrictSerializer):
    name = serializers.CharField(max_length=30)
    label = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")  # type: ignore[assignment]
    type = serializers.ChoiceField(choices=["text", "number", "boolean", "select"], default="text")
    options = serializers.ListField(
        child=serializers.CharField(max_length=60), required=False, default=list, max_length=30
    )
    default = serializers.CharField(
        max_length=120, required=False, allow_blank=True, allow_null=True, default=None
    )


class SnippetCreateIn(StrictSerializer):
    name = serializers.CharField(max_length=120)
    label = serializers.CharField(max_length=80)  # type: ignore[assignment]
    hint = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    has_data = serializers.BooleanField(required=False, default=False)
    params = serializers.ListField(child=SnippetParamIn(), required=False, default=list, max_length=10)  # type: ignore[assignment]


def role_out(role: Role) -> dict[str, Any]:
    perms = sorted(rp.permission.code for rp in role.role_permissions.all())
    return {
        "id": role.pk,
        "code": role.code,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permissions": perms,
        "user_count": role.user_roles.count(),
    }


def user_out(user: User) -> dict[str, Any]:
    return {
        "id": user.pk,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "identifier": user.identifier,
        "is_active": user.is_active,
        "is_locked": bool(user.locked_until),
        "roles": sorted(ur.role.code for ur in user.user_roles.all()),
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


def module_out(module: ModuleState) -> dict[str, Any]:
    return {
        "code": module.code,
        "name": module.name,
        "icon": module.icon,
        "description": module.description,
        "depends_on": module.depends_on,
        "is_core": module.is_core,
        "is_active": module.is_active,
        "is_orphan": module.is_orphan,
        "permission_count": module.permissions.count(),
    }


def menu_out(
    item: MenuItem, mapping: dict[int, list[dict[str, str]]] | None = None, page_slugs: set[str] | None = None
) -> dict[str, Any]:
    from core.services.access import audience

    return {
        "id": item.pk,
        "title": item.title,
        "hint": item.hint,
        "icon": item.icon,
        "to": item.to,
        "parent": item.parent_id,
        "order": item.order,
        "module": item.module_id,
        "permission": item.permission.code if item.permission else None,
        "is_active": item.is_active,
        "is_system": item.is_system,
        "is_orphan": item.is_orphan,
        "audience": audience(item.permission_id, mapping or {}),
        "page_slug": item.to[1:] if page_slugs and item.to[1:] in page_slugs else None,
    }
