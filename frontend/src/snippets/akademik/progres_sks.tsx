import { Card } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Progres SKS & IPK",
  hint: "Kemajuan studi mahasiswa yang sedang login",
  hasData: true,
  params: [{ name: "target", label: "Target SKS kelulusan", type: "number", default: 144 }],
};

export default function ProgresSks({ data }: SnippetProps) {
  const d = data as { sks: number; target: number; ipk: number | null; has_nim: boolean };
  if (!d.has_nim) return <Note tone="info">Snippet ini menampilkan progres milik mahasiswa. Akun Anda tidak memiliki NIM.</Note>;
  const pct = Math.min(100, Math.round((d.sks / d.target) * 100));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-text-2">SKS lulus</p><p className="text-[28px] font-semibold leading-tight text-navy-900 tabular-nums">{d.sks} <span className="text-[16px] font-normal text-text-3">/ {d.target}</span></p></div>
        <div className="text-right"><p className="text-text-2">IPK</p><p className="text-[28px] font-semibold leading-tight text-navy-900 tabular-nums">{d.ipk?.toFixed(2).replace(".", ",") ?? "—"}</p></div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-navy-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres SKS">
        <div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="mt-1.5 text-[12.5px] text-text-3">{pct}% dari target kelulusan</p>
    </Card>
  );
}
