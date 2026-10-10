"""Today's timetable (real ORM query on the `jadwal` module). `?hari=Selasa` overrides the day."""

from datetime import date
from typing import Any

from core.models import User
from modules.jadwal.models import HARI, JadwalKuliah

PERMISSION = "jadwal.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    wanted = str(params.get("hari", "")).strip().capitalize()
    weekday = date.today().weekday()  # Monday = 0
    hari = wanted if wanted in HARI else (HARI[weekday] if weekday < len(HARI) else "")
    rows = JadwalKuliah.objects.filter(hari=hari).values(
        "matkul", "dosen", "ruang", "kelas", "jam_mulai", "jam_selesai"
    )
    items = [
        {**r, "jam_mulai": f"{r['jam_mulai']:%H:%M}", "jam_selesai": f"{r['jam_selesai']:%H:%M}"}
        for r in rows
    ]
    return {"hari": hari or "Minggu", "items": items}
