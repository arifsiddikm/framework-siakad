MANIFEST = {
    "code": "keuangan",
    "name": "Keuangan",
    "icon": "wallet",
    "description": "Tagihan mahasiswa. Mahasiswa melihat tagihannya sendiri; staf mengelola dan menandai lunas.",
    "depends_on": [],
    "permissions": [
        {"code": "keuangan.view", "name": "Membuka halaman tagihan (mahasiswa melihat tagihannya sendiri)"},
        {"code": "keuangan.view_all", "name": "Lihat tagihan semua mahasiswa"},
        {"code": "keuangan.manage", "name": "Kelola tagihan (buat, tandai lunas)"},
    ],
    "datasets": [
        {
            "code": "tagihan",
            "label": "Tagihan mahasiswa",
            "model": "Tagihan",
            "perm": "keuangan.view_all",
            "fields": [
                {"name": "nim", "label": "NIM", "type": "text"},
                {"name": "keterangan", "label": "Keterangan", "type": "text"},
                {"name": "jumlah", "label": "Jumlah (Rp)", "type": "number"},
                {"name": "jatuh_tempo", "label": "Jatuh tempo", "type": "date"},
                {"name": "status", "label": "Status", "type": "text"},
            ],
        },
    ],
    "menu": [
        {
            "group": "Keuangan", "group_icon": "wallet", "group_order": 20,
            "title": "Tagihan", "hint": "Tagihan dan status pembayaran",
            "to": "/keuangan", "perm": "keuangan.view", "icon": "wallet", "order": 10,
        },
    ],
}  # fmt: skip
