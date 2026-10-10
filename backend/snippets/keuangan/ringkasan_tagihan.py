"""Summary of the signed-in student's bills, from the `keuangan` module (own data only)."""

from typing import Any

from core.models import User
from modules.keuangan.models import Tagihan

PERMISSION = "keuangan.view"


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    nim = user.identifier
    bills = list(Tagihan.objects.filter(nim=nim, status="belum").order_by("jatuh_tempo")) if nim else []
    next_bill = bills[0] if bills else None
    return {
        "has_nim": bool(nim),
        "belum_dibayar": sum(b.jumlah for b in bills),
        "jumlah_tagihan": len(bills),
        "berikutnya": {
            "keterangan": next_bill.keterangan,
            "jumlah": next_bill.jumlah,
            "jatuh_tempo": next_bill.jatuh_tempo.isoformat(),
        }
        if next_bill
        else None,
    }
