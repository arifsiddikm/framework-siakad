"""Snippets: a React file in `frontend/src/snippets/` (plus, optionally, a same-named Python file in
`backend/snippets/`) that an admin drops into any page with `[snippet:nama]` or the Snippet block.

The file path is the whole registration, folders can be nested freely:
`pages/data_ijazah.tsx` is the snippet `pages.data_ijazah`, `pages/data_ijazah/upload_form.tsx` is
`pages.data_ijazah.upload_form`. The Python half is optional and is found by the same path, and is
reached only through one API endpoint (`/api/snippets/<name>/data/`), so nothing is declared in a manifest.
"""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path
from typing import Any

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

from core.api import DomainError
from core.models import User
from core.selectors import has_permission

DELETED_RE = re.compile(r"_deleted(_\d+)?$")  # soft-deleted files are renamed <name>_deleted[_n]
NAME_RE = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){0,5}$")  # up to 6 levels of folders
MAX_PARAMS = 20


def frontend_dir() -> Path:
    return settings.BASE_DIR.parent / "frontend" / "src" / "snippets"


def backend_dir() -> Path:
    return settings.BASE_DIR / "snippets"


def known_snippets() -> set[str] | None:
    """Names of the React snippet files, or None when the frontend sources are not on this machine."""
    root = frontend_dir()
    if not root.is_dir():
        return None
    names: set[str] = set()
    for path in root.rglob("*.tsx"):
        relative = path.relative_to(root).with_suffix("")
        if any(part.startswith("_") for part in relative.parts) or len(relative.parts) > 6:
            continue
        if DELETED_RE.search(relative.parts[-1]):
            continue
        names.add(".".join(relative.parts))
    return names


def check_name(name: Any) -> str:
    """Valid, existing snippet name (existence is checked only when the frontend sources are present)."""
    if not isinstance(name, str) or not NAME_RE.match(name):
        raise DomainError("INVALID_SNIPPET", "Nama snippet tidak valid (contoh: pages.data_ijazah).")
    known = known_snippets()
    if known is not None and name not in known:
        raise DomainError(
            "UNKNOWN_SNIPPET",
            f"Snippet '{name}' tidak ada. Buat file-nya di frontend/src/snippets/ "
            "(lihat EDIT_ADD_FILE_HERE).",
        )
    return name


def clean_params(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict) or len(raw) > MAX_PARAMS:
        raise DomainError("INVALID_SNIPPET", f"Parameter snippet berupa daftar maksimal {MAX_PARAMS} isian.")
    out: dict[str, Any] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not re.match(r"^[a-z][a-z0-9_]{0,29}$", key):
            raise DomainError("INVALID_SNIPPET", f"Nama parameter '{key}' tidak valid.")
        if not isinstance(value, str | int | float | bool) or len(str(value)) > 300:
            raise DomainError(
                "INVALID_SNIPPET", f"Isi parameter '{key}' harus teks/angka maksimal 300 karakter."
            )
        out[key] = value
    return out


_loaded: dict[str, tuple[float, Any]] = {}


def _path(name: str) -> Path:
    return backend_dir().joinpath(*name.split(".")).with_suffix(".py")


def _provider(name: str) -> Any | None:
    """Load backend/snippets/<name>.py by file path (so `a.py` and a folder `a/` can coexist)."""
    path = _path(name)
    if not path.is_file():
        return None
    mtime = path.stat().st_mtime
    cached = _loaded.get(name)
    if cached and cached[0] == mtime:
        return cached[1]
    module_name = f"_snippet_{name.replace('.', '_')}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    _loaded[name] = (mtime, module)
    return module


def has_provider(name: str) -> bool:
    return NAME_RE.match(name) is not None and _path(name).is_file()


def run_snippet(name: str, params: dict[str, Any], user: User) -> Any:
    """Call `data(user=..., params=...)` of backend/snippets/<name>.py for the signed-in viewer."""
    check_name(name)
    module = _provider(name)
    if module is None or not callable(getattr(module, "data", None)):
        raise DomainError("NO_SNIPPET_DATA", "Snippet ini tidak memiliki data dari server.", status=404)
    permission = getattr(module, "PERMISSION", None)
    if permission and not has_permission(user, permission):
        raise PermissionDenied()
    return module.data(user=user, params=clean_params(params))
