from typing import Any

from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from core.api import PermByMethod, StrictSerializer
from core.selectors import has_permission
from modules.nilai.models import BOBOT, Nilai


class NilaiOut(serializers.ModelSerializer[Nilai]):
    class Meta:
        model = Nilai
        fields = ["id", "nim", "kode_mk", "matkul", "sks", "semester", "huruf"]
        read_only_fields = fields


class NilaiIn(StrictSerializer, serializers.ModelSerializer[Nilai]):
    class Meta:
        model = Nilai
        fields = ["nim", "kode_mk", "matkul", "sks", "semester", "huruf"]
        validators: list[Any] = []  # upsert on (nim, kode_mk, semester) instead of a uniqueness error
        extra_kwargs = {"sks": {"min_value": 1, "max_value": 8}}


def summarize(rows: list[Nilai]) -> dict[str, Any]:
    sks = sum(r.sks for r in rows)
    points = sum(BOBOT[r.huruf] * r.sks for r in rows)
    return {"sks": sks, "ipk": round(points / sks, 2) if sks else None, "mata_kuliah": len(rows)}


class NilaiView(GenericAPIView[Nilai]):
    """Mahasiswa: own grades (by the account's NIM). `nilai.view_all`: anyone's (`?nim=`, `?q=`)."""

    permission_classes = [PermByMethod]
    perm_map = {"GET": "nilai.view", "POST": "nilai.input"}

    def get(self, request: Request) -> Response:
        user = request.user
        see_all = has_permission(user, "nilai.view_all")  # type: ignore[arg-type]
        if see_all:
            nim = request.query_params.get("nim", "").strip()
            term = request.query_params.get("q", "").strip()
            qs = Nilai.objects.all()
            if nim:
                qs = qs.filter(nim=nim)
            elif term:
                qs = qs.filter(Q(nim__icontains=term) | Q(matkul__icontains=term))
            else:
                qs = qs.none()  # ask for a NIM or a search term; never dump the whole table
        else:
            nim = getattr(user, "identifier", "")
            qs = Nilai.objects.filter(nim=nim) if nim else Nilai.objects.none()
        rows = list(qs[:300])
        return Response(
            {
                "scope": "all" if see_all else "own",
                "nim": nim,
                "results": NilaiOut(rows, many=True).data,
                "summary": summarize(rows) if (nim or not see_all) else None,
                "grades": list(BOBOT),
            }
        )

    def post(self, request: Request) -> Response:
        data = NilaiIn(data=request.data)
        data.is_valid(raise_exception=True)
        values = dict(data.validated_data)
        key = {k: values.pop(k) for k in ("nim", "kode_mk", "semester")}
        obj, created = Nilai.objects.update_or_create(**key, defaults=values)
        return Response(NilaiOut(obj).data, status=201 if created else 200)
