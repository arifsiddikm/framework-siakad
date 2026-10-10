"""Who may see what. Access is always a permission code; these helpers let an admin think in roles.

Picking roles for a page or menu item creates a permission (`core.page.<slug>.view`,
`core.menu_item.<id>.view`) and grants it to exactly those roles. No roles = any signed-in user.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from core.api import DomainError
from core.models import Permission, Role, RolePermission


def ensure_access_permission(code: str, name: str) -> Permission:
    permission, _ = Permission.objects.update_or_create(
        code=code, defaults={"name": name, "module_id": "core"}
    )
    return permission


def set_permission_roles(permission: Permission, role_codes: Iterable[str]) -> None:
    wanted_codes = set(role_codes)
    roles = list(Role.objects.filter(code__in=wanted_codes))
    missing = sorted(wanted_codes - {r.code for r in roles})
    if missing:
        raise DomainError(
            "UNKNOWN_ROLE",
            f"Peran tidak dikenal: {', '.join(missing)}. Muat ulang halaman lalu pilih dari daftar.",
            fields={"roles": "Berisi peran yang tidak dikenal."},
        )
    RolePermission.objects.filter(permission=permission).exclude(role__in=roles).delete()
    have = set(RolePermission.objects.filter(permission=permission).values_list("role_id", flat=True))
    RolePermission.objects.bulk_create(
        RolePermission(role=r, permission=permission) for r in roles if r.pk not in have
    )


def roles_by_permission(permission_ids: Iterable[int | None]) -> dict[int, list[dict[str, str]]]:
    """permission id → [{code, name}] of the roles holding it (one query)."""
    ids = {pid for pid in permission_ids if pid}
    out: dict[int, list[dict[str, str]]] = {pid: [] for pid in ids}
    rows = RolePermission.objects.filter(permission_id__in=ids).select_related("role").order_by("role__name")
    for row in rows:
        out[row.permission_id].append({"code": row.role.code, "name": row.role.name})
    return out


def audience(permission_id: int | None, mapping: dict[int, list[dict[str, str]]]) -> dict[str, Any]:
    """`everyone` = no permission needed; otherwise the roles that hold it (may be empty = nobody yet)."""
    if not permission_id:
        return {"everyone": True, "roles": []}
    return {"everyone": False, "roles": mapping.get(permission_id, [])}


def delete_access_permission(permission: Permission | None, prefix: str) -> None:
    """Drop an auto-created permission when its owner is deleted."""
    if permission is not None and permission.code.startswith(prefix):
        permission.delete()
