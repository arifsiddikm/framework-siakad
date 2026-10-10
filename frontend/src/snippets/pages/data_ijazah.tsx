import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

/**
 * CONTOH snippet: tabel data ijazah (data fiktif dari backend/snippets/pages/data_ijazah.py).
 * Pasang di halaman mana pun dengan:  [snippet:pages.data_ijazah]   atau   [snippet:pages.data_ijazah limit=2]
 */
export const meta: SnippetMeta = {
  label: "Data ijazah (contoh)",
  hint: "Tabel pengambilan ijazah; data dari server",
  hasData: true,
  params: [
    { name: "judul", label: "Judul", type: "text", default: "Status pengambilan ijazah" },
    { name: "limit", label: "Maksimal baris", type: "number", default: 10 },
    { name: "status", label: "Filter status (kosong = semua)", type: "select", options: ["", "Siap diambil", "Dalam proses", "Diverifikasi"], default: "" },
  ],
};

type Row = { nomor: string; nama: string; prodi: string; status: string };

export default function DataIjazah({ params, data }: SnippetProps) {
  const { rows, total } = data as { rows: Row[]; total: number };
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h3 className="text-[16px] font-semibold text-navy-900">{String(params.judul)}</h3>
        <p className="text-[12.5px] text-text-3">{total} data</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[14px]">
          <thead>
            <tr className="bg-slate-50 text-[12.5px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-2.5 font-semibold">Nomor</th><th className="px-4 py-2.5 font-semibold">Nama</th><th className="px-4 py-2.5 font-semibold">Program studi</th><th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nomor} className="border-t border-line">
                <td className="px-4 py-2.5 font-mono text-[13px]">{r.nomor}</td>
                <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                <td className="px-4 py-2.5">{r.prodi}</td>
                <td className="px-4 py-2.5"><Chip tone={r.status === "Siap diambil" ? "green" : "amber"} dot>{r.status}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
