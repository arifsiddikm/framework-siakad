"""Sync manifests into the database (MOD-01, MENU-03).

Rules: permissions and modules are upserted; the admin's `is_active` on a module is kept.
Manifest menu items are upserted by `key`; the admin's title, order and visibility are never
overwritten. Items that vanished from manifests are marked orphan, never deleted.
"""

from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify

from core.models import MenuItem, ModuleState, Permission
from core.registry import CORE_CODE, Manifest, MenuDef, load_manifests

STEP = 10


def _next_order(parent_id: int | None) -> int:
    last = (
        MenuItem.objects.filter(parent_id=parent_id)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return STEP if last is None else last + STEP


def _sync_module(manifest: Manifest) -> ModuleState:
    state, created = ModuleState.objects.get_or_create(
        code=manifest.code,
        defaults={
            "name": manifest.name,
            "icon": manifest.icon,
            "description": manifest.description,
            "depends_on": list(manifest.depends_on),
            "is_core": manifest.code == CORE_CODE,
        },
    )
    if not created:
        state.name = manifest.name
        state.icon = manifest.icon
        state.description = manifest.description
        state.depends_on = list(manifest.depends_on)
        state.is_orphan = False
        state.save()
    return state


def _sync_group(entry: MenuDef) -> MenuItem:
    key = f"group:{slugify(entry.group or '')}"
    group = MenuItem.objects.filter(key=key).first()
    if group is None:
        return MenuItem.objects.create(
            key=key,
            title=entry.group or "",
            icon=entry.group_icon or "folder",
            order=entry.group_order if entry.group_order is not None else _next_order(None),
            is_system=True,
        )
    if group.is_orphan:
        group.is_orphan = False
        group.save(update_fields=["is_orphan"])
    return group


def _sync_menu_entry(manifest: Manifest, entry: MenuDef) -> str:
    key = f"{manifest.code}:{slugify(entry.title)}"
    parent = _sync_group(entry) if entry.group else None
    parent_id = parent.pk if parent else None
    permission = Permission.objects.get(code=entry.perm) if entry.perm else None
    manifest_owned = {
        "hint": entry.hint,
        "icon": entry.icon,
        "to": entry.to,
        "parent": parent,
        "module_id": manifest.code,
        "permission": permission,
        "is_system": True,
        "is_orphan": False,
    }
    item = MenuItem.objects.filter(key=key).first()
    if item is None:
        order = entry.order if entry.order is not None else _next_order(parent_id)
        MenuItem.objects.create(key=key, title=entry.title, order=order, **manifest_owned)
    else:
        for attr, value in manifest_owned.items():
            setattr(item, attr, value)
        item.save()
    return key


@transaction.atomic
def sync_registry() -> None:
    manifests = load_manifests()
    for manifest in manifests.values():
        _sync_module(manifest)
    ModuleState.objects.exclude(code__in=manifests).update(is_orphan=True)

    for manifest in manifests.values():
        for perm in manifest.permissions:
            Permission.objects.update_or_create(
                code=perm.code, defaults={"name": perm.name, "module_id": manifest.code}
            )

    seen_keys: set[str] = set()
    for manifest in manifests.values():
        for entry in manifest.menu:
            seen_keys.add(_sync_menu_entry(manifest, entry))
            if entry.group:
                seen_keys.add(f"group:{slugify(entry.group)}")
    MenuItem.objects.filter(is_system=True, key__isnull=False).exclude(key__in=seen_keys).update(
        is_orphan=True
    )
