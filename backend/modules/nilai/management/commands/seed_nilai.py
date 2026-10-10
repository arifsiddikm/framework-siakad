from django.core.management.base import BaseCommand

from modules.nilai.models import Nilai

# Fictional grades for demos only: (kode, matkul, sks, semester, {nim: huruf})
SAMPLE = [
    (
        "TI101",
        "Algoritma & Pemrograman",
        4,
        "Ganjil 2024/2025",
        {"24040012": "A", "24040001": "A-", "24040002": "B+"},
    ),
    (
        "TI102",
        "Matematika Diskrit",
        3,
        "Ganjil 2024/2025",
        {"24040012": "B+", "24040001": "A", "24040002": "B"},
    ),
    (
        "UM101",
        "Pendidikan Pancasila",
        2,
        "Ganjil 2024/2025",
        {"24040012": "A", "24040001": "A", "24040002": "A-"},
    ),
    ("TI103", "Struktur Data", 4, "Genap 2024/2025", {"24040012": "A-", "24040001": "B+", "24040002": "B"}),
    ("TI104", "Basis Data", 3, "Genap 2024/2025", {"24040012": "A", "24040001": "A-", "24040002": "B-"}),
    (
        "UM102",
        "Bahasa Indonesia",
        2,
        "Genap 2024/2025",
        {"24040012": "B+", "24040001": "A", "24040002": "B+"},
    ),
    ("TI201", "Pemrograman Web", 4, "Ganjil 2025/2026", {"24040012": "A", "24040001": "A", "24040002": "B"}),
    ("TI202", "Sistem Operasi", 3, "Ganjil 2025/2026", {"24040012": "B", "24040001": "B+", "24040002": "C+"}),
    (
        "TI203",
        "Jaringan Komputer",
        3,
        "Ganjil 2025/2026",
        {"24040012": "A-", "24040001": "A-", "24040002": "B"},
    ),
    (
        "TI204",
        "Rekayasa Perangkat Lunak",
        3,
        "Genap 2025/2026",
        {"24040012": "A", "24040001": "B+", "24040002": "B+"},
    ),
    (
        "TI205",
        "Interaksi Manusia & Komputer",
        3,
        "Genap 2025/2026",
        {"24040012": "A-", "24040001": "A", "24040002": "B"},
    ),
]


class Command(BaseCommand):
    help = "Add fictional grades for demo students (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        created = 0
        for kode, matkul, sks, semester, grades in SAMPLE:
            for nim, huruf in grades.items():
                _, was_created = Nilai.objects.get_or_create(
                    nim=nim,
                    kode_mk=kode,
                    semester=semester,
                    defaults={"matkul": matkul, "sks": sks, "huruf": huruf},
                )
                created += was_created
        self.stdout.write(f"{created} nilai contoh ditambahkan.")
