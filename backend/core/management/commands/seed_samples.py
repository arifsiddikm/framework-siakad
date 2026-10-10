"""`manage.py seed_samples`: fill a fresh install with fictional sample content for every role.

Idempotent. It (1) grants the sample modules' permissions to the starter roles, (2) loads sample rows of
each module, (3) creates sample portal pages with menu items. Never touches pages/menu you created yourself.
"""

from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from core import sample_content as sample
from core.models import ContentPage, MenuItem, Permission, Role, RolePermission
from core.seed import ROLES
from core.services import menu as menu_service
from core.services import pages as page_service
from core.services.registry_sync import sync_registry

SEEDERS = ["seed_mahasiswa", "seed_pengumuman", "seed_jadwal", "seed_nilai", "seed_keuangan"]


class Command(BaseCommand):
    help = "Create fictional sample data, pages, and menu items for all roles (idempotent)."

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        sync_registry()
        self._grant()
        for name in SEEDERS:
            call_command(name, stdout=self.stdout)
        self._groups()
        made = self._pages()
        self._order()
        self.stdout.write(
            self.style.SUCCESS(
                f"Sample siap: {made} halaman baru. Menu: {MenuItem.objects.exclude(to='').count()} item."
            )
        )

    def _grant(self) -> None:
        added = 0
        for code, (_name, _desc, perm_codes) in ROLES.items():
            role = Role.objects.filter(code=code).first()
            if role is None:
                continue
            for perm in Permission.objects.filter(code__in=perm_codes):
                _, created = RolePermission.objects.get_or_create(role=role, permission=perm)
                added += created
        self.stdout.write(f"{added} izin sample diberikan ke peran awal.")

    def _groups(self) -> None:
        for title, icon, order in sample.CUSTOM_GROUPS:
            if not MenuItem.objects.filter(parent=None, title=title).exists():
                item = menu_service.create_item({"title": title, "icon": icon})
                MenuItem.objects.filter(pk=item.pk).update(order=order)

    def _pages(self) -> int:
        ContentPage.objects.filter(slug="pusat-informasi-ujian").first() and page_service.delete_page(
            ContentPage.objects.get(slug="pusat-informasi-ujian")
        )  # an earlier throw-away demo page
        made = 0
        for entry in sample.PAGES:
            if ContentPage.objects.filter(slug=entry["slug"]).exists():
                continue
            menu = entry["menu"]
            parent = None
            if menu["group"]:
                parent = MenuItem.objects.filter(parent=None, title=menu["group"]).first()
            page = page_service.create_page(
                {
                    "slug": entry["slug"],
                    "title": entry["title"],
                    "blocks": entry["blocks"],
                    "roles": entry["roles"],
                    "is_published": True,
                    "menu_enabled": True,
                    "menu_title": menu["title"],
                    "menu_parent": parent.pk if parent else None,
                }
            )
            if "order" in menu:
                MenuItem.objects.filter(to=page_service.page_path(page.slug)).update(order=menu["order"])
            made += 1
        return made

    def _order(self) -> None:
        for key, order in sample.GROUP_ORDER.items():
            MenuItem.objects.filter(key=key).update(order=order)
        for key, order in {
            "jadwal:jadwal-kuliah": 10,
            "nilai:nilai-khs": 20,
            "mahasiswa:data-mahasiswa": 30,
        }.items():
            MenuItem.objects.filter(key=key).update(order=order)
        for item in MenuItem.objects.filter(to="/layanan-saya"):
            MenuItem.objects.filter(pk=item.pk).update(order=sample.GROUP_ORDER["group:layanan-saya"])
