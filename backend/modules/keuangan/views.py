from typing import Any

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response

from core.api import PermByMethod, StrictSerializer
from core.selectors import has_permission
from modules.keuangan.models import Tagihan


class TagihanOut(serializers.ModelSerializer[Tagihan]):
    class Meta:
        model = Tagihan
        fields = ["id", "nim", "keterangan", "jumlah", "jatuh_tempo", "status", "dibayar_pada"]
        read_only_fields = fields


class TagihanIn(StrictSerializer, serializers.ModelSerializer[Tagihan]):
    class Meta:
        model = Tagihan
        fields = ["nim", "keterangan", "jumlah", "jatuh_tempo"]
        extra_kwargs = {"jumlah": {"min_value": 1, "max_value": 1_000_000_000}}


class StatusIn(StrictSerializer):
    status = serializers.ChoiceField(choices=["lunas", "belum"])


def summary(qs: Any) -> dict[str, int]:
    paid = qs.filter(status="lunas").aggregate(v=Sum("jumlah"))["v"] or 0
    unpaid = qs.filter(status="belum").aggregate(v=Sum("jumlah"))["v"] or 0
    return {"lunas": paid, "belum": unpaid, "total": paid + unpaid}


class TagihanView(GenericAPIView[Tagihan]):
    """Mahasiswa: own bills (by the account's NIM). `keuangan.view_all`: anyone's (`?nim=`, `?q=`)."""

    permission_classes = [PermByMethod]
    perm_map = {"GET": "keuangan.view", "POST": "keuangan.manage"}

    def get(self, request: Request) -> Response:
        user = request.user
        see_all = has_permission(user, "keuangan.view_all")  # type: ignore[arg-type]
        if see_all:
            nim = request.query_params.get("nim", "").strip()
            term = request.query_params.get("q", "").strip()
            qs = Tagihan.objects.all()
            if nim:
                qs = qs.filter(nim=nim)
            if term:
                qs = qs.filter(Q(nim__icontains=term) | Q(keterangan__icontains=term))
            status = request.query_params.get("status", "").strip()
            if status:
                qs = qs.filter(status=status)
        else:
            nim = getattr(user, "identifier", "")
            qs = Tagihan.objects.filter(nim=nim) if nim else Tagihan.objects.none()
        rows = list(qs[:300])
        return Response(
            {
                "scope": "all" if see_all else "own",
                "nim": nim,
                "results": TagihanOut(rows, many=True).data,
                "summary": summary(qs),
            }
        )

    def post(self, request: Request) -> Response:
        data = TagihanIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(TagihanOut(data.save()).data, status=201)


class TagihanDetailView(GenericAPIView[Tagihan]):
    permission_classes = [PermByMethod]
    perm_map = {"PATCH": "keuangan.manage"}

    def patch(self, request: Request, pk: int) -> Response:
        data = StatusIn(data=request.data)
        data.is_valid(raise_exception=True)
        bill = get_object_or_404(Tagihan, pk=pk)
        bill.status = data.validated_data["status"]
        bill.dibayar_pada = timezone.localdate() if bill.status == "lunas" else None
        bill.save(update_fields=["status", "dibayar_pada"])
        return Response(TagihanOut(bill).data)
