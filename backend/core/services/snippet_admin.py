"""Create, list, delete (soft) and restore snippets from the admin panel.

The files in `frontend/src/snippets/` (and `backend/snippets/`) stay the source of truth. Creating from the
web writes a *scaffold from a fixed template*: values typed in the form are JSON-escaped data, never code.
Writing the real logic stays a developer's job (IDE + Git). Deleting never removes anything: the files are
renamed `<name>_deleted[.tsx|.py]` and the row is marked inactive, so it can be restored.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from django.db import transaction
from django.utils import timezone

from core import snippets
from core.api import DomainError
from core.models import ContentPage, SnippetRecord

PARAM_TYPES = ("text", "number", "boolean", "select")
PARAM_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,29}$")
LABEL_RE = re.compile(r"""label:\s*(?P<q>["'])(?P<v>.*?)(?P=q)""")


def _relative(name: str) -> str:
    return "/".join(name.split("."))


def _tsx(name: str, deleted: str = "") -> Path:
    return snippets.frontend_dir() / f"{_relative(name)}{deleted}.tsx"


def _py(name: str, deleted: str = "") -> Path:
    return snippets.backend_dir() / f"{_relative(name)}{deleted}.py"


def _deleted_suffix(path_for: Any, name: str) -> str:
    """'_deleted', or '_deleted_2'… when an older deleted copy already exists."""
    suffix, n = "_deleted", 1
    while path_for(name, suffix).exists():
        n += 1
        suffix = f"_deleted_{n}"
    return suffix


# ---- templates (fixed code; form values go in as JSON data only) --------------------------------


def _ts(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def render_tsx(name: str, label: str, hint: str, params: list[dict[str, Any]], has_data: bool) -> str:
    items = []
    for p in params:
        parts = [f"name: {_ts(p['name'])}", f"label: {_ts(p['label'])}", f"type: {_ts(p['type'])}"]
        if p["type"] == "select":
            parts.append(f"options: {_ts(p.get('options', []))}")
        if p.get("default") not in (None, ""):
            parts.append(f"default: {_ts(p['default'])}")
        items.append("    { " + ", ".join(parts) + " },")
    params_block = "\n".join(items) if items else "    // Belum ada isian. Tambahkan di sini bila perlu."
    data_line = (
        '      {data !== undefined && <pre className="mt-2 overflow-x-auto text-[13px] text-slate-700">{JSON.stringify(data, null, 2)}</pre>}\n'
        if has_data
        else ""
    )
    return f"""import {{ Card }} from "@/components/ui/Card";
import type {{ SnippetMeta, SnippetProps }} from "@/snippets/types";

// Dibuat dari panel admin (Snippet > Snippet baru). File ini milik developer: edit di IDE, commit ke Git.
// Dipakai di halaman dengan:  [snippet:{name}]

export const meta: SnippetMeta = {{
  label: {_ts(label)},
  hint: {_ts(hint)},
  hasData: {"true" if has_data else "false"},
  params: [
{params_block}
  ],
}};

// TODO: ganti isi komponen ini dengan tampilan yang Anda mau.
export default function Snippet({{ params, data }}: SnippetProps) {{
  return (
    <Card className="p-5">
      <p className="text-[17px] font-semibold text-navy-900">{{meta.label}}</p>
      <pre className="mt-2 overflow-x-auto text-[13px] text-slate-700">{{JSON.stringify(params, null, 2)}}</pre>
{data_line}    </Card>
  );
}}
"""


def render_py(name: str) -> str:
    rel = _relative(name)
    return f'''"""Sisi server snippet `{name}` (React: frontend/src/snippets/{rel}.tsx).

Dibuat dari panel admin. File ini milik developer: edit di IDE, commit ke Git.
"""

from typing import Any

from core.models import User

PERMISSION = None  # kode izin yang dibutuhkan untuk membaca data ini; None = semua yang sudah login


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    """`params` berasal dari admin/halaman: anggap TIDAK tepercaya, validasi. ORM saja (tanpa SQL mentah)."""
    return {{"pesan": "Ganti dengan data Anda"}}
'''


# ---- validation ------------------------------------------------------------------------------------


def _clean_params(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(raw) > 10:
        raise DomainError(
            "INVALID_SNIPPET", "Maksimal 10 isian per snippet.", fields={"params": "Maksimal 10 isian."}
        )
    seen: set[str] = set()
    out = []
    for p in raw:
        name = str(p.get("name", ""))
        if not PARAM_NAME_RE.match(name) or name in seen:
            raise DomainError(
                "INVALID_SNIPPET",
                f"Nama isian '{name}' tidak valid atau kembar (huruf kecil/angka/garis bawah, diawali huruf).",
                fields={"params": "Nama isian tidak valid atau kembar."},
            )
        seen.add(name)
        kind = p.get("type", "text")
        if kind not in PARAM_TYPES:
            raise DomainError(
                "INVALID_SNIPPET",
                f"Jenis isian '{kind}' tidak dikenal.",
                fields={"params": "Jenis isian tidak dikenal."},
            )
        options = [str(o)[:60] for o in p.get("options", []) if str(o).strip()][:30]
        if kind == "select" and not options:
            raise DomainError(
                "INVALID_SNIPPET",
                f"Isian '{name}' bertipe pilihan, isi minimal satu opsi.",
                fields={"params": "Isian pilihan butuh opsi."},
            )
        default = p.get("default")
        out.append(
            {
                "name": name,
                "label": str(p.get("label") or name)[:60],
                "type": kind,
                "options": options,
                "default": None if default in (None, "") else str(default)[:120],
            }
        )
    return out


def _check_new_name(name: str) -> None:
    if (
        not snippets.NAME_RE.match(name)
        or snippets.DELETED_RE.search(name.split(".")[-1])
        or any(part.startswith("_") for part in name.split("."))
    ):
        raise DomainError(
            "INVALID_SNIPPET",
            "Nama snippet: huruf kecil/angka/garis bawah, folder dipisah titik (contoh: pages.data_ijazah). Tidak boleh diawali atau diakhiri `_deleted`.",
            fields={"name": "Nama tidak valid."},
        )
    if SnippetRecord.objects.filter(name=name, is_active=True).exists() or _tsx(name).exists():
        raise DomainError(
            "SNIPPET_EXISTS",
            f"Snippet '{name}' sudah ada. Pilih nama lain.",
            fields={"name": "Nama sudah dipakai."},
        )
    gone = SnippetRecord.objects.filter(name=name, is_active=False).first()
    if gone:
        raise DomainError(
            "SNIPPET_DELETED",
            f"Snippet '{name}' pernah dihapus. Pulihkan dari daftar, atau pilih nama lain.",
            fields={"name": "Nama ini ada di snippet yang dihapus; pulihkan atau pakai nama lain."},
        )


# ---- operations ---------------------------------------------------------------------------------


def _need_dirs() -> None:
    if not snippets.frontend_dir().parent.is_dir():
        raise DomainError(
            "NO_SOURCE",
            "Folder kode frontend tidak ditemukan di server ini. Buat snippet di mesin pengembang lalu commit ke Git.",
            status=409,
        )


def create_snippet(data: dict[str, Any]) -> SnippetRecord:
    name = str(data["name"]).strip()
    _check_new_name(name)
    _need_dirs()
    params = _clean_params(data.get("params", []))
    label, hint, has_data = data["label"].strip(), data.get("hint", "").strip(), bool(data.get("has_data"))

    created: list[Path] = []
    try:
        for path, text in (
            (_tsx(name), render_tsx(name, label, hint, params, has_data)),
            *(((_py(name), render_py(name)),) if has_data else ()),
        ):
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x", encoding="utf-8") as handle:  # "x": never overwrite an existing file
                handle.write(text)
            created.append(path)
        with transaction.atomic():
            record, _ = SnippetRecord.objects.update_or_create(
                name=name,
                defaults={
                    "label": label,
                    "hint": hint,
                    "params": params,
                    "has_data": has_data,
                    "created_from_web": True,
                    "is_active": True,
                    "deleted_at": None,
                },
            )
    except FileExistsError as exc:
        raise DomainError(
            "SNIPPET_EXISTS",
            f"File snippet '{name}' sudah ada. Pilih nama lain.",
            fields={"name": "File sudah ada."},
        ) from exc
    except OSError as exc:
        for path in created:
            path.unlink(missing_ok=True)
        raise DomainError(
            "CANNOT_WRITE",
            "Server tidak dapat menulis file snippet (izin folder). Buat lewat terminal: manage.py startsnippet.",
            status=500,
        ) from exc
    except Exception:
        for path in created:
            path.unlink(missing_ok=True)
        raise
    return record


def delete_snippet(record: SnippetRecord) -> SnippetRecord:
    """Soft delete: mark inactive and rename the files to *_deleted. Nothing is removed."""
    if not record.is_active:
        raise DomainError("ALREADY_DELETED", "Snippet ini sudah dihapus.", status=409)
    for path_for, ext in ((_tsx, ".tsx"), (_py, ".py")):
        path = path_for(record.name)
        if path.exists():
            suffix = _deleted_suffix(path_for, record.name)
            path.rename(path.with_name(f"{path.stem}{suffix}{ext}"))
    record.is_active = False
    record.deleted_at = timezone.now()
    record.save(update_fields=["is_active", "deleted_at"])
    return record


def _latest_deleted(path_for: Any, name: str) -> Path | None:
    candidates = [path_for(name, "_deleted")] + [path_for(name, f"_deleted_{n}") for n in range(2, 50)]
    existing = [c for c in candidates if c.exists()]
    return existing[-1] if existing else None


def restore_snippet(record: SnippetRecord) -> SnippetRecord:
    if record.is_active:
        raise DomainError("NOT_DELETED", "Snippet ini tidak dalam keadaan dihapus.", status=409)
    if _tsx(record.name).exists() or _py(record.name).exists():
        raise DomainError(
            "SNIPPET_EXISTS",
            "Sudah ada file baru dengan nama yang sama. Ganti nama file itu dulu.",
            status=409,
        )
    tsx = _latest_deleted(_tsx, record.name)
    if tsx is None:
        raise DomainError(
            "FILE_MISSING", "File snippet yang dihapus tidak ditemukan. Pulihkan dari Git.", status=409
        )
    tsx.rename(_tsx(record.name))
    py = _latest_deleted(_py, record.name)
    if py is not None:
        py.rename(_py(record.name))
    record.is_active = True
    record.deleted_at = None
    record.save(update_fields=["is_active", "deleted_at"])
    return record


# ---- listing (files are the truth; rows are synced from them) ----------------------------------------


def _usage(name: str) -> int:
    needle_a, needle_b = f"[snippet:{name}", f"[{name}]"
    count = 0
    for blocks in ContentPage.objects.values_list("blocks", flat=True):
        for block in blocks or []:
            if block.get("type") == "snippet" and block.get("name") == name:
                count += 1
            elif block.get("type") == "text" and (
                needle_a in block.get("text", "") or needle_b in block.get("text", "")
            ):
                count += 1
    return count


def _label_from_file(name: str) -> str:
    try:
        match = LABEL_RE.search(_tsx(name).read_text(encoding="utf-8"))
    except OSError:
        match = None
    return match.group("v")[:80] if match else name


def sync_with_files() -> None:
    """Make sure every snippet file has a row; flag rows whose files vanished."""
    present = snippets.known_snippets()
    if present is None:
        return
    for name in present:
        record, created = SnippetRecord.objects.get_or_create(
            name=name, defaults={"label": _label_from_file(name), "has_data": _py(name).exists()}
        )
        if not created and not record.is_active:
            record.is_active, record.deleted_at = True, None
            record.save(update_fields=["is_active", "deleted_at"])
    SnippetRecord.objects.filter(is_active=True).exclude(name__in=present).update(
        is_active=False, deleted_at=timezone.now()
    )


def snippet_out(record: SnippetRecord) -> dict[str, Any]:
    rel = _relative(record.name)
    return {
        "id": record.pk,
        "name": record.name,
        "label": record.label,
        "hint": record.hint,
        "is_active": record.is_active,
        "created_from_web": record.created_from_web,
        "has_data": record.has_data or _py(record.name).exists(),
        "file": f"frontend/src/snippets/{rel}.tsx",
        "python_file": f"backend/snippets/{rel}.py",
        "file_exists": _tsx(record.name).exists(),
        "used_in": _usage(record.name),
        "shortcode": f"[snippet:{record.name}]",
        "deleted_at": record.deleted_at.isoformat() if record.deleted_at else None,
    }
