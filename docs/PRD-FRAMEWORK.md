# PRD — Framework Core SIAKAD Modular

> Versi 0.8 · 9 Okt 2026 · Pemilik repositori dan pembuat pull request: Arif.
> Terpasang di `dev-siakadku.riplabs.co.id` sebagai sample untuk ditinjau tim. Dibangun terpisah dari demo SiakadKu (`siakadku.riplabs.co.id`), tetapi memakai **konsep yang sama** (lihat §11 dan `docs/PRD-DEMO.md` di proyek demo).
> Dokumen ini adalah satu-satunya sumber kebutuhan framework; riwayat revisi ada di §12.

## 1. Ringkasan dan tujuan

Framework core adalah fondasi SIAKAD modular: login, hak akses berbasis peran (RBAC), menu portal yang terbentuk dari modul aktif **dan setelan admin**, halaman yang dirakit admin dari blok, serta *snippet* (potongan tampilan dari file React) untuk kebutuhan khusus. Tim lain menambah modul akademik tanpa mengubah core.

Tahap ini membangun framework, konten sample (lima modul kecil, 12 snippet, 13 halaman, menu untuk semua peran), dan panduan. Modul SIAKAD yang sesungguhnya disusun tim lain setelah rapat penentuan modul.

**Selesai bila** enam hal ini dapat didemokan:
1. Pengguna login di portal dan melihat menu yang sesuai perannya.
2. Admin login di panel admin yang terpisah.
3. Peran dan izin diatur lewat panel admin.
4. Navbar portal berubah sesuai peran, modul aktif, dan setelan menu admin.
5. Admin membuat halaman dari blok dan snippet tanpa menyentuh kode.
6. Modul baru dapat ditambahkan hanya dengan menaruh satu folder (`startmodule`), snippet baru dengan satu file.

## 2. Dua area aplikasi

| | Portal pengguna | Panel admin |
|---|---|---|
| Alamat | `/masuk`, `/` (Beranda), `/<modul>`, `/<alamat-halaman>` | `/admin/masuk`, `/admin`, `/admin/*` |
| Siapa | Semua pengguna | Akun dengan izin `core.*.manage` |
| Login | Halaman sendiri: ilustrasi kampus + form (gaya portal akademik) | Halaman sendiri: panel navy dengan efek ShapeWaves (WebGPU) + form; menolak akun tanpa izin admin |
| Kerangka | Kop + **navbar dropdown** (laci HP) | **Sidebar kiri** + top bar (laci HP) |
| Isi | Beranda, halaman modul, halaman buatan admin | Dashboard, Peran & izin, Pengguna, Modul, Halaman & akses, Snippet, Menu portal |
| Menu | Dari data (`MenuItem`): manifest modul + setelan admin | Tetap (sidebar), **dikelompokkan per kategori dengan submenu dropdown**, disaring izin |

Sesi memakai satu cookie. Dari login portal ada tautan **Panel Admin** (`/admin`); setelah masuk, admin melihat tombol **Panel Admin** di kop portal. Tombol hamburger di HP berada di **kanan** kop dan laci terbuka dari kanan.

## 3. Ruang lingkup

| Termasuk | Tidak termasuk (menyusul / dikerjakan tim lain) |
|---|---|
| Login, logout, sesi; dua halaman login | Modul akademik sungguhan (KRS, absensi, yudisium, dst.) |
| Peran, izin, penugasan peran | Pembayaran online, kuitansi, cicilan |
| Registri modul + menu dinamis + saklar modul | PMB, chatbot, notifikasi WhatsApp |
| Portal + panel admin | Lisensi berbayar dan multi-kampus |
| Page builder (blok), snippet, dataset modul | Integrasi Neo Feeder/PDDikti, SSO |
| Empat modul **contoh** (pengumuman, jadwal, nilai, keuangan) + Data Mahasiswa, sebagai bukti kontrak modul dan RBAC "milik sendiri" | Unggah berkas/gambar, editor teks WYSIWYG |
| Panduan modul, style, snippet, halaman | Ekspor/impor halaman antar-server |

