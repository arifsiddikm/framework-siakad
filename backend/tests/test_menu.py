import pytest

from core.models import MenuItem, Permission
from core.services.registry_sync import sync_registry

URL = "/api/admin/menu/"


def create(client, **data):
    return client.post(URL, data, format="json")


def test_admin_creates_group_and_link_and_users_see_them(admin_client, client_for, make_user, make_role):
    group = create(admin_client, title="Layanan")
    assert group.status_code == 201
    link = create(
        admin_client, title="Portal kampus", to="https://kampus.example.ac.id", parent=group.data["id"]
    )
    assert link.status_code == 201
    user = make_user("biasa1")
    menu = client_for(user).get("/api/auth/me/").data["menu"]
    layanan = next(n for n in menu if n["title"] == "Layanan")
    assert [c["title"] for c in layanan["children"]] == ["Portal kampus"]


def test_group_without_visible_children_is_dropped(admin_client, client_for, make_user):
    create(admin_client, title="Kosong")
    menu = client_for(make_user("biasa2")).get("/api/auth/me/").data["menu"]
    assert "Kosong" not in [n["title"] for n in menu]


def test_item_requires_permission_to_show(admin_client, client_for, make_user, make_role):
    group = create(admin_client, title="Khusus").data["id"]
    create(
        admin_client, title="Rahasia", to="https://x.example.ac.id", parent=group, permission="mahasiswa.view"
    )
    plain = client_for(make_user("tanpa")).get("/api/auth/me/").data["menu"]
    assert "Khusus" not in [n["title"] for n in plain]
    allowed = (
        client_for(make_user("punya", [make_role("r-punya", ["mahasiswa.view"])]))
        .get("/api/auth/me/")
        .data["menu"]
    )
    assert "Khusus" in [n["title"] for n in allowed]


def test_hidden_items_disappear(admin_client, client_for, make_user):
    group = create(admin_client, title="Sementara").data["id"]
    item = create(admin_client, title="Tautan", to="https://a.example.ac.id", parent=group).data["id"]
    user = make_user("lihat")
    assert "Sementara" in [n["title"] for n in client_for(user).get("/api/auth/me/").data["menu"]]
    admin_client.patch(f"{URL}{item}/", {"is_active": False}, format="json")
    assert "Sementara" not in [n["title"] for n in client_for(user).get("/api/auth/me/").data["menu"]]


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"title": ""}, "title"),
        ({"title": "x" * 41}, "title"),
        ({"title": "Ok", "to": "/halaman-tidak-ada"}, "to"),
        ({"title": "Ok", "to": "http://tidak-aman.example.ac.id"}, "to"),
        ({"title": "Ok", "to": "javascript:alert(1)"}, "to"),
        ({"title": "Ok", "permission": "tidak.ada"}, "permission"),
        ({"title": "Ok", "module": "tidak_ada"}, "module"),
        ({"title": "Ok", "icon": "ikon-palsu"}, "icon"),
        ({"title": "Ok", "parent": 999999}, "parent"),
    ],
)
def test_invalid_input_is_rejected_with_a_specific_message(admin_client, payload, field):
    res = create(admin_client, **payload)
    assert res.status_code == 400
    assert field in res.data["fields"]
    assert res.data["message"]


def test_registered_page_is_a_valid_target(admin_client):
    assert create(admin_client, title="Ke profil", to="/profil").status_code == 201


def test_title_must_be_unique_within_the_same_parent(admin_client):
    group = create(admin_client, title="Induk").data["id"]
    assert create(admin_client, title="Sama", to="/profil", parent=group).status_code == 201
    assert create(admin_client, title="SAMA", to="/keamanan", parent=group).status_code == 400
    other = create(admin_client, title="Induk lain").data["id"]
    assert create(admin_client, title="Sama", to="/profil", parent=other).status_code == 201


def test_depth_is_limited_to_two_and_no_cycles(admin_client):
    group = create(admin_client, title="Tingkat 1").data["id"]
    leaf = create(admin_client, title="Tingkat 2", to="/profil", parent=group).data["id"]
    deep = create(admin_client, title="Tingkat 3", to="/keamanan", parent=leaf)
    assert deep.status_code == 400 and "parent" in deep.data["fields"]
    sub_group = create(admin_client, title="Sub grup")
    assert sub_group.status_code == 201
    nested = create(admin_client, title="Di dalam", to="/profil", parent=sub_group.data["id"])
    assert nested.status_code == 201
    move_group_into_group = admin_client.patch(
        f"{URL}{group}/", {"parent": sub_group.data["id"]}, format="json"
    )
    assert move_group_into_group.status_code == 400
    self_parent = admin_client.patch(f"{URL}{group}/", {"parent": group}, format="json")
    assert self_parent.status_code == 400


