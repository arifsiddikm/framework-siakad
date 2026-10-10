"""Module on/off switch (MOD-02)."""

from __future__ import annotations

from core.api import DomainError
from core.models import ModuleState


def set_module_active(module: ModuleState, active: bool) -> ModuleState:
    if module.is_core and not active:
        raise DomainError("CORE_MODULE", "Modul inti tidak dapat dinonaktifkan.", status=409)
    if module.is_orphan and active:
        raise DomainError(
            "MODULE_ORPHAN",
            "Foldernya sudah tidak ada di kode. Pulihkan folder modul lalu jalankan migrate.",
            status=409,
        )
    states = {m.code: m for m in ModuleState.objects.all()}
    if active:
        off = [d for d in module.depends_on if d in states and not states[d].is_active]
        if off:
            raise DomainError(
                "DEPENDENCY_INACTIVE",
                f"Aktifkan dulu modul yang dibutuhkan: {', '.join(states[d].name for d in off)}.",
                status=409,
            )
    else:
        users = [m for m in states.values() if m.is_active and module.code in m.depends_on]
        if users:
            raise DomainError(
                "DEPENDED_ON",
                f"Modul ini dibutuhkan oleh {', '.join(m.name for m in users)}. Nonaktifkan modul itu dulu.",
                status=409,
            )
    module.is_active = active
    module.save(update_fields=["is_active", "updated_at"])
    return module
