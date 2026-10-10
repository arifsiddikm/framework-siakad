import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from core.models import Permission, Role, RolePermission, User, UserRole
from core.registry import load_manifests
from core.services.registry_sync import sync_registry

PASSWORD = "Sandi-Uji-12345"


@pytest.fixture(autouse=True)
def _registry(db):
    """Fresh manifests synced for every test (post_migrate data is rolled back with the DB)."""
    load_manifests.cache_clear()
    sync_registry()
    yield
    load_manifests.cache_clear()


@pytest.fixture
def make_role(db):
    def _make(code: str, perms: list[str] | tuple[str, ...] = (), name: str | None = None) -> Role:
        role = Role.objects.create(code=code, name=name or code.title())
        RolePermission.objects.bulk_create(
            RolePermission(role=role, permission=Permission.objects.get(code=c)) for c in perms
        )
        return role

    return _make


@pytest.fixture
def make_user(db):
    def _make(username: str, roles: list[Role] | tuple[Role, ...] = (), **extra) -> User:
        user = User.objects.create_user(username, PASSWORD, full_name=username.title(), **extra)
        for role in roles:
            UserRole.objects.create(user=user, role=role)
        return user

    return _make


@pytest.fixture
def client_for():
    def _client(user: User | None = None) -> APIClient:
        client = APIClient(enforce_csrf_checks=False)
        if user is not None:
            client.force_login(user)
        return client

    return _client


@pytest.fixture
def admin_role(make_role):
    return make_role(
        "admin-uji",
        ["core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage"],
    )


@pytest.fixture
def admin(make_user, admin_role):
    return make_user("admin.uji", [admin_role])


@pytest.fixture
def admin_client(client_for, admin):
    return client_for(admin)


@pytest.fixture
def seeded(db):
    call_command("seed_roles")
