MANIFEST = {
    "code": "mahasiswa",
    "name": "Data Mahasiswa",
    "icon": "users",
    "description": "Modul contoh: daftar dan tambah data mahasiswa.",
    "depends_on": [],
    "permissions": [
        {"code": "mahasiswa.view", "name": "Lihat data mahasiswa"},
        {"code": "mahasiswa.create", "name": "Tambah data mahasiswa"},
    ],
    # Tables the page builder may show (read-only, queried through the ORM, gated by `perm`).
    "datasets": [
        {
            "code": "mahasiswa",
            "label": "Data mahasiswa",
            "model": "Mahasiswa",
            "perm": "mahasiswa.view",
            "fields": [
                {"name": "nim", "label": "NIM", "type": "text"},
                {"name": "nama", "label": "Nama", "type": "text"},
                {"name": "prodi", "label": "Program studi", "type": "text"},
                {"name": "angkatan", "label": "Angkatan", "type": "number"},
                {"name": "created_at", "label": "Ditambahkan", "type": "date"},
            ],
        },
    ],
    "menu": [
        {
            "group": "Akademik",
            "group_icon": "graduation-cap",
            "title": "Data mahasiswa",
            "hint": "Daftar dan tambah mahasiswa",
            "to": "/mahasiswa",
            "perm": "mahasiswa.view",
            "icon": "users",
        },
    ],
}
