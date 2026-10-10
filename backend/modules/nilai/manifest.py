MANIFEST = {
    "code": "nilai",
    "name": "Nilai & KHS",
    "icon": "clipboard-check",
    "description": "Nilai per mata kuliah dan IPK. Mahasiswa melihat nilainya sendiri; dosen dan staf melihat semua dan menginput.",
    "depends_on": [],
    "permissions": [
        {"code": "nilai.view", "name": "Membuka halaman nilai (mahasiswa melihat nilainya sendiri)"},
        {"code": "nilai.view_all", "name": "Lihat nilai semua mahasiswa"},
        {"code": "nilai.input", "name": "Input nilai"},
    ],
    "datasets": [
        {
            "code": "nilai",
            "label": "Nilai mahasiswa",
            "model": "Nilai",
            "perm": "nilai.view_all",
            "fields": [
                {"name": "nim", "label": "NIM", "type": "text"},
                {"name": "matkul", "label": "Mata kuliah", "type": "text"},
                {"name": "sks", "label": "SKS", "type": "number"},
                {"name": "semester", "label": "Semester", "type": "text"},
                {"name": "huruf", "label": "Nilai", "type": "text"},
            ],
        },
    ],
    "menu": [
        {
            "group": "Akademik", "group_icon": "graduation-cap", "group_order": 10,
            "title": "Nilai & KHS", "hint": "Hasil studi dan IPK",
            "to": "/nilai", "perm": "nilai.view", "icon": "clipboard-check", "order": 20,
        },
    ],
}  # fmt: skip