Empat modul contoh sengaja sederhana (tanpa cicilan, pembayaran, atau KRS) dan berdata fiktif; fungsinya mendemokan kerangka, bukan menggantikan modul sungguhan.

## 4. Peran dan izin

Lima peran awal adalah data seed (`core/seed.py`), bukan kode. Peran dapat ditambah atau diubah dari panel admin tanpa deploy ulang. **Kode tidak boleh memeriksa nama peran**; selalu memakai kode izin. Peran hanyalah kumpulan izin.

| Izin | Admin | Staf akademik | Dosen | Mahasiswa | Pimpinan |
|---|:-:|:-:|:-:|:-:|:-:|
| `core.roles/users/modules/menu.manage` (panel admin) | ✔ | | | | |
| `mahasiswa.view` / `.create` | | ✔ / ✔ | ✔ / | | ✔ / |
| `pengumuman.view` / `.manage` | | ✔ / ✔ | ✔ / | ✔ / | ✔ / |
| `jadwal.view` / `.manage` | | ✔ / ✔ | ✔ / | ✔ / | ✔ / |
| `nilai.view` / `.view_all` / `.input` | | ✔ / ✔ / ✔ | ✔ / ✔ / ✔ | ✔ / / | ✔ / ✔ / |
| `keuangan.view` / `.view_all` / `.manage` | | ✔ / ✔ / ✔ | | ✔ / / | ✔ / ✔ / |

Pola "**milik sendiri**": mahasiswa memegang `*.view` tanpa `*.view_all`; server mencocokkan **NIM akun** (`User.identifier`) dengan data, sehingga mahasiswa hanya melihat nilai dan tagihannya sendiri (parameter `?nim=` diabaikan). Pemegang `*.view_all` dapat mencari mahasiswa mana pun, tetapi tabel tidak pernah dikirim utuh tanpa kata kunci.

## 5. Kebutuhan fungsional

Prioritas: **M** wajib, **S** sebaiknya ada.

### 5.1 Autentikasi dan RBAC
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| AUT-01 | M | Login dan logout dengan username + kata sandi | Kata sandi salah ditolak dengan pesan seragam; logout mengakhiri sesi dan langsung mengarahkan ke halaman login area yang dipakai |
| AUT-02 | M | `GET /api/auth/me/` | Mengembalikan profil, peran, izin, modul nonaktif, dan pohon menu pengguna |
| AUT-03 | S | Batas percobaan login | 5 kali gagal berturut-turut mengunci akun sementara |
| AUT-04 | M | Login admin terpisah | `/admin/masuk` menolak akun tanpa izin admin dan menutup sesinya; `/admin/*` tanpa login mengarah ke `/admin/masuk` |
| RBAC-01 | M | Model Role, Permission, RolePermission, UserRole | Satu pengguna dapat memiliki lebih dari satu peran; izin efektif = gabungan |
| RBAC-02 | M | Setiap endpoint dan halaman memeriksa kode izin | Tanpa izin: API 403, halaman "Akses ditolak"; tiap rute API masuk matriks izin (tes otomatis) |
| RBAC-03 | M | Kelola peran dan izin (panel admin) | Admin menambah peran, mencentang izin; berlaku tanpa deploy; tidak dapat mencabut izin kelola miliknya sendiri |
| RBAC-04 | M | Kelola pengguna (panel admin) | Buat, nonaktifkan, tetapkan peran, reset kata sandi (sementara, tampil sekali) |
| RBAC-05 | M | Data milik sendiri | Mahasiswa hanya menerima baris dengan NIM akunnya; tes membuktikan `?nim=` orang lain diabaikan |

