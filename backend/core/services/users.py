"""User administration (RBAC-04)."""

from __future__ import annotations

import secrets
from collections.abc import Iterable

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from core.api import DomainError
from core.models import Role, User, UserRole
from core.services.guards import protect_own_manage_permissions


def generate_temp_password() -> str:
    return secrets.token_urlsafe(12)


def _roles(codes: Iterable[str]) -> list[Role]:
    wanted = set(codes)
    found = list(Role.objects.filter(code__in=wanted))
    missing = sorted(wanted - {r.code for r in found})
    if missing:
        raise DomainError(
            "UNKNOWN_ROLE",
            f"Peran tidak dikenal: {', '.join(missing)}. Muat ulang halaman lalu pilih dari daftar.",
            fields={"roles": "Berisi peran yang tidak dikenal."},
        )
    return found


def _set_roles(user: User, codes: Iterable[str]) -> None:
    wanted = _roles(codes)
    UserRole.objects.filter(user=user).exclude(role__in=wanted).delete()
    have = set(UserRole.objects.filter(user=user).values_list("role_id", flat=True))
    UserRole.objects.bulk_create(UserRole(user=user, role=r) for r in wanted if r.pk not in have)


def check_password_strength(password: str, user: User | None = None) -> None:
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise DomainError(
            "WEAK_PASSWORD", " ".join(exc.messages), fields={"password": " ".join(exc.messages)}
        ) from exc


def create_user(
    *,
    username: str,
    full_name: str,
    email: str = "",
    identifier: str = "",
    password: str | None = None,
    roles: Iterable[str] = (),
) -> tuple[User, str | None]:
    """Create a user. Returns (user, generated_password) — the latter only if none was given."""
    if User.objects.filter(username__iexact=username).exists():
        raise DomainError(
            "USERNAME_TAKEN",
            "Username sudah dipakai. Pilih username lain.",
            fields={"username": "Username sudah dipakai."},
        )
    generated = None
    if not password:
        password = generated = generate_temp_password()
    else:
        check_password_strength(password)
    with transaction.atomic():
        user = User.objects.create_user(
            username, password, full_name=full_name, email=email, identifier=identifier
        )
        _set_roles(user, roles)
    return user, generated


def update_user(actor: User, user: User, data: dict[str, object]) -> User:
    if user.pk == actor.pk and data.get("is_active") is False:
        raise DomainError(
            "SELF_DEACTIVATE",
            "Anda tidak dapat menonaktifkan akun sendiri. Minta admin lain melakukannya.",
            status=409,
        )
    with protect_own_manage_permissions(actor):
        for attr in ("full_name", "email", "identifier", "is_active"):
            if attr in data:
                setattr(user, attr, data[attr])
        user.save()
        if "roles" in data:
            _set_roles(user, data["roles"])  # type: ignore[arg-type]
    return user


def reset_password(user: User) -> str:
    """Set a random temporary password, clear any lockout, and return it (shown once)."""
    password = generate_temp_password()
    user.set_password(password)
    user.failed_login_count = 0
    user.locked_until = None
    user.save()
    return password
