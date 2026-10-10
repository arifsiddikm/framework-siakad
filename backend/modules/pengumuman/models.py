from django.db import models
from django.utils import timezone


class Pengumuman(models.Model):
    KATEGORI = [
        ("umum", "Umum"),
        ("akademik", "Akademik"),
        ("keuangan", "Keuangan"),
        ("kegiatan", "Kegiatan"),
    ]

    judul = models.CharField(max_length=120)
    isi = models.TextField(max_length=2000)
    kategori = models.CharField(max_length=20, choices=KATEGORI, default="umum")
    penting = models.BooleanField(default=False)
    tanggal = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-tanggal", "-id"]

    def __str__(self) -> str:
        return self.judul
