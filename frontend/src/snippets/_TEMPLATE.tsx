// SALIN file ini, ganti namanya (tanpa awalan "_"), lalu edit.  Contoh: pages/laporan_ujian.tsx
// Nama snippet = path file dengan titik:  pages/laporan_ujian.tsx  ->  [snippet:pages.laporan_ujian]
// Folder boleh bertingkat: pages/laporan/ringkas.tsx -> pages.laporan.ringkas
// Atau buat otomatis:  python manage.py startsnippet pages.laporan_ujian --with-data
import { Card } from "@/components/ui/Card";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Nama di editor halaman",
  hint: "Deskripsi singkat",
  hasData: false, // true bila ada backend/snippets/<path yang sama>.py
  params: [{ name: "judul", label: "Judul", type: "text", default: "Halo" }],
};

export default function Snippet({ params }: SnippetProps) {
  return (
    <Card className="p-5">
      <p className="text-[17px] font-semibold text-navy-900">{String(params.judul)}</p>
    </Card>
  );
}
