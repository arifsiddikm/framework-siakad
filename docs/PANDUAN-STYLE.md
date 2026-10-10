# Panduan Style Frontend

Untuk anggota tim yang membuat halaman atau modul. Ikuti panduan ini supaya semua halaman terasa satu produk. Contoh nyata: `frontend/src/modules/mahasiswa/pages/MahasiswaPage.tsx` (halaman modul) dan `frontend/src/admin/pages/*` (halaman admin). Konsep tiap modul tetap dibahas lewat brief terpisah; panduan ini hanya soal **tampilan dan cara menulisnya**.

## 1. Dua area, dua kerangka

| | Portal (pengguna) | Panel admin |
|---|---|---|
| Kerangka | `layouts/PortalShell.tsx`: kop + navbar dropdown | `admin/AdminShell.tsx`: sidebar kiri + top bar |
| Halaman baru modul masuk ke | **Portal** (`modules/<kode>/pages`) | Tidak. Admin hanya untuk setelan core |
| Menu | Data dari admin (`GET /api/auth/me/`) — **jangan** menulis menu di frontend | Tetap, `admin/nav.ts` |
| Login | `/masuk` | `/admin/masuk` |

Halaman modul **tidak** menggambar kop/navbar sendiri; cukup mengembalikan isi (`PageHeader` + `Card`). Kerangka disediakan shell. Jangan menaruh alamat `/admin/*` di menu portal.

## 2. Token (warna, huruf, bentuk)

Semua dari `src/styles/tokens.css` (salinan `brand/tokens.css`). Pakai kelas Tailwind bernama token, jangan kode hex.

| Pakai | Kelas | Catatan |
|---|---|---|
| Kop, sidebar, tombol utama | `bg-navy-900`, `bg-navy-700` | Tombol utama hanya satu per area layar |
| Latar halaman | `bg-bg` / `bg-slate-50` | Kartu: `bg-surface` + `border-line` |
| Teks | `text-text` (utama), `text-text-2` (sekunder), `text-text-3` (bantu) | `slate-400` hanya dekoratif (kontras kurang) |
| Peringatan/terkunci | `amber-*` | **Hanya** peringatan, terkunci, aksen sambutan |
| Sukses / galat | `green-*` / `red-*` | Selalu disertai teks atau ikon |

* Huruf: IBM Plex Sans 14 px (UI); judul halaman 22 px/600 (`PageHeader`); nama aplikasi di kop pakai `font-serif` (Source Serif 4); kode/izin pakai `font-mono`.
* Radius: kartu 10 px (`rounded-card`), kontrol 8 px (`rounded-ctl`). Dropdown/dialog boleh bayangan; selain itu **tanpa** gradasi, emoji, dan bayangan tebal.
* Ikon: `lucide-react`, `strokeWidth={1.75}`, ukuran 16/18/20 px, `aria-hidden="true"` bila dekoratif. Untuk ikon dari data (menu) pakai `<NamedIcon name="users" />` dari `lib/icons.tsx`; tambah ikon baru di `ICONS` **dan** `backend/core/icons.py`.
* Jarak: kelipatan 4 px. Konten maks 1280 px; padding 28 px (HP 16 px). Kartu `p-4 sm:p-5`.

## 3. Komponen siap pakai (`components/ui/`)

| Komponen | Kapan |
|---|---|
| `PageHeader` | Judul halaman + deskripsi + tombol aksi di kanan. Satu per halaman |
| `Card`, `CardHeader` | Pembungkus isi. Judul kartu 15/600 |
| `Button` | `variant`: `primary` (satu aksi utama), `secondary`, `danger`, `ghost`; `size="sm"` di tabel; `loading` saat menyimpan |
| `Input`, `Select`, `Textarea` (`Field.tsx`) | Selalu berlabel; `error` dan `hint` sudah menyambung ke `aria-describedby`. `required` menampilkan `*` merah. `look="filled"` hanya untuk halaman login |
| `DataTable` | Tabel dengan 4 kondisi otomatis (memuat, galat, kosong, data). Wajib `caption` |
| `Chip` | Status/label kecil. Tone: `neutral navy green amber red`; tambah `dot` untuk status |
| `Checkbox`, `Radio` | Pilihan dengan gaya sendiri (input asli tetap ada: keyboard dan pembaca layar jalan). Pakai ini, **jangan** `<input type="checkbox">` polos. `label` bisa berisi elemen; `description` opsional |
| `Switch` | Nyala/mati; tombol 44 px di HP, ada teks "Aktif/Nonaktif" |
| `Note` | Pesan **di dalam halaman/form** (info, warn, error, success) |
| `EmptyState`, `Skeleton` | Kondisi kosong dan memuat |
| `Dialog` | Form di atas halaman (`<dialog>` bawaan browser: fokus terkunci, `Esc` menutup) |

Perlu komponen baru? Tambahkan di `components/ui/` dengan token yang sama, dan jangan memasang library UI besar (lihat `CLAUDE.md`, aturan 8).

## 4. Empat kondisi data (wajib)

Setiap tampilan data punya: **memuat** (`Skeleton`), **galat** (`Note tone="error"` + pesan yang bisa ditindaklanjuti), **kosong** (`EmptyState`: judul + satu kalimat + aksi), **normal**. `DataTable` sudah menanganinya. Status jangan hanya warna: pakai `Chip dot` + teks.

## 5. Peringatan (SweetAlert2 lewat `lib/alert.ts`)

Jangan memanggil `Swal` langsung dan jangan `window.alert/confirm`.

