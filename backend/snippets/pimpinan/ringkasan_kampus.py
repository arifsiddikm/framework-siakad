"""Campus KPIs for leadership (counts through the ORM; the numbers follow the data in the modules)."""

from typing import Any

from django.db.models import Count, Sum

from core.models import User
from modules.keuangan.models import Tagihan
from modules.mahasiswa.models import Mahasiswa
from modules.nilai.models import Nilai

PERMISSION = "mahasiswa.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    per_prodi = Mahasiswa.objects.values("prodi").annotate(jumlah=Count("pk")).order_by("-jumlah")
    unpaid = Tagihan.objects.filter(status="belum").aggregate(v=Sum("jumlah"))["v"] or 0
    return {
        "mahasiswa": Mahasiswa.objects.count(),
        "program_studi": per_prodi.count(),
        "nilai_tercatat": Nilai.objects.count(),
        "tagihan_belum": unpaid,
        "per_prodi": list(per_prodi[:6]),
    }
