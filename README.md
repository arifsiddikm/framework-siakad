# framework-siakad

Framework core SIAKAD modular (sample) — login, RBAC, registri modul, menu dinamis, admin panel.
Terpasang di `dev-siakadku.riplabs.co.id`. Versi 0.1 · 9 Okt 2026. Semua data fiktif.

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
