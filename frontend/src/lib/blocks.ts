import { BarChart3, ChevronsUpDown, FileText, Image, Info, Link2, Puzzle, Table2, Table, TrendingUp, type LucideIcon } from "lucide-react";

export type Filter = { field: string; op: string; value: string };
export type StatItem = { label: string; dataset: string; aggregate: string; field: string; format: "angka" | "rupiah" | "persen"; filters: Filter[] };

export type Block = { id: string } & (
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt: string; caption: string }
  | { type: "callout"; tone: "info" | "success" | "warn" | "error"; text: string }
  | { type: "table"; title: string; columns: string[]; rows: string[][] }
  | { type: "accordion"; title: string; items: { title: string; text: string }[] }
  | { type: "links"; title: string; items: { label: string; url: string }[] }
  | { type: "data_table"; title: string; dataset: string; columns: string[]; sort: string; direction: "asc" | "desc"; limit: number; filters: Filter[] }
  | { type: "stats"; title: string; items: StatItem[] }
  | { type: "snippet"; name: string; params: Record<string, unknown> }
  | { type: "chart"; title: string; dataset: string; group_by: string; aggregate: "count" | "sum"; field: string; limit: number; filters: Filter[] }
);
export type BlockType = Block["type"];

export const DATA_BLOCKS: BlockType[] = ["data_table", "stats", "chart"];

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string; icon: LucideIcon }[] = [
  { type: "text", label: "Teks", hint: "Judul, paragraf, daftar, gambar, kutipan, tabel", icon: FileText },
  { type: "image", label: "Gambar", hint: "Gambar dari alamat https", icon: Image },
  { type: "callout", label: "Info penting", hint: "Kotak informasi atau peringatan", icon: Info },
  { type: "table", label: "Tabel manual", hint: "Tabel yang Anda isi sendiri", icon: Table },
  { type: "accordion", label: "Tanya-jawab", hint: "Daftar yang bisa dibuka-tutup", icon: ChevronsUpDown },
  { type: "links", label: "Tombol tautan", hint: "Satu atau beberapa tombol ke halaman/situs", icon: Link2 },
  { type: "data_table", label: "Tabel data", hint: "Tabel dari database atau koleksi data", icon: Table2 },
  { type: "stats", label: "Kartu statistik", hint: "Angka ringkasan: jumlah, total, rata-rata", icon: TrendingUp },
  { type: "chart", label: "Grafik batang", hint: "Perbandingan per kategori dari data", icon: BarChart3 },
  { type: "snippet", label: "Snippet", hint: "Potongan tampilan dari file React (folder snippets)", icon: Puzzle },
];

export function newId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "text": return { id, type, text: "" };
    case "image": return { id, type, url: "https://", alt: "", caption: "" };
    case "callout": return { id, type, tone: "info", text: "" };
    case "table": return { id, type, title: "", columns: ["Kolom 1", "Kolom 2"], rows: [["", ""]] };
    case "accordion": return { id, type, title: "", items: [{ title: "", text: "" }] };
    case "links": return { id, type, title: "", items: [{ label: "", url: "https://" }] };
    case "data_table": return { id, type, title: "", dataset: "", columns: [], sort: "", direction: "asc", limit: 20, filters: [] };
    case "stats": return { id, type, title: "", items: [{ label: "", dataset: "", aggregate: "count", field: "", format: "angka", filters: [] }] };
    case "chart": return { id, type, title: "", dataset: "", group_by: "", aggregate: "count", field: "", limit: 10, filters: [] };
    case "snippet": return { id, type, name: "", params: {} };
  }
}

export const FILTER_OPS: { value: string; label: string }[] = [
  { value: "eq", label: "sama dengan" },
  { value: "ne", label: "tidak sama dengan" },
  { value: "contains", label: "mengandung" },
  { value: "gt", label: "lebih dari" },
  { value: "gte", label: "minimal" },
  { value: "lt", label: "kurang dari" },
  { value: "lte", label: "maksimal" },
];

export const AGGREGATES: { value: string; label: string }[] = [
  { value: "count", label: "Jumlah baris" },
  { value: "sum", label: "Total (jumlah nilai)" },
  { value: "avg", label: "Rata-rata" },
  { value: "min", label: "Terkecil / paling awal" },
  { value: "max", label: "Terbesar / paling akhir" },
];
