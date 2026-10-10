"""Module registry: discover, parse and validate manifests (MOD-01).

A module is a folder `modules/<code>/` with a `manifest.py` exposing `MANIFEST`.
This file only reads manifests; syncing them into the database is `services/registry_sync.py`.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from core.discovery import MODULE_CODE_RE, discover_module_codes
from core.icons import DEFAULT_ICON, ICON_NAMES

CORE_CODE = "core"
TITLE_MAX = 40


@dataclass(frozen=True)
class PermissionDef:
    code: str
    name: str


@dataclass(frozen=True)
class MenuDef:
    title: str
    to: str
    hint: str = ""
    icon: str = ""
    perm: str | None = None
    group: str | None = None
    group_icon: str = ""
    group_order: int | None = None
    order: int | None = None


@dataclass(frozen=True)
class PageDef:
    path: str
    title: str


FIELD_TYPES = ("text", "number", "date", "boolean")


@dataclass(frozen=True)
class FieldDef:
    name: str
    label: str
    type: str = "text"


@dataclass(frozen=True)
class DatasetDef:
    """A read-only table a module exposes to the page builder (queried through the ORM)."""

    code: str
    label: str
    model: str  # model class name inside the module's app
    perm: str | None
    fields: tuple[FieldDef, ...]


@dataclass(frozen=True)
class Manifest:
    code: str
    name: str
    icon: str = DEFAULT_ICON
    description: str = ""
    depends_on: tuple[str, ...] = ()
    permissions: tuple[PermissionDef, ...] = ()
    menu: tuple[MenuDef, ...] = ()
    pages: tuple[PageDef, ...] = field(default_factory=tuple)
    datasets: tuple[DatasetDef, ...] = field(default_factory=tuple)


def _fail(code: str, message: str) -> ImproperlyConfigured:
    return ImproperlyConfigured(f"Manifest '{code}': {message}")


def parse_manifest(folder_code: str, raw: dict[str, Any]) -> Manifest:
    """Validate a raw MANIFEST dict. Raises ImproperlyConfigured with a developer-facing message."""
    code = raw.get("code")
    if code != folder_code:
        raise _fail(folder_code, f"'code' must equal the folder name, got {code!r}")
    if folder_code != CORE_CODE and not MODULE_CODE_RE.match(folder_code):
        raise _fail(folder_code, "code must match ^[a-z][a-z0-9_]{1,29}$")
    name = str(raw.get("name", "")).strip()
    if not name:
        raise _fail(code, "'name' is required")
    icon = str(raw.get("icon") or DEFAULT_ICON)
    if icon not in ICON_NAMES:
        raise _fail(code, f"unknown icon {icon!r}; allowed: see core/icons.py")

    permissions: list[PermissionDef] = []
    for entry in raw.get("permissions", []):
        perm = {"code": entry, "name": entry} if isinstance(entry, str) else dict(entry)
        perm_code = str(perm.get("code", ""))
        if not perm_code.startswith(f"{code}."):
            raise _fail(code, f"permission {perm_code!r} must start with '{code}.'")
        permissions.append(PermissionDef(perm_code, str(perm.get("name") or perm_code)))
    own_perms = {p.code for p in permissions}
    if len(own_perms) != len(permissions):
        raise _fail(code, "duplicate permission codes")

    menu: list[MenuDef] = []
    for entry in raw.get("menu", []):
        title = str(entry.get("title", "")).strip()
        to = str(entry.get("to", ""))
        if not title or len(title) > TITLE_MAX:
            raise _fail(code, f"menu title {title!r} must be 1–{TITLE_MAX} characters")
        if not to.startswith("/"):
            raise _fail(code, f"menu '{title}': 'to' must start with '/'")
        perm = entry.get("perm")
        if perm is not None and perm not in own_perms:
            raise _fail(code, f"menu '{title}': perm {perm!r} is not declared in this manifest")
        item_icon = str(entry.get("icon") or "")
        group_icon = str(entry.get("group_icon") or "")
        for used in (item_icon, group_icon):
            if used and used not in ICON_NAMES:
                raise _fail(code, f"menu '{title}': unknown icon {used!r}")
        menu.append(
            MenuDef(
                title=title,
                to=to,
                hint=str(entry.get("hint", "")),
                icon=item_icon,
                perm=perm,
                group=entry.get("group"),
                group_icon=group_icon,
                group_order=entry.get("group_order"),
                order=entry.get("order"),
            )
        )

    pages = tuple(PageDef(str(p["path"]), str(p.get("title", p["path"]))) for p in raw.get("pages", []))
    for page in pages:
        if not page.path.startswith("/"):
            raise _fail(code, f"page path {page.path!r} must start with '/'")

    datasets: list[DatasetDef] = []
    for entry in raw.get("datasets", []):
        ds_code = str(entry.get("code", ""))
        if not MODULE_CODE_RE.match(ds_code):
            raise _fail(code, f"dataset code {ds_code!r} must match ^[a-z][a-z0-9_]{{1,29}}$")
        perm = entry.get("perm")
        if perm is not None and perm not in own_perms:
            raise _fail(code, f"dataset '{ds_code}': perm {perm!r} is not declared in this manifest")
        fields = tuple(
            FieldDef(str(f["name"]), str(f.get("label", f["name"])), str(f.get("type", "text")))
            for f in entry.get("fields", [])
        )
        if not fields or any(f.type not in FIELD_TYPES for f in fields):
            raise _fail(code, f"dataset '{ds_code}': needs fields with type in {FIELD_TYPES}")
        datasets.append(
            DatasetDef(ds_code, str(entry.get("label", ds_code)), str(entry.get("model", "")), perm, fields)
        )

    return Manifest(
        code=code,
        name=name,
        icon=icon,
        description=str(raw.get("description", "")),
        depends_on=tuple(raw.get("depends_on", [])),
        permissions=tuple(permissions),
        menu=tuple(menu),
        pages=pages,
        datasets=tuple(datasets),
    )


def _check_dependencies(manifests: dict[str, Manifest]) -> None:
    for manifest in manifests.values():
        for dep in manifest.depends_on:
            if dep not in manifests:
                raise _fail(manifest.code, f"depends_on unknown module {dep!r}")
    # Detect cycles with a depth-first walk.
    visiting: set[str] = set()
    done: set[str] = set()

    def visit(code: str) -> None:
        if code in done:
            return
        if code in visiting:
            raise _fail(code, "circular depends_on")
        visiting.add(code)
        for dep in manifests[code].depends_on:
            visit(dep)
        visiting.discard(code)
        done.add(code)

    for code in manifests:
        visit(code)


@lru_cache(maxsize=1)
def load_manifests() -> dict[str, Manifest]:
    """All manifests keyed by code, `core` first. Cached per process; restart to pick up changes."""
    from core.manifest import MANIFEST as CORE_MANIFEST

    manifests = {CORE_CODE: parse_manifest(CORE_CODE, CORE_MANIFEST)}
    for code in discover_module_codes(settings.MODULES_DIR):
        module = importlib.import_module(f"modules.{code}.manifest")
        manifests[code] = parse_manifest(code, module.MANIFEST)
    _check_dependencies(manifests)
    return manifests


def registered_pages() -> dict[str, str]:
    """Every page path a menu item may point to → its title (MENU-04)."""
    pages: dict[str, str] = {}
    for manifest in load_manifests().values():
        for item in manifest.menu:
            pages[item.to] = item.title
        for page in manifest.pages:
            pages[page.path] = page.title
    return pages
