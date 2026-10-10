import { Link } from "react-router";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatDate } from "@/lib/format";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Pengumuman terbaru",
  hint: "Daftar pengumuman terakhir dari modul Pengumuman",
  hasData: true,
  params: [
    { name: "jumlah", label: "Jumlah pengumuman", type: "number", default: 5 },
    { name: "kategori", label: "Kategori", type: "select", options: ["", "umum", "akademik", "keuangan", "kegiatan"], default: "" },
  ],
};

type Item = { id: number; judul: string; isi: string; kategori: string; penting: boolean; tanggal: string };

export default function PengumumanTerbaru({ data }: SnippetProps) {
  const { items } = data as { items: Item[] };
  return (
    <Card>
      <CardHeader title="Pengumuman terbaru" action={<Link to="/pengumuman" className="text-[13px] font-medium text-navy-700 hover:underline">Lihat semua</Link>} />
      {items.length === 0 ? (
        <p className="p-5 text-text-2">Belum ada pengumuman.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.judul}</span>
                {item.penting && <Chip tone="amber" dot>Penting</Chip>}
                <Chip>{item.kategori}</Chip>
              </div>
              <p className="mt-0.5 line-clamp-2 text-text-2">{item.isi}</p>
              <p className="mt-1 text-[12.5px] text-text-3">{formatDate(item.tanggal)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
