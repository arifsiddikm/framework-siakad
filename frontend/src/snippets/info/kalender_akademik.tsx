import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatDate } from "@/lib/format";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = {
  label: "Kalender akademik",
  hint: "Linimasa kegiatan akademik (data contoh dari server)",
  hasData: true,
  params: [{ name: "jenis", label: "Hanya jenis", type: "select", options: ["", "akademik", "ujian", "penting", "kegiatan"], default: "" }],
};

type Event = { tanggal: string; kegiatan: string; jenis: string };
const tone = { akademik: "navy", ujian: "amber", penting: "red", kegiatan: "green" } as const;

export default function KalenderAkademik({ data }: SnippetProps) {
  const { events } = data as { events: Event[] };
  return (
    <Card className="p-5">
      <ol className="relative space-y-4 border-l-2 border-navy-100 pl-5">
        {events.map((e) => (
          <li key={`${e.tanggal}-${e.kegiatan}`} className="relative">
            <span aria-hidden="true" className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-navy-600" />
            <p className="text-[12.5px] font-medium text-slate-600">{formatDate(e.tanggal)}</p>
            <p className="font-semibold text-slate-900">{e.kegiatan} <Chip tone={tone[e.jenis as keyof typeof tone] ?? "neutral"}>{e.jenis}</Chip></p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
