from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _sync_after_migrate(**_: object) -> None:
    from core.services.registry_sync import sync_registry

    sync_registry()


class CoreConfig(AppConfig):
    name = "core"

    def ready(self) -> None:
        # Manifests are synced into the database after every `migrate` (MOD-01, MENU-03).
        post_migrate.connect(_sync_after_migrate, sender=self, dispatch_uid="core.sync_registry")