### 5.2 Modul dan menu
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| MOD-01 | M | Registri modul: manifest ditemukan otomatis | Folder modul baru muncul di daftar modul tanpa mengubah core |
| MOD-02 | M | Saklar aktif/nonaktif modul | Modul nonaktif: menu hilang dan API menjawab 403 `MODULE_INACTIVE`; ketergantungan (`depends_on`) ditegakkan |
| MOD-03 | S | Menu modul nonaktif tampil terkunci | Diatur `SHOW_LOCKED_MODULE_MENU` (bawaan: hilang) |
| MENU-01 | M | Menu adalah data (`MenuItem`) | Item tampil bila aktif, modulnya aktif, izin dimiliki, dan induknya tampil; grup tanpa anak dihilangkan |
| MENU-02 | M | Admin membuat, mengubah, mengurutkan, menyembunyikan item dan grup | Perubahan tampil di navbar tanpa deploy |
| MENU-03 | M | Item manifest disinkronkan saat `migrate` | Kustomisasi admin tidak tertimpa; item yang hilang ditandai yatim, tidak dihapus |
| MENU-04 | M | Validasi: tujuan halaman terdaftar atau URL https; kedalaman maks 2; judul ≤ 40 karakter, unik di induk | Input tidak valid ditolak dengan pesan spesifik |
| MENU-05 | M | Item inti (`is_system`) tidak dapat dihapus; hanya judul, urutan, tampil/sembunyi yang dapat diubah | Tes menolak percobaan lain |
| MENU-06 | M | Menyembunyikan menu bukan pengamanan | URL tanpa izin tetap 403 dari server |
| MENU-07 | M | Alamat `/admin/*` bukan bagian menu portal | Tidak dapat dijadikan tujuan menu |
| MENU-08 | M | Akses per peran untuk item menu buatan admin | Centang peran membuat izin otomatis; panel menampilkan peran tiap item |

### 5.3 Portal pengguna
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| PRT-01 | M | Login portal | Ilustrasi + form, rapi dari 360 px; "Lupa kata sandi?" menjelaskan meminta admin; tautan Panel Admin |
| PRT-02 | M | Beranda | Pesan selamat datang: sapaan, nama, peran |
| PRT-03 | M | Navbar dari setelan admin | Perubahan admin tampil setelah muat ulang atau kembali ke tab |
| PRT-04 | M | Responsif dari 360 px | Di bawah 1024 px navbar menjadi laci; hamburger di kanan |
| PRT-05 | M | Tombol **Panel Admin** untuk admin | Hanya terlihat bagi akun dengan izin admin |

### 5.4 Panel admin
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| ADM-01 | M | Kerangka sidebar kiri + top bar | Hanya bagian yang boleh diakses; di HP laci dari kanan |
| ADM-02 | M | Dashboard | Ringkasan jumlah pengguna, peran, modul aktif, item menu + penjelasan cara kerja |
| ADM-03 | M | Peringatan interaktif | Konfirmasi tindakan tak terbalik, toast keberhasilan, dialog galat penting (SweetAlert2) |
| ADM-04 | M | Peta akses *Halaman & akses* | Semua halaman (modul, bawaan, buatan admin) dengan peran yang boleh mengakses, menu yang mengarah ke sana, status |
| ADM-05 | M | Wizard *Tambah modul* | Menjelaskan jalur halaman + snippet dan jalur modul (`startmodule`), dengan perintah siap salin |
| ADM-06 | M | Sidebar berkategori dengan submenu dropdown | Dashboard dan Modul berdiri sendiri; *Akses & pengguna* (Peran & izin, Pengguna) dan *Konten portal* (Halaman & akses, Snippet, Menu portal) berupa dropdown yang dibuka klik/keyboard (`aria-expanded`); kategori yang sedang dibuka otomatis terbuka; kategori tanpa anak yang boleh diakses hilang; item baru cukup didaftarkan di `admin/nav.ts` |

