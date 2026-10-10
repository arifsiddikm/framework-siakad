"""Sample modules (pengumuman, jadwal, nilai, keuangan) and the seeded demo content, per role."""

import pytest
from django.core.management import call_command

from core import snippets
from core.models import ContentPage, MenuItem, Role, User, UserRole


@pytest.fixture
def world(db, settings):
    """Starter roles + sample data, and one user per role (identifier = NIM for the student)."""
    call_command("seed_roles")
    call_command("seed_samples")
    users = {}
    for code, ident in [
        ("mahasiswa", "24040012"),
        ("dosen", ""),
        ("staf-akademik", ""),
        ("pimpinan", ""),
        ("admin", ""),
    ]:
        user = User.objects.create_user(
            f"u_{code}", "Sandi-Uji-12345", full_name=code.title(), identifier=ident
        )
        UserRole.objects.create(user=user, role=Role.objects.get(code=code))
        users[code] = user
    return users


def api(client_for, world, role):
    return client_for(world[role])


def test_seed_samples_is_idempotent_and_creates_enough_content(world):
    pages, menu = ContentPage.objects.count(), MenuItem.objects.count()
    call_command("seed_samples")
    assert (ContentPage.objects.count(), MenuItem.objects.count()) == (pages, menu)
    assert pages >= 12
    assert MenuItem.objects.exclude(to="").count() >= 18
    assert len(snippets.known_snippets() or set()) >= 12


@pytest.mark.parametrize(
    ("role", "must_see", "must_not_see"),
    [
        (
            "mahasiswa",
            {
                "Layanan saya",
                "Jadwal kuliah",
                "Nilai & KHS",
                "Tagihan",
                "Pengumuman",
                "Beasiswa",
                "Wisuda",
                "Panduan KRS",
            },
            {"Data mahasiswa", "Panduan dosen wali", "Ringkasan kampus"},
        ),
        (
            "dosen",
            {
                "Jadwal kuliah",
                "Nilai & KHS",
                "Data mahasiswa",
                "Panduan dosen wali",
                "Pedoman penilaian",
                "Panduan KRS",
            },
            {"Tagihan", "Beasiswa", "Ringkasan kampus", "Layanan saya"},
        ),
        (
            "staf-akademik",
            {
                "Jadwal kuliah",
                "Nilai & KHS",
                "Tagihan",
                "Data mahasiswa",
                "Beasiswa",
                "Ringkasan kampus",
                "Panduan dosen wali",
            },
            {"Layanan saya"},
        ),
        (
            "pimpinan",
            {"Ringkasan kampus", "Wisuda", "Pengumuman", "Tagihan", "Kalender akademik"},
            {"Panduan dosen wali", "Beasiswa", "Layanan saya", "Panduan KRS"},
        ),
        (
            "admin",
            {
                "Beranda",
                "Kalender akademik",
                "Kontak layanan",
                "Tata tertib",
                "FAQ",
                "Perpustakaan",
                "Layanan ijazah",
            },
            {"Tagihan", "Nilai & KHS", "Jadwal kuliah"},
        ),
    ],
)
def test_every_role_sees_the_menu_that_fits_it(world, client_for, role, must_see, must_not_see):
    menu = api(client_for, world, role).get("/api/auth/me/").data["menu"]
    titles = {n["title"] for n in menu} | {c["title"] for n in menu for c in n["children"]}
    assert must_see <= titles, must_see - titles
    assert not (must_not_see & titles), must_not_see & titles


def test_every_role_has_a_portal_with_several_menus(world, client_for):
    counts = {r: len(api(client_for, world, r).get("/api/auth/me/").data["menu"]) for r in world}
    assert (
        counts["mahasiswa"] >= 4
        and counts["staf-akademik"] >= 4
        and counts["dosen"] >= 3
        and counts["pimpinan"] >= 3
    )


def test_roles_cannot_open_pages_meant_for_other_roles(world, client_for):
    assert api(client_for, world, "mahasiswa").get("/api/pages/panduan-dosen-wali/").status_code == 403
    assert api(client_for, world, "dosen").get("/api/pages/panduan-dosen-wali/").status_code == 200
    assert api(client_for, world, "dosen").get("/api/pages/info-beasiswa/").status_code == 403
    assert api(client_for, world, "pimpinan").get("/api/pages/ringkasan-kampus/").status_code == 200
    assert api(client_for, world, "mahasiswa").get("/api/pages/kalender-akademik/").status_code == 200


