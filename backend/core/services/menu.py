"""Menu administration (MENU-02, MENU-04, MENU-05).

Items from manifests are `is_system`: the admin may only rename, reorder or hide them.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from core.api import DomainError
from core.icons import ICON_NAMES
from core.models import MenuItem, ModuleState, Permission
from core.registry import TITLE_MAX, registered_pages
from core.selectors import content_page_paths
from core.services import access

HINT_MAX = 120
STEP = 10
SYSTEM_EDITABLE = {"title", "is_active", "order"}
PERM_PREFIX = "core.menu_item."


def _invalid(field: str, message: str) -> DomainError:
    return DomainError("MENU_INVALID", message, fields={field: message})


def is_valid_target(to: str) -> bool:
    """A registered portal page, an admin-written page, or an https address."""
    if to in registered_pages() or to in content_page_paths():
        return True
    parsed = urlparse(to)
    return parsed.scheme == "https" and bool(parsed.netloc) and " " not in to and len(to) <= 300


def _check_target(to: str) -> None:
    if not to:
        return
    if to in registered_pages() or to in content_page_paths():
        return
    parsed = urlparse(to)
    if parsed.scheme == "https" and parsed.netloc and " " not in to and len(to) <= 300:
        return
    raise _invalid(
        "to",
        "Tujuan harus salah satu halaman terdaftar atau alamat https (contoh: https://contoh.ac.id).",
    )


def _check_title(title: str, parent_id: int | None, exclude_id: int | None) -> str:
    title = title.strip()
    if not title:
        raise _invalid("title", "Judul wajib diisi.")
    if len(title) > TITLE_MAX:
        raise _invalid("title", f"Judul maksimal {TITLE_MAX} karakter (sekarang {len(title)}).")
    clash = MenuItem.objects.filter(parent_id=parent_id, title__iexact=title).exclude(pk=exclude_id)  # type: ignore[misc]
    if clash.exists():
        raise _invalid("title", "Sudah ada item dengan judul itu di induk yang sama. Pakai judul lain.")
    return title


def _check_parent(parent_id: int | None, item: MenuItem | None, has_target: bool) -> MenuItem | None:
    if parent_id is None:
        return None
    if item is not None and parent_id == item.pk:
        raise _invalid("parent", "Item tidak boleh menjadi induk bagi dirinya sendiri.")
    parent = MenuItem.objects.filter(pk=parent_id).first()
    if parent is None:
        raise _invalid("parent", "Induk tidak ditemukan. Muat ulang daftar menu.")
    if parent.parent_id is not None or parent.to:
        raise _invalid("parent", "Induk harus berupa grup tingkat atas. Kedalaman menu maksimal 2 tingkat.")
    if item is not None and item.pk and item.children.exists():
        raise _invalid("parent", "Grup yang memiliki sub-menu tidak dapat dipindahkan ke dalam grup lain.")
    return parent


def _resolve_refs(data: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if "module" in data:
        code = data["module"] or None
        if code is not None and not ModuleState.objects.filter(code=code).exists():
            raise _invalid("module", "Modul tidak ditemukan. Pilih dari daftar modul.")
        out["module_id"] = code
    if "permission" in data:
        code = data["permission"] or None
        perm = None
        if code is not None:
            perm = Permission.objects.filter(code=code).first()
            if perm is None:
                raise _invalid("permission", "Izin tidak ditemukan. Pilih dari daftar izin.")
        out["permission"] = perm
    return out


def _check_icon(icon: str) -> None:
    if icon and icon not in ICON_NAMES:
        raise _invalid("icon", "Ikon tidak tersedia. Pilih dari daftar ikon.")


def _last_order(parent_id: int | None) -> int:
    last = (
        MenuItem.objects.filter(parent_id=parent_id)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return STEP if last is None else last + STEP


def _apply_roles(item: MenuItem, roles: list[str]) -> None:
    """Restrict a custom item to roles (empty = any signed-in user) via an auto-created permission."""
    old = item.permission
    if roles:
        permission = access.ensure_access_permission(
            f"{PERM_PREFIX}{item.pk}.view", f"Lihat menu: {item.title}"
        )
        access.set_permission_roles(permission, roles)
        item.permission = permission
    else:
        item.permission = None
    item.save(update_fields=["permission"])
    if old is not None and old != item.permission:
        access.delete_access_permission(old, PERM_PREFIX)


def create_item(data: dict[str, Any]) -> MenuItem:
    to = str(data.get("to", "")).strip()
    hint = str(data.get("hint", "")).strip()
    icon = str(data.get("icon", "")).strip()
    parent_id = data.get("parent")
    _check_target(to)
    _check_icon(icon)
    if len(hint) > HINT_MAX:
        raise _invalid("hint", f"Keterangan maksimal {HINT_MAX} karakter.")
    parent = _check_parent(parent_id, None, bool(to))
    title = _check_title(str(data.get("title", "")), parent_id, None)
    refs = _resolve_refs(data)
    item = MenuItem.objects.create(
        title=title,
        hint=hint,
        icon=icon,
        to=to,
        parent=parent,
        order=_last_order(parent_id),
        is_active=bool(data.get("is_active", True)),
        is_system=False,
        **refs,
    )
    if "roles" in data:
        _apply_roles(item, data["roles"])
    return item


def update_item(item: MenuItem, data: dict[str, Any]) -> MenuItem:
    if item.is_system:
        current = {
            "hint": item.hint, "icon": item.icon, "to": item.to, "parent": item.parent_id,
            "module": item.module_id, "permission": item.permission.code if item.permission else None,
        }  # fmt: skip
        changed = [
            key for key, value in data.items()
            if key not in SYSTEM_EDITABLE and (value or None) != (current.get(key) or None)
        ]  # fmt: skip
        if changed:
            raise DomainError(
                "SYSTEM_ITEM_LOCKED",
                "Item inti hanya dapat diubah judul dan urutannya, atau disembunyikan.",
                status=409,
                fields={key: "Tidak dapat diubah pada item inti." for key in changed},
            )

    parent_id = data.get("parent", item.parent_id) if not item.is_system else item.parent_id
    to = str(data["to"]).strip() if "to" in data and not item.is_system else item.to
    if "to" in data and not item.is_system:
        _check_target(to)
        if to and item.children.exists():
            raise _invalid("to", "Grup yang memiliki sub-menu tidak boleh punya tujuan. Kosongkan tujuan.")
    if not item.is_system:
        item.parent = _check_parent(parent_id, item, bool(to))
        item.to = to
        if "hint" in data:
            hint = str(data["hint"]).strip()
            if len(hint) > HINT_MAX:
                raise _invalid("hint", f"Keterangan maksimal {HINT_MAX} karakter.")
            item.hint = hint
        if "icon" in data:
            _check_icon(str(data["icon"]))
            item.icon = str(data["icon"])
        for attr, value in _resolve_refs(data).items():
            setattr(item, attr, value)
    if "roles" in data and not item.is_system:
        _apply_roles(item, data["roles"])
    if "title" in data or (not item.is_system and "parent" in data):
        item.title = _check_title(str(data.get("title", item.title)), item.parent_id, item.pk)
    if "is_active" in data:
        item.is_active = bool(data["is_active"])
    if "order" in data:
        item.order = int(data["order"])
    item.save()
    return item


def delete_item(item: MenuItem) -> None:
    if item.is_system:
        raise DomainError(
            "SYSTEM_ITEM_PROTECTED",
            "Item inti tidak dapat dihapus. Sembunyikan saja bila tidak ingin ditampilkan.",
            status=409,
        )
    if item.children.filter(is_system=True).exists():
        raise DomainError(
            "GROUP_HAS_SYSTEM_ITEMS",
            "Grup ini berisi item inti sehingga tidak dapat dihapus. Sembunyikan saja.",
            status=409,
        )
    permission = item.permission
    item.delete()
    access.delete_access_permission(permission, PERM_PREFIX)


def move_item(item: MenuItem, direction: str) -> None:
    """Swap with the neighbour above/below (same parent) and renumber siblings 10, 20, 30…"""
    siblings = list(MenuItem.objects.filter(parent_id=item.parent_id).order_by("order", "id"))
    index = next(i for i, s in enumerate(siblings) if s.pk == item.pk)
    target = index - 1 if direction == "up" else index + 1
    if 0 <= target < len(siblings):
        siblings[index], siblings[target] = siblings[target], siblings[index]
    for position, sibling in enumerate(siblings, start=1):
        if sibling.order != position * STEP:
            sibling.order = position * STEP
            sibling.save(update_fields=["order"])
