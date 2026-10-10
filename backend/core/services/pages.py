"""Pages written by admins (PAGE-01..04) and the access map (ADM-04)."""

from __future__ import annotations

from typing import Any

from django.db import transaction

from core.api import DomainError
from core.models import ContentPage, MenuItem, Permission
from core.registry import load_manifests, registered_pages
from core.services import access
from core.services import blocks as block_service
from core.services import menu as menu_service

PERM_PREFIX = "core.page."


RESERVED_SLUGS = frozenset(
    {
        "admin",
        "api",
        "masuk",
        "p",
        "akses-ditolak",
        "modul-belum-aktif",
        "static",
        "assets",
        "fonts",
        "brand",
        "favicon",
        "site",
    }
)


def page_path(slug: str) -> str:
    return f"/{slug}"


def reserved_slugs() -> set[str]:
    """First path segments already used by the system, modules, or static files."""
    taken = set(RESERVED_SLUGS) | set(load_manifests())
    for path in registered_pages():
        head = path.strip("/").split("/")[0]
        if head:
            taken.add(head)
    return taken


def _menu_items(page: ContentPage) -> list[MenuItem]:
    return list(MenuItem.objects.filter(to=page_path(page.slug), is_system=False))


def _apply_roles(page: ContentPage, roles: list[str]) -> None:
    if not roles:
        old = page.permission
        page.permission = None
        page.save(update_fields=["permission", "updated_at"])
        for item in _menu_items(page):
            item.permission = None
            item.save(update_fields=["permission"])
        access.delete_access_permission(old, PERM_PREFIX)
        return
    permission = access.ensure_access_permission(
        f"{PERM_PREFIX}{page.slug}.view", f"Lihat halaman: {page.title}"
    )
    access.set_permission_roles(permission, roles)
    page.permission = permission
    page.save(update_fields=["permission", "updated_at"])
    for item in _menu_items(page):
        item.permission = permission
        item.save(update_fields=["permission"])


def _remap(error: DomainError) -> DomainError:
    names = {"title": "menu_title", "parent": "menu_parent"}
    fields = {names.get(k, k): v for k, v in error.fields.items()}
    return DomainError(error.code, error.message, status=error.status, fields=fields)


def _sync_menu(page: ContentPage, data: dict[str, Any]) -> None:
    """Create, update or remove the menu link of this page (one link per page)."""
    items = _menu_items(page)
    if "menu_enabled" not in data and not items:
        return
    enabled = data.get("menu_enabled", bool(items))
    if not enabled:
        for item in items:
            menu_service.delete_item(item)
        return
    payload = {
        "title": data.get("menu_title") or (items[0].title if items else page.title[:40]),
        "to": page_path(page.slug),
        "icon": "file-text",
        "parent": data.get("menu_parent", items[0].parent_id if items else None),
        "is_active": page.is_published,
        "permission": page.permission.code if page.permission else None,
    }
    try:
        if items:
            menu_service.update_item(items[0], payload)
        else:
            menu_service.create_item(payload)
    except DomainError as error:
        raise _remap(error) from error


def _check_slug_free(slug: str) -> None:
    if slug in reserved_slugs():
        raise DomainError(
            "SLUG_RESERVED",
            f"Alamat '{slug}' dipakai sistem atau modul. Pilih alamat lain.",
            fields={"slug": "Alamat ini dipakai sistem atau modul."},
        )
    if ContentPage.objects.filter(slug=slug).exists():
        raise DomainError(
            "SLUG_TAKEN",
            "Alamat halaman sudah dipakai. Pilih alamat lain.",
            fields={"slug": "Alamat sudah dipakai."},
        )


@transaction.atomic
def create_page(data: dict[str, Any]) -> ContentPage:
    _check_slug_free(data["slug"])
    page = ContentPage.objects.create(
        slug=data["slug"],
        title=data["title"].strip(),
        blocks=block_service.validate_blocks(data.get("blocks", [])),
        is_published=data.get("is_published", True),
    )
    _apply_roles(page, data.get("roles", []))
    _sync_menu(page, data)
    return page


