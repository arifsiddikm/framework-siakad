import { Card, CardHeader } from "@/components/ui/Card";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Mahasiswa bimbingan",
  hint: "Daftar mahasiswa bimbingan dosen wali (data contoh)",
  hasData: true,
  params: [{ name: "prodi", label: "Program studi", type: "select", options: ["Teknik Informatika", "Sistem Informasi", "Manajemen"], default: "Teknik Informatika" }],
};

export default function MahasiswaBimbingan({ data }: SnippetProps) {
  const { prodi, items } = data as { prodi: string; items: { nim: string; nama: string; angkatan: number }[] };
  return (
    <Card>
      <CardHeader title={`Mahasiswa bimbingan · ${prodi}`} />
      <ul className="divide-y divide-line">
        {items.map((m) => (
          <li key={m.nim} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            <span><span className="font-semibold">{m.nama}</span> <span className="text-text-3">Angkatan {m.angkatan}</span></span>
            <code className="font-mono text-[13px] text-slate-600">{m.nim}</code>
          </li>
        ))}
      </ul>
    </Card>
  );
}