### 5.5 Page builder
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| PAGE-01 | M | Admin membuat, mengubah, menerbitkan/draf, menghapus halaman di `/<alamat>` | Alamat milik sistem/modul ditolak; alamat tak dapat diubah setelah dibuat |
| PAGE-02 | M | Akses halaman per peran | Peran dipilih → izin otomatis; kosong → semua pengguna login; tanpa izin → server 403 |
| PAGE-03 | M | Tampilkan di menu dalam satu langkah | Satu form membuat halaman + item menu; draf menyembunyikan menu; hapus halaman menghapus menu |
| PAGE-04 | M | Mudah mengubah | Tombol **Ubah halaman** di halaman portal (admin) dan tautan di Menu portal |
| BLK-01 | M | Isi halaman = daftar blok: teks, gambar, info, tabel manual, tanya-jawab, tautan, tabel data, statistik, grafik, snippet | Validasi ketat per tipe; kolom tak dikenal ditolak; galat menyebut nomor dan jenis blok |
| BLK-02 | M | Editor visual: tambah, urut, gandakan, hapus; pratinjau dengan data nyata | Peringatan perubahan belum disimpan |
| DATA-01 | M | Dataset modul (`datasets` di manifest) untuk Tabel data / Statistik / Grafik | Hanya kolom terdaftar yang dapat dipilih/disaring; ORM saja |
| DATA-02 | M | Izin data per penonton | Tanpa izin dataset: halaman terbuka, blok menolak (403) tanpa merusak halaman |

### 5.6 Snippet
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| SNP-01 | M | Snippet = file `.tsx` di `frontend/src/snippets/` (folder bebas, bertingkat; nama = path dengan titik) dengan `export meta` + komponen | Muncul otomatis di editor dan panel admin › Snippet; tanpa daftar manifest; berawalan `_` dan `*_deleted` diabaikan |
| SNP-02 | M | Pemasangan: `[snippet:nama key=value]` di blok Teks, atau blok Snippet dengan formulir isian | Isian dari `meta.params`; kurung/tautan biasa tidak terpengaruh |
| SNP-03 | M | Sisi server opsional: `backend/snippets/<path sama>.py` (`PERMISSION`, `data(user, params)`) lewat satu endpoint `/api/snippets/<nama>/data/` | `PERMISSION` ditegakkan; nama dan parameter divalidasi |
| SNP-04 | M | Penanda `EDIT_ADD_FILE_HERE` di kedua folder + `TUTORIAL-SNIPPETS.md` | Developer baru tahu lokasi edit dan alurnya |
| SNP-05 | M | CRUD snippet dari panel admin | Buat = file kerangka dari template tetap (nilai form di-escape); hapus = status nonaktif + file diganti nama `*_deleted` (tidak hilang); pulihkan; daftar menyinkron file tulisan tangan; jumlah pemakaian ditampilkan |
| SNP-06 | S | `manage.py startsnippet <nama> [--with-data]` | Membuat file React (+ Python) siap pakai |

Kode snippet **tidak diedit dari browser**: web hanya membuat kerangka; isi kode lewat IDE dan Git (aman untuk server, ada review).

### 5.7 Pengembangan
| ID | P | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| DEV-01 | M | Modul contoh | `mahasiswa`, `pengumuman`, `jadwal`, `nilai`, `keuangan` dengan data fiktif (`seed_samples`) |
| DEV-02 | M | `manage.py startmodule <kode>` | Membuat kerangka modul backend dan frontend |
| DEV-03 | M | Panduan | `docs/PANDUAN-MODUL.md`, `PANDUAN-STYLE.md`, `PANDUAN-BLOK.md`, `PANDUAN-MENU-HALAMAN.md`, `TUTORIAL-SNIPPETS.md` |
| DEV-04 | S | Tombol isi otomatis login (mode dev) | Kata sandi dari `frontend/.env.local`; tidak ada di build produksi |
| UI-01 | M | NIM hanya angka | Form menyaring huruf; server menolak (400) |

## 6. Kontrak modul dan struktur kode

Satu modul = satu folder backend + satu folder frontend; core menemukannya lewat manifest. Halaman modul tampil di **portal**; panel admin hanya untuk setelan core.

```
backend/
  core/                       # user, RBAC, registri modul, menu, halaman, snippet
  modules/<kode>/             # manifest.py (izin, menu, datasets), models, views, urls, seed_*.py
  snippets/                   # (opsional) sisi Python snippet, nama file = snippet   <- EDIT_ADD_FILE_HERE
frontend/src/
  core/pages/  admin/  layouts/  components/
  modules/<kode>/             # manifest.ts (rute), pages/
  snippets/                   # satu file .tsx = satu snippet                        <- EDIT_ADD_FILE_HERE
```