def test_student_sees_only_own_grades(world, client_for):
    res = api(client_for, world, "mahasiswa").get("/api/nilai/?nim=24040001")  # ?nim= is ignored for students
    assert res.status_code == 200 and res.data["scope"] == "own" and res.data["nim"] == "24040012"
    assert {r["nim"] for r in res.data["results"]} == {"24040012"}
    assert res.data["summary"]["sks"] == 34 and res.data["summary"]["ipk"] == 3.72


def test_lecturer_must_search_and_never_dumps_the_table(world, client_for):
    dosen = api(client_for, world, "dosen")
    empty = dosen.get("/api/nilai/")
    assert empty.status_code == 200 and empty.data["scope"] == "all" and empty.data["results"] == []
    found = dosen.get("/api/nilai/?nim=24040001")
    assert {r["nim"] for r in found.data["results"]} == {"24040001"} and found.data["summary"][
        "ipk"
    ] is not None


def test_only_input_permission_can_write_grades_and_it_upserts(world, client_for):
    body = {
        "nim": "24040012",
        "kode_mk": "TI301",
        "matkul": "Cloud Computing",
        "sks": 3,
        "semester": "Ganjil 2026/2027",
        "huruf": "A",
    }
    assert api(client_for, world, "mahasiswa").post("/api/nilai/", body, format="json").status_code == 403
    assert api(client_for, world, "pimpinan").post("/api/nilai/", body, format="json").status_code == 403
    dosen = api(client_for, world, "dosen")
    assert dosen.post("/api/nilai/", body, format="json").status_code == 201
    assert (
        dosen.post("/api/nilai/", body | {"huruf": "B"}, format="json").status_code == 200
    )  # same key -> update
    assert dosen.post("/api/nilai/", body | {"huruf": "Z"}, format="json").status_code == 400
    assert dosen.post("/api/nilai/", body | {"nim": "24A0"}, format="json").status_code == 400
    assert dosen.post("/api/nilai/", body | {"sks": 0}, format="json").status_code == 400


def test_student_sees_only_own_bills_and_cannot_manage(world, client_for):
    res = api(client_for, world, "mahasiswa").get("/api/keuangan/?q=24040001")
    assert res.data["scope"] == "own" and {r["nim"] for r in res.data["results"]} == {"24040012"}
    assert res.data["summary"]["belum"] == 7_500_000
    bill = res.data["results"][0]["id"]
    assert (
        api(client_for, world, "mahasiswa")
        .patch(f"/api/keuangan/{bill}/", {"status": "lunas"}, format="json")
        .status_code
        == 403
    )
    assert (
        api(client_for, world, "mahasiswa")
        .post(
            "/api/keuangan/",
            {"nim": "1", "keterangan": "x", "jumlah": 1, "jatuh_tempo": "2026-12-01"},
            format="json",
        )
        .status_code
        == 403
    )


