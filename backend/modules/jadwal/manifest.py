MANIFEST = {
    "code": "jadwal",
    "name": "Jadwal Kuliah",
    "icon": "calendar",
    "description": "Jadwal perkuliahan mingguan. Dilihat mahasiswa, dosen, staf, dan pimpinan.",
    "depends_on": [],
    "permissions": [
        {"code": "jadwal.view", "name": "Lihat jadwal kuliah"},
        {"code": "jadwal.manage", "name": "Kelola jadwal kuliah"},
    ],
    "datasets": [
        {
            "code": "jadwal",
            "label": "Jadwal kuliah",
            "model": "JadwalKuliah",
            "perm": "jadwal.view",
            "fields": [
                {"name": "matkul", "label": "Mata kuliah", "type": "text"},
                {"name": "dosen", "label": "Dosen", "type": "text"},
                {"name": "hari", "label": "Hari", "type": "text"},
                {"name": "ruang", "label": "Ruang", "type": "text"},
                {"name": "kelas", "label": "Kelas", "type": "text"},
            ],
        },
    ],
    "menu": [
        {
            "group": "Akademik", "group_icon": "graduation-cap", "group_order": 10,
            "title": "Jadwal kuliah", "hint": "Jadwal mingguan per hari",
            "to": "/jadwal", "perm": "jadwal.view", "icon": "calendar", "order": 10,
        },
    ],
}  # fmt: skip