Manifest backend (ringkas):

```python
MANIFEST = {
    "code": "nilai", "name": "Nilai & KHS", "icon": "clipboard-check", "depends_on": [],
    "permissions": [{"code": "nilai.view", "name": "…"}, {"code": "nilai.view_all", "name": "…"}, {"code": "nilai.input", "name": "…"}],
    "datasets": [{"code": "nilai", "label": "Nilai mahasiswa", "model": "Nilai", "perm": "nilai.view_all",
                  "fields": [{"name": "nim", "label": "NIM", "type": "text"}]}],
    "menu": [{"group": "Akademik", "title": "Nilai & KHS", "to": "/nilai", "perm": "nilai.view"}],
}
```

Aturan: izin dan menu disinkronkan saat `migrate`/`sync_modules`; menu tampil bila modul aktif **dan** izin dimiliki; modul tidak boleh mengubah tabel core; serializer berfield eksplisit dan menolak kolom tak dikenal.

## 7. Konten sample (`manage.py seed_samples`)

Idempoten, seluruhnya fiktif; memberi izin sample ke peran awal, mengisi data tiap modul, dan membuat halaman + menu. Akun uji dibuat `seed_roles` (kata sandi dari `.env`).

| Jenis | Isi |
|---|---|
| **Modul** (5) | `mahasiswa`, `pengumuman`, `jadwal`, `nilai`, `keuangan` |
| **Snippet** (12) | `pages.data_ijazah`, `pages.data_ijazah.upload_form`, `info.pengumuman_terbaru`, `info.kalender_akademik`, `info.kontak_bagian`, `info.faq_krs`, `info.tautan_cepat`, `akademik.jadwal_hari_ini`, `akademik.progres_sks`, `keuangan.ringkasan_tagihan`, `dosen.mahasiswa_bimbingan`, `pimpinan.ringkasan_kampus` |
| **Halaman** (13) | `layanan-saya` (mahasiswa), `kalender-akademik`, `layanan-ijazah`, `kontak-layanan`, `tata-tertib`, `perpustakaan`, `faq-umum` (semua), `panduan-krs` (mahasiswa/dosen/staf), `info-beasiswa` (mahasiswa/staf), `info-wisuda` (mahasiswa/staf/pimpinan), `panduan-dosen-wali`, `pedoman-penilaian` (dosen/staf), `ringkasan-kampus` (pimpinan/staf) |
| **Menu** | Grup Akademik, Keuangan, Informasi, Layanan Dosen, Pimpinan + Layanan saya; 20 item. Tiap peran melihat 3–5 menu berbeda |

## 8. Non-fungsional dan stack

| Aspek | Ketentuan |
|---|---|
| Stack | Python 3.12, Django 5.2 LTS + DRF; React + Vite + TypeScript + Tailwind v4; TanStack Query; React Hook Form + zod; react-router; SweetAlert2; vgpu 0.3.1 (hanya efek login admin) |
| Basis data | MySQL 8.4 |
| Autentikasi | Sesi cookie + CSRF; kata sandi Argon2id |
| Keamanan | ORM saja; izin diperiksa di server; HTML dari admin tidak dijalankan; kode snippet hanya lewat Git; nama dan parameter snippet divalidasi |
| Aksesibilitas | Navbar dan sidebar dapat dioperasikan keyboard; kontras ≥ 4,5:1; checkbox/radio asli tetap ada |
| Tampilan | Portal: kop + navbar dropdown. Admin: sidebar kiri. `docs/UI-FRAMEWORK.md`, `docs/PANDUAN-STYLE.md` |
| Deploy | Manual di VPS (nginx + gunicorn + systemd), tanpa Docker; `dev-siakadku.riplabs.co.id`. Uji lokal: pm2. Di produksi file snippet baru tampil setelah `npm run build` |
| Pengujian | Backend (pytest) dan frontend (vitest) mencakup login, izin, registri modul, validasi menu/blok, kepemilikan data, snippet, pemisahan portal/admin; `scripts/check.sh` harus hijau |

