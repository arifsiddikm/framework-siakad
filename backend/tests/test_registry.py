import importlib
import sys
from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command

from core import registry
from core.models import MenuItem, ModuleState, Permission
from core.registry import load_manifests, parse_manifest
from core.services.registry_sync import sync_registry


def test_manifests_are_discovered_and_synced():
    assert set(load_manifests()) == {"core", "mahasiswa", "pengumuman", "jadwal", "nilai", "keuangan"}
    assert ModuleState.objects.get(code="mahasiswa").is_active
    assert Permission.objects.filter(code__in=["mahasiswa.view", "mahasiswa.create"]).count() == 2
    assert MenuItem.objects.filter(key="mahasiswa:data-mahasiswa").exists()


def test_sync_is_idempotent_and_keeps_admin_state():
    ModuleState.objects.filter(code="mahasiswa").update(is_active=False)
    before = MenuItem.objects.count()
    sync_registry()
    sync_registry()
    assert MenuItem.objects.count() == before
    assert not ModuleState.objects.get(code="mahasiswa").is_active


def test_permission_codes_must_carry_the_module_prefix():
    with pytest.raises(ImproperlyConfigured, match="must start with"):
        parse_manifest("abc", {"code": "abc", "name": "A", "permissions": ["lain.view"]})


def test_manifest_code_must_match_folder_and_deps_must_exist():
    with pytest.raises(ImproperlyConfigured):
        parse_manifest("abc", {"code": "xyz", "name": "A"})
    bad = parse_manifest("abc", {"code": "abc", "name": "A", "depends_on": ["hantu"]})
    with pytest.raises(ImproperlyConfigured, match="unknown module"):
        registry._check_dependencies({"abc": bad})


def test_dependency_cycle_is_rejected():
    a = parse_manifest("aa", {"code": "aa", "name": "A", "depends_on": ["bb"]})
    b = parse_manifest("bb", {"code": "bb", "name": "B", "depends_on": ["aa"]})
    with pytest.raises(ImproperlyConfigured, match="circular"):
        registry._check_dependencies({"aa": a, "bb": b})


def test_modules_api_lists_modules(admin_client):
    res = admin_client.get("/api/admin/modules/")
    assert res.status_code == 200
    assert {m["code"] for m in res.data} == {"core", "mahasiswa", "pengumuman", "jadwal", "nilai", "keuangan"}


def test_inactive_module_hides_menu_and_api_answers_403(make_role, make_user, client_for, admin_client):
    user = make_user("dosen1", [make_role("dosen-uji", ["mahasiswa.view"])])
    client = client_for(user)
    assert client.get("/api/mahasiswa/").status_code == 200
    assert "Akademik" in [n["title"] for n in client.get("/api/auth/me/").data["menu"]]

    off = admin_client.patch("/api/admin/modules/mahasiswa/", {"is_active": False}, format="json")
    assert off.status_code == 200

    blocked = client.get("/api/mahasiswa/")
    assert blocked.status_code == 403
    assert blocked.data["code"] == "MODULE_INACTIVE"
    me = client.get("/api/auth/me/").data
    assert [n["title"] for n in me["menu"]] == ["Beranda"]
    assert "mahasiswa.view" not in me["permissions"]
    assert "mahasiswa" in me["inactive_modules"]

    admin_client.patch("/api/admin/modules/mahasiswa/", {"is_active": True}, format="json")
    assert client.get("/api/mahasiswa/").status_code == 200


def test_locked_menu_items_shown_when_enabled(settings, make_role, make_user, client_for, admin_client):
    settings.SHOW_LOCKED_MODULE_MENU = True
    client = client_for(make_user("kunci1", [make_role("r-kunci", ["mahasiswa.view"])]))
    admin_client.patch("/api/admin/modules/mahasiswa/", {"is_active": False}, format="json")
    group = next(n for n in client.get("/api/auth/me/").data["menu"] if n["title"] == "Akademik")
    assert group["children"][0]["locked"] is True


def test_core_module_cannot_be_disabled(admin_client):
    res = admin_client.patch("/api/admin/modules/core/", {"is_active": False}, format="json")
    assert res.status_code == 409 and res.data["code"] == "CORE_MODULE"


def test_module_dependencies_are_enforced(admin_client):
    ModuleState.objects.create(code="turunan", name="Turunan", depends_on=["mahasiswa"])
    res = admin_client.patch("/api/admin/modules/mahasiswa/", {"is_active": False}, format="json")
    assert res.status_code == 409 and res.data["code"] == "DEPENDED_ON"
    admin_client.patch("/api/admin/modules/turunan/", {"is_active": False}, format="json")
    assert (
        admin_client.patch("/api/admin/modules/mahasiswa/", {"is_active": False}, format="json").status_code
        == 200
    )
    res = admin_client.patch("/api/admin/modules/turunan/", {"is_active": True}, format="json")
    assert res.status_code == 409 and res.data["code"] == "DEPENDENCY_INACTIVE"


