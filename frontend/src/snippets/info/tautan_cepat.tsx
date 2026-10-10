import { BookOpen, CalendarDays, GraduationCap, Library, Wallet } from "lucide-react";
import { Link } from "react-router";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

/** Quick links to portal pages. Edit LINKS to change the shortcuts. */
export const meta: SnippetMeta = {
  label: "Tautan cepat layanan",
  hint: "Kartu pintasan ke layanan utama",
  params: [{ name: "judul", label: "Judul", type: "text", default: "Layanan cepat" }],
};

const LINKS = [
  { to: "/jadwal", label: "Jadwal kuliah", icon: CalendarDays },
  { to: "/nilai", label: "Nilai & KHS", icon: GraduationCap },
  { to: "/keuangan", label: "Tagihan", icon: Wallet },
  { to: "/panduan-krs", label: "Panduan KRS", icon: BookOpen },
  { to: "/perpustakaan", label: "Perpustakaan", icon: Library },
];

export default function TautanCepat({ params }: SnippetProps) {
  return (
    <section>
      <h3 className="mb-3 text-[16px] font-semibold text-navy-900">{String(params.judul)}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface p-3 text-center font-medium shadow-card hover:border-navy-300">
            <Icon className="size-6 text-navy-700" strokeWidth={1.75} aria-hidden="true" /> {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
