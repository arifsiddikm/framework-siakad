import re
from pathlib import Path

from core.selectors import effective_permission_codes
from tests.conftest import PASSWORD  # noqa: F401


def test_effective_permissions_are_the_union_of_all_roles(make_role, make_user):
    a = make_role("peran-a", ["mahasiswa.view"])
    b = make_role("peran-b", ["core.menu.manage"])
    user = make_user("gabung", [a, b])
    assert effective_permission_codes(user) == {"mahasiswa.view", "core.menu.manage"}


def test_user_without_roles_has_no_permissions(make_user):
    assert effective_permission_codes(make_user("kosong")) == frozenset()


def test_api_without_permission_is_403(make_user, client_for):
    res = client_for(make_user("biasa")).get("/api/mahasiswa/")
    assert res.status_code == 403
    assert res.data["code"] == "PERMISSION_DENIED"


def test_permission_change_applies_without_deploy(make_role, make_user, client_for, admin_client):
    role = make_role("dinamis")
    user = make_user("dina", [role])
    client = client_for(user)
    assert client.get("/api/mahasiswa/").status_code == 403
    res = admin_client.patch(
        f"/api/admin/roles/{role.pk}/", {"permissions": ["mahasiswa.view"]}, format="json"
    )
    assert res.status_code == 200
    assert client.get("/api/mahasiswa/").status_code == 200


def test_code_never_checks_role_names():
    """RBAC rule 1: authorisation is by permission code, never by role name."""
    pattern = re.compile(r"role(\.code|\.name)?\s*(==|!=|in)\s*[\"'\[(]|\.roles\.filter\(.*code=[\"']")
    offenders = []
    backend = Path(__file__).resolve().parent.parent
    for folder in ("core", "modules", "config"):
        for path in (backend / folder).rglob("*.py"):
            if "migrations" in path.parts or path.name == "seed.py":
                continue
            for number, line in enumerate(path.read_text().splitlines(), start=1):
                if pattern.search(line):
                    offenders.append(f"{path.relative_to(backend)}:{number}: {line.strip()}")
    assert offenders == []


def test_cannot_revoke_own_manage_permission(admin, admin_role, admin_client):
    res = admin_client.patch(
        f"/api/admin/roles/{admin_role.pk}/", {"permissions": ["core.roles.manage"]}, format="json"
    )
    assert res.status_code == 409
    assert res.data["code"] == "SELF_LOCKOUT"
    assert admin_role.role_permissions.count() == 4  # rolled back


def test_cannot_drop_own_admin_role_or_deactivate_self(admin, admin_client):
    res = admin_client.patch(f"/api/admin/users/{admin.pk}/", {"roles": []}, format="json")
    assert res.status_code == 409 and res.data["code"] == "SELF_LOCKOUT"
    res = admin_client.patch(f"/api/admin/users/{admin.pk}/", {"is_active": False}, format="json")
    assert res.status_code == 409 and res.data["code"] == "SELF_DEACTIVATE"


def test_admin_can_manage_roles_end_to_end(admin_client):
    created = admin_client.post(
        "/api/admin/roles/",
        {"code": "koordinator", "name": "Koordinator", "permissions": ["mahasiswa.view"]},
        format="json",
    )
    assert created.status_code == 201
    pk = created.data["id"]
    assert created.data["permissions"] == ["mahasiswa.view"]
    dup = admin_client.post("/api/admin/roles/", {"code": "koordinator", "name": "Lain"}, format="json")
    assert dup.status_code == 400
    bad = admin_client.patch(f"/api/admin/roles/{pk}/", {"permissions": ["tidak.ada"]}, format="json")
    assert bad.status_code == 400 and bad.data["code"] == "UNKNOWN_PERMISSION"
    assert admin_client.delete(f"/api/admin/roles/{pk}/").status_code == 204


def test_system_role_cannot_be_deleted(seeded, admin_client):
    from core.models import Role

    role = Role.objects.get(code="dosen")
    res = admin_client.delete(f"/api/admin/roles/{role.pk}/")
    assert res.status_code == 409 and res.data["code"] == "SYSTEM_ROLE_PROTECTED"


def test_admin_user_management(admin_client, make_role):
    make_role("staf-x")
    created = admin_client.post(
        "/api/admin/users/",
        {"username": "baru.user", "full_name": "Baru User", "roles": ["staf-x"]},
        format="json",
    )
    assert created.status_code == 201
    temp = created.data["temporary_password"]
    assert temp
    uid = created.data["user"]["id"]
    assert created.data["user"]["roles"] == ["staf-x"]

    login = admin_client.__class__().post(
        "/api/auth/login/", {"username": "baru.user", "password": temp}, format="json"
    )
    assert login.status_code == 200

    assert (
        admin_client.post(
            "/api/admin/users/", {"username": "BARU.user", "full_name": "x"}, format="json"
        ).status_code
        == 400
    )
    off = admin_client.patch(f"/api/admin/users/{uid}/", {"is_active": False}, format="json")
    assert off.data["is_active"] is False
    again = admin_client.__class__().post(
        "/api/auth/login/", {"username": "baru.user", "password": temp}, format="json"
    )
    assert again.status_code == 400

    reset = admin_client.post(f"/api/admin/users/{uid}/reset-password/")
    assert reset.status_code == 200 and reset.data["temporary_password"] != temp

    listing = admin_client.get("/api/admin/users/?q=baru")
    assert listing.data["count"] == 1
