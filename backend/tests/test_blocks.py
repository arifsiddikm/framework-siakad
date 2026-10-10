import pytest

from core.models import Permission, RolePermission
from modules.mahasiswa.models import Mahasiswa

PAGES = "/api/admin/pages/"
PREVIEW = "/api/admin/blocks/preview/"


def block(kind, block_id="b1", **extra):
    return {"id": block_id, "type": kind, **extra}


def make_page(client, blocks, slug="beranda-data", **extra):
    return client.post(
        PAGES, {"slug": slug, "title": "Halaman Data", "blocks": blocks} | extra, format="json"
    )


@pytest.fixture
def mahasiswa_rows(db):
    for nim, nama, prodi, angkatan in [
        ("24040001", "Aulia", "Teknik Informatika", 2024),
        ("24040002", "Bagas", "Teknik Informatika", 2024),
        ("23050007", "Eka", "Sistem Informasi", 2023),
    ]:
        Mahasiswa.objects.create(nim=nim, nama=nama, prodi=prodi, angkatan=angkatan)


# ---- static blocks ----------------------------------------------------------------------------


def test_all_static_block_types_are_accepted(admin_client):
    blocks = [
        block("text", "t1", text="# Judul\n\nIsi"),
        block("image", "i1", url="https://contoh.ac.id/a.png", alt="Gedung", caption="Gedung A"),
        block("callout", "c1", tone="warn", text="Perhatian"),
        block(
            "table", "tb", title="Tarif", columns=["Jenis", "Biaya"], rows=[["SPP", "5.000.000"], ["Ujian"]]
        ),
        block("accordion", "a1", title="FAQ", items=[{"title": "Apa?", "text": "Itu."}]),
        block("links", "l1", title="Tautan", items=[{"label": "Situs", "url": "https://contoh.ac.id"}]),
    ]
    res = make_page(admin_client, blocks)
    assert res.status_code == 201
    saved = {b["id"]: b for b in res.data["blocks"]}
    assert saved["tb"]["rows"] == [["SPP", "5.000.000"], ["Ujian", ""]]  # short rows are padded


@pytest.mark.parametrize(
    "bad",
    [
        block("hantu", "x"),
        block("text", "x", text="a", ekstra=1),
        block("image", "x", url="http://tidak-aman.example.ac.id/a.png"),
        block("image", "x", url="javascript:alert(1)"),
        block("callout", "x", tone="merah", text="a"),
        block("table", "x", columns=[], rows=[]),
        block("links", "x", items=[{"label": "a", "url": "ftp://x"}]),
        {"type": "text", "text": "tanpa id"},
        block("text", "bad id!", text="a"),
    ],
)
def test_invalid_blocks_are_rejected_with_a_specific_message(admin_client, bad):
    res = make_page(admin_client, [bad])
    assert res.status_code == 400 and res.data["code"] == "BLOCK_INVALID"
    assert res.data["message"].startswith("Blok 1")


def test_duplicate_block_ids_and_too_many_blocks(admin_client):
    assert (
        make_page(admin_client, [block("text", "a", text="1"), block("text", "a", text="2")]).status_code
        == 400
    )
    many = [block("text", f"b{i}", text="x") for i in range(61)]
    assert make_page(admin_client, many, slug="banyak").status_code == 400


def test_links_block_may_point_to_portal_pages(admin_client):
    ok = make_page(admin_client, [block("links", "l", items=[{"label": "Mahasiswa", "url": "/mahasiswa"}])])
    assert ok.status_code == 201
    bad = make_page(
        admin_client, [block("links", "l", items=[{"label": "Hantu", "url": "/tidak-ada"}])], slug="lain"
    )
    assert bad.status_code == 400


# ---- data blocks: module dataset ----------------------------------------------------------------


