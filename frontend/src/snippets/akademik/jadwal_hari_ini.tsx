import { Card, CardHeader } from "@/components/ui/Card";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Jadwal hari ini",
  hint: "Jadwal kuliah pada hari ini (atau hari pilihan)",
  hasData: true,
  params: [{ name: "hari", label: "Hari (kosong = hari ini)", type: "select", options: ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], default: "" }],
};

type Item = { matkul: string; dosen: string; ruang: string; kelas: string; jam_mulai: string; jam_selesai: string };

export default function JadwalHariIni({ data }: SnippetProps) {
  const { hari, items } = data as { hari: string; items: Item[] };
  return (
    <Card>
      <CardHeader title={`Jadwal ${hari}`} />
      {items.length === 0 ? (
        <p className="p-5 text-text-2">Tidak ada kuliah pada hari {hari}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={`${i.matkul}-${i.kelas}`} className="grid grid-cols-[88px_1fr] gap-3 px-4 py-3 sm:px-5">
              <div className="tabular-nums"><p className="font-semibold">{i.jam_mulai}</p><p className="text-text-3">{i.jam_selesai}</p></div>
              <div><p className="font-semibold">{i.matkul}</p><p className="text-[12.5px] text-slate-600">Kelas {i.kelas} · {i.ruang} · {i.dosen}</p></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
