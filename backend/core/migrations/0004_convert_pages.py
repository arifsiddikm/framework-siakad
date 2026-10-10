"""Move legacy page bodies into a text block and drop the `/p/` prefix from page links."""

import secrets

from django.db import migrations


def forwards(apps, schema_editor):
    ContentPage = apps.get_model("core", "ContentPage")
    MenuItem = apps.get_model("core", "MenuItem")
    for page in ContentPage.objects.all():
        if page.body and not page.blocks:
            page.blocks = [{"id": secrets.token_hex(6), "type": "text", "text": page.body}]
            page.save(update_fields=["blocks"])
        MenuItem.objects.filter(to=f"/p/{page.slug}").update(to=f"/{page.slug}")


def backwards(apps, schema_editor):
    ContentPage = apps.get_model("core", "ContentPage")
    MenuItem = apps.get_model("core", "MenuItem")
    for page in ContentPage.objects.all():
        MenuItem.objects.filter(to=f"/{page.slug}").update(to=f"/p/{page.slug}")


class Migration(migrations.Migration):
    dependencies = [("core", "0003_blocks_and_collections")]
    operations = [migrations.RunPython(forwards, backwards)]
