from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response

from core.api import PermByMethod, StrictSerializer
from modules.pengumuman.models import Pengumuman


class PengumumanOut(serializers.ModelSerializer[Pengumuman]):
    class Meta:
        model = Pengumuman
        fields = ["id", "judul", "isi", "kategori", "penting", "tanggal"]
        read_only_fields = fields


class PengumumanIn(StrictSerializer, serializers.ModelSerializer[Pengumuman]):
    class Meta:
        model = Pengumuman
        fields = ["judul", "isi", "kategori", "penting", "tanggal"]
        extra_kwargs = {"tanggal": {"required": False}}


class PengumumanListView(GenericAPIView[Pengumuman]):
    permission_classes = [PermByMethod]
    perm_map = {"GET": "pengumuman.view", "POST": "pengumuman.manage"}

    def get(self, request: Request) -> Response:
        qs = Pengumuman.objects.all()
        term = request.query_params.get("q", "").strip()
        if term:
            qs = qs.filter(Q(judul__icontains=term) | Q(isi__icontains=term))
        kategori = request.query_params.get("kategori", "").strip()
        if kategori:
            qs = qs.filter(kategori=kategori)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(PengumumanOut(page, many=True).data)

    def post(self, request: Request) -> Response:
        data = PengumumanIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(PengumumanOut(data.save()).data, status=201)


class PengumumanDetailView(GenericAPIView[Pengumuman]):
    permission_classes = [PermByMethod]
    perm_map = {"DELETE": "pengumuman.manage"}

    def delete(self, request: Request, pk: int) -> Response:
        get_object_or_404(Pengumuman, pk=pk).delete()
        return Response(status=204)
