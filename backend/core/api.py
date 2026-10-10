"""API plumbing: error format, strict input, permission class, pagination."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from django.http import Http404
from rest_framework import exceptions, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


class DomainError(Exception):
    """A rule of the system was violated. Rendered as `{code, message, fields}`."""

    def __init__(
        self, code: str, message: str, *, status: int = 400, fields: dict[str, str] | None = None
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or {}


class ModuleInactive(exceptions.PermissionDenied):
    default_code = "module_inactive"
    default_detail = "Modul ini belum aktif. Minta administrator mengaktifkannya di Panel Admin › Modul."


class SessionAuth(SessionAuthentication):
    """Session auth that answers 401 (not 403) when nobody is logged in."""

    def authenticate_header(self, request: Any) -> str:
        return "Session"


class Pagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


def _first_message(detail: Any) -> str:
    if isinstance(detail, Mapping):
        return _first_message(next(iter(detail.values()), ""))
    if isinstance(detail, list | tuple):
        return _first_message(detail[0]) if detail else ""
    return str(detail)


def _flatten_fields(detail: Any) -> dict[str, str]:
    if not isinstance(detail, Mapping):
        return {}
    return {str(key): _first_message(value) for key, value in detail.items()}


def exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    # Imported here: rest_framework.views reads our settings at import time (circular otherwise).
    from rest_framework.views import exception_handler as drf_exception_handler

    if isinstance(exc, DomainError):
        return Response({"code": exc.code, "message": exc.message, "fields": exc.fields}, status=exc.status)
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, exceptions.ValidationError):
        fields = _flatten_fields(exc.detail)
        message = fields.get("non_field_errors") or "Isian belum benar. Periksa kolom yang ditandai."
        body = {"code": "VALIDATION_ERROR", "message": message, "fields": fields}
    elif isinstance(exc, exceptions.NotAuthenticated):
        body = {"code": "NOT_AUTHENTICATED", "message": "Sesi berakhir. Silakan masuk kembali.", "fields": {}}
    elif isinstance(exc, ModuleInactive):
        body = {"code": "MODULE_INACTIVE", "message": str(exc.detail), "fields": {}}
    elif isinstance(exc, exceptions.PermissionDenied):
        if str(exc.detail).startswith("CSRF"):
            body = {
                "code": "CSRF_FAILED",
                "message": "Sesi keamanan tidak valid. Muat ulang halaman lalu coba lagi.",
                "fields": {},
            }
        else:
            body = {
                "code": "PERMISSION_DENIED",
                "message": "Anda tidak memiliki izin untuk ini. Hubungi administrator bila perlu.",
                "fields": {},
            }
    elif isinstance(exc, exceptions.NotFound):
        body = {"code": "NOT_FOUND", "message": "Data tidak ditemukan.", "fields": {}}
    elif isinstance(exc, exceptions.MethodNotAllowed):
        body = {"code": "METHOD_NOT_ALLOWED", "message": "Metode tidak diizinkan.", "fields": {}}
    elif isinstance(exc, exceptions.ParseError):
        body = {"code": "INVALID_REQUEST", "message": "Format data tidak valid. Kirim JSON.", "fields": {}}
    else:
        body = {"code": "REQUEST_FAILED", "message": "Permintaan tidak dapat diproses.", "fields": {}}
    response.data = body
    return response


class StrictSerializer(serializers.Serializer[Any]):
    """Input serializer that rejects keys it does not declare (CLAUDE.md rule 6)."""

    def to_internal_value(self, data: Any) -> Any:
        if isinstance(data, Mapping):
            unknown = sorted(set(data) - set(self.fields))
            if unknown:
                raise serializers.ValidationError({name: ["Kolom ini tidak dikenal."] for name in unknown})
        return super().to_internal_value(data)


class PermByMethod(BasePermission):
    """Check the permission code mapped to the HTTP method in `view.perm_map`.

    A value may be one code or a tuple of codes (any one is enough, e.g. `("nilai.view_own",
    "nilai.view_all")`). Methods missing from the map are denied. A permission whose module is
    switched off answers 403 `MODULE_INACTIVE` (MOD-02).
    """

    def has_permission(self, request: Any, view: Any) -> bool:
        from core.selectors import has_permission

        if not request.user.is_authenticated:
            return False
        codes = getattr(view, "perm_map", {}).get(request.method)
        if codes is None:
            return False
        for code in (codes,) if isinstance(codes, str) else codes:
            if has_permission(request.user, code):
                return True
        return False
