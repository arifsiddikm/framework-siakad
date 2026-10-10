from django.core.management.base import BaseCommand

from core.registry import load_manifests
from core.services.registry_sync import sync_registry


class Command(BaseCommand):
    help = "Sync module manifests (modules, permissions, menu) into the database."

    def handle(self, *args: object, **options: object) -> None:
        sync_registry()
        self.stdout.write(f"Modul tersinkron: {', '.join(load_manifests())}")
