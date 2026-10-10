import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import User
from tests.conftest import PASSWORD

LOGIN = "/api/auth/login/"
ME = "/api/auth/me/"


def test_login_success_returns_profile_roles_permissions_and_menu(make_role, make_user, client_for):
    role = make_role("staf-uji", ["mahasiswa.view"])
    user = make_user("staf1", [role])
    client = client_for()
    res = client.post(LOGIN, {"username": "staf1", "password": PASSWORD}, format="json")
    assert res.status_code == 200
    assert res.data["user"]["username"] == "staf1"
    assert res.data["roles"] == [{"code": "staf-uji", "name": "Staf-Uji"}]
    assert res.data["permissions"] == ["mahasiswa.view"]
    titles = [n["title"] for n in res.data["menu"]]
    assert titles == ["Beranda", "Akademik"]
    assert client.get(ME).status_code == 200
    user.refresh_from_db()
    assert user.last_login is not None


def test_wrong_password_and_unknown_user_get_the_same_answer(make_user, client_for):
    make_user("ada")
    wrong = client_for().post(LOGIN, {"username": "ada", "password": "salah"}, format="json")
    unknown = client_for().post(LOGIN, {"username": "tidakada", "password": "salah"}, format="json")
    assert wrong.status_code == unknown.status_code == 400
    assert wrong.data == unknown.data
    assert wrong.data["code"] == "INVALID_CREDENTIALS"


def test_inactive_user_cannot_login(make_user, client_for):
    make_user("nonaktif", is_active=False)
    res = client_for().post(LOGIN, {"username": "nonaktif", "password": PASSWORD}, format="json")
    assert res.status_code == 400


def test_logout_ends_session(make_user, client_for):
    user = make_user("keluar")
    client = client_for()
    client.post(LOGIN, {"username": "keluar", "password": PASSWORD}, format="json")
    assert client.get(ME).status_code == 200
    assert client.post("/api/auth/logout/").status_code == 204
    assert client.get(ME).status_code == 401
    assert user.pk


def test_me_requires_login(client_for):
    res = client_for().get(ME)
    assert res.status_code == 401
    assert res.data["code"] == "NOT_AUTHENTICATED"


def test_five_failures_lock_the_account(make_user, client_for):
    user = make_user("kunci")
    client = client_for()
    for _ in range(5):
        client.post(LOGIN, {"username": "kunci", "password": "salah"}, format="json")
    user.refresh_from_db()
    assert user.locked_until and user.locked_until > timezone.now()
    res = client.post(LOGIN, {"username": "kunci", "password": PASSWORD}, format="json")
    assert res.status_code == 429
    assert res.data["code"] == "ACCOUNT_LOCKED"


def test_success_resets_failure_counter(make_user, client_for):
    user = make_user("reset")
    client = client_for()
    for _ in range(3):
        client.post(LOGIN, {"username": "reset", "password": "salah"}, format="json")
    client.post(LOGIN, {"username": "reset", "password": PASSWORD}, format="json")
    user.refresh_from_db()
    assert user.failed_login_count == 0


def test_login_requires_csrf_token():
    client = APIClient(enforce_csrf_checks=True)
    res = client.post(LOGIN, {"username": "x", "password": "y"}, format="json")
    assert res.status_code == 403
    assert res.data["code"] == "CSRF_FAILED"


def test_change_password(make_user, client_for):
    user = make_user("ganti")
    client = client_for(user)
    bad = client.post(
        "/api/auth/password/",
        {"current_password": "salah", "new_password": "BaruSekali-98765"},
        format="json",
    )
    assert bad.status_code == 400
    weak = client.post(
        "/api/auth/password/", {"current_password": PASSWORD, "new_password": "123"}, format="json"
    )
    assert weak.status_code == 400 and weak.data["code"] == "WEAK_PASSWORD"
    ok = client.post(
        "/api/auth/password/",
        {"current_password": PASSWORD, "new_password": "BaruSekali-98765"},
        format="json",
    )
    assert ok.status_code == 200
    assert User.objects.get(pk=user.pk).check_password("BaruSekali-98765")
    assert client.get(ME).status_code == 200  # session stays valid


def test_passwords_are_hashed_with_argon2(make_user):
    assert make_user("hash").password.startswith("argon2")


@pytest.mark.parametrize("field", ["is_superuser", "role"])
def test_unknown_login_fields_are_rejected(client_for, field):
    res = client_for().post(LOGIN, {"username": "a", "password": "b", field: 1}, format="json")
    assert res.status_code == 400
    assert field in res.data["fields"]
