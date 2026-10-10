"""Server half of the example snippet `pages.data_ijazah.upload_form` (nested folders are fine).

This one only shows the shape: the React form posts to its own endpoint or just reads `data` here.
"""

from typing import Any

from core.models import User

PERMISSION = None


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    return {"nama_pengunggah": user.full_name, "maks_mb": int(params.get("maks_mb", 5) or 5)}