def test_group_with_children_cannot_get_a_target(admin_client):
    group = create(admin_client, title="Grup").data["id"]
    create(admin_client, title="Anak", to="/profil", parent=group)
    res = admin_client.patch(f"{URL}{group}/", {"to": "/keamanan"}, format="json")
    assert res.status_code == 400 and "to" in res.data["fields"]


def test_system_items_cannot_be_deleted(admin_client):
    item = MenuItem.objects.get(key="core:beranda")
    res = admin_client.delete(f"{URL}{item.pk}/")
    assert res.status_code == 409 and res.data["code"] == "SYSTEM_ITEM_PROTECTED"
    assert MenuItem.objects.filter(pk=item.pk).exists()


def test_system_items_only_allow_title_order_and_hiding(admin_client):
    item = MenuItem.objects.get(key="mahasiswa:data-mahasiswa")
    ok = admin_client.patch(f"{URL}{item.pk}/", {"title": "Mahasiswa", "is_active": False}, format="json")
    assert ok.status_code == 200 and ok.data["title"] == "Mahasiswa"
    bad = admin_client.patch(f"{URL}{item.pk}/", {"to": "https://x.example.ac.id"}, format="json")
    assert bad.status_code == 409 and bad.data["code"] == "SYSTEM_ITEM_LOCKED"
    bad = admin_client.patch(f"{URL}{item.pk}/", {"permission": None}, format="json")
    assert bad.status_code == 409


def test_manifest_sync_does_not_overwrite_admin_customisation():
    item = MenuItem.objects.get(key="mahasiswa:data-mahasiswa")
    item.title, item.is_active, item.order = "Mahasiswa kami", False, 77
    item.save()
    sync_registry()
    item.refresh_from_db()
    assert (item.title, item.is_active, item.order) == ("Mahasiswa kami", False, 77)
    assert item.permission == Permission.objects.get(code="mahasiswa.view")


def test_move_swaps_neighbours(admin_client):
    a = create(admin_client, title="A satu").data["id"]
    b = create(admin_client, title="B dua").data["id"]
    res = admin_client.post(f"{URL}{b}/move/", {"direction": "up"}, format="json")
    order = {i["id"]: i["order"] for i in res.data}
    assert order[b] < order[a]


def test_hidden_menu_is_not_security(make_user, client_for):
    """MENU-06: API answers 403 even for a menu item the user cannot see."""
    assert client_for(make_user("tamu")).get("/api/mahasiswa/").status_code == 403
    assert client_for(make_user("tamu2")).get("/api/admin/menu/").status_code == 403


def test_options_endpoint_lists_pages_permissions_modules_icons(admin_client):
    res = admin_client.get(f"{URL}options/")
    assert res.status_code == 200
    assert {"/", "/mahasiswa", "/profil"} <= {p["path"] for p in res.data["pages"]}
    assert "mahasiswa.view" in {p["code"] for p in res.data["permissions"]}
    assert "home" in res.data["icons"]


def test_unknown_columns_are_rejected(admin_client):
    res = create(admin_client, title="Aneh", is_system=True)
    assert res.status_code == 400 and "is_system" in res.data["fields"]


def test_beranda_comes_first_and_module_groups_follow():
    roots = {i.title: i.order for i in MenuItem.objects.filter(parent=None)}
    assert roots["Beranda"] < roots["Akademik"]


def test_admin_panel_is_not_part_of_the_portal_menu(admin_client):
    """Settings live in /admin; the portal navbar never carries admin links."""
    titles = {i.title for i in MenuItem.objects.all()}
    assert titles.isdisjoint({"Administrasi", "Pengguna", "Peran & izin", "Modul", "Menu"})
    menu = admin_client.get("/api/auth/me/").data["menu"]
    assert [n["title"] for n in menu] == ["Beranda"]
    pages = {p["path"] for p in admin_client.get(f"{URL}options/").data["pages"]}
    assert not any(path.startswith("/admin") for path in pages)
    res = create(admin_client, title="Tautan admin", to="/admin/pengguna")
    assert res.status_code == 400 and "to" in res.data["fields"]
