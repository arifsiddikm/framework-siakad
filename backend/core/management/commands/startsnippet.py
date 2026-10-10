"""`manage.py startsnippet <nama>`: scaffold a snippet (React file, optional Python half)."""

from __future__ import annotations

from string import Template

from django.core.management.base import BaseCommand, CommandError

from core import snippets

REACT = """import { Card } from "@/components/ui/Card";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

/** Shown in the page builder. `params` become the form the admin fills in. */
export const meta: SnippetMeta = {
  label: "$title",
  hint: "Deskripsi singkat snippet",
  hasData: $has_data,
  params: [{ name: "judul", label: "Judul", type: "text", default: "$title" }],
};

/** Insert in any text block with  [snippet:$name]  or add it with the "Snippet" block. */
export default function Snippet({ params$data_prop }: SnippetProps) {
  return (
    <Card className="p-5">
      <p className="text-[17px] font-semibold text-navy-900">{String(params.judul ?? "$title")}</p>$data_view
    </Card>
  );
}
"""

PYTHON = '''"""Server half of the snippet `$name` (React half: frontend/src/snippets/$rel.tsx)."""

from typing import Any

from core.models import User

PERMISSION = None  # permission code required to read this data; None = any signed-in user


def data(*, user: User, params: dict[str, Any]) -> dict[str, Any]:
    """`params` come from the admin and are untrusted: validate them. ORM only."""
    return {"message": "Halo dari server"}
'''


class Command(BaseCommand):
    help = (
        "Create a snippet: frontend/src/snippets/<nama>.tsx (+ backend/snippets/<nama>.py with --with-data)."
    )

    def add_arguments(self, parser) -> None:  # type: ignore[no-untyped-def]
        parser.add_argument(
            "name", help="Snippet name, folders separated by dots: pages.data_ijazah.upload_form"
        )
        parser.add_argument("--title", help="Label shown in the page builder")
        parser.add_argument("--with-data", action="store_true", help="Also create the Python data provider")

    def handle(self, *args: object, **options: object) -> None:
        name = str(options["name"])
        if not snippets.NAME_RE.match(name):
            raise CommandError(
                "Nama snippet: huruf kecil/angka/garis bawah, folder dipisah titik (contoh: pages.data_ijazah)."
            )
        rel = "/".join(name.split("."))
        react = snippets.frontend_dir() / f"{rel}.tsx"
        python = snippets.backend_dir() / f"{rel}.py"
        if react.exists() or (options["with_data"] and python.exists()):
            raise CommandError(f"Snippet '{name}' sudah ada. Pilih nama lain.")
        title = str(options.get("title") or name.split(".")[-1].replace("_", " ").title())
        with_data = bool(options["with_data"])
        values = {
            "name": name,
            "rel": rel,
            "title": title,
            "has_data": "true" if with_data else "false",
            "data_prop": ", data" if with_data else "",
            "data_view": '\n      <pre className="mt-2 text-[13px] text-slate-700">{JSON.stringify(data, null, 2)}</pre>'
            if with_data
            else "",
        }
        for path, template in ((react, REACT), (python, PYTHON)):
            if path is python and not with_data:
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(Template(template).substitute(values), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Snippet '{name}' dibuat."))
        self.stdout.write(f"  React : {react}")
        if with_data:
            self.stdout.write(f"  Python: {python}")
        self.stdout.write(
            f"Pakai di halaman: tulis  [snippet:{name}]  di blok Teks, atau tambah blok Snippet."
        )
