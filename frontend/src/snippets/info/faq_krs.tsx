import { Card } from "@/components/ui/Card";
import type { SnippetMeta } from "@/snippets/types";

/** Static FAQ (no server data). Edit the questions right here. */
export const meta: SnippetMeta = { label: "FAQ pengisian KRS", hint: "Tanya-jawab seputar KRS (isi tetap di file)" };

const FAQ = [
  { q: "Kapan KRS bisa diisi?", a: "Selama masa KRS di kalender akademik. Di luar masa itu, KRS terkunci kecuali ada izin dari bagian akademik." },
  { q: "Berapa SKS maksimal yang boleh diambil?", a: "Ditentukan IPS semester lalu: IPS ≥ 3,00 boleh 24 SKS, 2,50–2,99 boleh 21 SKS, di bawahnya 18 SKS." },
  { q: "Siapa yang menyetujui KRS?", a: "Dosen wali. Status KRS berubah menjadi Disetujui setelah dosen wali menyetujui." },
  { q: "KRS tidak bisa disimpan, kenapa?", a: "Biasanya karena tagihan SPP tahap 1 belum lunas atau ada bentrok jadwal. Cek halaman Tagihan dan Jadwal kuliah." },
];

export default function FaqKrs() {
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {FAQ.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden="true" className="text-slate-500 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="px-4 pb-4 text-slate-700">{item.a}</p>
        </details>
      ))}
    </Card>
  );
}
