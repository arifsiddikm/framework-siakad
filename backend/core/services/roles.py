"""Role administration (RBAC-03). Roles are data: a bag of permission codes."""

from __future__ import annotations

import re
from collections.abc import Iterable

from django.db import IntegrityError, transaction

from core.api import DomainError
from core.models import Permission, Role, RolePermission, User
from core.services.guards import protect_own_manage_permissions

ROLE_CODE_RE = re.compile(r"^[a-z][a-z0-9_-]{1,39}$")


def _permissions(codes: Iterable[str]) -> list[Permission]:
    wanted = set(codes)
    found = list(Permission.objects.filter(code__in=wanted))
    missing = sorted(wanted - {p.code for p in found})
    if missing:
        raise DomainError(
            "UNKNOWN_PERMISSION",
            f"Izin tidak dikenal: {', '.join(missing)}. Muat ulang halaman lalu pilih dari daftar.",
            fields={"permissions": "Berisi izin yang tidak dikenal."},
        )
    return found


def _set_permissions(role: Role, codes: Iterable[str]) -> None:
    wanted = _permissions(codes)
    RolePermission.objects.filter(role=role).exclude(permission__in=wanted).delete()
    have = set(RolePermission.objects.filter(role=role).values_list("permission_id", flat=True))
    RolePermission.objects.bulk_create(
        RolePermission(role=role, permission=p) for p in wanted if p.pk not in have
    )


def _unique_name(name: str, exclude_id: int | None = None) -> None:
    if Role.objects.filter(name__iexact=name).exclude(pk=exclude_id).exists():  # type: ignore[misc]
        raise DomainError(
            "ROLE_NAME_TAKEN",
            "Nama peran sudah dipakai. Pilih nama lain.",
            fields={"name": "Nama peran sudah dipakai."},
        )


def create_role(*, code: str, name: str, description: str, permissions: Iterable[str]) -> Role:
    if not ROLE_CODE_RE.match(code):
        raise DomainError(
            "INVALID_ROLE_CODE",
            "Kode peran 2–40 karakter: huruf kecil, angka, garis bawah atau tanda hubung.",
            fields={"code": "Format kode tidak valid."},
        )
    if Role.objects.filter(code=code).exists():
        raise DomainError(
            "ROLE_CODE_TAKEN",
            "Kode peran sudah dipakai. Pilih kode lain.",
            fields={"code": "Kode peran sudah dipakai."},
        )
    _unique_name(name)
    try:
        with transaction.atomic():
            role = Role.objects.create(code=code, name=name, description=description)
            _set_permissions(role, permissions)
    except IntegrityError as exc:  # race with a concurrent create
        raise DomainError("ROLE_CONFLICT", "Peran dengan kode atau nama itu baru saja dibuat.") from exc
    return role


def update_role(actor: User, role: Role, data: dict[str, object]) -> Role:
    with protect_own_manage_permissions(actor):
        if "name" in data:
            _unique_name(str(data["name"]), exclude_id=role.pk)
            role.name = str(data["name"])
        if "description" in data:
            role.description = str(data["description"])
        role.save()
        if "permissions" in data:
            _set_permissions(role, data["permissions"])  # type: ignore[arg-type]
    return role


def delete_role(actor: User, role: Role) -> None:
    if role.is_system:
        raise DomainError(
            "SYSTEM_ROLE_PROTECTED",
            "Peran bawaan tidak dapat dihapus. Cabut izinnya bila tidak diperlukan.",
            status=409,
        )
    with protect_own_manage_permissions(actor):
        role.delete()