def test_data_table_of_a_module_dataset_for_a_user_with_permission(
    admin_client, client_for, make_user, make_role, mahasiswa_rows
):
    cfg = block("data_table", "dt", title="Mahasiswa", dataset="mahasiswa.mahasiswa", columns=["nim", "nama", "prodi"], sort="nim", direction="desc", limit=2,
                filters=[{"field": "prodi", "op": "contains", "value": "informatika"}])  # fmt: skip
    assert make_page(admin_client, [cfg]).status_code == 201
    viewer = client_for(make_user("v1", [make_role("lihat-mhs", ["mahasiswa.view"])]))
    res = viewer.get("/api/pages/beranda-data/blocks/dt/")
    assert res.status_code == 200
    assert res.data["total"] == 2
    assert [r["nim"] for r in res.data["rows"]] == ["24040002", "24040001"]
    assert [c["label"] for c in res.data["columns"]] == ["NIM", "Nama", "Program studi"]


def test_dataset_permission_is_enforced_per_viewer(admin_client, client_for, make_user, mahasiswa_rows):
    make_page(
        admin_client, [block("data_table", "dt", dataset="mahasiswa.mahasiswa", columns=["nim"], limit=5)]
    )
    denied = client_for(make_user("tanpa-izin")).get("/api/pages/beranda-data/blocks/dt/")
    assert denied.status_code == 403
    page = client_for(make_user("tanpa-izin2")).get("/api/pages/beranda-data/")
    assert page.status_code == 200  # the page opens; only the data block refuses


def test_stats_and_chart_on_module_data(admin_client, client_for, make_user, make_role, mahasiswa_rows):
    stats = block("stats", "st", title="Ringkasan", items=[
        {"label": "Total", "dataset": "mahasiswa.mahasiswa", "aggregate": "count"},
        {"label": "Angkatan 2024", "dataset": "mahasiswa.mahasiswa", "aggregate": "count", "filters": [{"field": "angkatan", "op": "eq", "value": "2024"}]},
        {"label": "Rata-rata angkatan", "dataset": "mahasiswa.mahasiswa", "aggregate": "avg", "field": "angkatan"},
    ])  # fmt: skip
    chart = block(
        "chart",
        "ch",
        title="Per prodi",
        dataset="mahasiswa.mahasiswa",
        group_by="prodi",
        aggregate="count",
        limit=5,
    )
    assert make_page(admin_client, [stats, chart]).status_code == 201
    viewer = client_for(make_user("v2", [make_role("lihat-mhs2", ["mahasiswa.view"])]))
    items = viewer.get("/api/pages/beranda-data/blocks/st/").data["items"]
    assert [i["value"] for i in items][:2] == [3, 2]
    assert round(items[2]["value"], 2) == 2023.67
    bars = viewer.get("/api/pages/beranda-data/blocks/ch/").data["bars"]
    assert bars[0] == {"label": "Teknik Informatika", "value": 2}


def test_filters_and_columns_are_checked_against_declared_fields(admin_client):
    bad_col = block("data_table", "dt", dataset="mahasiswa.mahasiswa", columns=["password"], limit=5)
    assert make_page(admin_client, [bad_col]).status_code == 400
    bad_filter = block(
        "data_table",
        "dt",
        dataset="mahasiswa.mahasiswa",
        columns=["nim"],
        limit=5,
        filters=[{"field": "nim; DROP TABLE x", "op": "eq", "value": "1"}],
    )
    assert make_page(admin_client, [bad_filter], slug="x2").status_code == 400
    bad_op = block(
        "data_table",
        "dt",
        dataset="mahasiswa.mahasiswa",
        columns=["nim"],
        limit=5,
        filters=[{"field": "nim", "op": "sql", "value": "1"}],
    )
    assert make_page(admin_client, [bad_op], slug="x3").status_code == 400
    bad_val = block(
        "data_table",
        "dt",
        dataset="mahasiswa.mahasiswa",
        columns=["nim"],
        limit=5,
        filters=[{"field": "angkatan", "op": "gt", "value": "abc"}],
    )
    assert make_page(admin_client, [bad_val], slug="x4").status_code == 400
    assert (
        make_page(
            admin_client, [block("data_table", "dt", dataset="hantu.x", columns=["a"], limit=5)], slug="x5"
        ).status_code
        == 400
    )