## 9. Urutan kerja dan status

| # | Langkah | Status |
|---|---|---|
| 1 | Skeleton, token desain, koneksi database | ✔ |
| 2 | Login + RBAC, seed lima peran | ✔ |
| 3 | Registri modul + menu dinamis | ✔ |
| 4 | Panel admin (peran, pengguna, modul, menu) di `/admin` | ✔ |
| 5 | Portal: login baru, Beranda | ✔ |
| 6 | Page builder, dataset, snippet (+ CRUD dari panel) | ✔ |
| 7 | Modul contoh, `startmodule`, `startsnippet`, panduan | ✔ |
| 8 | Konten sample untuk semua peran (`seed_samples`) | ✔ |
| 9 | Demo di rapat: deploy ke dev-siakadku.riplabs.co.id | ⏳ menunggu akses VPS |

## 10. Keputusan dan pertanyaan terbuka

Keputusan Arif (9 Okt 2026):
* Sample/demo dahulu karena belum ada brief proyek; direvisi setelah rapat. Satu kampus dulu; model multi-kampus dipikirkan nanti.
* Dipasang di `dev-siakadku.riplabs.co.id` (VPS pribadi Arif), terpisah dari demo SiakadKu.
* Portal dan panel admin dipisah total. Setelan (peran, pengguna, modul, halaman, snippet, menu) hanya di panel admin.
* Kustomisasi tampilan khusus lewat **snippet** (file di Git), bukan blok kustom di manifest dan bukan editor kode di browser. Fitur "Data" (tabel buatan admin) dibuang karena berlebihan.
* Konsep tiap modul akademik dibahas lewat brief terpisah sebelum dikerjakan.

Masih terbuka (untuk rapat):
- [ ] Siapa yang menyusun daftar modul dan brief, dan kapan rapatnya? Tim mana memegang modul apa?
- [ ] Apakah ini untuk proyek nyata; bila ya, domain dan instansinya apa?
- [ ] Perlu unggah gambar/berkas dan ekspor/impor halaman antar-server?
- [ ] Menu modul nonaktif: hilang (bawaan) atau tampil terkunci?
- [ ] Foto kampus asli dan nama kampus untuk halaman login (sekarang ilustrasi + "Universitas Contoh", `VITE_CAMPUS_NAME`).

## 11. Hubungan dengan demo SiakadKu

Proyek demo (`siakadku-demo`, multi-kampus) mengadopsi konsep framework ini: dua area (portal + panel admin), RBAC berbasis kode izin, menu sebagai data, page builder + snippet, panduan style yang sama, dan kontrak modul yang sama agar modul dapat dipindah antar proyek. Daftar keputusan penyelarasan: `docs/PRD-DEMO.md` §2 (K8–K15) di proyek demo.

## 12. Riwayat revisi

| Versi | Perubahan |
|---|---|
| 0.1 | PRD awal: login, RBAC, registri modul, menu, satu modul contoh |
| 0.2 | Dua area (portal + panel admin sidebar), login terpisah, hamburger kanan, SweetAlert2, logout diperbaiki |
| 0.3 | Halaman buatan admin, akses per peran, peta akses, NIM hanya angka |
| 0.4 | Page builder berbasis blok, alamat `/<alamat>`, dataset modul |
| 0.5 | Fitur Data dan blok kustom manifest dihapus; diganti snippet (file React + opsional Python) |
| 0.6 | CRUD snippet dari panel admin (kerangka file otomatis, hapus = soft delete + `*_deleted`) |
| 0.7 | PRD ditulis ulang konsisten; konten sample (4 modul, 12 snippet, 13 halaman, menu semua peran), pola data milik sendiri, hubungan dengan demo |
| 0.8 | Sidebar panel admin dikelompokkan per kategori dengan submenu dropdown (ADM-06) |
