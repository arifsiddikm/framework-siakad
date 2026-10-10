"""Find module folders without importing Django (used by settings, registry, startmodule)."""

from __future__ import annotations

import re
from pathlib import Path

MODULE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{1,29}$")


def discover_module_codes(modules_dir: Path) -> list[str]:
    """Return sorted codes of folders in `modules_dir` that contain a manifest.py."""
    if not modules_dir.is_dir():
        return []
    return sorted(
        entry.name
        for entry in modules_dir.iterdir()
        if entry.is_dir() and MODULE_CODE_RE.match(entry.name) and (entry / "manifest.py").is_file()
    )