@transaction.atomic
def update_page(page: ContentPage, data: dict[str, Any]) -> ContentPage:
    for attr in ("title", "is_published"):
        if attr in data:
            setattr(page, attr, data[attr].strip() if attr == "title" else data[attr])
    if "blocks" in data:
        page.blocks = block_service.validate_blocks(data["blocks"])
    page.save()
    if "roles" in data:
        _apply_roles(page, data["roles"])
    _sync_menu(page, data)
    if "is_published" in data:
        for item in _menu_items(page):
            item.is_active = page.is_published
            item.save(update_fields=["is_active"])
    return page


@transaction.atomic
def delete_page(page: ContentPage) -> None:
    for item in _menu_items(page):
        menu_service.delete_item(item)
    permission = page.permission
    page.delete()
    access.delete_access_permission(permission, PERM_PREFIX)


def page_out(page: ContentPage, mapping: dict[int, list[dict[str, str]]]) -> dict[str, Any]:
    items = _menu_items(page)
    return {
        "id": page.pk,
        "slug": page.slug,
        "path": page_path(page.slug),
        "title": page.title,
        "blocks": page.blocks,
        "is_published": page.is_published,
        "roles": [r["code"] for r in mapping.get(page.permission_id or 0, [])],
        "audience": access.audience(page.permission_id, mapping),
        "menu": {"enabled": True, "id": items[0].pk, "title": items[0].title, "parent": items[0].parent_id}
        if items
        else {"enabled": False, "id": None, "title": page.title[:40], "parent": None},
        "updated_at": page.updated_at.isoformat(),
    }


def access_map() -> list[dict[str, Any]]:
    """Every page the portal can open, who may open it, and which menu items lead there."""
    manifests = load_manifests()
    perm_ids = dict(Permission.objects.values_list("code", "id"))
    pages = list(ContentPage.objects.select_related("permission"))
    items = list(MenuItem.objects.filter(is_orphan=False).exclude(to=""))
    mapping = access.roles_by_permission(
        [perm_ids.get(p.perm) for m in manifests.values() for p in m.menu if p.perm]
        + [p.permission_id for p in pages]
    )
    menus: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        menus.setdefault(item.to, []).append({"title": item.title, "is_active": item.is_active})
    module_state = {code: m.is_active for code, m in _module_states().items()}

    rows: dict[str, dict[str, Any]] = {}
    for manifest in manifests.values():
        kind = "bawaan" if manifest.code == "core" else "modul"
        for entry in manifest.menu:
            who = access.audience(perm_ids.get(entry.perm or ""), mapping)
            rows[entry.to] = _row(
                entry.to, entry.title, kind, manifest.code, entry.perm, who, menus, module_state
            )
        for extra in manifest.pages:
            who = access.audience(None, mapping)
            rows.setdefault(
                extra.path,
                _row(extra.path, extra.title, "bawaan", manifest.code, None, who, menus, module_state),
            )
    for page in pages:
        path = page_path(page.slug)
        code = page.permission.code if page.permission else None
        who = access.audience(page.permission_id, mapping)
        rows[path] = _row(path, page.title, "halaman", "core", code, who, menus, module_state)
        rows[path].update({"page_id": page.pk, "is_published": page.is_published})
    return sorted(rows.values(), key=lambda r: (r["kind"] != "halaman", r["path"]))


def _module_states() -> dict[str, Any]:
    from core.models import ModuleState

    return {m.code: m for m in ModuleState.objects.all()}


def _row(
    path: str, title: str, kind: str, module: str, perm: str | None, audience: dict[str, Any],
    menus: dict[str, list[dict[str, Any]]], module_state: dict[str, bool],
) -> dict[str, Any]:  # fmt: skip
    return {
        "path": path,
        "title": title,
        "kind": kind,
        "module": module,
        "module_active": module_state.get(module, True),
        "permission": perm,
        "audience": audience,
        "menus": menus.get(path, []),
        "page_id": None,
        "is_published": True,
    }
