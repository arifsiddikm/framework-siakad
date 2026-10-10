"""Manifest of the core itself: admin permissions and the Beranda menu item.

The admin panel (/admin) is not part of the portal menu: its sidebar is fixed in the frontend and
gated by the `core.*.manage` permissions below.
"""

MANIFEST = {
    "code": "core",
    "name": "Inti sistem",
    "icon": "settings",
    "description": "Pengguna, peran, izin, modul, dan menu.",
    "depends_on": [],
    "permissions": [
        {"code": "core.roles.manage", "name": "Kelola peran dan izin"},
        {"code": "core.users.manage", "name": "Kelola pengguna"},
        {"code": "core.modules.manage", "name": "Kelola modul"},
        {"code": "core.menu.manage", "name": "Kelola menu, halaman, dan data"},
    ],
    "menu": [
        {"title": "Beranda", "hint": "Halaman sambutan", "to": "/", "icon": "home", "order": 0},
    ],
    # Pages reachable without a menu item.
    "pages": [
        {"path": "/profil", "title": "Profil saya"},
        {"path": "/keamanan", "title": "Keamanan akun"},
    ],
}  # fmt: skip
