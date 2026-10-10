import pytest

from core.models import ContentPage, MenuItem, Permission, RolePermission


def text_block(text, block_id="b1"):
    return {"id": block_id, "type": "text", "text": text}


PAGES = "/api/admin/pages/"
MENU = "/api/admin/menu/"


def new_page(client, **extra):
    data = {"slug": "panduan-krs", "title": "Panduan KRS", "blocks": [text_block("Isi panduan.")]} | extra
    return client.post(PAGES, data, format="json")


def test_admin_creates_a_page_everyone_can_read(admin_client, client_for, make_user):
    res = new_page(admin_client)
    assert res.status_code == 201
    assert res.data["path"] == "/panduan-krs"
    assert res.data["audience"] == {"everyone": True, "roles": []}
    page = client_for(make_user("pembaca")).get("/api/pages/panduan-krs/")
    assert page.status_code == 200 and page.data["title"] == "Panduan KRS"


def test_page_restricted_to_roles_is_forbidden_for_others(admin_client, client_for, make_user, make_role):
    dosen = make_role("dosen-x", name="Dosen X")
    res = new_page(admin_client, roles=["dosen-x"])
    assert res.data["roles"] == ["dosen-x"]
    assert res.data["audience"]["roles"] == [{"code": "dosen-x", "name": "Dosen X"}]
    assert Permission.objects.filter(code="core.page.panduan-krs.view").exists()
    allowed = client_for(make_user("d1", [dosen])).get("/api/pages/panduan-krs/")
    denied = client_for(make_user("m1")).get("/api/pages/panduan-krs/")
    assert allowed.status_code == 200
    assert denied.status_code == 403 and denied.data["code"] == "PERMISSION_DENIED"


def test_changing_roles_applies_immediately_and_clearing_opens_to_everyone(
    admin_client, client_for, make_user, make_role
):
    a, b = make_role("peran-a"), make_role("peran-b")
    page = new_page(admin_client, roles=["peran-a"]).data
    user_b = client_for(make_user("ub", [b]))
    assert user_b.get("/api/pages/panduan-krs/").status_code == 403
    admin_client.patch(f"{PAGES}{page['id']}/", {"roles": ["peran-b"]}, format="json")
    assert user_b.get("/api/pages/panduan-krs/").status_code == 200
    assert client_for(make_user("ua", [a])).get("/api/pages/panduan-krs/").status_code == 403
    admin_client.patch(f"{PAGES}{page['id']}/", {"roles": []}, format="json")
    assert client_for(make_user("ux")).get("/api/pages/panduan-krs/").status_code == 200
    assert not Permission.objects.filter(code="core.page.panduan-krs.view").exists()


def test_unpublished_page_is_404(admin_client, client_for, make_user):
    new_page(admin_client, is_published=False)
    assert client_for(make_user("p1")).get("/api/pages/panduan-krs/").status_code == 404


def test_anonymous_cannot_read_pages(admin_client, client_for):
    new_page(admin_client)
    assert client_for().get("/api/pages/panduan-krs/").status_code == 401


@pytest.mark.parametrize("slug", ["Ada Spasi", "UPPER", "-awal", "a_b", "x" * 61])
def test_slug_format_is_validated(admin_client, slug):
    res = new_page(admin_client, slug=slug)
    assert res.status_code == 400 and "slug" in res.data["fields"]


def test_slug_must_be_unique(admin_client):
    new_page(admin_client)
    res = new_page(admin_client)
    assert res.status_code == 400 and res.data["code"] == "SLUG_TAKEN"


def test_page_can_be_added_to_the_portal_menu_in_one_step(admin_client, client_for, make_user, make_role):
    role = make_role("staf-y")
    res = new_page(admin_client, roles=["staf-y"], menu_enabled=True, menu_title="Panduan")
    assert res.status_code == 201 and res.data["menu"]["enabled"] is True
    item = MenuItem.objects.get(to="/panduan-krs")
    assert item.title == "Panduan" and item.permission.code == "core.page.panduan-krs.view"
    seen = client_for(make_user("s1", [role])).get("/api/auth/me/").data["menu"]
    unseen = client_for(make_user("s2")).get("/api/auth/me/").data["menu"]
    assert "Panduan" in [n["title"] for n in seen]
    assert "Panduan" not in [n["title"] for n in unseen]


def test_menu_title_clash_is_reported_on_the_menu_field(admin_client):
    res = new_page(admin_client, menu_enabled=True, menu_title="Beranda")
    assert res.status_code == 400 and "menu_title" in res.data["fields"]
    assert not ContentPage.objects.filter(slug="panduan-krs").exists()  # rolled back


