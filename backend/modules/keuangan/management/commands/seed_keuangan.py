from datetime import date, timedelta

from django.core.management.base import BaseCommand

from modules.keuangan.models import Tagihan

# Fictional bills for demos only: (nim, keterangan, jumlah Rp, hari dari hari ini, lunas?)
SAMPLE = [
    ("24040012", "SPP Semester Ganjil 2026/2027 — tahap 1", 3_750_000, 21, False),
    ("24040012", "SPP Semester Ganjil 2026/2027 — tahap 2", 3_750_000, 51, False),
    ("24040012", "Registrasi & asuransi", 450_000, -20, True),
    ("24040012", "SPP Semester Genap 2025/2026", 7_500_000, -200, True),
    ("24040001", "SPP Semester Ganjil 2026/2027 — tahap 1", 3_750_000, 21, True),
    ("24040001", "SPP Semester Ganjil 2026/2027 — tahap 2", 3_750_000, 51, False),
    ("24040002", "SPP Semester Ganjil 2026/2027 — tahap 1", 3_750_000, -5, False),
    ("24040002", "Praktikum Jaringan", 300_000, 10, False),
    ("23050007", "SPP Semester Ganjil 2026/2027", 6_900_000, 21, True),
    ("23040011", "SPP Semester Ganjil 2026/2027", 7_500_000, 21, False),
]


class Command(BaseCommand):
    help = "Add fictional bills for demo students (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        today, created = date.today(), 0
        for nim, ket, jumlah, offset, paid in SAMPLE:
            _, was_created = Tagihan.objects.get_or_create(
                nim=nim, keterangan=ket,
                defaults={"jumlah": jumlah, "jatuh_tempo": today + timedelta(days=offset), "status": "lunas" if paid else "belum", "dibayar_pada": today if paid else None},
            )  # fmt: skip
            created += was_created
        self.stdout.write(f"{created} tagihan contoh ditambahkan.")
