from django.db.models import Q
from rest_framework import serializers
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from core.api import PermByMethod, StrictSerializer
from modules.mahasiswa.models import Mahasiswa


class MahasiswaOut(serializers.ModelSerializer[Mahasiswa]):
    class Meta:
        model = Mahasiswa
        fields = ["id", "nim", "nama", "prodi", "angkatan", "created_at"]
        read_only_fields = fields


class MahasiswaIn(StrictSerializer, serializers.ModelSerializer[Mahasiswa]):
    class Meta:
        model = Mahasiswa
        fields = ["nim", "nama", "prodi", "angkatan"]
        extra_kwargs = {
            "nim": {"error_messages": {"unique": "NIM sudah terdaftar. Periksa kembali NIM-nya."}},
            "angkatan": {"min_value": 1990, "max_value": 2100},
        }


class MahasiswaListView(GenericAPIView[Mahasiswa]):
    permission_classes = [PermByMethod]
    perm_map = {"GET": "mahasiswa.view", "POST": "mahasiswa.create"}

    def get(self, request: Request) -> Response:
        qs = Mahasiswa.objects.all()
        term = request.query_params.get("q", "").strip()
        if term:
            qs = qs.filter(Q(nim__icontains=term) | Q(nama__icontains=term) | Q(prodi__icontains=term))
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(MahasiswaOut(page, many=True).data)

    def post(self, request: Request) -> Response:
        data = MahasiswaIn(data=request.data)
        data.is_valid(raise_exception=True)
        obj = data.save()
        return Response(MahasiswaOut(obj).data, status=201)
