"""Page builder blocks: strict validation on save, data resolution on view.

A page is an ordered list of blocks (`{"id", "type", ...}`). Every block type has a fixed set of
keys; anything else is rejected. Data blocks (table, stats, chart) store only a *configuration*;
the numbers are computed on the server when somebody views the page, under that viewer's permissions.
"""

from __future__ import annotations

import re
from typing import Any

from rest_framework.exceptions import PermissionDenied

from core import snippets
from core.api import DomainError
from core.models import User
from core.selectors import has_permission
from core.services import datasets
from core.services import menu as menu_service

MAX_BLOCKS = 60
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
TONES = ("info", "success", "warn", "error")
FORMATS = ("angka", "rupiah", "persen")
DATA_TYPES = ("data_table", "stats", "chart")


def _fail(index: int, message: str, field: str = "blocks") -> DomainError:
    return DomainError(
        "BLOCK_INVALID", f"Blok {index + 1}: {message}", fields={field: f"Blok {index + 1}: {message}"}
    )


TYPE_LABELS = {
    "text": "Teks",
    "image": "Gambar",
    "callout": "Info penting",
    "table": "Tabel manual",
    "accordion": "Tanya-jawab",
    "links": "Tombol tautan",
    "data_table": "Tabel data",
    "stats": "Kartu statistik",
    "chart": "Grafik batang",
    "snippet": "Snippet",
}
KEY_LABELS = {
    "text": "isi",
    "url": "alamat",
    "title": "judul",
    "label": "teks tombol",
    "alt": "teks pengganti",
    "caption": "keterangan",
}


def _text(index: int, block: dict[str, Any], key: str, maximum: int, *, required: bool = False) -> str:
    name = KEY_LABELS.get(key, key)
    value = block.get(key, "")
    if not isinstance(value, str):
        raise _fail(index, f"{name} harus berupa teks.")
    value = value.strip()
    if required and not value:
        raise _fail(index, f"{name} wajib diisi.")
    if len(value) > maximum:
        raise _fail(index, f"{name} maksimal {maximum} karakter.")
    return value


def _only(index: int, block: dict[str, Any], allowed: set[str]) -> None:
    extra = sorted(set(block) - allowed - {"id", "type"})
    if extra:
        raise _fail(index, f"kolom tidak dikenal: {', '.join(extra)}.")


def _url(index: int, value: str, *, allow_internal: bool) -> str:
    if value.startswith("https://") and " " not in value and len(value) <= 500:
        return value
    if allow_internal and menu_service.is_valid_target(value):
        return value
    raise _fail(index, f"alamat '{value}' harus https:// atau halaman portal yang terdaftar.")


def _filters(index: int, block: dict[str, Any], dataset: datasets.Dataset, raw: Any) -> list[dict[str, Any]]:
    if raw in (None, ""):
        return []
    if not isinstance(raw, list) or len(raw) > 6:
        raise _fail(index, "filter maksimal 6 aturan.")
    out = []
    for item in raw:
        if not isinstance(item, dict) or set(item) - {"field", "op", "value"}:
            raise _fail(index, "format filter tidak valid.")
        field, op, value = item.get("field"), item.get("op"), item.get("value", "")
        if not isinstance(field, str) or op not in datasets.OPS or not isinstance(value, str | int | float):
            raise _fail(index, "filter harus berisi kolom, operator, dan nilai.")
        out.append({"field": field, "op": op, "value": str(value)})
    try:
        datasets._check_filters(dataset, out)
    except DomainError as error:
        raise _fail(index, error.message) from error
    return out


def _dataset(index: int, code: Any) -> datasets.Dataset:
    if not isinstance(code, str) or not code:
        raise _fail(index, "pilih sumber data.")
    try:
        return datasets.get_dataset(code)
    except DomainError as error:
        raise _fail(index, error.message) from error


def _field_name(index: int, dataset: datasets.Dataset, name: Any, label: str) -> str:
    if not isinstance(name, str) or not any(f.name == name for f in dataset.fields):
        raise _fail(index, f"{label} tidak ada di sumber data {dataset.label}.")
    return name


