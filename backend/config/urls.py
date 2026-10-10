"""Root URLs. Each module's `urls.py` is mounted at /api/<code>/ automatically (MOD-01)."""

from django.conf import settings
from django.urls import include, path

from core.discovery import discover_module_codes

urlpatterns = [
    path("api/", include("core.urls")),
    *(
        path(f"api/{code}/", include(f"modules.{code}.urls"))
        for code in discover_module_codes(settings.MODULES_DIR)
    ),
]
