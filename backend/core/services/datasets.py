"""Datasets: read-only tables the page builder can show (tables, stats, charts).

Module datasets are declared in a module's manifest, read through the ORM, and gated by a permission.
No raw SQL anywhere: columns, sort fields and filters are checked against the dataset's declared fields.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.apps import apps
from django.db import models
from django.db.models import Avg, Count, Max, Min, Q, Sum

from core.api import DomainError
from core.registry import load_manifests

OPS = ("eq", "ne", "contains", "gt", "gte", "lt", "lte")
AGGREGATES = ("count", "sum", "avg", "min", "max")
MAX_ROWS = 100
_LOOKUP = {
    "eq": "exact",
    "ne": "exact",
    "contains": "icontains",
    "gt": "gt",
    "gte": "gte",
    "lt": "lt",
    "lte": "lte",
}


@dataclass(frozen=True)
class DField:
    name: str
    label: str
    type: str  # text | number | date | boolean | select


@dataclass(frozen=True)
class Dataset:
    code: str
    label: str
    source: str  # "modul"
    fields: tuple[DField, ...]
    perm: str | None = None
    module: str | None = None
    model: str | None = None

    def field(self, name: str) -> DField:
        for f in self.fields:
            if f.name == name:
                return f
        raise DomainError(
            "UNKNOWN_FIELD", f"Kolom '{name}' tidak ada di sumber data {self.label}.", fields={"field": name}
        )


def all_datasets() -> dict[str, Dataset]:
    found: dict[str, Dataset] = {}
    for manifest in load_manifests().values():
        for d in manifest.datasets:
            code = f"{manifest.code}.{d.code}"
            fields = tuple(DField(f.name, f.label, f.type) for f in d.fields)
            found[code] = Dataset(
                code, d.label, "modul", fields, perm=d.perm, module=manifest.code, model=d.model
            )
    return found


def get_dataset(code: str) -> Dataset:
    dataset = all_datasets().get(code)
    if dataset is None:
        raise DomainError(
            "UNKNOWN_DATASET", "Sumber data tidak ditemukan. Pilih ulang sumber datanya.", status=404
        )
    return dataset


def dataset_out(d: Dataset) -> dict[str, Any]:
    return {
        "code": d.code,
        "label": d.label,
        "source": d.source,
        "fields": [{"name": f.name, "label": f.label, "type": f.type} for f in d.fields],
    }


# ---- value handling ---------------------------------------------------------------------------


def _json(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


def _coerce(field: DField, value: Any) -> Any:
    try:
        if field.type == "number":
            return Decimal(str(value))
        if field.type == "date":
            return date.fromisoformat(str(value)[:10])
        if field.type == "boolean":
            return str(value).strip().lower() in {"true", "1", "ya", "yes"}
    except (InvalidOperation, ValueError) as exc:
        raise DomainError(
            "INVALID_FILTER",
            f"Nilai filter '{value}' tidak cocok untuk kolom {field.label} ({field.type}).",
            fields={"filters": f"Nilai tidak cocok untuk {field.label}."},
        ) from exc
    return str(value)


def _check_filters(dataset: Dataset, filters: list[dict[str, Any]]) -> None:
    for item in filters:
        field = dataset.field(item["field"])
        if item["op"] not in OPS:
            raise DomainError(
                "INVALID_FILTER",
                f"Operator '{item['op']}' tidak dikenal.",
                fields={"filters": "Operator tidak dikenal."},
            )
        if item["op"] == "contains" and field.type not in ("text", "select"):
            raise DomainError(
                "INVALID_FILTER",
                f"'mengandung' hanya untuk kolom teks ({field.label}).",
                fields={"filters": "Operator tidak cocok."},
            )
        _coerce(field, item["value"])


# ---- module source (ORM) ----------------------------------------------------------------------


def _model(dataset: Dataset) -> type[models.Model]:
    try:
        return apps.get_model(dataset.module or "", dataset.model or "")
    except LookupError as exc:
        raise DomainError(
            "DATASET_BROKEN",
            f"Model sumber data {dataset.label} tidak ditemukan. Hubungi pengembang.",
            status=500,
        ) from exc


def _orm_queryset(dataset: Dataset, filters: list[dict[str, Any]]) -> models.QuerySet[Any]:
    model = _model(dataset)
    query = Q()
    for item in filters:
        field = dataset.field(item["field"])
        name = item["field"]
        if field.type == "date" and isinstance(model._meta.get_field(name), models.DateTimeField):
            name = f"{name}__date"
        condition = Q(**{f"{name}__{_LOOKUP[item['op']]}": _coerce(field, item["value"])})
        query &= ~condition if item["op"] == "ne" else condition
    return model._default_manager.filter(query)


def _orm_agg(aggregate: str, field: str) -> Any:
    return {"sum": Sum, "avg": Avg, "min": Min, "max": Max}[aggregate](field)


# ---- public operations ------------------------------------------------------------------------


def table(
    dataset: Dataset,
    *,
    columns: list[str],
    sort: str,
    direction: str,
    limit: int,
    filters: list[dict[str, Any]],
) -> dict[str, Any]:
    _check_filters(dataset, filters)
    for name in columns:
        dataset.field(name)
    limit = max(1, min(limit, MAX_ROWS))
    queryset = _orm_queryset(dataset, filters)
    total = queryset.count()
    if sort:
        dataset.field(sort)
        queryset = queryset.order_by(f"{'-' if direction == 'desc' else ''}{sort}")
    rows = [{k: _json(v) for k, v in row.items()} for row in queryset.values(*columns)[:limit]]
    return {
        "columns": [
            {"name": c, "label": dataset.field(c).label, "type": dataset.field(c).type} for c in columns
        ],
        "rows": rows,
        "total": total,
    }


def aggregate(
    dataset: Dataset, *, aggregate: str, field: str, filters: list[dict[str, Any]]
) -> float | str | None:
    _check_filters(dataset, filters)
    if aggregate not in AGGREGATES:
        raise DomainError("INVALID_AGGREGATE", f"Perhitungan '{aggregate}' tidak dikenal.")
    if aggregate != "count":
        kind = dataset.field(field).type
        if kind != "number" and not (aggregate in ("min", "max") and kind == "date"):
            raise DomainError(
                "INVALID_AGGREGATE",
                f"Perhitungan {aggregate} butuh kolom angka (atau tanggal untuk min/maks).",
            )
    queryset = _orm_queryset(dataset, filters)
    if aggregate == "count":
        return queryset.count()
    return _json(queryset.aggregate(v=_orm_agg(aggregate, field))["v"])


def group(
    dataset: Dataset,
    *,
    group_by: str,
    aggregate_name: str,
    field: str,
    limit: int,
    filters: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    _check_filters(dataset, filters)
    dataset.field(group_by)
    if aggregate_name not in ("count", "sum"):
        raise DomainError(
            "INVALID_AGGREGATE", "Grafik hanya mendukung jumlah baris (count) atau jumlah nilai (sum)."
        )
    if aggregate_name == "sum" and dataset.field(field).type != "number":
        raise DomainError("INVALID_AGGREGATE", "Jumlah nilai (sum) butuh kolom angka.")
    limit = max(1, min(limit, 20))
    queryset = _orm_queryset(dataset, filters).values(group_by)
    value = Count("pk") if aggregate_name == "count" else Sum(field)
    rows = queryset.annotate(v=value).order_by("-v")[:limit]
    return [
        {
            "label": str(_json(r[group_by]) if r[group_by] not in (None, "") else "(kosong)"),
            "value": _json(r["v"]) or 0,
        }
        for r in rows
    ]