def test_unpublishing_hides_the_menu_link_and_deleting_removes_everything(admin_client):
    page = new_page(admin_client, roles=[], menu_enabled=True, menu_title="Panduan").data
    admin_client.patch(f"{PAGES}{page['id']}/", {"is_published": False}, format="json")
    assert MenuItem.objects.get(to="/panduan-krs").is_active is False
    admin_client.patch(f"{PAGES}{page['id']}/", {"is_published": True, "menu_enabled": False}, format="json")
    assert not MenuItem.objects.filter(to="/panduan-krs").exists()
    admin_client.patch(f"{PAGES}{page['id']}/", {"menu_enabled": True, "menu_title": "Lagi"}, format="json")
    assert admin_client.delete(f"{PAGES}{page['id']}/").status_code == 204
    assert not MenuItem.objects.filter(to="/panduan-krs").exists()
    assert not ContentPage.objects.exists()


def test_menu_can_target_an_admin_written_page(admin_client):
    new_page(admin_client)
    ok = admin_client.post(MENU, {"title": "Ke panduan", "to": "/panduan-krs"}, format="json")
    assert ok.status_code == 201
    bad = admin_client.post(MENU, {"title": "Ke hantu", "to": "/tidak-ada"}, format="json")
    assert bad.status_code == 400 and "to" in bad.data["fields"]


def test_custom_menu_item_roles_create_a_permission_and_show_audience(admin_client, make_role):
    make_role("r-menu", name="Peran Menu")
    res = admin_client.post(
        MENU,
        {"title": "Portal luar", "to": "https://kampus.example.ac.id", "roles": ["r-menu"]},
        format="json",
    )
    assert res.status_code == 201
    assert res.data["audience"]["roles"] == [{"code": "r-menu", "name": "Peran Menu"}]
    assert res.data["permission"].startswith("core.menu_item.")
    clear = admin_client.patch(f"{MENU}{res.data['id']}/", {"roles": []}, format="json")
    assert clear.data["audience"]["everyone"] is True and clear.data["permission"] is None
    assert not Permission.objects.filter(code__startswith="core.menu_item.").exists()


def test_unknown_role_is_rejected(admin_client):
    res = new_page(admin_client, roles=["hantu"])
    assert res.status_code == 400 and res.data["code"] == "UNKNOWN_ROLE"


def test_system_menu_items_cannot_be_given_roles(admin_client):
    item = MenuItem.objects.get(key="mahasiswa:data-mahasiswa")
    res = admin_client.patch(f"{MENU}{item.pk}/", {"roles": ["admin-uji"]}, format="json")
    assert res.status_code == 409 and res.data["code"] == "SYSTEM_ITEM_LOCKED"


def test_menu_list_tells_which_roles_see_each_item(admin_client, make_role):
    RolePermission.objects.create(
        role=make_role("staf-z", name="Staf Z"), permission=Permission.objects.get(code="mahasiswa.view")
    )
    rows = {r["title"]: r for r in admin_client.get(MENU).data}
    assert rows["Beranda"]["audience"]["everyone"] is True
    assert rows["Data mahasiswa"]["audience"]["roles"] == [{"code": "staf-z", "name": "Staf Z"}]


def test_access_map_lists_code_pages_and_written_pages_with_roles(admin_client, make_role):
    RolePermission.objects.create(
        role=make_role("staf-m", name="Staf M"), permission=Permission.objects.get(code="mahasiswa.view")
    )
    new_page(admin_client, roles=["staf-m"], menu_enabled=True, menu_title="Panduan")
    rows = {r["path"]: r for r in admin_client.get("/api/admin/access-map/").data}
    assert rows["/mahasiswa"]["kind"] == "modul"
    assert rows["/mahasiswa"]["audience"]["roles"][0]["code"] == "staf-m"
    assert rows["/mahasiswa"]["menus"][0]["title"] == "Data mahasiswa"
    assert rows["/"]["kind"] == "bawaan" and rows["/"]["audience"]["everyone"] is True
    assert rows["/panduan-krs"]["kind"] == "halaman" and rows["/panduan-krs"]["page_id"]
    assert rows["/panduan-krs"]["menus"][0]["title"] == "Panduan"
    assert not any(path.startswith("/admin") for path in rows)


def test_page_admin_requires_menu_permission(client_for, make_user):
    user = client_for(make_user("biasa-p"))
    assert user.get("/api/admin/access-map/").status_code == 403
    assert user.post(PAGES, {"slug": "x", "title": "x"}, format="json").status_code == 403


def test_nim_must_be_digits_only(client_for, make_user, make_role):
    staf = client_for(make_user("stafn", [make_role("staf-n", ["mahasiswa.view", "mahasiswa.create"])]))
    base = {"nama": "Budi", "prodi": "Teknik Informatika", "angkatan": 2024}
    bad = staf.post("/api/mahasiswa/", base | {"nim": "24A0001"}, format="json")
    assert bad.status_code == 400 and bad.data["fields"]["nim"] == "NIM hanya boleh berisi angka."
    assert staf.post("/api/mahasiswa/", base | {"nim": "24-0001"}, format="json").status_code == 400
    assert staf.post("/api/mahasiswa/", base | {"nim": "24040099"}, format="json").status_code == 201
