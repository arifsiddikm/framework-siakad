# UI Framework — layar dan kerangka (v0.2)

> Dua area terpisah: **portal pengguna** (login, Beranda, modul) dan **panel admin** (semua setelan). Aturan visual rinci untuk tim ada di `docs/PANDUAN-STYLE.md`.
> Tangkapan di `design/screens/ref-*.png` adalah acuan kerangka navbar dropdown/laci dari proyek SiakadKu; isi halamannya bukan yang dibangun di sini.

## 1. Layar yang dibangun

### Portal pengguna (`/`)
| Layar | Alamat | Isi |
|---|---|---|
| Login | `/masuk` | Dua kolom: ilustrasi/foto kampus + teks "Selamat datang" di kiri; logo, form username + kata sandi (isian berlatar biru muda, tanda `*` merah, tombol mata, "Lupa kata sandi?") di kanan. Di HP: foto menjadi spanduk di atas form. Tautan **Panel Admin** di pojok atas. Tombol isi otomatis hanya di mode dev |
| Beranda | `/` | Pesan selamat datang: sapaan, nama, peran. Tanpa statistik dan tanpa tautan cepat |
| Profil saya / Keamanan akun | `/profil`, `/keamanan` | Data akun (baca saja); ganti kata sandi |
| 403 / 404 / Modul belum aktif | — | Satu kalimat + satu langkah berikutnya |
| Halaman modul | `/<modul>` | Milik tiap modul (contoh: `/mahasiswa`) |
| Halaman buatan admin | `/<alamat>` | Judul + blok (teks, gambar, tabel, data, statistik, grafik, snippet); admin melihat tombol **Ubah halaman** |

### Panel admin (`/admin`)
| Layar | Alamat | Izin |
|---|---|---|
| Login admin | `/admin/masuk` | — (menolak akun tanpa izin admin) |
| Dashboard | `/admin` | salah satu izin admin |
| Peran & izin | `/admin/peran` | `core.roles.manage` |
| Pengguna | `/admin/pengguna` | `core.users.manage` |
| Modul | `/admin/modul` | `core.modules.manage` |
| Halaman & akses | `/admin/halaman` (daftar), `/admin/halaman/baru`, `/admin/halaman/:id` (editor blok) | `core.menu.manage` |
| Snippet | `/admin/snippet` (daftar, buat kerangka file, hapus/pulihkan, lokasi file, salin kode) | `core.menu.manage` |
| Menu portal | `/admin/menu` | `core.menu.manage` |

## 2. Kerangka portal (kop + navbar dropdown)

* **Kop** navy-900, 72 px: lambang + nama aplikasi (Source Serif 4, 19 px) di kiri; di kanan tombol **Panel Admin** (hanya admin, ≥ 768 px), menu akun, dan **hamburger (< 1024 px)**. Kop ikut tergulir.
* **Navbar** navy-900, 48 px, **sticky**, hanya ≥ 1024 px: item 14/500; menu terbuka = latar putih 10%; halaman aktif = teks putih + garis bawah putih 3 px. Item tanpa anak = tautan langsung. Isinya dibangun dari `GET /api/auth/me/` (menu yang sudah disaring peran, modul, izin).
* **Dropdown**: panel putih, radius 12, takik, jarak 8 px; lebar 360 px (satu kolom) atau 660 px (dua kolom bila > 6 item). Item: ubin ikon 36 px + judul 14/600 + keterangan 12,5. Aktif = ubin `navy-700`. Terkunci = ubin amber + gembok → "Modul belum aktif".
* **Menu akun** (kanan, 310 px): Panel Admin (bila admin) · Profil saya · Keamanan akun · Keluar (merah, minta konfirmasi).
* **Perilaku**: klik/Enter/Spasi (bukan hover); satu panel terbuka; `Esc`/klik luar menutup dan mengembalikan fokus; `↓` fokus ke item pertama, `↑/↓` berpindah, `←/→` antar menu; WAI-ARIA disclosure.
* **Laci HP**: terbuka **dari kanan**, akordeon untuk grup, target sentuh ≥ 44 px, `Esc` menutup, fokus terkunci di dalam laci.
* Konten maks 1280 px, padding 28 px (HP 16 px); breadcrumb 13 px di halaman dalam (tidak di Beranda).

