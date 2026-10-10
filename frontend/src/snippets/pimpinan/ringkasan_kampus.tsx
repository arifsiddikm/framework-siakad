import { Card } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = { label: "Ringkasan kampus (pimpinan)", hint: "KPI utama dan sebaran mahasiswa per program studi", hasData: true };

type Data = { mahasiswa: number; program_studi: number; nilai_tercatat: number; tagihan_belum: number; per_prodi: { prodi: string; jumlah: number }[] };

export default function RingkasanKampus({ data }: SnippetProps) {
  const d = data as Data;
  const kpi = [
    { label: "Mahasiswa", value: formatNumber(d.mahasiswa) },
    { label: "Program studi", value: formatNumber(d.program_studi) },
    { label: "Nilai tercatat", value: formatNumber(d.nilai_tercatat) },
    { label: "Tagihan belum lunas", value: `Rp ${formatNumber(d.tagihan_belum)}` },
  ];
  const max = Math.max(1, ...d.per_prodi.map((p) => p.jumlah));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label} className="p-4"><p className="text-text-2">{k.label}</p><p className="mt-1 text-[24px] font-semibold leading-tight text-navy-900 tabular-nums">{k.value}</p></Card>
        ))}
      </div>
      <Card className="p-5">
        <p className="mb-3 font-semibold">Mahasiswa per program studi</p>
        <ul className="space-y-3">
          {d.per_prodi.map((p) => (
            <li key={p.prodi}>
              <div className="mb-1 flex justify-between text-[13.5px]"><span className="font-medium">{p.prodi}</span><span className="tabular-nums">{p.jumlah}</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-navy-50"><div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.max(3, (p.jumlah / max) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
