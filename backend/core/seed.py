"""Seed data: five starter roles (PRD §3). Data, not code — editable later from the UI."""

from __future__ import annotations

CORE_ADMIN_PERMISSIONS = [
    "core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage",
]  # fmt: skip

# code -> (name, description, permission codes). Unknown codes are skipped, so seeding works
# even if a module has been removed.
ROLES: dict[str, tuple[str, str, list[str]]] = {
    "admin": (
        "Admin",
        "Mengelola pengguna, peran, izin, modul, dan menu.",
        CORE_ADMIN_PERMISSIONS,
    ),
    "staf-akademik": (
        "Staf Akademik",
        "Mengoperasikan modul akademik dan keuangan.",
        [
            "mahasiswa.view",
            "mahasiswa.create",
            "pengumuman.view",
            "pengumuman.manage",
            "jadwal.view",
            "jadwal.manage",
            "nilai.view",
            "nilai.view_all",
            "nilai.input",
            "keuangan.view",
            "keuangan.view_all",
            "keuangan.manage",
        ],
    ),  # fmt: skip
    "dosen": (
        "Dosen",
        "Mengakses modul perkuliahan dan perwalian.",
        ["mahasiswa.view", "pengumuman.view", "jadwal.view", "nilai.view", "nilai.view_all", "nilai.input"],
    ),
    "mahasiswa": (
        "Mahasiswa",
        "Mengakses data dan layanan miliknya sendiri.",
        ["pengumuman.view", "jadwal.view", "nilai.view", "keuangan.view"],
    ),
    "pimpinan": (
        "Pimpinan",
        "Melihat ringkasan, hak baca saja.",
        [
            "mahasiswa.view",
            "pengumuman.view",
            "jadwal.view",
            "nilai.view",
            "nilai.view_all",
            "keuangan.view",
            "keuangan.view_all",
        ],
    ),  # fmt: skip
}

# Fictional demo accounts (only created when SEED_DEMO_PASSWORD is set).
DEMO_USERS: list[tuple[str, str, str, str]] = [
    ("staf.demo", "Sari Wulandari", "staf-akademik", ""),
    ("dosen.demo", "Dr. Hendra Wijaya, M.Kom.", "dosen", "0411058801"),
    ("mahasiswa.demo", "Rizky Aditya Pratama", "mahasiswa", "24040012"),
    ("pimpinan.demo", "Prof. Budi Santoso", "pimpinan", ""),
]
