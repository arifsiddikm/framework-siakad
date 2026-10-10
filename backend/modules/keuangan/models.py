from django.core.validators import RegexValidator
from django.db import models


class Tagihan(models.Model):
    STATUS = [("belum", "Belum dibayar"), ("lunas", "Lunas")]

    nim = models.CharField(
        max_length=20, db_index=True, validators=[RegexValidator(r"^\d+$", "NIM hanya boleh berisi angka.")]
    )
    keterangan = models.CharField(max_length=120)
    jumlah = models.PositiveIntegerField(help_text="Rupiah, bilangan bulat")
    jatuh_tempo = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS, default="belum")
    dibayar_pada = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["jatuh_tempo", "id"]

    def __str__(self) -> str:
        return f"{self.nim} {self.keterangan}"
