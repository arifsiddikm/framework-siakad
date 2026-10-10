# Panduan: menambah dan mengubah menu & halaman

Untuk admin kampus dan tim pengembang. Semua dikelola di **panel admin** (`/admin`), tanpa menyentuh kode.

## Dua jenis halaman

| Jenis | Siapa yang membuat | Mengubah isinya |
|---|---|---|
| **Halaman admin** (alamat `/<alamat>`) | Admin, di *Halaman & akses* | Panel admin: *Halaman & akses › Ubah* |
| **Halaman modul** (contoh `/mahasiswa`) | Pengembang, lewat modul (`docs/PANDUAN-MODUL.md`) | Kode modul. Admin hanya mengatur **siapa yang boleh mengakses** dan **posisi menunya** |
| **Bawaan** (Beranda, Profil, Keamanan) | Kerangka | Tidak diubah dari admin |

## Menambah halaman baru (± 1 menit)

1. **Panel admin › Halaman & akses › Halaman baru**.
2. Isi **Judul** (alamat terisi otomatis dan tidak bisa diubah setelah dibuat), lalu susun isi dari **blok**: teks, gambar, tabel, tanya-jawab, tabel data, kartu statistik, grafik, atau **snippet** buatan developer (`[snippet:nama]` atau blok Snippet; lihat `TUTORIAL-SNIPPETS.md`).
3. Pilih **Peran yang boleh melihat**. Tidak ada yang dicentang = semua pengguna yang sudah login.
4. Nyalakan **Tampilkan di menu portal**, isi judul menu (maks 40 karakter) dan pilih grup (atau tingkat atas navbar).
5. **Buat halaman**. Pengguna melihatnya setelah memuat ulang atau kembali ke tab.

Format blok Teks: `# Judul`, `## Sub judul`, `- daftar`, `1. bernomor`, `> kutipan`, `---`, `![gambar](https://…)`, tabel `| a | b |`, `**tebal**`, `*miring*`, `` `kode` ``, `[teks](https://…)`. HTML tidak diproses (aman). Data dinamis (tabel, statistik, grafik) lewat blok khusus.

## Mengubah halaman yang sudah ada

* **Dari panel admin**: *Halaman & akses* → baris halaman → **Ubah** (judul, isi, peran, tampil di menu, terbit/draf) atau **Hapus** (menu ikut terhapus).
* **Dari portal**: buka halamannya sebagai admin → tombol **Ubah halaman** di pojok kanan atas. Di daftar *Menu portal* juga ada tautan **Ubah isi halaman**.
* **Draf**: matikan *Terbitkan halaman*; halaman dan menunya hilang dari pengguna, isinya tetap tersimpan.

## Menu tanpa halaman (tautan luar, grup)

**Panel admin › Menu portal › Tambah item**:
* **Grup** = dropdown di navbar; isi dengan item di dalamnya (grup kosong tidak tampil).
* **Tautan** = satu menu ke halaman yang ada, halaman buatan admin, atau alamat `https://` situs lain (dibuka di tab baru).
* **Siapa yang boleh melihat**: centang peran; kosong = semua pengguna yang sudah login.
* Urutan: tombol panah. Sembunyikan sementara: saklar. Item **Inti** (dari modul) hanya bisa diganti judul/urutannya atau disembunyikan.

## Melihat siapa yang boleh membuka apa

*Halaman & akses* menampilkan semua halaman portal: **Dapat diakses oleh** (peran atau "Semua pengguna yang login"; amber "Belum ada peran" = belum ada yang bisa membukanya), **Di menu** (item menu yang mengarah ke sana), dan statusnya. Untuk halaman modul, klik **Atur akses** (membuka *Peran & izin*). *Menu portal* juga menampilkan "Dapat diakses oleh" di tiap item.

## Cara kerjanya (untuk pengembang)

* Akses selalu berupa **kode izin**. Memilih peran untuk halaman/menu membuat izin otomatis (`core.page.<alamat>.view`, `core.menu_item.<id>.view`) dan memberikannya ke peran itu. Server menolak (403) pembukaan halaman tanpa izin, bukan hanya menyembunyikan menu.
* `GET /api/pages/<alamat>/` melayani blok halaman (harus login; 404 bila draf; 403 tanpa izin); `GET /api/pages/<alamat>/blocks/<id>/` menghitung data satu blok untuk pengguna itu. Portal merender lewat `BlockRenderer` dan `RichText`, tanpa `dangerouslySetInnerHTML`.
* Panel admin tidak masuk menu portal; alamat `/admin/*` ditolak sebagai tujuan menu.
* Peta akses: `GET /api/admin/access-map/` (izin `core.menu.manage`).

## Pertanyaan umum

* **Menu tidak muncul di pengguna?** Cek: item tidak disembunyikan; peran pengguna dicentang (atau kosong); modulnya aktif; halaman berstatus Tayang.
* **Halaman modul tampil di menu tapi "Akses ditolak"?** Peran pengguna belum punya izin modulnya (*Peran & izin*). Menu buatan admin tidak menggantikan izin modul.
* **Mau tampilan khusus (tabel dari data server, formulir, kartu custom)?** Minta developer membuat **snippet**: satu file React di `frontend/src/snippets/` (`TUTORIAL-SNIPPETS.md`). **Fitur lengkap dengan tabel database sendiri?** Itu modul: `startmodule` (`docs/PANDUAN-MODUL.md`).
