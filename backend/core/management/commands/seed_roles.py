import os

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Permission, Role, RolePermission, User, UserRole
from core.seed import DEMO_USERS, ROLES
from core.services.registry_sync import sync_registry
from core.services.users import check_password_strength


class Command(BaseCommand):
    help = (
        "Sync manifests, create the five starter roles, and the admin account. "
        "Idempotent: existing roles and users are never modified."
    )

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        sync_registry()
        for code, (name, description, perm_codes) in ROLES.items():
            role, created = Role.objects.get_or_create(
                code=code, defaults={"name": name, "description": description, "is_system": True}
            )
            if created:
                perms = Permission.objects.filter(code__in=perm_codes)
                RolePermission.objects.bulk_create(RolePermission(role=role, permission=p) for p in perms)
                self.stdout.write(f"Peran dibuat: {name}")

        self._seed_user(
            os.environ.get("SEED_ADMIN_USERNAME", "admin"),
            "Administrator",
            "admin",
            "",
            os.environ.get("SEED_ADMIN_PASSWORD", ""),
            "SEED_ADMIN_PASSWORD",
        )
        demo_password = os.environ.get("SEED_DEMO_PASSWORD", "")
        if demo_password:
            for username, full_name, role_code, identifier in DEMO_USERS:
                self._seed_user(
                    username, full_name, role_code, identifier, demo_password, "SEED_DEMO_PASSWORD"
                )

    def _seed_user(
        self, username: str, full_name: str, role_code: str, identifier: str, password: str, env_name: str
    ) -> None:
        if User.objects.filter(username=username).exists():
            return
        if not password:
            self.stdout.write(self.style.WARNING(f"{env_name} kosong: akun '{username}' tidak dibuat."))
            return
        check_password_strength(password)
        user = User.objects.create_user(username, password, full_name=full_name, identifier=identifier)
        UserRole.objects.create(user=user, role=Role.objects.get(code=role_code))
        self.stdout.write(f"Akun dibuat: {username}")
