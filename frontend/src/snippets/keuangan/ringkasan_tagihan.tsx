import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { Note } from "@/components/ui/Note";
import { formatDate, formatNumber } from "@/lib/format";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

export const meta: SnippetMeta = { label: "Ringkasan tagihan saya", hint: "Total yang belum dibayar + tagihan terdekat", hasData: true };

export default function RingkasanTagihan({ data }: SnippetProps) {
  const d = data as { has_nim: boolean; belum_dibayar: number; jumlah_tagihan: number; berikutnya: { keterangan: string; jumlah: number; jatuh_tempo: string } | null };
  if (!d.has_nim) return <Note tone="info">Snippet ini menampilkan tagihan milik mahasiswa. Akun Anda tidak memiliki NIM.</Note>;
  return (
    <Card className="p-5">
      <p className="text-text-2">Belum dibayar</p>
      <p className="text-[28px] font-semibold leading-tight text-navy-900 tabular-nums">Rp {formatNumber(d.belum_dibayar)}</p>
      {d.berikutnya ? (
        <p className="mt-2 text-slate-700">Berikutnya: <strong>{d.berikutnya.keterangan}</strong> — Rp {formatNumber(d.berikutnya.jumlah)}, jatuh tempo {formatDate(d.berikutnya.jatuh_tempo)}.</p>
      ) : (
        <p className="mt-2 text-green-700">Semua tagihan sudah lunas.</p>
      )}
      <Link to="/keuangan" className="mt-3 inline-flex min-h-10 items-center font-medium text-navy-700 hover:underline">Lihat semua tagihan →</Link>
    </Card>
  );
}
