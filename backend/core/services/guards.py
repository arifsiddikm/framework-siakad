"""Safety net: an admin must never be able to lock themselves out of the admin panel (MENU-05)."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from django.db import transaction

from core.api import DomainError
from core.models import User
from core.selectors import MANAGE_PERMISSIONS, load_grants


@contextmanager
def protect_own_manage_permissions(actor: User) -> Iterator[None]:
    """Run the change in a transaction; roll back if it removes a manage permission of `actor`."""
    before = load_grants(actor.pk)[0] & MANAGE_PERMISSIONS
    with transaction.atomic():
        yield
        lost = before - load_grants(actor.pk)[0]
        if lost:
            raise DomainError(
                "SELF_LOCKOUT",
                "Perubahan ini akan mencabut izin kelola milik Anda sendiri, "
                "jadi dibatalkan. Minta admin lain melakukannya, atau pertahankan izin tersebut.",
                status=409,
            )
