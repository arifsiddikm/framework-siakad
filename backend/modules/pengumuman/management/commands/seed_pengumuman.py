from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from modules.pengumuman.models import Pengumuman

# Fictional announcements for demos only.
SAMPLE = [
    (
        "Pengisian KRS semester Ganjil 2026/2027",
        "KRS dibuka 12–18 Oktober 2026 lewat portal. Konsultasikan rencana studi dengan dosen wali sebelum menyetujui.",
        "akademik",
        True,
        2,
    ),
    (
        "Batas pembayaran SPP tahap 1",
        "Pembayaran SPP tahap 1 paling lambat 31 Oktober 2026. Mahasiswa yang belum membayar tidak dapat mengisi KRS.",
        "keuangan",
        True,
        4,
    ),
    (
        "Jadwal Ujian Tengah Semester",
        "UTS berlangsung 20–24 Oktober 2026. Kartu ujian dapat diunduh mulai 17 Oktober.",
        "akademik",
        True,
        6,
    ),
    (
        "Seminar nasional: Transformasi Digital Pendidikan",
        "Terbuka untuk seluruh civitas, 5 November 2026 di Aula Utama. Pendaftaran gratis melalui bagian kemahasiswaan.",
        "kegiatan",
        False,
        9,
    ),
    (
        "Pemeliharaan sistem akademik",
        "Portal tidak dapat diakses Minggu, 11 Oktober 2026 pukul 01.00–04.00 WIB karena pemeliharaan server.",
        "umum",
        False,
        10,
    ),
    (
        "Pendaftaran beasiswa prestasi dibuka",
        "Beasiswa prestasi tahun akademik 2026/2027: IPK minimal 3,50. Berkas diserahkan sebelum 25 Oktober 2026.",
        "keuangan",
        False,
        12,
    ),
    (
        "Perpustakaan perpanjang jam layanan",
        "Selama pekan ujian, perpustakaan buka hingga pukul 21.00 WIB.",
        "umum",
        False,
        14,
    ),
    (
        "Wisuda periode November 2026",
        "Pendaftaran wisuda ditutup 30 Oktober 2026. Hubungi bagian akademik untuk persyaratan.",
        "akademik",
        False,
        18,
    ),
]


class Command(BaseCommand):
    help = "Add fictional announcements for demos (idempotent)."

    def handle(self, *args: object, **options: object) -> None:
        today = timezone.localdate()
        created = 0
        for judul, isi, kategori, penting, days_ago in SAMPLE:
            _, was_created = Pengumuman.objects.get_or_create(
                judul=judul,
                defaults={
                    "isi": isi,
                    "kategori": kategori,
                    "penting": penting,
                    "tanggal": today - timedelta(days=days_ago),
                },
            )
            created += was_created
        self.stdout.write(f"{created} pengumuman contoh ditambahkan.")