def _validate_one(index: int, block: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(block, dict):
        raise _fail(index, "format blok tidak valid.")
    kind = block.get("type")
    out: dict[str, Any] = {"id": block.get("id"), "type": kind}
    if not isinstance(out["id"], str) or not ID_RE.match(out["id"]):
        raise _fail(index, "id blok tidak valid.")

    if kind == "text":
        _only(index, block, {"text"})
        out["text"] = _text(index, block, "text", 20000)
    elif kind == "image":
        _only(index, block, {"url", "alt", "caption"})
        out["url"] = _url(index, _text(index, block, "url", 500, required=True), allow_internal=False)
        out["alt"] = _text(index, block, "alt", 120)
        out["caption"] = _text(index, block, "caption", 200)
    elif kind == "callout":
        _only(index, block, {"tone", "text"})
        if block.get("tone") not in TONES:
            raise _fail(index, f"warna harus salah satu dari {', '.join(TONES)}.")
        out["tone"] = block["tone"]
        out["text"] = _text(index, block, "text", 1000, required=True)
    elif kind == "table":
        _only(index, block, {"title", "columns", "rows"})
        out["title"] = _text(index, block, "title", 100)
        columns, rows = block.get("columns"), block.get("rows", [])
        if (
            not isinstance(columns, list)
            or not 1 <= len(columns) <= 12
            or not all(isinstance(c, str) and c.strip() for c in columns)
        ):
            raise _fail(index, "tabel butuh 1–12 kolom dengan judul.")
        if not isinstance(rows, list) or len(rows) > 200:
            raise _fail(index, "tabel maksimal 200 baris.")
        out["columns"] = [c.strip()[:60] for c in columns]
        out["rows"] = []
        for row in rows:
            if not isinstance(row, list) or not all(isinstance(c, str | int | float) for c in row):
                raise _fail(index, "isi baris tabel harus berupa teks.")
            cells = [str(c)[:300] for c in row][: len(columns)]
            out["rows"].append(cells + [""] * (len(columns) - len(cells)))
    elif kind == "accordion":
        _only(index, block, {"title", "items"})
        out["title"] = _text(index, block, "title", 100)
        items = block.get("items", [])
        if not isinstance(items, list) or not 1 <= len(items) <= 30:
            raise _fail(index, "daftar tanya-jawab butuh 1–30 butir.")
        out["items"] = []
        for item in items:
            if not isinstance(item, dict) or set(item) - {"title", "text"}:
                raise _fail(index, "format butir tidak valid.")
            out["items"].append(
                {
                    "title": _text(index, item, "title", 120, required=True),
                    "text": _text(index, item, "text", 5000),
                }
            )
    elif kind == "links":
        _only(index, block, {"title", "items"})
        out["title"] = _text(index, block, "title", 100)
        items = block.get("items", [])
        if not isinstance(items, list) or not 1 <= len(items) <= 12:
            raise _fail(index, "tombol tautan butuh 1–12 butir.")
        out["items"] = []
        for item in items:
            if not isinstance(item, dict) or set(item) - {"label", "url"}:
                raise _fail(index, "format tautan tidak valid.")
            label = _text(index, item, "label", 60, required=True)
            out["items"].append(
                {
                    "label": label,
                    "url": _url(index, _text(index, item, "url", 500, required=True), allow_internal=True),
                }
            )
    elif kind == "data_table":
        _only(index, block, {"title", "dataset", "columns", "sort", "direction", "limit", "filters"})
        dataset = _dataset(index, block.get("dataset"))
        out["title"] = _text(index, block, "title", 100)
        out["dataset"] = dataset.code
        columns = block.get("columns")
        if not isinstance(columns, list) or not 1 <= len(columns) <= 12:
            raise _fail(index, "pilih 1–12 kolom yang ditampilkan.")
        out["columns"] = [_field_name(index, dataset, c, f"kolom '{c}'") for c in columns]
        sort = block.get("sort") or ""
        out["sort"] = _field_name(index, dataset, sort, "kolom urutan") if sort else ""
        out["direction"] = "desc" if block.get("direction") == "desc" else "asc"
        limit = block.get("limit", 20)
        if not isinstance(limit, int) or not 1 <= limit <= datasets.MAX_ROWS:
            raise _fail(index, f"jumlah baris 1–{datasets.MAX_ROWS}.")
        out["limit"] = limit
        out["filters"] = _filters(index, block, dataset, block.get("filters"))
    elif kind == "stats":
        _only(index, block, {"title", "items"})
        out["title"] = _text(index, block, "title", 100)
        items = block.get("items", [])
        if not isinstance(items, list) or not 1 <= len(items) <= 6:
            raise _fail(index, "kartu statistik butuh 1–6 butir.")
        out["items"] = []
        for item in items:
            if not isinstance(item, dict) or set(item) - {
                "label",
                "dataset",
                "aggregate",
                "field",
                "format",
                "filters",
            }:
                raise _fail(index, "format kartu statistik tidak valid.")
            dataset = _dataset(index, item.get("dataset"))
            aggregate = item.get("aggregate", "count")
            if aggregate not in datasets.AGGREGATES:
                raise _fail(index, "perhitungan tidak dikenal.")
            field = item.get("field") or ""
            if aggregate != "count":
                _field_name(index, dataset, field, "kolom hitung")
                kind_of = dataset.field(field).type
                if kind_of != "number" and not (aggregate in ("min", "max") and kind_of == "date"):
                    raise _fail(index, f"{aggregate} butuh kolom angka (atau tanggal untuk min/maks).")
            fmt = item.get("format", "angka")
            if fmt not in FORMATS:
                raise _fail(index, "format angka tidak dikenal.")
            out["items"].append(
                {
                    "label": _text(index, item, "label", 60, required=True),
                    "dataset": dataset.code,
                    "aggregate": aggregate,
                    "field": field if aggregate != "count" else "",
                    "format": fmt,
                    "filters": _filters(index, block, dataset, item.get("filters")),
                }
            )
    elif kind == "chart":
        _only(index, block, {"title", "dataset", "group_by", "aggregate", "field", "limit", "filters"})
        dataset = _dataset(index, block.get("dataset"))
        out["title"] = _text(index, block, "title", 100)
        out["dataset"] = dataset.code
        out["group_by"] = _field_name(index, dataset, block.get("group_by"), "kolom pengelompokan")
        aggregate = block.get("aggregate", "count")
        if aggregate not in ("count", "sum"):
            raise _fail(index, "grafik hanya mendukung count atau sum.")
        out["aggregate"] = aggregate
        field = block.get("field") or ""
        if aggregate == "sum":
            _field_name(index, dataset, field, "kolom hitung")
            if dataset.field(field).type != "number":
                raise _fail(index, "sum butuh kolom angka.")
        out["field"] = field if aggregate == "sum" else ""
        limit = block.get("limit", 10)
        if not isinstance(limit, int) or not 1 <= limit <= 20:
            raise _fail(index, "jumlah batang 1–20.")
        out["limit"] = limit
        out["filters"] = _filters(index, block, dataset, block.get("filters"))
    elif kind == "snippet":
        _only(index, block, {"name", "params"})
        try:
            out["name"] = snippets.check_name(block.get("name"))
            out["params"] = snippets.clean_params(block.get("params") or {})
        except DomainError as error:
            raise _fail(index, error.message) from error
    else:
        raise _fail(index, f"jenis blok '{kind}' tidak dikenal.")
    return out


def validate_blocks(blocks: Any) -> list[dict[str, Any]]:
    if not isinstance(blocks, list):
        raise DomainError(
            "BLOCK_INVALID",
            "Isi halaman harus berupa daftar blok.",
            fields={"blocks": "Format blok tidak valid."},
        )
    if len(blocks) > MAX_BLOCKS:
        raise DomainError(
            "BLOCK_INVALID",
            f"Satu halaman maksimal {MAX_BLOCKS} blok.",
            fields={"blocks": f"Maksimal {MAX_BLOCKS} blok."},
        )
    cleaned = []
    for i, b in enumerate(blocks):
        try:
            cleaned.append(_validate_one(i, b))
        except DomainError as error:
            label = TYPE_LABELS.get(b.get("type", ""), "") if isinstance(b, dict) else ""
            if label:
                message = error.message.replace(f"Blok {i + 1}:", f"Blok {i + 1} ({label}):", 1)
                raise DomainError(
                    error.code, message, status=error.status, fields={"blocks": message}
                ) from error
            raise
    ids = [b["id"] for b in cleaned]
    if len(set(ids)) != len(ids):
        raise DomainError(
            "BLOCK_INVALID",
            "Ada id blok yang kembar. Muat ulang editor.",
            fields={"blocks": "Id blok kembar."},
        )
    return cleaned


def run_block(block: dict[str, Any], user: User) -> dict[str, Any]:
    """Compute the data of a data block for `user` (PermissionDenied if its dataset needs a permission)."""
    kind = block.get("type")
    if kind not in DATA_TYPES:
        raise DomainError("NOT_A_DATA_BLOCK", "Blok ini tidak memiliki data dinamis.", status=400)

    def guard(dataset: datasets.Dataset) -> None:
        if dataset.perm and not has_permission(user, dataset.perm):
            raise PermissionDenied()

    if kind == "data_table":
        dataset = datasets.get_dataset(block["dataset"])
        guard(dataset)
        return datasets.table(
            dataset,
            columns=block["columns"],
            sort=block["sort"],
            direction=block["direction"],
            limit=block["limit"],
            filters=block["filters"],
        )
    if kind == "chart":
        dataset = datasets.get_dataset(block["dataset"])
        guard(dataset)
        bars = datasets.group(
            dataset,
            group_by=block["group_by"],
            aggregate_name=block["aggregate"],
            field=block["field"],
            limit=block["limit"],
            filters=block["filters"],
        )
        return {"bars": bars}
    items = []
    for item in block["items"]:
        dataset = datasets.get_dataset(item["dataset"])
        guard(dataset)
        value = datasets.aggregate(
            dataset, aggregate=item["aggregate"], field=item["field"], filters=item["filters"]
        )
        items.append({"label": item["label"], "value": value, "format": item["format"]})
    return {"items": items}
