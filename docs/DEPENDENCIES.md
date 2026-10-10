# Dependensi

Catat setiap paket yang ditambahkan: nama, versi, alasan, tanggal. Verifikasi nama paket nyata di registri (PyPI/npm) sebelum memasang.

## Backend (PyPI) — `backend/requirements*.txt`

| Paket | Versi | Alasan | Tanggal |
|---|---|---|---|
| Django | 5.2.18 | Framework web (LTS) — stack wajib | 2026-10-09 |
| djangorestframework | 3.16.1 | API REST — stack wajib | 2026-10-09 |
| mysqlclient | 2.2.8 | Driver MySQL 8.4 resmi untuk Django | 2026-10-09 |
| argon2-cffi | 25.1.0 | Hash kata sandi Argon2id (aturan 5) | 2026-10-09 |
| python-dotenv | 1.2.4 | Memuat `.env` (rahasia di luar kode) | 2026-10-09 |
| gunicorn | 26.2.0 | Server WSGI untuk VPS dan pengujian lokal | 2026-10-09 |
| pytest, pytest-django | 9.1.1, 4.14.0 | Tes otomatis | 2026-10-09 |
| ruff | 0.16.10 | Lint + format | 2026-10-09 |
| mypy, django-stubs, djangorestframework-stubs | 2.4.0, 6.1.2, 3.18.1 | Pemeriksaan tipe | 2026-10-09 |

## Frontend (npm) — `frontend/package.json`

| Paket | Alasan | Tanggal |
|---|---|---|
| react, react-dom | UI — stack wajib | 2026-10-09 |
| vite, @vitejs/plugin-react, typescript | Build + TS — stack wajib | 2026-10-09 |
| tailwindcss, @tailwindcss/vite | Gaya (Tailwind v4) — stack wajib | 2026-10-09 |
| @tanstack/react-query | Data server — stack wajib | 2026-10-09 |
| react-hook-form, @hookform/resolvers, zod | Formulir + validasi — stack wajib | 2026-10-09 |
| lucide-react | Ikon (aturan 9) | 2026-10-09 |
| react-router | Perutean halaman. **Tambahan di luar daftar stack**, diperlukan karena ada banyak halaman dan rute dinamis dari manifest modul | 2026-10-09 |
| sweetalert2 | Peringatan/konfirmasi/toast (permintaan Arif, ADM-03). Dibungkus di `lib/alert.ts` dan diberi skin token | 2026-10-09 |
| vgpu | **0.3.1 (dipin tepat)** — efek ShapeWaves di login admin (React Bits). Versi ≥ 0.4 mengubah API dan membuat efek gagal ("Texture kind must be explicit"); naikkan hanya bersama pembaruan komponen. Kode komponen: `components/effects/ShapeWaves.jsx` | 2026-10-09 |
| vitest, jsdom, @testing-library/react, /user-event, /jest-dom | Tes komponen | 2026-10-09 |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | Lint | 2026-10-09 |
| @types/react, @types/react-dom, @types/node | Tipe | 2026-10-09 |

## Alat lokal (bukan dependensi proyek)

`uv` (Homebrew) dipakai membuat venv Python 3.12 karena Python 3.12 Homebrew di Mac pengembang rusak (pyexpat); `pm2` menjalankan backend + frontend saat uji lokal. MySQL 8.4 dari Homebrew (`mysql@8.4`) berjalan di port 3307 agar tidak bentrok dengan MariaDB XAMPP.