def test_dropping_a_new_module_folder_registers_it_without_touching_core(tmp_path, settings, monkeypatch):
    """MOD-01: a new folder with a manifest.py appears in the module list."""
    modules_dir = tmp_path / "modules"
    folder = modules_dir / "demo_baru"
    folder.mkdir(parents=True)
    (folder / "__init__.py").write_text("")
    (folder / "manifest.py").write_text(
        'MANIFEST = {"code": "demo_baru", "name": "Demo Baru", "permissions": ["demo_baru.view"],'
        ' "menu": [{"title": "Demo baru", "to": "/demo-baru", "perm": "demo_baru.view"}]}'
    )
    monkeypatch.syspath_prepend(str(tmp_path))
    real_modules = sys.modules["modules"]
    real_path = list(real_modules.__path__)
    real_modules.__path__.append(str(modules_dir))
    try:
        settings.MODULES_DIR = Path(modules_dir)
        # mimic discovery of both folders: the real ones plus the new one
        from core import discovery

        real_discover = discovery.discover_module_codes
        monkeypatch.setattr(
            registry,
            "discover_module_codes",
            lambda d: sorted({*real_discover(d), *real_discover(real_modules_dir())}),
        )
        load_manifests.cache_clear()
        importlib.invalidate_caches()
        sync_registry()
        assert ModuleState.objects.filter(code="demo_baru", is_active=True).exists()
        assert Permission.objects.filter(code="demo_baru.view").exists()
        assert MenuItem.objects.filter(key="demo_baru:demo-baru", is_orphan=False).exists()
    finally:
        real_modules.__path__[:] = real_path
        sys.modules.pop("modules.demo_baru", None)
        sys.modules.pop("modules.demo_baru.manifest", None)


def real_modules_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "modules"


def test_items_missing_from_manifests_are_marked_orphan_not_deleted(monkeypatch):
    sync_registry()
    item = MenuItem.objects.get(key="mahasiswa:data-mahasiswa")
    manifests = {k: v for k, v in load_manifests().items() if k != "mahasiswa"}
    monkeypatch.setattr("core.services.registry_sync.load_manifests", lambda: manifests)
    sync_registry()
    item.refresh_from_db()
    assert item.is_orphan
    assert ModuleState.objects.get(code="mahasiswa").is_orphan


def test_startmodule_creates_a_loadable_skeleton(tmp_path):
    backend, frontend = tmp_path / "backend", tmp_path / "frontend"
    call_command("startmodule", "nilai_uji", "--backend-dir", str(backend), "--frontend-dir", str(frontend))
    manifest_src = (backend / "nilai_uji" / "manifest.py").read_text()
    ns: dict = {}
    exec(compile(manifest_src, "manifest.py", "exec"), ns)  # noqa: S102 - generated by us, in tmp
    parsed = parse_manifest("nilai_uji", ns["MANIFEST"])
    assert parsed.permissions[0].code == "nilai_uji.view"
    assert (backend / "nilai_uji" / "urls.py").is_file()
    assert (frontend / "nilai_uji" / "manifest.ts").is_file()
    assert (frontend / "nilai_uji" / "pages" / "NilaiUjiPage.tsx").is_file()
    with pytest.raises(Exception, match="sudah ada"):
        call_command(
            "startmodule", "nilai_uji", "--backend-dir", str(backend), "--frontend-dir", str(frontend)
        )
    with pytest.raises(Exception, match="Kode modul"):
        call_command(
            "startmodule", "Bad-Code", "--backend-dir", str(backend), "--frontend-dir", str(frontend)
        )


def test_startsnippet_scaffolds_react_and_optional_python(tmp_path, settings):
    settings.BASE_DIR = tmp_path / "backend"
    call_command("startsnippet", "pages.laporan.ringkas", "--with-data", "--title", "Ringkas")
    react = tmp_path / "frontend" / "src" / "snippets" / "pages" / "laporan" / "ringkas.tsx"
    python = tmp_path / "backend" / "snippets" / "pages" / "laporan" / "ringkas.py"
    assert "hasData: true" in react.read_text() and "[snippet:pages.laporan.ringkas]" in react.read_text()
    compile(python.read_text(), "ringkas.py", "exec")
    call_command("startsnippet", "tampil_saja")
    assert not (tmp_path / "backend" / "snippets" / "tampil_saja.py").exists()
    with pytest.raises(Exception, match="sudah ada"):
        call_command("startsnippet", "tampil_saja")
    with pytest.raises(Exception, match="Nama snippet"):
        call_command("startsnippet", "Salah Nama")
