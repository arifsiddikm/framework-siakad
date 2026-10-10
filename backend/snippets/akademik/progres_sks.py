"""A student's SKS progress and IPK, from the `nilai` module. Matches the account's NIM (own data only)."""

from typing import Any

from core.models import User
from modules.nilai.models import BOBOT, Nilai

PERMISSION = "nilai.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    nim = user.identifier
    try:
        target = max(1, min(int(params.get("target", 144)), 300))
    except ValueError:
        target = 144
    rows = list(Nilai.objects.filter(nim=nim)) if nim else []
    sks = sum(r.sks for r in rows)
    ipk = round(sum(BOBOT[r.huruf] * r.sks for r in rows) / sks, 2) if sks else None
    return {"nim": nim, "sks": sks, "target": target, "ipk": ipk, "has_nim": bool(nim)}
