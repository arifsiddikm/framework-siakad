"""Server half of the example snippet `pages.data_ijazah`.

React half: frontend/src/snippets/pages/data_ijazah.tsx.

Fictional data for the demo. Replace with an ORM query on your own model.
"""

from typing import Any

from core.models import User

PERMISSION = None  # None = any signed-in user. Set a permission code for anything sensitive.

_SAMPLE = [
    {
        "nomor": "IJZ-2026-0001",
        "nama": "Aulia Rahmawati",
        "prodi": "Teknik Informatika",
        "status": "Siap diambil",
    },
    {
        "nomor": "IJZ-2026-0002",
        "nama": "Bagas Prasetyo",
        "prodi": "Teknik Informatika",
        "status": "Dalam proses",
    },
    {
        "nomor": "IJZ-2026-0003",
        "nama": "Citra Lestari",
        "prodi": "Sistem Informasi",
        "status": "Siap diambil",
    },
    {
        "nomor": "IJZ-2026-0004",
        "nama": "Dimas Anggara",
        "prodi": "Sistem Informasi",
        "status": "Diverifikasi",
    },
]


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    """Rows for the table. `params` come from the shortcode, e.g. [snippet:pages.data_ijazah limit=2]."""
    try:
        limit = max(1, min(int(params.get("limit", 10)), 50))
    except ValueError:
        limit = 10
    status = str(params.get("status", "")).strip()
    rows = [r for r in _SAMPLE if not status or r["status"].lower() == status.lower()]
    return {"rows": rows[:limit], "total": len(rows)}
