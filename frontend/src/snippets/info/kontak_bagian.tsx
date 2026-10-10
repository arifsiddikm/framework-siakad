import { Mail, Phone, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

/** Contact card. Tampilan saja (tanpa data server): semua isi datang dari params. */
export const meta: SnippetMeta = {
  label: "Kartu kontak bagian",
  hint: "Kontak satu bagian/unit layanan",
  params: [
    { name: "bagian", label: "Nama bagian", type: "text", default: "Bagian Akademik" },
    { name: "email", label: "Email", type: "text", default: "akademik@kampus.example.ac.id" },
    { name: "telepon", label: "Telepon", type: "text", default: "(021) 555-0101" },
    { name: "jam", label: "Jam layanan", type: "text", default: "Senin–Jumat, 08.00–15.00 WIB" },
  ],
};

export default function KontakBagian({ params }: SnippetProps) {
  const rows = [
    { icon: Mail, text: String(params.email) },
    { icon: Phone, text: String(params.telepon) },
    { icon: Clock, text: String(params.jam) },
  ];
  return (
    <Card className="p-5">
      <h3 className="text-[16px] font-semibold text-navy-900">{String(params.bagian)}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-slate-700">
            <Icon className="size-4 shrink-0 text-navy-600" strokeWidth={1.75} aria-hidden="true" /> {text}
          </li>
        ))}
      </ul>
    </Card>
  );
}
