"""Latest announcements (real ORM query on the `pengumuman` module)."""

from typing import Any

from core.models import User
from modules.pengumuman.models import Pengumuman

PERMISSION = "pengumuman.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    try:
        limit = max(1, min(int(params.get("jumlah", 5)), 20))
    except ValueError:
        limit = 5
    qs = Pengumuman.objects.all()
    kategori = str(params.get("kategori", "")).strip()
    if kategori:
        qs = qs.filter(kategori=kategori)
    rows = qs[:limit].values("id", "judul", "isi", "kategori", "penting", "tanggal")
    return {"items": [{**r, "tanggal": r["tanggal"].isoformat()} for r in rows]}