def test_staff_manages_bills(world, client_for):
    staf = api(client_for, world, "staf-akademik")
    assert staf.get("/api/keuangan/").data["scope"] == "all"
    made = staf.post(
        "/api/keuangan/",
        {"nim": "24040012", "keterangan": "Wisuda", "jumlah": 1_000_000, "jatuh_tempo": "2026-12-01"},
        format="json",
    )
    assert made.status_code == 201 and made.data["status"] == "belum"
    paid = staf.patch(f"/api/keuangan/{made.data['id']}/", {"status": "lunas"}, format="json")
    assert paid.data["status"] == "lunas" and paid.data["dibayar_pada"]
    assert (
        staf.patch(f"/api/keuangan/{made.data['id']}/", {"status": "hantu"}, format="json").status_code == 400
    )
    assert (
        staf.patch(
            f"/api/keuangan/{made.data['id']}/", {"status": "lunas", "jumlah": 1}, format="json"
        ).status_code
        == 400
    )
    assert (
        staf.post(
            "/api/keuangan/",
            {"nim": "24040012", "keterangan": "x", "jumlah": 0, "jatuh_tempo": "2026-12-01"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        api(client_for, world, "pimpinan")
        .patch(f"/api/keuangan/{made.data['id']}/", {"status": "belum"}, format="json")
        .status_code
        == 403
    )


def test_announcements_everyone_reads_only_staff_writes(world, client_for):
    assert all(
        api(client_for, world, r).get("/api/pengumuman/").status_code == 200
        for r in ("mahasiswa", "dosen", "staf-akademik", "pimpinan")
    )
    assert (
        api(client_for, world, "admin").get("/api/pengumuman/").status_code == 403
    )  # admin has settings, not content
    body = {"judul": "Libur nasional", "isi": "Kampus libur.", "kategori": "umum", "penting": True}
    assert api(client_for, world, "dosen").post("/api/pengumuman/", body, format="json").status_code == 403
    made = api(client_for, world, "staf-akademik").post("/api/pengumuman/", body, format="json")
    assert made.status_code == 201 and made.data["tanggal"]
    assert (
        api(client_for, world, "staf-akademik")
        .post("/api/pengumuman/", body | {"kategori": "hantu"}, format="json")
        .status_code
        == 400
    )
    assert (
        api(client_for, world, "mahasiswa").delete(f"/api/pengumuman/{made.data['id']}/").status_code == 403
    )
    assert (
        api(client_for, world, "staf-akademik").delete(f"/api/pengumuman/{made.data['id']}/").status_code
        == 204
    )
    assert api(client_for, world, "mahasiswa").get("/api/pengumuman/?kategori=keuangan").data["count"] == 2


def test_timetable_is_validated_and_sorted(world, client_for):
    data = api(client_for, world, "mahasiswa").get("/api/jadwal/").data
    days = [r["hari"] for r in data["results"]]
    assert days == sorted(days, key=data["hari"].index)
    staf = api(client_for, world, "staf-akademik")
    body = {
        "kode_mk": "TI999",
        "matkul": "Uji",
        "dosen": "Dosen",
        "hari": "Senin",
        "jam_mulai": "10:00",
        "jam_selesai": "09:00",
        "ruang": "R1",
    }
    assert staf.post("/api/jadwal/", body, format="json").status_code == 400
    assert staf.post("/api/jadwal/", body | {"jam_selesai": "11:00"}, format="json").status_code == 201
    assert api(client_for, world, "dosen").post("/api/jadwal/", body, format="json").status_code == 403
    assert api(client_for, world, "mahasiswa").get("/api/jadwal/?hari=Senin").data["results"]


def test_sample_snippet_providers_follow_permissions(world, client_for):
    mhs, pim, dosen = (api(client_for, world, r) for r in ("mahasiswa", "pimpinan", "dosen"))
    sks = mhs.get("/api/snippets/akademik.progres_sks/data/?target=120").data["data"]
    assert sks["sks"] == 34 and sks["target"] == 120 and sks["has_nim"]
    assert (
        mhs.get("/api/snippets/keuangan.ringkasan_tagihan/data/").data["data"]["belum_dibayar"] == 7_500_000
    )
    assert (
        pim.get("/api/snippets/keuangan.ringkasan_tagihan/data/").data["data"]["has_nim"] is False
    )  # no NIM, no data
    assert mhs.get("/api/snippets/pimpinan.ringkasan_kampus/data/").status_code in (200, 403)
    assert (
        api(client_for, world, "admin").get("/api/snippets/pimpinan.ringkasan_kampus/data/").status_code
        == 403
    )
    assert pim.get("/api/snippets/pimpinan.ringkasan_kampus/data/").data["data"]["mahasiswa"] >= 7
    assert len(dosen.get("/api/snippets/dosen.mahasiswa_bimbingan/data/").data["data"]["items"]) >= 1
    assert len(mhs.get("/api/snippets/info.pengumuman_terbaru/data/?jumlah=3").data["data"]["items"]) == 3
    assert mhs.get("/api/snippets/info.kalender_akademik/data/?jenis=ujian").data["data"]["events"]
    assert mhs.get("/api/snippets/akademik.jadwal_hari_ini/data/?hari=Senin").data["data"]["items"]


def test_any_of_permission_tuples(db, make_user, make_role, client_for):
    from rest_framework.views import APIView

    from core.api import PermByMethod

    class V(APIView):
        permission_classes = [PermByMethod]
        perm_map = {"GET": ("mahasiswa.view", "pengumuman.view")}

    request = type(
        "R", (), {"method": "GET", "user": make_user("x1", [make_role("r-any", ["pengumuman.view"])])}
    )()
    assert PermByMethod().has_permission(request, V()) is True
    request.user = make_user("x2", [make_role("r-none", [])])
    assert PermByMethod().has_permission(request, V()) is False
