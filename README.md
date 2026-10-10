# framework-siakad

Selamat datang. Ini **framework core SIAKAD modular**: login, RBAC (peran dan izin), registri modul, menu dinamis, Panel Admin, page builder dan snippet. Aplikasi lain (mis. `siakadku-demo`) dibangun di atasnya dengan menambah modul. Semua data fiktif.

Terpasang di https://dev-siakadku.riplabs.co.id · Stack: Python 3.12, Django 5.2, DRF, MySQL 8.4, React, Vite, TypeScript, Tailwind v4.

## Instalasi singkat

```bash
mysql -uroot -P3307 -e "CREATE DATABASE siakadku_framework CHARACTER SET utf8mb4;"
cd backend && python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env && .venv/bin/python manage.py migrate && .venv/bin/python manage.py seed_roles
cd ../frontend && npm install && cp .env.example .env.local
cd .. && pm2 start ecosystem.config.cjs      # backend :8000, frontend :5173
```
Rinciannya ada di bagian *Menjalankan secara lokal* di bawah. Nilai di `.env` (DB, `SEED_ADMIN_PASSWORD`, dst.) diisi sendiri; tidak ada kata sandi bawaan di kode.

## Kerja tim

* `main` = yang sudah ditinjau; kerja di branch sendiri (mis. `arif`) lalu Pull Request.
* Jangan commit `.env`, `.env.local`, `uploads/`, atau kunci. Hanya `.env.example`.
* Jalankan `scripts/check.sh` sebelum membuka PR. Modul baru: `docs/PANDUAN-MODUL.md`.

## Mulai
1. Baca `docs/PRD-FRAMEWORK.md` lalu `CLAUDE.md`.
2. Baca `docs/UI-FRAMEWORK.md`; tangkapan di `design/screens/ref-*.png` hanyalah acuan kerangka (kop + navbar dropdown, laci HP).
3. Baca `docs/PANDUAN-STYLE.md` sebelum membuat halaman; mulai dari urutan kerja `PRD-FRAMEWORK.md` §8.

## Menjalankan secara lokal (Mac)
Prasyarat: MySQL 8.4 (`brew services start mysql@8.4`, port 3307), Python 3.12 (venv `backend/.venv`), Node 22, pm2.
```bash
# sekali saja
cd backend && cp .env.example .env            # isi nilainya, lihat komentar di dalamnya
.venv/bin/python manage.py migrate && .venv/bin/python manage.py seed_roles
cd ../frontend && npm install

# jalan sehari-hari (dari folder framework-siakad)
pm2 start ecosystem.config.cjs                # backend :8000 + frontend :5173
pm2 status | pm2 logs | pm2 restart all | pm2 stop all
```
Buka http://127.0.0.1:5173 (portal pengguna, login `/masuk`) atau http://127.0.0.1:5173/admin (panel admin, login `/admin/masuk`). Di mode dev ada tombol *isi otomatis* di kedua login (sandi dari `frontend/.env.local`, salin dari `.env.example`). Akun dibuat oleh `seed_roles` dari `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` di `backend/.env` (tidak ada kata sandi bawaan di kode).
Pemeriksaan penuh: `scripts/check.sh`. Membuat modul baru: `docs/PANDUAN-MODUL.md`.

## Isi
| Berkas | Isi |
|---|---|
| `CLAUDE.md` | Aturan kerja Claude Code |
| `docs/PRD-FRAMEWORK.md` | Kebutuhan, kontrak modul, urutan kerja, keputusan |
| `docs/UI-FRAMEWORK.md` | Layar yang dibangun, kerangka kop + navbar dropdown, token |
| `brand/` | Logo, favicon, `tokens.css` (Tailwind v4) |
| `design/` | Font self-host, tangkapan layar acuan kerangka |
| `backend/` | Django + DRF: `core/` (user, RBAC, registri modul, menu), `modules/` (modul) |
| `frontend/` | React + Vite + TS + Tailwind v4: `src/core/`, `src/modules/` |
| `docs/PANDUAN-MODUL.md` | Cara membuat modul |
| `TUTORIAL-SNIPPETS.md` | Tutorial singkat snippet: potongan halaman dari file React (folder `frontend/src/snippets/`) |
| `docs/PANDUAN-BLOK.md` | Page builder, snippet, dan dataset modul |
| `docs/PANDUAN-MENU-HALAMAN.md` | Cara admin menambah/mengubah menu dan halaman, dan melihat siapa boleh akses apa |
| `docs/PANDUAN-STYLE.md` | Aturan tampilan/komponen/peringatan untuk semua halaman |
| `scripts/check.sh` | ruff, mypy, pytest, eslint, tsc, vitest |
