# framework-siakad — aturan kerja untuk Claude Code

Framework core SIAKAD modular (sample, terpasang di `dev-siakadku.riplabs.co.id`). Fondasi saja: login, RBAC, registri modul, menu dinamis, panel admin. **Dua area terpisah**: portal pengguna (`/`) dan panel admin (`/admin`, sidebar kiri). **Bukan** aplikasi SIAKAD lengkap; modul akademik/keuangan dibuat tim lain di atas kerangka ini.
Bahasa kode & komentar: **Inggris**. Bahasa UI, pesan galat pengguna, dokumen: **Indonesia**.

## Baca dulu
`docs/PRD-FRAMEWORK.md` (apa yang dibangun, ID kebutuhan, kontrak modul) · `docs/UI-FRAMEWORK.md` (layar + kerangka portal/admin) · `docs/PANDUAN-STYLE.md` (aturan style untuk semua halaman) · `docs/PANDUAN-MODUL.md` · `docs/PANDUAN-BLOK.md` · `TUTORIAL-SNIPPETS.md` · `design/screens/ref-*.png` (acuan kerangka saja) · `brand/tokens.css`.
**Scope layar hanya**: portal (login, beranda welcome, profil/keamanan, 403/404/modul belum aktif), panel admin (login admin, dashboard, peran & izin, pengguna, modul, halaman & akses, menu portal), halaman buatan admin (`/<alamat>`, dirakit dari blok + snippet), dan satu modul contoh. Jangan membangun layar akademik.
Bila dokumen bertentangan dengan kode atau satu sama lain: **berhenti dan tanyakan**.

## Stack (jangan ganti tanpa persetujuan)
Python 3.12 · Django 5.2 LTS + DRF · MySQL 8.4 · React + Vite + TypeScript + Tailwind v4 · TanStack Query · React Hook Form + zod · react-router · SweetAlert2 · vgpu 0.3.1 (hanya efek login admin; jangan dinaikkan tanpa menguji).
Tanpa Docker, Celery, Redis, library UI besar, CDN. Satu kampus; **tidak** ada multi-tenant.

## Perintah
```
backend:   python manage.py runserver | migrate | seed_roles | startmodule <kode> | test → pytest
frontend:  npm run dev | build | test | lint | typecheck
semua:     scripts/check.sh   # ruff, mypy, pytest, eslint, tsc, vitest — wajib hijau sebelum "selesai"
```

## Aturan tak boleh dilanggar
1. **RBAC lewat kode izin.** Dilarang memeriksa nama peran (`if role == "dosen"`). Semua endpoint dan halaman memakai izin (`mahasiswa.view`). Peran = kumpulan izin; dapat diubah dari UI tanpa deploy. Tanpa izin → API `403`, halaman "Akses ditolak".
2. **Menu adalah data, bukan keamanan.** Menyembunyikan menu tidak menggantikan pemeriksaan izin di server.
3. **Kontrak modul**: satu modul = `backend/modules/<kode>/manifest.py` + `frontend/src/modules/<kode>/manifest.ts`. Core menemukannya otomatis (`import.meta.glob` di React); modul tidak boleh mengubah tabel core dan tidak ada impor dari modul lain tanpa `depends_on`.
4. **Validasi menu** (MENU-04/05): tujuan dari daftar halaman terdaftar atau URL https; izin dan modul harus ada; kedalaman maks 2 tanpa siklus; judul wajib ≤ 40 karakter dan unik di induk; item `is_system` tak dapat dihapus; admin tak dapat mencabut izin kelola miliknya sendiri. Sinkron manifest = upsert, tidak menimpa kustomisasi admin.
5. **Rahasia**: tak pernah di kode, log, atau git. `.env` hanya di mesin/VPS; `.env.example` di repo. Kata sandi akun seed dari env (`SEED_ADMIN_PASSWORD`), bukan di kode. Pakai `secrets`, `hmac.compare_digest`. Kata sandi: Argon2id.
6. **Kueri**: ORM saja; tanpa `raw/extra/cursor.execute`. Serializer dengan `fields` eksplisit (tanpa `__all__`/`exclude`); kolom tak dikenal → 400.
7. **Dilarang**: `eval`, `exec`, `pickle`, `os.system`, `subprocess(shell=True)`, `yaml.load`, Django admin di produksi, akun/kata sandi/kunci bawaan.
8. **Dependensi baru**: jangan menambah paket di luar yang perlu tanpa meminta; verifikasi nama paket nyata; catat di `docs/DEPENDENCIES.md`.
9. **UI**: portal = kop + navbar dropdown; panel admin = sidebar kiri; halaman admin **tidak** masuk menu portal; hamburger HP di kanan; klik/keyboard, bukan hover; WAI-ARIA disclosure; tanpa gradasi, emoji, bayangan tebal; ikon `lucide-react` stroke 1.75; 4 kondisi (normal/memuat/kosong/galat); format via `lib/format.ts`; peringatan lewat `lib/alert.ts` (toast sukses, konfirmasi aksi tak terbalik, dialog galat). Detail: `docs/PANDUAN-STYLE.md`.

## Cara menulis kode
* View tipis → logika di `services.py` / `selectors.py`. Fungsi kecil, nama jelas, komentar hanya untuk *mengapa*. Type hints lengkap.
* Pesan galat pengguna: Indonesia, spesifik, ada langkah berikutnya. Kode galat Inggris `UPPER_SNAKE`.
* Tes dulu untuk kriteria penerimaan: login, pemeriksaan izin, registri modul, validasi menu, tiap rute baru masuk matriks izin.
* Migrasi: satu per perubahan; jangan mengedit yang sudah di-merge.
* Commit kecil: `feat(menu): validasi kedalaman maksimal 2 (MENU-04)`.

## Alur kerja
1. Ringkas rencana (file, model/endpoint, tes) → tunggu persetujuan untuk perubahan > 3 file atau yang menyentuh `core/auth`, `core/rbac`, `config/settings`.
2. Tes dulu → implementasi → `scripts/check.sh` → ringkas hasil (file yang diubah + satu baris tiap file).
3. Jangan mengklaim selesai bila ada tes yang dilewati; sebut yang tidak sempat diuji.
4. Ikuti urutan `docs/PRD-FRAMEWORK.md` §8: skeleton → login + RBAC → beranda → registri modul + menu → admin panel → modul contoh.

## Di luar cakupan
Modul akademik/keuangan/PMB/chatbot (konsep tiap modul lewat brief terpisah), multi-tenant, lisensi berbayar, Neo Feeder, SSO, WhatsApp, mode gelap, multi-bahasa.
