import json

import pytest

from core import snippets
from core.models import ContentPage, SnippetRecord

URL = "/api/admin/snippets/"


@pytest.fixture
def tree(tmp_path, settings):
    """A throw-away project tree so tests never touch the real snippet folders."""
    settings.BASE_DIR = tmp_path / "backend"
    (tmp_path / "frontend" / "src" / "snippets").mkdir(parents=True)
    (tmp_path / "backend").mkdir()
    return tmp_path


def create(client, **extra):
    data = {
        "name": "pages.laporan_ujian",
        "label": "Laporan ujian",
        "hint": "Ringkasan",
        "params": [{"name": "judul", "label": "Judul", "type": "text", "default": "Halo"}],
    } | extra
    return client.post(URL, data, format="json")


def test_create_writes_a_tidy_react_file_and_records_it(admin_client, tree):
    res = create(admin_client)
    assert res.status_code == 201 and res.data["is_active"] and res.data["created_from_web"]
    tsx = tree / "frontend" / "src" / "snippets" / "pages" / "laporan_ujian.tsx"
    text = tsx.read_text()
    assert (
        'label: "Laporan ujian"' in text
        and "hasData: false" in text
        and "[snippet:pages.laporan_ujian]" in text
    )
    assert '{ name: "judul", label: "Judul", type: "text", default: "Halo" }' in text
    assert not (tree / "backend" / "snippets" / "pages" / "laporan_ujian.py").exists()
    assert snippets.known_snippets() == {"pages.laporan_ujian"}  # backend follows the file


def test_create_with_data_also_writes_a_python_file(admin_client, tree):
    res = create(admin_client, name="pages.ijazah.form", has_data=True)
    assert res.status_code == 201 and res.data["has_data"]
    py = tree / "backend" / "snippets" / "pages" / "ijazah" / "form.py"
    compile(py.read_text(), "form.py", "exec")
    assert "def data(" in py.read_text() and "PERMISSION = None" in py.read_text()
    assert (
        "hasData: true"
        in (tree / "frontend" / "src" / "snippets" / "pages" / "ijazah" / "form.tsx").read_text()
    )


def test_form_values_are_data_never_code(admin_client, tree):
    evil = 'x"; import("fs").then(f=>f.rmSync("/")); //'
    res = create(
        admin_client,
        label=evil,
        hint=evil,
        params=[{"name": "judul", "label": evil, "type": "select", "options": [evil, "b"], "default": evil}],
    )
    assert res.status_code == 201
    text = (tree / "frontend" / "src" / "snippets" / "pages" / "laporan_ujian.tsx").read_text()
    assert json.dumps(evil) in text  # escaped as a JSON string literal
    assert 'label: "x"; import' not in text  # the quote did not close the literal


@pytest.mark.parametrize(
    "name",
    [
        "../etc/passwd",
        "Pages.Data",
        "pages/data",
        "a.b.c.d.e.f.g.h",
        "",
        "_rahasia",
        "pages._x",
        "pages.data_deleted",
        "pages.data_deleted_2",
        "x",
    ],
)
def test_names_are_validated(admin_client, tree, name):
    res = create(admin_client, name=name)
    if name == "x":
        assert res.status_code == 201  # a one-letter name is still a valid name
    else:
        assert res.status_code == 400 and res.data["code"] in {"INVALID_SNIPPET", "VALIDATION_ERROR"}
    assert list((tree / "frontend" / "src" / "snippets").rglob("*.tsx")) == (
        [tree / "frontend" / "src" / "snippets" / "x.tsx"] if name == "x" else []
    )


def test_params_are_validated(admin_client, tree):
    assert create(admin_client, params=[{"name": "Bad Name", "type": "text"}]).status_code == 400
    assert (
        create(
            admin_client, params=[{"name": "a", "type": "text"}, {"name": "a", "type": "text"}]
        ).status_code
        == 400
    )
    assert create(admin_client, params=[{"name": "a", "type": "select"}]).status_code == 400
    assert (
        create(admin_client, params=[{"name": f"p{i}", "type": "text"} for i in range(11)]).status_code == 400
    )
    assert create(admin_client, params=[{"name": "a", "type": "kode"}]).status_code == 400


def test_never_overwrites_an_existing_file(admin_client, tree):
    manual = tree / "frontend" / "src" / "snippets" / "pages" / "laporan_ujian.tsx"
    manual.parent.mkdir(parents=True)
    manual.write_text("// tulisan tangan developer")
    res = create(admin_client)
    assert res.status_code == 400 and res.data["code"] == "SNIPPET_EXISTS"
    assert manual.read_text() == "// tulisan tangan developer"


