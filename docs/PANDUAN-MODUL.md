# Cara membuat modul (satu halaman)

Satu modul = satu folder di backend + satu folder di frontend. Core menemukannya otomatis; **tidak ada file core yang diubah**. Halaman modul tampil di **portal pengguna** (kop + navbar); panel admin (`/admin`) hanya untuk setelan core. Aturan tampilan: `docs/PANDUAN-STYLE.md`. Konsep tiap modul dibahas lewat brief terpisah.

## 1. Buat kerangka
```bash
cd backend
.venv/bin/python manage.py startmodule nilai --title "Nilai"
```
Perintah ini membuat `backend/modules/nilai/` dan `frontend/src/modules/nilai/`. Kode modul: huruf kecil/angka/garis bawah, diawali huruf.

## 2. Isi manifest backend — `backend/modules/nilai/manifest.py`
```python
MANIFEST = {
    "code": "nilai",                       # sama dengan nama folder
    "name": "Nilai",
    "icon": "clipboard-check",             # daftar ikon: backend/core/icons.py
    "depends_on": [],                      # kode modul lain bila perlu
    "permissions": [
        {"code": "nilai.view", "name": "Lihat nilai"},   # wajib berawalan "nilai."
        {"code": "nilai.input", "name": "Input nilai"},
    ],
    "menu": [
        {"group": "Akademik", "title": "Nilai & KHS", "hint": "Hasil studi per semester",
         "to": "/nilai", "perm": "nilai.view", "icon": "clipboard-check"},
    ],
    "pages": [],                           # halaman tanpa menu (opsional): {"path": "/nilai/rekap", "title": "Rekap"}
}
```

## 3. Tulis model, view, URL
* `models.py` — tabel milik modul. **Jangan mengubah tabel core.**
* `views.py` — view tipis; setiap view wajib memakai izin:
  ```python
  class NilaiListView(APIView):
      permission_classes = [PermByMethod]
      perm_map = {"GET": "nilai.view", "POST": "nilai.input"}   # metode tanpa izin ditolak
  ```
* `urls.py` — otomatis dipasang di `/api/nilai/`.
* Jangan memeriksa nama peran. Periksa **kode izin** saja.

## 4. Halaman frontend — `frontend/src/modules/nilai/manifest.ts`
Daftarkan rute: `path`, `title`, `section` (breadcrumb), `perm`, dan `component` (lazy). Taruh halaman di `pages/`. Pakai komponen `@/components/ui/*`, `api` dari `@/lib/api`, peringatan dari `@/lib/alert`, dan format lewat `@/lib/format` (lihat `docs/PANDUAN-STYLE.md`). Setiap tampilan data memiliki 4 kondisi: normal, memuat, kosong, galat. Tombol aksi disembunyikan dengan `useAuth().can("nilai.input")`.

## 5. Aktifkan
```bash
.venv/bin/python manage.py makemigrations nilai && .venv/bin/python manage.py migrate
```
`migrate` juga menyinkronkan izin, modul, dan menu dari manifest. Restart backend (pm2/gunicorn); frontend dev memuat ulang otomatis.

Lalu di **panel admin** (`/admin`): **Peran & izin** — centang izin `nilai.*` pada peran yang berhak. **Modul** — saklar aktif/nonaktif. **Menu portal** — ubah judul/urutan, sembunyikan item, atau tambah tautan lain ke navbar.

## Aturan
* Item menu dari manifest hanya dapat diubah judul dan urutannya, atau disembunyikan; kustomisasi admin tidak tertimpa saat sinkron.
* Modul nonaktif: menunya hilang dan API-nya menjawab 403 `MODULE_INACTIVE`.
* Mengimpor dari modul lain hanya bila tercantum di `depends_on`.
* Tambahkan tes: tiap rute baru otomatis masuk matriks izin (`backend/tests/test_permission_matrix.py`) — tes gagal bila view tanpa izin.

## Tambahan: dataset dan snippet untuk page builder
* `"datasets"` di `manifest.py` membuka tabel modul (baca saja) sebagai sumber **Tabel data / Kartu statistik / Grafik** di halaman buatan admin.
* Potongan tampilan khusus untuk halaman: **snippet**, satu file React di `frontend/src/snippets/` (`manage.py startsnippet pages.nama [--with-data]`), tanpa mendaftar di manifest. Lihat `TUTORIAL-SNIPPETS.md`.
* Detail: `docs/PANDUAN-BLOK.md`. Admin juga dapat melihat cara menambah modul dari panel (*Modul › Tambah modul*).