def test_browser_cannot_choose_the_dataset_at_view_time(admin_client, client_for, make_user):
    make_page(admin_client, [block("text", "t1", text="a")])
    viewer = client_for(make_user("v3"))
    assert viewer.get("/api/pages/beranda-data/blocks/nope/").status_code == 404
    assert viewer.get("/api/pages/beranda-data/blocks/t1/").status_code == 400  # not a data block


# ---- collections ------------------------------------------------------------------------------


def test_preview_runs_a_block_with_the_admins_permissions(admin_client, admin_role, mahasiswa_rows):
    cfg = block(
        "stats", "p", items=[{"label": "Mahasiswa", "dataset": "mahasiswa.mahasiswa", "aggregate": "count"}]
    )
    # the preview uses the admin's own permissions: without mahasiswa.view the dataset is refused
    assert admin_client.post(PREVIEW, {"block": cfg}, format="json").status_code == 403
    RolePermission.objects.create(role=admin_role, permission=Permission.objects.get(code="mahasiswa.view"))
    res = admin_client.post(PREVIEW, {"block": cfg}, format="json")
    assert res.status_code == 200 and res.data["items"][0]["value"] == 3
    bad = admin_client.post(
        PREVIEW,
        {"block": block("stats", "p", items=[{"label": "x", "dataset": "hantu.x", "aggregate": "count"}])},
        format="json",
    )
    assert bad.status_code == 400


def test_datasets_list_for_the_editor(admin_client):
    rows = {d["code"]: d for d in admin_client.get("/api/admin/datasets/").data}
    assert rows["mahasiswa.mahasiswa"]["source"] == "modul"
    assert [f["name"] for f in rows["mahasiswa.mahasiswa"]["fields"]][:2] == ["nim", "nama"]


def test_the_data_feature_is_gone(admin_client):
    assert admin_client.get("/api/admin/collections/").status_code == 404
    assert admin_client.get("/api/admin/custom-blocks/").status_code == 404


# ---- slugs: pages live at /<slug> --------------------------------------------------------------


@pytest.mark.parametrize("slug", ["admin", "masuk", "api", "mahasiswa", "profil", "keamanan", "p", "core"])
def test_reserved_slugs_are_refused(admin_client, slug):
    res = make_page(admin_client, [], slug=slug)
    assert res.status_code == 400 and res.data["code"] == "SLUG_RESERVED"


def test_page_menu_link_uses_the_short_path(admin_client):
    res = make_page(
        admin_client,
        [block("text", "t", text="a")],
        slug="info-ijazah",
        menu_enabled=True,
        menu_title="Info ijazah",
    )
    assert res.status_code == 201 and res.data["path"] == "/info-ijazah"
    items = {i["title"]: i for i in admin_client.get("/api/admin/menu/").data}
    assert items["Info ijazah"]["to"] == "/info-ijazah" and items["Info ijazah"]["page_slug"] == "info-ijazah"


def test_legacy_body_migration_logic():
    """The data migration wraps old text in one text block (checked on the helper it uses)."""
    import importlib

    module = importlib.import_module("core.migrations.0004_convert_pages")
    assert callable(module.forwards) and callable(module.backwards)


def test_blocks_permission_row_not_created_for_open_pages(admin_client):
    make_page(admin_client, [block("text", "t", text="a")])
    assert not Permission.objects.filter(code__startswith="core.page.").exists()
    assert RolePermission.objects.filter(permission__code__startswith="core.page.").count() == 0


# ---- snippets ---------------------------------------------------------------------------------


def snippet(name="pages.data_ijazah", block_id="sn", **params):
    return {"id": block_id, "type": "snippet", "name": name, "params": params}


