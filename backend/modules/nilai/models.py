from django.core.validators import RegexValidator
from django.db import models

# Grade letter -> grade points (4.0 scale).
BOBOT = {"A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "D": 1.0, "E": 0.0}


class Nilai(models.Model):
    nim = models.CharField(
        max_length=20, db_index=True, validators=[RegexValidator(r"^\d+$", "NIM hanya boleh berisi angka.")]
    )
    kode_mk = models.CharField(max_length=15)
    matkul = models.CharField(max_length=100)
    sks = models.PositiveSmallIntegerField()
    semester = models.CharField(max_length=30)
    huruf = models.CharField(max_length=2, choices=[(k, k) for k in BOBOT])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["semester", "kode_mk"]
        constraints = [
            models.UniqueConstraint(fields=["nim", "kode_mk", "semester"], name="uniq_nilai_nim_mk_semester")
        ]

    def __str__(self) -> str:
        return f"{self.nim} {self.kode_mk} {self.huruf}"
