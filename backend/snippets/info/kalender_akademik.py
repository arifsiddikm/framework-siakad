"""Academic calendar (fictional sample). Replace with your own model when the calendar is managed in the app."""

from typing import Any

from core.models import User

PERMISSION = None

EVENTS = [
    {"tanggal": "2026-09-01", "kegiatan": "Awal semester Ganjil 2026/2027", "jenis": "akademik"},
    {"tanggal": "2026-10-12", "kegiatan": "Pengisian KRS dibuka", "jenis": "akademik"},
    {"tanggal": "2026-10-18", "kegiatan": "Batas akhir pengisian & perubahan KRS", "jenis": "penting"},
    {"tanggal": "2026-10-20", "kegiatan": "Ujian Tengah Semester (UTS)", "jenis": "ujian"},
    {"tanggal": "2026-10-31", "kegiatan": "Batas pembayaran SPP tahap 1", "jenis": "penting"},
    {"tanggal": "2026-11-05", "kegiatan": "Seminar nasional transformasi digital", "jenis": "kegiatan"},
    {"tanggal": "2026-12-15", "kegiatan": "Ujian Akhir Semester (UAS)", "jenis": "ujian"},
    {"tanggal": "2027-01-11", "kegiatan": "Pengumuman nilai & yudisium", "jenis": "akademik"},
]


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    jenis = str(params.get("jenis", "")).strip()
    return {"events": [e for e in EVENTS if not jenis or e["jenis"] == jenis]}
