"""Read-side queries: effective permissions, the user's menu, `/auth/me/` payload."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from core.api import ModuleInactive
from core.models import ContentPage, MenuItem, ModuleState, Permission, User

MANAGE_PERMISSIONS = frozenset(
    {"core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage"}
)


def load_grants(user_id: int) -> tuple[frozenset[str], frozenset[str]]:
    """(granted, effective) permission codes. Effective excludes perms of inactive modules.

    A user's permissions are the union over all their roles (RBAC-01).
    """
    rows = (
        Permission.objects.filter(permission_roles__role__user_roles__user_id=user_id)
        .values_list("code", "module__is_active")
        .distinct()
    )
    granted = {code for code, _ in rows}
    effective = {code for code, active in rows if active}
    return frozenset(granted), frozenset(effective)


def _grants(user: User) -> tuple[frozenset[str], frozenset[str]]:
    cached = getattr(user, "_grants_cache", None)
    if cached is None:
        cached = load_grants(user.pk)
        user._grants_cache = cached  # type: ignore[attr-defined]
    return cached


def granted_permission_codes(user: User) -> frozenset[str]:
    return _grants(user)[0]


def effective_permission_codes(user: User) -> frozenset[str]:
    return _grants(user)[1]


def has_permission(user: User, code: str) -> bool:
    """True if allowed. Raises ModuleInactive if the user holds it but its module is off."""
    granted, effective = _grants(user)
    if code in effective:
        return True
    if code in granted:
        raise ModuleInactive()
    return False


def inactive_module_codes() -> list[str]:
    return sorted(ModuleState.objects.filter(is_active=False).values_list("code", flat=True))


def _item_state(item: MenuItem, granted: frozenset[str]) -> str | None:
    """'visible', 'locked' or None (hidden) for a leaf item."""
    if item.permission_id and item.permission.code not in granted:  # type: ignore[union-attr]
        return None
    module_off = item.module_id is not None and not item.module.is_active  # type: ignore[union-attr]
    perm_module_off = item.permission_id is not None and not item.permission.module.is_active  # type: ignore[union-attr]
    if module_off or perm_module_off:
        return "locked" if settings.SHOW_LOCKED_MODULE_MENU else None
    return "visible"


def build_menu(user: User) -> list[dict[str, Any]]:
    """Menu tree for this user (MOD-03, MENU-01).

    An item shows when it is active, not orphaned, its module is active, the user holds its
    permission and its parent shows. A group with no visible child is dropped.
    """
    granted = granted_permission_codes(user)
    items = list(
        MenuItem.objects.filter(is_active=True, is_orphan=False)
        .select_related("module", "permission__module")
        .order_by("order", "id")
    )
    children: dict[int | None, list[MenuItem]] = {}
    for item in items:
        children.setdefault(item.parent_id, []).append(item)

    def node(item: MenuItem, locked: bool, kids: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "id": item.pk,
            "title": item.title,
            "hint": item.hint,
            "icon": item.icon,
            "to": item.to,
            "locked": locked,
            "children": kids,
        }

    tree: list[dict[str, Any]] = []
    for root in children.get(None, []):
        if root.to:
            state = _item_state(root, granted)
            if state:
                tree.append(node(root, state == "locked", []))
            continue
        kids = []
        for child in children.get(root.pk, []):
            state = _item_state(child, granted) if child.to else None
            if state:
                kids.append(node(child, state == "locked", []))
        if kids and _item_state(root, granted):
            tree.append(node(root, False, kids))
    return tree


def me_payload(user: User) -> dict[str, Any]:
    roles = list(user.roles.order_by("name").values("code", "name"))
    initials = "".join(part[0] for part in user.full_name.split()[:2]).upper() or user.username[:2].upper()
    return {
        "user": {
            "id": user.pk,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "identifier": user.identifier,
            "initials": initials,
        },
        "roles": roles,
        "permissions": sorted(effective_permission_codes(user)),
        "inactive_modules": inactive_module_codes(),
        "menu": build_menu(user),
    }


def content_page_paths() -> dict[str, str]:
    """Path → title of every admin-written page (valid menu targets)."""
    return {f"/{slug}": title for slug, title in ContentPage.objects.values_list("slug", "title")}
