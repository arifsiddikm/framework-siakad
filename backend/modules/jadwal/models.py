from django.db import models

HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]


class JadwalKuliah(models.Model):
    kode_mk = models.CharField(max_length=15)
    matkul = models.CharField(max_length=100)
    dosen = models.CharField(max_length=100)
    hari = models.CharField(max_length=10, choices=[(h, h) for h in HARI])
    jam_mulai = models.TimeField()
    jam_selesai = models.TimeField()
    ruang = models.CharField(max_length=20)
    kelas = models.CharField(max_length=5, default="A")
    semester = models.CharField(max_length=30, default="Ganjil 2026/2027")

    class Meta:
        ordering = ["jam_mulai", "id"]

    def __str__(self) -> str:
        return f"{self.matkul} ({self.hari})"
