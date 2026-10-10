from datetime import time

from django.core.management.base import BaseCommand

from modules.jadwal.models import JadwalKuliah

# Fictional timetable for demos only: (kode, matkul, dosen, hari, mulai, selesai, ruang, kelas)
SAMPLE = [
    (
        "TI201",
        "Pemrograman Web",
        "Dr. Hendra Wijaya, M.Kom.",
        "Senin",
        time(8, 0),
        time(10, 30),
        "Lab Komputer 2",
        "A",
    ),
    (
        "TI203",
        "Basis Data Lanjut",
        "Sari Utami, S.T., M.T.",
        "Senin",
        time(10, 45),
        time(13, 15),
        "R. 304",
        "B",
    ),
    ("UM101", "Etika Profesi", "Drs. Mulyadi, M.M.", "Senin", time(14, 0), time(15, 40), "R. 112", "A"),
    (
        "TI205",
        "Jaringan Komputer",
        "Dr. Hendra Wijaya, M.Kom.",
        "Selasa",
        time(8, 0),
        time(10, 30),
        "Lab Jaringan",
        "A",
    ),
    (
        "SI202",
        "Analisis & Perancangan Sistem",
        "Rina Kartika, M.Kom.",
        "Selasa",
        time(10, 45),
        time(13, 15),
        "R. 201",
        "A",
    ),
    (
        "MN110",
        "Pengantar Manajemen",
        "Budi Hartono, M.M.",
        "Selasa",
        time(13, 30),
        time(15, 10),
        "R. 105",
        "C",
    ),
    ("TI207", "Kecerdasan Buatan", "Sari Utami, S.T., M.T.", "Rabu", time(8, 0), time(10, 30), "R. 304", "A"),
    (
        "TI209",
        "Pemrograman Mobile",
        "Dr. Hendra Wijaya, M.Kom.",
        "Rabu",
        time(13, 0),
        time(15, 30),
        "Lab Komputer 1",
        "B",
    ),
    (
        "SI204",
        "Manajemen Proyek TI",
        "Rina Kartika, M.Kom.",
        "Kamis",
        time(9, 0),
        time(11, 30),
        "R. 202",
        "A",
    ),
    (
        "UM103",
        "Bahasa Inggris Akademik",
        "Maya Sari, M.Pd.",
        "Kamis",
        time(13, 0),
        time(14, 40),
        "R. 110",
        "A",
    ),
    (
        "TI211",
        "Keamanan Informasi",
        "Sari Utami, S.T., M.T.",
        "Jumat",
        time(8, 0),
        time(10, 30),
        "R. 304",
        "A",
    ),
    (
        "SI206",
        "Data Warehouse",
        "Rina Kartika, M.Kom.",
        "Jumat",
        time(13, 30),
        time(16, 0),
        "Lab Komputer 3",
        "B",
    ),
    ("MN120", "Kewirausahaan", "Budi Hartono, M.M.", "Sabtu", time(8, 0), time(9, 40), "R. 105", "C"),
]


class Command(BaseCommand):
    help = "Add a fictional timetable for demos (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        created = 0
        for kode, matkul, dosen, hari, mulai, selesai, ruang, kelas in SAMPLE:
            _, was_created = JadwalKuliah.objects.get_or_create(
                kode_mk=kode, kelas=kelas, hari=hari,
                defaults={"matkul": matkul, "dosen": dosen, "jam_mulai": mulai, "jam_selesai": selesai, "ruang": ruang},
            )  # fmt: skip
            created += was_created
        self.stdout.write(f"{created} jadwal contoh ditambahkan.")
