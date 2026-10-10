"""Advisees of a lecturer. Demo: the first students of a study programme stand in for the real advising table."""

from typing import Any

from core.models import User
from modules.mahasiswa.models import Mahasiswa

PERMISSION = "mahasiswa.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    prodi = str(params.get("prodi", "Teknik Informatika"))
    rows = Mahasiswa.objects.filter(prodi=prodi).order_by("nim").values("nim", "nama", "angkatan")[:8]
    return {"prodi": prodi, "items": list(rows)}