## 3. Kerangka panel admin (sidebar kiri)

* **Sidebar** navy-900, 256 px, tetap di kiri (≥ 1024 px): logo + "PANEL ADMIN", label bagian "PENGATURAN", item 14/500 dengan ikon; aktif = latar putih 10% + garis kiri putih 3 px; di bawah: "Buka portal pengguna". Item disaring izin.
* **Kategori dengan submenu dropdown**: Dashboard · *Akses & pengguna* (Peran & izin, Pengguna) · *Konten portal* (Halaman & akses, Snippet, Menu portal) · Modul. Kategori = tombol dengan ikon + chevron (`aria-expanded`, `aria-controls`), dibuka klik/Enter/Spasi (bukan hover); anak menjorok 12 px; kategori berisi halaman aktif terbuka otomatis, dan dapat ditutup manual. Kategori tanpa anak yang boleh diakses disembunyikan. Daftar ada di `admin/nav.ts`.
* **Login admin**: panel kiri navy dengan efek ShapeWaves (WebGPU; bila browser tidak mendukung, tetap navy polos) dan hanya logo di pojok; form di kanan terisi otomatis di mode dev.
* **Top bar** putih, 64 px, sticky: judul halaman di kiri; menu akun (Buka portal, Keluar) dan **hamburger (< 1024 px)** di kanan. Laci sidebar terbuka dari kanan.
* **Konten** `slate-50`, maks 1280 px: `PageHeader` (judul + deskripsi + aksi) lalu `Card`.

## 4. Peringatan (SweetAlert2)

| Situasi | Pakai |
|---|---|
| Berhasil disimpan/dibuat/dihapus | Toast kanan-bawah, hilang sendiri |
| Tindakan tak terbalik (hapus, reset, nonaktifkan modul, keluar) | Konfirmasi (tombol bahaya merah) |
| Galat yang harus dibaca (ditolak server, kunci diri sendiri) | Dialog galat: apa yang terjadi + langkah berikutnya |
| Galat isian form | Pesan di bawah kolom (bukan SweetAlert) |
| Rahasia sekali tampil (kata sandi sementara) | Dialog dengan tombol Salin |

## 5. Token dan gaya

Pakai `brand/tokens.css` (Tailwind v4; salinannya di `frontend/src/styles/tokens.css`). Navy untuk kop/sidebar/tombol utama; putih dan abu kebiruan selainnya; amber **hanya** untuk peringatan/terkunci/aksen sambutan. Font: IBM Plex Sans (UI), IBM Plex Mono (kode), Source Serif 4 (nama di kop) — self-host, `design/fonts/`. Ikon `lucide-react` stroke 1,75. Radius 10 (kartu) / 8 (kontrol). Tanpa gradasi, emoji, atau bayangan tebal (kecuali lapisan melayang).
Setiap tampilan data punya 4 kondisi: normal, memuat, kosong, galat. Status tidak hanya warna: warna + teks + titik/ikon. Kontras teks ≥ 4,5:1.

## 6. Struktur kode UI

```
frontend/src/
  layouts/PortalShell.tsx        # kop + navbar + laci HP (portal)
  admin/AdminShell.tsx           # sidebar kiri + top bar (admin)
  admin/AdminLoginPage.tsx  admin/AdminGuard.tsx  admin/nav.ts  admin/routes.ts  admin/pages/
  components/nav/                # NavBar, MenuItem, UserMenu, MobileDrawer, Breadcrumb
  components/auth/LoginForm.tsx  # dipakai dua halaman login
  components/ui/                 # Button, Field(Input/Select/Textarea), Card, Chip, DataTable, Switch, Note, EmptyState, Dialog, Skeleton, PageHeader
  core/pages/                    # login portal, beranda, profil, keamanan, 403, 404, modul belum aktif
  lib/api.ts  lib/alert.ts  lib/format.ts  lib/icons.tsx
  modules/<kode>/                # manifest.ts + pages/ (milik modul)
```
