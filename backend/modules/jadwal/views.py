from typing import Any

from rest_framework import serializers
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response

from core.api import PermByMethod, StrictSerializer
from modules.jadwal.models import HARI, JadwalKuliah


class JadwalOut(serializers.ModelSerializer[JadwalKuliah]):
    class Meta:
        model = JadwalKuliah
        fields = [
            "id",
            "kode_mk",
            "matkul",
            "dosen",
            "hari",
            "jam_mulai",
            "jam_selesai",
            "ruang",
            "kelas",
            "semester",
        ]
        read_only_fields = fields


class JadwalIn(StrictSerializer, serializers.ModelSerializer[JadwalKuliah]):
    class Meta:
        model = JadwalKuliah
        fields = [
            "kode_mk",
            "matkul",
            "dosen",
            "hari",
            "jam_mulai",
            "jam_selesai",
            "ruang",
            "kelas",
            "semester",
        ]
        extra_kwargs = {"kelas": {"required": False}, "semester": {"required": False}}

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["jam_selesai"] <= attrs["jam_mulai"]:
            raise serializers.ValidationError({"jam_selesai": "Jam selesai harus setelah jam mulai."})
        return attrs


class JadwalListView(GenericAPIView[JadwalKuliah]):
    permission_classes = [PermByMethod]
    perm_map = {"GET": "jadwal.view", "POST": "jadwal.manage"}

    def get(self, request: Request) -> Response:
        qs = JadwalKuliah.objects.all()
        hari = request.query_params.get("hari", "").strip()
        if hari:
            qs = qs.filter(hari=hari)
        rows = sorted(JadwalOut(qs, many=True).data, key=lambda r: (HARI.index(r["hari"]), r["jam_mulai"]))
        return Response({"hari": HARI, "results": rows})

    def post(self, request: Request) -> Response:
        data = JadwalIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(JadwalOut(data.save()).data, status=201)


class JadwalDetailView(GenericAPIView[JadwalKuliah]):
    permission_classes = [PermByMethod]
    perm_map = {"DELETE": "jadwal.manage"}

    def delete(self, request: Request, pk: int) -> Response:
        get_object_or_404(JadwalKuliah, pk=pk).delete()
        return Response(status=204)
