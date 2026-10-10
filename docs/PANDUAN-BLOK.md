# Panduan: page builder dan snippet

Halaman portal dirakit admin dari **blok** di panel admin (*Halaman & akses*). Untuk tampilan atau data khusus, developer menambah **snippet**: satu file React di folder `frontend/src/snippets/`, yang dipasang admin di halaman mana pun. Tutorial singkat snippet: `TUTORIAL-SNIPPETS.md` (folder utama).

## 1. Alamat halaman
Halaman buatan admin tampil di **`/alamat`** (contoh `/pusat-informasi`). Alamat yang dipakai sistem atau modul (`admin`, `masuk`, `api`, `profil`, `mahasiswa`, kode modul lain, dst.) ditolak. Alamat tidak dapat diubah setelah dibuat.

## 2. Jenis blok

| Blok | Fungsi |
|---|---|
| **Teks** | Judul, paragraf, daftar, daftar bernomor, kutipan, garis, gambar, tabel, **tebal**/*miring*/`kode`/tautan, dan **shortcode snippet** `[snippet:nama]` |
| **Gambar** | Gambar dari alamat `https://` + keterangan |
| **Info penting** | Kotak informasi / berhasil / peringatan / bahaya |
| **Tabel manual** | Tabel yang diisi sendiri; bisa **tempel dari Excel/CSV** |
| **Tanya-jawab** | Daftar buka-tutup |
| **Tombol tautan** | Tombol ke situs luar (https) atau halaman portal |
| **Tabel data / Kartu statistik / Grafik batang** | Data dari **dataset modul** (bagian 4): kolom, urutan, syarat saring, jumlah/total/rata-rata |
| **Snippet** | Potongan tampilan dari file React (bagian 3) |

Susun dengan tombol panah, gandakan, hapus. Tab **Pratinjau** menampilkan hasil dengan data nyata. HTML mentah tidak dijalankan.

## 3. Snippet (file React, seperti shortcode WordPress)
* **Lokasi**: `frontend/src/snippets/` (penanda `EDIT_ADD_FILE_HERE`). Satu `.tsx` = satu snippet; nama = path file dengan titik, folder bebas dan bertingkat (`pages/data_ijazah/upload_form.tsx` → `pages.data_ijazah.upload_form`). Berawalan `_` diabaikan.
* **Daftar otomatis**: tidak ada manifest/registrasi. Backend ikut membaca nama file yang sama untuk memvalidasi.
* **Isian untuk admin**: `export const meta` berisi `label`, `hint`, `hasData`, dan `params` (text/number/boolean/select) → menjadi formulir di blok Snippet dan bisa ditulis `key=value` di shortcode.
* **Data server opsional**: file Python `backend/snippets/<path yang sama>.py` dengan `PERMISSION` dan `data(user, params)`; diakses lewat satu endpoint `/api/snippets/<nama>/data/`.
* **Memasang**: shortcode di blok Teks (`[snippet:pages.data_ijazah limit=5]`, pilihan *Sisipkan snippet* membantu) atau blok **Snippet**. Daftar + lokasi file + tombol salin ada di panel admin › **Snippet**.
* **Membuat**: dari panel admin (**Snippet › Snippet baru**: file React, dan Python bila dicentang, dibuat otomatis sebagai kerangka dari template tetap; nilai dari form hanya masuk sebagai data ber-escape) atau `manage.py startsnippet pages.nama_baru [--with-data]`. Isi kode diedit developer di IDE dan di-commit.
* **Menghapus/memulihkan**: dari panel (soft delete): status jadi nonaktif dan file diganti nama `*_deleted` (tidak ada yang hilang), bisa dipulihkan. Panel menunjukkan berapa halaman yang masih memakai snippet itu.
* **Keamanan**: nama divalidasi (tanpa `..`/`/`), parameter dibatasi (teks/angka ≤ 300 karakter, maks 20), provider Python wajib set `PERMISSION` untuk data sensitif dan memperlakukan `params` sebagai input tak tepercaya. Kode hanya masuk lewat Git, tidak diunggah dari browser.

## 4. Dataset modul (untuk Tabel data / Statistik / Grafik)
Developer membuka tabel modul (baca saja) di `backend/modules/<kode>/manifest.py`:
```python
"datasets": [{
    "code": "mahasiswa", "label": "Data mahasiswa",
    "model": "Mahasiswa",              # nama class model di modul ini
    "perm": "mahasiswa.view",          # izin untuk melihat datanya (None = semua yang login)
    "fields": [{"name": "nim", "label": "NIM", "type": "text"},   # text | number | date | boolean
               {"name": "angkatan", "label": "Angkatan", "type": "number"}],
}],
```
Hanya kolom di `fields` yang dapat dipilih atau disaring; kueri lewat ORM. Angka dihitung server saat halaman dibuka dengan izin pengguna yang melihat: tanpa izin dataset, halaman tetap terbuka dan hanya blok itu yang menolak. Jangan memasukkan kolom sensitif.

Untuk data atau perhitungan yang tidak cocok dengan blok ini, pakai **snippet dengan data server**.

## 5. Alur kerja tim (Git)
* **Admin**: halaman, menu, akses → panel admin (database, bukan Git).
* **Developer**: modul, dataset, snippet → cabang Git → pull request → review → deploy (`migrate`, restart).
* Konten admin tidak ikut Git; untuk memindahkan antar-server, salin database atau buat ulang.

## 6. Batas
Maks 60 blok per halaman; teks 20.000 karakter per blok; tabel manual 12 kolom × 200 baris; gambar harus `https://` (belum ada unggah file).
