"""Fictional portal pages for demos (`manage.py seed_samples`). All text is made up.

Each entry becomes a page built from blocks, restricted to `roles` (empty = every signed-in user), with a
menu item in `group`. Snippet shortcodes refer to files in frontend/src/snippets/.
"""

from __future__ import annotations

from typing import Any

# Order of menu groups at the top level (lower = further left). Beranda = 0.
GROUP_ORDER = {"group:layanan-saya": 5, "group:akademik": 10, "group:keuangan": 20, "group:informasi": 30}
CUSTOM_GROUPS = [("Layanan Dosen", "school", 40), ("Pimpinan", "chart-bar", 50)]


def _text(i: str, text: str) -> dict[str, Any]:
    return {"id": i, "type": "text", "text": text}


def _callout(i: str, tone: str, text: str) -> dict[str, Any]:
    return {"id": i, "type": "callout", "tone": tone, "text": text}


def _faq(i: str, title: str, items: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "id": i,
        "type": "accordion",
        "title": title,
        "items": [{"title": q, "text": a} for q, a in items],
    }


def _links(i: str, title: str, items: list[tuple[str, str]]) -> dict[str, Any]:
    return {"id": i, "type": "links", "title": title, "items": [{"label": a, "url": b} for a, b in items]}


def _table(i: str, title: str, columns: list[str], rows: list[list[str]]) -> dict[str, Any]:
    return {"id": i, "type": "table", "title": title, "columns": columns, "rows": rows}


