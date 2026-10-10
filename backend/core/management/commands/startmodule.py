"""`manage.py startmodule <kode>`: scaffold a backend + frontend module skeleton (DEV-02)."""

from __future__ import annotations

from pathlib import Path
from string import Template

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.discovery import MODULE_CODE_RE

BACKEND_FILES = {
    "__init__.py": "",
    "migrations/__init__.py": "",
    "manifest.py": """MANIFEST = {
    "code": "$code",
    "name": "$title",
    "icon": "box",
    "description": "",
    "depends_on": [],
    "permissions": [
        {"code": "$code.view", "name": "Lihat $title"},
    ],
    "menu": [
        {
            "group": "Lainnya",
            "title": "$title",
            "hint": "Deskripsi singkat modul",
            "to": "/$code",
            "perm": "$code.view",
            "icon": "box",
        },
    ],
}
""",
    "models.py": """from django.db import models  # noqa: F401

# Define this module's tables here. Never alter core tables (see docs/PANDUAN-MODUL.md).
""",
    "views.py": """from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import PermByMethod


class IndexView(APIView):
    permission_classes = [PermByMethod]
    perm_map = {"GET": "$code.view"}

    def get(self, request: Request) -> Response:
        return Response({"results": []})
""",
    "urls.py": """from django.urls import path

from modules.$code import views

urlpatterns = [path("", views.IndexView.as_view())]
""",
}

FRONTEND_FILES = {
    "manifest.ts": """import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  code: "$code",
  routes: [
    {
      path: "/$code",
      title: "$title",
      section: "Lainnya",
      perm: "$code.view",
      component: lazy(() => import("./pages/${pascal}Page")),
    },
  ],
};

export default manifest;
""",
    "pages/${pascal}Page.tsx": """import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Note } from "@/components/ui/Note";

export default function ${pascal}Page() {
  const query = useQuery({
    queryKey: ["$code"],
    queryFn: () => api.get<{ results: unknown[] }>("/$code/"),
  });

  return (
    <>
      <PageHeader title="$title" description="Deskripsi singkat modul" />
      <Card>
        {query.isLoading && <Skeleton lines={3} />}
        {query.isError && <Note tone="error">Data tidak dapat dimuat. Muat ulang halaman ini.</Note>}
        {query.data && query.data.results.length === 0 && (
          <EmptyState title="Belum ada data" hint="Data akan tampil di sini setelah ditambahkan." />
        )}
      </Card>
    </>
  );
}
""",
}


class Command(BaseCommand):
    help = "Create the skeleton of a new module (backend/modules/<kode> and frontend/src/modules/<kode>)."

    def add_arguments(self, parser) -> None:  # type: ignore[no-untyped-def]
        parser.add_argument("code", help="Module code: lowercase letters, digits, underscore")
        parser.add_argument("--title", help="Display name (default: derived from the code)")
        parser.add_argument(
            "--backend-dir", default=str(settings.MODULES_DIR), help="Where to create the backend folder"
        )
        parser.add_argument(
            "--frontend-dir",
            default=str(settings.BASE_DIR.parent / "frontend" / "src" / "modules"),
            help="Where to create the frontend folder",
        )

    def handle(self, *args: object, **options: str) -> None:
        code = options["code"]
        if not MODULE_CODE_RE.match(code):
            raise CommandError(
                "Kode modul harus 2–30 karakter: huruf kecil, angka, garis bawah; diawali huruf."
            )
        backend_root = Path(options["backend_dir"]) / code
        frontend_root = Path(options["frontend_dir"]) / code
        for target in (backend_root, frontend_root):
            if target.exists():
                raise CommandError(f"{target} sudah ada. Pilih kode lain atau hapus folder itu dulu.")

        words = code.replace("_", " ")
        values = {
            "code": code,
            "title": options.get("title") or words.title(),
            "pascal": "".join(part.capitalize() for part in code.split("_")),
        }
        for root, files in ((backend_root, BACKEND_FILES), (frontend_root, FRONTEND_FILES)):
            for name, body in files.items():
                path = root / Template(name).substitute(values)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(Template(body).substitute(values), encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"Modul '{code}' dibuat."))
        self.stdout.write(f"  backend : {backend_root}")
        self.stdout.write(f"  frontend: {frontend_root}")
        self.stdout.write("Langkah berikutnya: python manage.py makemigrations && python manage.py migrate")
        self.stdout.write("lalu muat ulang aplikasi. Lihat docs/PANDUAN-MODUL.md.")
