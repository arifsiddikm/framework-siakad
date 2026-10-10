# Tutorial singkat: snippet (potongan halaman dari file React)

**Snippet** = satu file React yang bisa dipasang di halaman mana pun dari panel admin. Seperti shortcode WordPress, tapi kodenya ada di Git.

## Di mana mengedit?
```
frontend/src/snippets/        <- TARUH / EDIT FILE REACT DI SINI   (lihat file EDIT_ADD_FILE_HERE)
backend/snippets/             <- (opsional) sisi Python, nama file SAMA   (lihat EDIT_ADD_FILE_HERE)
```
Nama file (dengan folder) = nama snippet. Folder bebas, bertingkat boleh:

| File React | Nama snippet |
|---|---|
| `frontend/src/snippets/pages/data_ijazah.tsx` | `pages.data_ijazah` |
| `frontend/src/snippets/pages/data_ijazah/upload_form.tsx` | `pages.data_ijazah.upload_form` |
| `frontend/src/snippets/laporan/ujian.tsx` | `laporan.ujian` |

Berkas atau folder berawalan `_` (mis. `_TEMPLATE.tsx`) diabaikan.

## Membuat snippet
**Cara termudah — dari panel admin:** menu **Snippet › Snippet baru**. Isi nama (path dengan titik), nama tampil, deskripsi, isian pengaturan (opsional), dan centang *Butuh data dari server* bila perlu. File kerangka dibuat otomatis dan rapi di folder yang benar (React, plus Python bila dicentang).

Atau lewat terminal: `cd backend && .venv/bin/python manage.py startsnippet pages.laporan_ujian [--with-data]`, atau salin `frontend/src/snippets/_TEMPLATE.tsx`.

Setelah itu (3 langkah):
1. File kerangka sudah ada (dari web atau terminal).
2. **Edit isi `.tsx`-nya di IDE** — web hanya membuat kerangka dari template tetap, tidak mengedit kode (sengaja, demi keamanan server dan agar semua kode lewat Git). Export `meta` (nama di editor + daftar isian) dan komponen `default`:
   ```tsx
   export const meta: SnippetMeta = { label: "Laporan ujian", params: [{ name: "judul", label: "Judul", type: "text", default: "Laporan" }] };
   export default function Snippet({ params, data }: SnippetProps) { return <Card className="p-5">{String(params.judul)}</Card>; }
   ```
3. Simpan dan commit. Di mode pengembangan snippet langsung muncul di daftar editor; di server produksi jalankan `npm run build` agar file baru ikut.

**Menghapus:** menu Snippet › ikon tempat sampah. Tidak dihapus permanen: status jadi *Dihapus* dan file diganti nama `nama_deleted.tsx` (dan `.py`), jadi bisa **Dipulihkan** kapan saja. Snippet yang masih dipakai di halaman akan menampilkan peringatan sampai dilepas.

## Memasang di halaman
Panel admin › **Halaman & akses** › edit halaman:
* Di blok **Teks**, tulis pada baris sendiri: `[snippet:pages.data_ijazah]` — dengan isian: `[snippet:pages.data_ijazah limit=5 status="Siap diambil"]`. Pilihan **Sisipkan snippet** di atas kotak teks menulisnya untuk Anda.
* Atau tambah blok **Snippet** dan pilih dari daftar (isian berupa formulir).
* Daftar semua snippet + lokasi file + tombol salin kode: panel admin › **Snippet**.

## Data dari server (opsional)
Buat file Python dengan **path yang sama** di `backend/snippets/`:
```python
# backend/snippets/pages/data_ijazah.py
PERMISSION = "mahasiswa.view"          # izin yang dibutuhkan; None = semua yang login

def data(*, user, params):             # params dari admin: anggap TIDAK tepercaya
    return {"rows": [...]}             # JSON apa saja -> props.data di React
```
Tandai `hasData: true` di `meta`. Hanya ada satu endpoint (`/api/snippets/<nama>/data/`); tidak ada manifest yang diisi. ORM saja, tanpa SQL mentah.

## Aturan singkat
* Tampilan: komponen dari `@/components/ui/*`, ikut `docs/PANDUAN-STYLE.md`.
* Data sensitif: wajib set `PERMISSION`. Menyembunyikan menu bukan pengaman.
* Perubahan kode lewat Git (cabang → review → deploy). Konten halaman (teks, peran, menu) diubah admin di panel, tidak lewat Git.
* Lebih lengkap: `docs/PANDUAN-BLOK.md`.