```ts
import { alertError, confirmAction, showSecret, toastSuccess } from "@/lib/alert";

const ok = await confirmAction({            // aksi tak terbalik → tombol merah
  title: "Hapus peran?",
  text: "Peran akan dicabut dari 3 pengguna. Tindakan ini tidak dapat dibatalkan.",
  confirmText: "Ya, hapus", danger: true,
});
if (ok) remove.mutate();
// onSuccess → toastSuccess("Peran dihapus.");   onError → alertError("Peran tidak dapat dihapus", pesanDariServer);
```

| Situasi | Fungsi |
|---|---|
| Berhasil (simpan/buat/hapus/masuk/keluar) | `toastSuccess` (kanan bawah, hilang sendiri) |
| Sebelum hapus, reset, nonaktifkan, keluar | `confirmAction` (`danger: true` untuk yang merusak) |
| Server menolak / gagal, perlu dibaca | `alertError(judul, pesan)` |
| Informasi singkat | `alertInfo` |
| Kata sandi sementara / rahasia sekali tampil | `showSecret` |
| Salah isian form | Pesan di bawah kolom (`error` pada `Input`), **bukan** SweetAlert |

Tulis pesan dalam bahasa Indonesia: apa yang terjadi + langkah berikutnya ("Kode sudah dipakai. Pilih kode lain."), bukan "Terjadi kesalahan".

## 6. Formulir

* React Hook Form + zod: `useForm({ resolver: zodResolver(schema) })`; pesan zod berbahasa Indonesia.
* Galat dari server per kolom: `ApiError.fields` → `setError(field, { message })`; galat umum → `Note` atau `alertError`.
* Tombol kirim memakai `loading={isSubmitting}`; tombol batal `variant="secondary"`.
* Tambah/ubah data → `Dialog`; setelah sukses `queryClient.invalidateQueries(...)`, tutup dialog, `toastSuccess`.
* Panggilan API selalu lewat `api` (`lib/api.ts`): CSRF dan galat seragam sudah ditangani. Data server lewat TanStack Query.

## 7. Aksi dan izin di halaman

* Izin diperiksa **server**; frontend hanya menyembunyikan: `const { can } = useAuth(); can("nilai.input") && <Button>…</Button>`.
* Daftarkan rute dengan `perm` di `manifest.ts`; `RequirePermission` menampilkan "Akses ditolak" atau "Modul belum aktif" otomatis.
* Format tanggal/angka lewat `lib/format.ts` (`formatDate`, `formatNumber`), jangan `toLocaleString` ad hoc.

## 8. Responsif dan aksesibilitas

* Desain mulai dari 360 px. Di bawah 1024 px portal memakai laci menu dan admin memakai laci sidebar; **tombol hamburger selalu di kanan atas**, laci terbuka dari kanan. Target sentuh ≥ 44 px (`min-h-11`).
* Tabel lebar: `DataTable` sudah `overflow-x-auto`. Form dua kolom → `sm:grid-cols-2`.
* Semua kontrol dapat dioperasikan keyboard; fokus terlihat (`:focus-visible` dari token). Menu terbuka dengan klik/Enter/Spasi, bukan hover. Gambar dekoratif `alt=""`.
* Kontras teks ≥ 4,5:1. Judul halaman satu `h1`.

## 8b. Isi halaman buatan admin dan info akses

* Teks dari admin ditampilkan lewat `RichText` (`lib/richtext.tsx`); jangan memakai `dangerouslySetInnerHTML`.
* Menampilkan "siapa yang boleh mengakses" selalu lewat `AudienceChips` (`components/AudienceChips.tsx`): hijau = semua pengguna login, biru = peran, amber = belum ada peran.
* Efek latar login admin (`components/effects/ShapeWaves`) hanya dipakai di sana, dimuat lazy, dan wajib punya fallback polos bila WebGPU tidak ada.

## 8c. Blok halaman dan snippet

* Tampilan blok: `components/blocks/BlockRenderer.tsx`; editor: `admin/blocks/BlockForm.tsx`; jenis dan nilai awal: `lib/blocks.ts`. Menambah jenis blok bawaan butuh perubahan di backend (`core/services/blocks.py`) dan tes, jadi konsultasikan dulu. **Untuk tampilan khusus, buat snippet** (tidak menyentuh core).
* Snippet: `frontend/src/snippets/**.tsx`, export `meta` + komponen `default`, menerima `{ params, data }`. Pakai `Card`, token, dan komponen UI yang sama; tampilkan 4 kondisi bila mengambil data sendiri. Tutorial: `TUTORIAL-SNIPPETS.md`.

## 9. Menambah halaman admin (jarang)

Halaman admin hanya untuk setelan core. Bila perlu: buat di `admin/pages/`, daftarkan di `admin/routes.ts` (dengan `perm` `core.*.manage`) dan `admin/nav.ts`; tambahkan izinnya di `backend/core/manifest.py`. Konsultasikan dulu, karena modul akademik tidak punya halaman admin sendiri.

## 10. Daftar periksa sebelum PR

- [ ] Memakai `PageHeader` + `Card`; tanpa hex, gradasi, atau emoji
- [ ] Empat kondisi data ada
- [ ] Izin: rute punya `perm`, tombol aksi disaring `can(...)`, endpoint punya `perm_map`
- [ ] Peringatan lewat `lib/alert.ts`; pesan Indonesia dan spesifik
- [ ] Terlihat baik di 360 px dan 1440 px; dapat dioperasikan dengan keyboard
- [ ] `scripts/check.sh` hijau