def test_soft_delete_renames_files_and_marks_inactive(admin_client, tree):
    pk = create(admin_client, has_data=True).data["id"]
    res = admin_client.delete(f"{URL}{pk}/")
    assert res.status_code == 200 and res.data["is_active"] is False and res.data["file_exists"] is False
    folder = tree / "frontend" / "src" / "snippets" / "pages"
    assert not (folder / "laporan_ujian.tsx").exists() and (folder / "laporan_ujian_deleted.tsx").is_file()
    assert (tree / "backend" / "snippets" / "pages" / "laporan_ujian_deleted.py").is_file()
    assert SnippetRecord.objects.get(pk=pk).is_active is False
    assert snippets.known_snippets() == set()  # gone from the editor and from validation
    assert admin_client.delete(f"{URL}{pk}/").status_code == 409


def test_deleted_snippet_cannot_be_used_on_pages(admin_client, tree):
    pk = create(admin_client).data["id"]
    page = {
        "slug": "pakai",
        "title": "Pakai",
        "blocks": [{"id": "s", "type": "snippet", "name": "pages.laporan_ujian", "params": {}}],
    }
    assert admin_client.post("/api/admin/pages/", page, format="json").status_code == 201
    assert admin_client.get(URL).data[0]["used_in"] == 1
    admin_client.delete(f"{URL}{pk}/")
    again = admin_client.post("/api/admin/pages/", page | {"slug": "pakai2"}, format="json")
    assert again.status_code == 400 and "tidak ada" in again.data["message"]


def test_restore_brings_the_files_back(admin_client, tree):
    pk = create(admin_client, has_data=True).data["id"]
    admin_client.delete(f"{URL}{pk}/")
    res = admin_client.post(f"{URL}{pk}/restore/")
    assert res.status_code == 200 and res.data["is_active"] is True and res.data["file_exists"] is True
    assert (tree / "frontend" / "src" / "snippets" / "pages" / "laporan_ujian.tsx").is_file()
    assert (tree / "backend" / "snippets" / "pages" / "laporan_ujian.py").is_file()
    assert snippets.known_snippets() == {"pages.laporan_ujian"}
    assert admin_client.post(f"{URL}{pk}/restore/").status_code == 409


def test_repeated_delete_keeps_every_copy(admin_client, tree):
    folder = tree / "frontend" / "src" / "snippets" / "pages"
    pk = create(admin_client).data["id"]
    admin_client.delete(f"{URL}{pk}/")
    (folder / "laporan_ujian.tsx").write_text("// versi baru ditulis developer")
    SnippetRecord.objects.filter(pk=pk).update(is_active=True)
    admin_client.delete(f"{URL}{pk}/")
    assert (folder / "laporan_ujian_deleted.tsx").is_file() and (
        folder / "laporan_ujian_deleted_2.tsx"
    ).is_file()
    assert (folder / "laporan_ujian_deleted_2.tsx").read_text() == "// versi baru ditulis developer"


def test_name_of_a_deleted_snippet_cannot_be_silently_reused(admin_client, tree):
    pk = create(admin_client).data["id"]
    admin_client.delete(f"{URL}{pk}/")
    res = create(admin_client)
    assert res.status_code == 400 and res.data["code"] == "SNIPPET_DELETED"


def test_listing_syncs_files_written_by_hand(admin_client, tree):
    manual = tree / "frontend" / "src" / "snippets" / "laporan" / "tangan.tsx"
    manual.parent.mkdir(parents=True)
    manual.write_text(
        'export const meta = { label: "Dibuat developer", params: [] };\nexport default () => null;'
    )
    (manual.parent / "_draf.tsx").write_text("export default () => null;")
    (manual.parent / "lama_deleted.tsx").write_text("export default () => null;")
    rows = {r["name"]: r for r in admin_client.get(URL).data}
    assert set(rows) == {"laporan.tangan"}
    assert (
        rows["laporan.tangan"]["label"] == "Dibuat developer"
        and rows["laporan.tangan"]["created_from_web"] is False
    )
    manual.unlink()
    assert admin_client.get(URL).data[0]["is_active"] is False  # file vanished -> flagged, row kept


def test_requires_menu_permission(client_for, make_user, tree):
    user = client_for(make_user("biasa-sn"))
    assert user.get(URL).status_code == 403
    assert user.post(URL, {"name": "a.b", "label": "x"}, format="json").status_code == 403


def test_clear_error_when_the_server_has_no_source_tree(admin_client, tmp_path, settings):
    settings.BASE_DIR = tmp_path / "nowhere" / "backend"
    res = create(admin_client)
    assert res.status_code == 409 and res.data["code"] == "NO_SOURCE"


def test_page_usage_counts_shortcodes_in_text(admin_client, tree):
    create(admin_client)
    ContentPage.objects.create(
        slug="t",
        title="T",
        blocks=[{"id": "a", "type": "text", "text": "Isi\n[snippet:pages.laporan_ujian limit=3]"}],
    )
    assert admin_client.get(URL).data[0]["used_in"] == 1
