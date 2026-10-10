from django.core.management.base import BaseCommand

from modules.mahasiswa.models import Mahasiswa

# Fictional people for demos only.
SAMPLE = [
    ("24040001", "Aulia Rahmawati", "Teknik Informatika", 2024),
    ("24040002", "Bagas Prasetyo", "Teknik Informatika", 2024),
    ("24050001", "Citra Lestari", "Sistem Informasi", 2024),
    ("23040011", "Dimas Anggara", "Teknik Informatika", 2023),
    ("23050007", "Eka Putri Wulandari", "Sistem Informasi", 2023),
    ("22030005", "Fajar Nugraha", "Manajemen", 2022),
    ("24040012", "Rizky Aditya Pratama", "Teknik Informatika", 2024),
]


class Command(BaseCommand):
    help = "Add a few fictional mahasiswa rows for demos (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        created = 0
        for nim, nama, prodi, angkatan in SAMPLE:
            _, was_created = Mahasiswa.objects.get_or_create(
                nim=nim, defaults={"nama": nama, "prodi": prodi, "angkatan": angkatan}
            )
            created += was_created
        self.stdout.write(f"{created} baris contoh ditambahkan.")
