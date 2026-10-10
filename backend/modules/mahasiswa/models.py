from django.core.validators import RegexValidator
from django.db import models

nim_validator = RegexValidator(r"^\d+$", "NIM hanya boleh berisi angka.")


class Mahasiswa(models.Model):
    nim = models.CharField(max_length=20, unique=True, validators=[nim_validator])
    nama = models.CharField(max_length=150)
    prodi = models.CharField(max_length=100)
    angkatan = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nim"]

    def __str__(self) -> str:
        return f"{self.nim} {self.nama}"