PAGES: list[dict[str, Any]] = [
    {
        "slug": "layanan-saya",
        "title": "Layanan saya",
        "roles": ["mahasiswa"],
        "menu": {"group": None, "title": "Layanan saya", "key": "group:layanan-saya"},
        "blocks": [
            _text(
                "t1", "# Layanan mahasiswa\n\nRingkasan studi, tagihan, dan jadwal Anda dalam satu halaman."
            ),
            {"id": "s1", "type": "snippet", "name": "akademik.progres_sks", "params": {"target": 144}},
            {"id": "s2", "type": "snippet", "name": "keuangan.ringkasan_tagihan", "params": {}},
            {"id": "s3", "type": "snippet", "name": "akademik.jadwal_hari_ini", "params": {}},
            {"id": "s4", "type": "snippet", "name": "info.pengumuman_terbaru", "params": {"jumlah": 3}},
            {
                "id": "s5",
                "type": "snippet",
                "name": "info.tautan_cepat",
                "params": {"judul": "Layanan cepat"},
            },
        ],
    },
    {
        "slug": "kalender-akademik",
        "title": "Kalender akademik",
        "roles": [],
        "menu": {"group": "Informasi", "title": "Kalender akademik", "order": 20},
        "blocks": [
            _text(
                "t1",
                "# Kalender akademik 2026/2027\n\nTanggal penting semester ini. Jadwal dapat berubah; periksa halaman ini secara berkala.",
            ),
            {"id": "s1", "type": "snippet", "name": "info.kalender_akademik", "params": {}},
            _callout(
                "c1",
                "warn",
                "Batas akhir pengisian dan perubahan KRS: 18 Oktober 2026. Setelah itu KRS terkunci.",
            ),
        ],
    },
    {
        "slug": "panduan-krs",
        "title": "Panduan pengisian KRS",
        "roles": ["mahasiswa", "dosen", "staf-akademik"],
        "menu": {"group": "Informasi", "title": "Panduan KRS", "order": 30},
        "blocks": [
            _text(
                "t1",
                "# Cara mengisi KRS\n\n1. Pastikan tagihan SPP tahap 1 sudah lunas di halaman **Tagihan**.\n2. Cek jadwal di halaman **Jadwal kuliah** agar tidak bentrok.\n3. Pilih mata kuliah sesuai batas SKS Anda.\n4. Simpan, lalu minta persetujuan **dosen wali**.\n\n> Status KRS menjadi *Disetujui* setelah dosen wali menyetujui.",
            ),
            _faq(
                "f1",
                "Pertanyaan yang sering diajukan",
                [
                    (
                        "Berapa SKS maksimal?",
                        "IPS ≥ 3,00 boleh 24 SKS; 2,50–2,99 boleh 21 SKS; di bawahnya 18 SKS.",
                    ),
                    (
                        "KRS tidak bisa disimpan?",
                        "Biasanya tagihan belum lunas atau jadwal bentrok. Cek halaman Tagihan dan Jadwal kuliah.",
                    ),
                ],
            ),
            {"id": "s1", "type": "snippet", "name": "info.faq_krs", "params": {}},
            _links(
                "l1",
                "Halaman terkait",
                [
                    ("Jadwal kuliah", "/jadwal"),
                    ("Tagihan", "/keuangan"),
                    ("Kalender akademik", "/kalender-akademik"),
                ],
            ),
        ],
    },
    {
        "slug": "layanan-ijazah",
        "title": "Layanan ijazah",
        "roles": [],
        "menu": {"group": "Informasi", "title": "Layanan ijazah", "order": 40},
        "blocks": [
            _text(
                "t1",
                "# Pengambilan ijazah\n\nIjazah diambil di Bagian Akademik dengan membawa **kartu identitas** dan **bukti bebas tanggungan**. Status di bawah diperbarui setiap hari kerja.",
            ),
            {
                "id": "s1",
                "type": "snippet",
                "name": "pages.data_ijazah",
                "params": {"judul": "Status pengambilan ijazah", "limit": 4},
            },
            {
                "id": "s2",
                "type": "snippet",
                "name": "pages.data_ijazah.upload_form",
                "params": {"maks_mb": 5},
            },
        ],
    },
    {
        "slug": "kontak-layanan",
        "title": "Kontak layanan",
        "roles": [],
        "menu": {"group": "Informasi", "title": "Kontak layanan", "order": 50},
        "blocks": [
            _text(
                "t1",
                "# Hubungi kami\n\nPilih bagian sesuai keperluan Anda. Balasan email maksimal 2 hari kerja.",
            ),
            {
                "id": "s1",
                "type": "snippet",
                "name": "info.kontak_bagian",
                "params": {
                    "bagian": "Bagian Akademik",
                    "email": "akademik@kampus.example.ac.id",
                    "telepon": "(021) 555-0101",
                    "jam": "Senin–Jumat, 08.00–15.00 WIB",
                },
            },
            {
                "id": "s2",
                "type": "snippet",
                "name": "info.kontak_bagian",
                "params": {
                    "bagian": "Bagian Keuangan",
                    "email": "keuangan@kampus.example.ac.id",
                    "telepon": "(021) 555-0102",
                    "jam": "Senin–Jumat, 08.00–14.00 WIB",
                },
            },
            {
                "id": "s3",
                "type": "snippet",
                "name": "info.kontak_bagian",
                "params": {
                    "bagian": "Pusat Teknologi Informasi",
                    "email": "helpdesk@kampus.example.ac.id",
                    "telepon": "(021) 555-0103",
                    "jam": "Setiap hari, 07.00–21.00 WIB",
                },
            },
        ],
    },
    {
        "slug": "tata-tertib",
        "title": "Tata tertib kampus",
        "roles": [],
        "menu": {"group": "Informasi", "title": "Tata tertib", "order": 60},
        "blocks": [
            _text(
                "t1",
                "# Tata tertib civitas akademika\n\n## Perkuliahan\n- Hadir minimal **75%** dari total pertemuan untuk mengikuti ujian.\n- Berpakaian rapi dan sopan di lingkungan kampus.\n- Terlambat lebih dari 20 menit tidak diperkenankan masuk kelas.\n\n## Ujian\n- Membawa kartu ujian dan kartu identitas.\n- Dilarang membawa alat komunikasi ke ruang ujian.\n\n---\n\nPelanggaran dikenai sanksi sesuai peraturan akademik.",
            ),
        ],
    },
    {
        "slug": "info-beasiswa",
        "title": "Informasi beasiswa",
        "roles": ["mahasiswa", "staf-akademik"],
        "menu": {"group": "Informasi", "title": "Beasiswa", "order": 70},
        "blocks": [
            _text(
                "t1",
                "# Beasiswa tahun akademik 2026/2027\n\nBeasiswa membantu biaya kuliah bagi mahasiswa berprestasi dan yang membutuhkan.",
            ),
            _table(
                "tb",
                "Jenis beasiswa",
                ["Beasiswa", "Syarat utama", "Bantuan", "Batas pendaftaran"],
                [
                    ["Prestasi akademik", "IPK ≥ 3,50", "100% SPP", "25 Okt 2026"],
                    ["Peningkatan prestasi", "IPK ≥ 3,00, aktif organisasi", "50% SPP", "25 Okt 2026"],
                    ["Kurang mampu", "Surat keterangan desa/kelurahan", "Rp 3.000.000", "30 Okt 2026"],
                ],
            ),
            _callout(
                "c1",
                "info",
                "Berkas diserahkan ke Bagian Kemahasiswaan. Hasil seleksi diumumkan di halaman Pengumuman.",
            ),
            _links(
                "l1", "Lihat juga", [("Pengumuman", "/pengumuman"), ("Kontak layanan", "/kontak-layanan")]
            ),
        ],
    },
    {
        "slug": "info-wisuda",
        "title": "Informasi wisuda",
        "roles": ["mahasiswa", "staf-akademik", "pimpinan"],
        "menu": {"group": "Informasi", "title": "Wisuda", "order": 80},
        "blocks": [
            _text("t1", "# Wisuda periode November 2026\n\nPendaftaran wisuda ditutup **30 Oktober 2026**."),
            _faq(
                "f1",
                "Persyaratan dan alur",
                [
                    (
                        "Siapa yang boleh mendaftar?",
                        "Mahasiswa yang telah dinyatakan lulus yudisium dan bebas tanggungan keuangan dan perpustakaan.",
                    ),
                    (
                        "Berkas apa yang diserahkan?",
                        "Fotokopi ijazah terakhir, pas foto 4×6, dan bukti pembayaran biaya wisuda.",
                    ),
                    ("Kapan gladi bersih?", "Satu hari sebelum acara wisuda, pukul 09.00 WIB di Aula Utama."),
                ],
            ),
            _table(
                "tb",
                "Biaya",
                ["Komponen", "Biaya"],
                [["Toga & atribut", "Rp 450.000"], ["Dokumentasi", "Rp 250.000"], ["Konsumsi", "Rp 300.000"]],
            ),
        ],
    },
    {
        "slug": "perpustakaan",
        "title": "Perpustakaan",
        "roles": [],
        "menu": {"group": "Informasi", "title": "Perpustakaan", "order": 90},
        "blocks": [
            _text(
                "t1",
                "# Layanan perpustakaan\n\nKoleksi buku, jurnal, dan tugas akhir. **Jam layanan:** Senin–Jumat 08.00–19.00 WIB, Sabtu 08.00–14.00 WIB.\n\n- Peminjaman maksimal **5 buku** selama 14 hari.\n- Perpanjangan dapat dilakukan satu kali.\n- Denda keterlambatan Rp 1.000 per buku per hari.",
            ),
            _links(
                "l1",
                "Layanan daring",
                [
                    ("Katalog perpustakaan", "https://perpus.example.ac.id"),
                    ("Repositori tugas akhir", "https://repository.example.ac.id"),
                ],
            ),
        ],
    },
    {
        "slug": "faq-umum",
        "title": "FAQ",
        "roles": [],
        "menu": {"group": "Informasi", "title": "FAQ", "order": 100},
        "blocks": [
            _text("t1", "# Pertanyaan umum\n\nJawaban singkat untuk hal yang sering ditanyakan."),
            _faq(
                "f1",
                "Akun dan kata sandi",
                [
                    (
                        "Lupa kata sandi?",
                        "Hubungi administrator kampus; admin dapat membuatkan kata sandi sementara.",
                    ),
                    ("Bagaimana mengganti kata sandi?", "Buka menu akun di kanan atas › Keamanan akun."),
                ],
            ),
            _faq(
                "f2",
                "Akademik dan keuangan",
                [
                    ("Di mana melihat nilai?", "Menu Akademik › Nilai & KHS."),
                    ("Kapan batas pembayaran SPP?", "Lihat halaman Tagihan atau Pengumuman."),
                ],
            ),
        ],
    },
    {
        "slug": "panduan-dosen-wali",
        "title": "Panduan dosen wali",
        "roles": ["dosen", "staf-akademik"],
        "menu": {"group": "Layanan Dosen", "title": "Panduan dosen wali", "order": 10},
        "blocks": [
            _text(
                "t1",
                "# Tugas dosen wali\n\n- Mendampingi mahasiswa bimbingan sepanjang studi.\n- Menyetujui KRS setiap awal semester.\n- Memantau IPS dan kehadiran; memanggil mahasiswa yang bermasalah.\n\n**Pertemuan wajib:** minimal 3 kali per semester.",
            ),
            {
                "id": "s1",
                "type": "snippet",
                "name": "dosen.mahasiswa_bimbingan",
                "params": {"prodi": "Teknik Informatika"},
            },
            _callout(
                "c1",
                "info",
                "Nilai mahasiswa bimbingan dapat dilihat di Akademik › Nilai & KHS dengan mencari NIM.",
            ),
        ],
    },
    {
        "slug": "pedoman-penilaian",
        "title": "Pedoman penilaian",
        "roles": ["dosen", "staf-akademik"],
        "menu": {"group": "Layanan Dosen", "title": "Pedoman penilaian", "order": 20},
        "blocks": [
            _text(
                "t1",
                "# Skala penilaian\n\nNilai akhir = 30% tugas + 30% UTS + 40% UAS, kecuali ditetapkan lain pada RPS.",
            ),
            _table(
                "tb",
                "Konversi nilai",
                ["Rentang", "Huruf", "Bobot"],
                [
                    ["85–100", "A", "4,00"],
                    ["80–84", "A-", "3,70"],
                    ["75–79", "B+", "3,30"],
                    ["70–74", "B", "3,00"],
                    ["65–69", "B-", "2,70"],
                    ["60–64", "C+", "2,30"],
                    ["55–59", "C", "2,00"],
                    ["40–54", "D", "1,00"],
                    ["< 40", "E", "0,00"],
                ],
            ),
            _callout(
                "c1",
                "warn",
                "Nilai wajib diinput paling lambat 7 hari setelah UAS di Akademik › Nilai & KHS.",
            ),
        ],
    },
    {
        "slug": "ringkasan-kampus",
        "title": "Ringkasan kampus",
        "roles": ["pimpinan", "staf-akademik"],
        "menu": {"group": "Pimpinan", "title": "Ringkasan kampus", "order": 10},
        "blocks": [
            _text(
                "t1",
                "# Ringkasan kampus\n\nAngka diturunkan langsung dari data modul; tidak ada angka yang diketik manual.",
            ),
            {"id": "s1", "type": "snippet", "name": "pimpinan.ringkasan_kampus", "params": {}},
            {
                "id": "g1",
                "type": "chart",
                "title": "Mahasiswa per angkatan",
                "dataset": "mahasiswa.mahasiswa",
                "group_by": "angkatan",
                "aggregate": "count",
                "field": "",
                "limit": 6,
                "filters": [],
            },
            {
                "id": "d1",
                "type": "data_table",
                "title": "Tagihan belum lunas",
                "dataset": "keuangan.tagihan",
                "columns": ["nim", "keterangan", "jumlah", "jatuh_tempo"],
                "sort": "jatuh_tempo",
                "direction": "asc",
                "limit": 8,
                "filters": [{"field": "status", "op": "eq", "value": "belum"}],
            },
        ],
    },
]