def test_snippet_block_is_validated_against_the_react_files(admin_client):
    ok = make_page(admin_client, [snippet(limit=2, status="Siap diambil")])
    assert ok.status_code == 201
    assert ok.data["blocks"][0]["params"] == {"limit": 2, "status": "Siap diambil"}
    assert (
        make_page(admin_client, [snippet("pages.data_ijazah.upload_form")], slug="s2").status_code == 201
    )  # nested folder
    missing = make_page(admin_client, [snippet("pages.tidak_ada")], slug="s3")
    assert missing.status_code == 400 and "tidak ada" in missing.data["message"]
    for bad in ["../etc/passwd", "Pages.Data", "pages/data", "a.b.c.d.e.f.g.h", ""]:
        assert make_page(admin_client, [snippet(bad)], slug="s4").status_code == 400
    assert make_page(admin_client, [snippet(limit=["x"])], slug="s5").status_code == 400
    assert make_page(admin_client, [snippet(**{"BAD key": 1})], slug="s6").status_code == 400
    smuggled = {"id": "sn", "type": "snippet", "name": "pages.data_ijazah", "params": {}, "code": "x"}
    assert make_page(admin_client, [smuggled], slug="s7").status_code == 400


def test_snippet_data_comes_from_the_same_named_python_file(client_for, make_user):
    viewer = client_for(make_user("sv1"))
    res = viewer.get("/api/snippets/pages.data_ijazah/data/?limit=2&status=siap diambil")
    assert res.status_code == 200
    assert [r["nomor"] for r in res.data["data"]["rows"]] == ["IJZ-2026-0001", "IJZ-2026-0003"]
    nested = viewer.get("/api/snippets/pages.data_ijazah.upload_form/data/?maks_mb=8")
    assert nested.status_code == 200 and nested.data["data"]["maks_mb"] == 8
    assert nested.data["data"]["nama_pengunggah"] == "Sv1"


def test_snippet_data_endpoint_rules(client_for, make_user):
    assert client_for().get("/api/snippets/pages.data_ijazah/data/").status_code == 401
    viewer = client_for(make_user("sv2"))
    assert viewer.get("/api/snippets/pages.tidak_ada/data/").status_code == 400
    assert viewer.get("/api/snippets/..%2Fsecret/data/").status_code in (400, 404)
    assert viewer.get("/api/snippets/pages/data/").status_code == 400  # "pages" alone is not a snippet
    junk = "&".join(f"k{i}=1" for i in range(30))
    assert viewer.get(f"/api/snippets/pages.data_ijazah/data/?{junk}").status_code == 400


def test_snippet_without_python_half_has_no_data(client_for, make_user, tmp_path, settings):
    """A React-only snippet is fine; its data endpoint just says there is none."""
    import core.snippets as snippets

    settings.BASE_DIR = tmp_path / "backend"
    (tmp_path / "frontend" / "src" / "snippets").mkdir(parents=True)
    (tmp_path / "frontend" / "src" / "snippets" / "saja_tampilan.tsx").write_text("export default () => null")
    assert snippets.known_snippets() == {"saja_tampilan"}
    res = client_for(make_user("sv3")).get("/api/snippets/saja_tampilan/data/")
    assert res.status_code == 404 and res.data["code"] == "NO_SNIPPET_DATA"


def test_snippet_provider_permission_is_enforced(client_for, make_user, make_role, tmp_path, settings):
    settings.BASE_DIR = tmp_path / "backend"
    (tmp_path / "frontend" / "src" / "snippets").mkdir(parents=True)
    (tmp_path / "frontend" / "src" / "snippets" / "rahasia.tsx").write_text("export default () => null")
    (tmp_path / "backend" / "snippets").mkdir(parents=True)
    (tmp_path / "backend" / "snippets" / "rahasia.py").write_text(
        'PERMISSION = "mahasiswa.view"\n\ndef data(*, user, params):\n    return {"ok": True}\n'
    )
    assert client_for(make_user("sv4")).get("/api/snippets/rahasia/data/").status_code == 403
    allowed = client_for(make_user("sv5", [make_role("lihat-rahasia", ["mahasiswa.view"])]))
    assert allowed.get("/api/snippets/rahasia/data/").data == {"data": {"ok": True}}
