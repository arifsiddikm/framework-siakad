MANIFEST = {
    "code": "pengumuman",
    "name": "Pengumuman",
    "icon": "bell",
    "description": "Kabar terbaru kampus. Dibaca semua peran; staf akademik mengelola.",
    "depends_on": [],
    "permissions": [
        {"code": "pengumuman.view", "name": "Lihat pengumuman"},
        {"code": "pengumuman.manage", "name": "Kelola pengumuman"},
    ],
    "datasets": [
        {
            "code": "pengumuman",
            "label": "Pengumuman",
            "model": "Pengumuman",
            "perm": "pengumuman.view",
            "fields": [
                {"name": "judul", "label": "Judul", "type": "text"},
                {"name": "kategori", "label": "Kategori", "type": "text"},
                {"name": "tanggal", "label": "Tanggal", "type": "date"},
                {"name": "penting", "label": "Penting", "type": "boolean"},
            ],
        },
    ],
    "menu": [
        {
            "group": "Informasi", "group_icon": "bell", "group_order": 30,
            "title": "Pengumuman", "hint": "Kabar terbaru kampus",
            "to": "/pengumuman", "perm": "pengumuman.view", "icon": "bell", "order": 10,
        },
    ],
}  # fmt: skip
