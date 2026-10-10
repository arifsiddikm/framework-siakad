import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DatasetInfo } from "@/admin/blocks/types";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { AGGREGATES, type Block, FILTER_OPS, type Filter, type StatItem } from "@/lib/blocks";
import { parseDelimited } from "@/lib/csv";
import { snippetList, snippets } from "@/snippets/registry";

type Ctx = { datasets: DatasetInfo[] };
type Props<T extends Block> = { block: T; onChange: (next: T) => void } & Ctx;

const SNIPPETS: { label: string; text: string }[] = [
  { label: "Judul", text: "# Judul besar" },
  { label: "Sub judul", text: "## Sub judul" },
  { label: "Daftar", text: "- butir pertama\n- butir kedua" },
  { label: "Daftar bernomor", text: "1. langkah pertama\n2. langkah kedua" },
  { label: "Kutipan", text: "> Kutipan atau catatan penting" },
  { label: "Tabel", text: "| Kolom A | Kolom B |\n|---|---|\n| isi 1 | isi 2 |" },
  { label: "Gambar", text: "![keterangan gambar](https://contoh.ac.id/gambar.png)" },
  { label: "Garis", text: "---" },
];

function DatasetSelect({ datasets, value, onChange, label = "Sumber data" }: { datasets: DatasetInfo[]; value: string; onChange: (code: string) => void; label?: string }) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pilih sumber data…</option>
      {datasets.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
    </Select>
  );
}

function FilterEditor({ dataset, filters, onChange }: { dataset?: DatasetInfo; filters: Filter[]; onChange: (next: Filter[]) => void }) {
  if (!dataset) return null;
  const update = (i: number, patch: Partial<Filter>) => onChange(filters.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">Saring baris (opsional)</legend>
      {filters.map((f, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Select label="Kolom" value={f.field} onChange={(e) => update(i, { field: e.target.value })}>
            <option value="">Pilih…</option>
            {dataset.fields.map((x) => <option key={x.name} value={x.name}>{x.label}</option>)}
          </Select>
          <Select label="Syarat" value={f.op} onChange={(e) => update(i, { op: e.target.value })}>
            {FILTER_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Nilai" value={f.value} onChange={(e) => update(i, { value: e.target.value })} />
          <Button variant="ghost" size="sm" className="self-end" aria-label="Hapus syarat" onClick={() => onChange(filters.filter((_, n) => n !== i))}>
            <Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      ))}
      {filters.length < 6 && (
        <Button variant="secondary" size="sm" onClick={() => onChange([...filters, { field: dataset.fields[0]?.name ?? "", op: "eq", value: "" }])}>
          <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah syarat
        </Button>
      )}
    </fieldset>
  );
}

function TextForm({ block, onChange }: Props<Extract<Block, { type: "text" }>>) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sisipkan format">
        {SNIPPETS.map((s) => (
          <Button key={s.label} variant="secondary" size="sm" onClick={() => onChange({ ...block, text: `${block.text}${block.text && !block.text.endsWith("\n") ? "\n" : ""}${s.text}\n` })}>
            {s.label}
          </Button>
        ))}
      </div>
      <Select label="Sisipkan snippet dari file" value="" onChange={(e) => e.target.value && onChange({ ...block, text: `${block.text}${block.text && !block.text.endsWith("\n") ? "\n" : ""}[snippet:${e.target.value}]\n` })}
        hint={snippetList.length ? "Menambahkan baris [snippet:nama]. File-nya di frontend/src/snippets/." : "Belum ada snippet. Lihat frontend/src/snippets/EDIT_ADD_FILE_HERE."}>
        <option value="">Pilih snippet…</option>
        {snippetList.map((sn) => <option key={sn.name} value={sn.name}>{sn.meta.label} — {sn.name}</option>)}
      </Select>
      <Textarea label="Isi teks" rows={9} value={block.text} maxLength={20000} onChange={(e) => onChange({ ...block, text: e.target.value })}
        hint="Format: # judul · ## sub judul · - daftar · 1. bernomor · > kutipan · | tabel | · ![gambar](https://…) · **tebal** · *miring* · `kode` · [teks](https://…) · [snippet:nama] · baris kosong = paragraf baru." />
    </div>
  );
}

function TableForm({ block, onChange }: Props<Extract<Block, { type: "table" }>>) {
  const [paste, setPaste] = useState("");
  const [open, setOpen] = useState(false);
  const setCell = (r: number, c: number, value: string) => onChange({ ...block, rows: block.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)) });
  const apply = () => {
    const parsed = parseDelimited(paste);
    if (parsed.length === 0) return;
    const [header, ...rows] = parsed;
    onChange({ ...block, columns: header.slice(0, 12), rows: rows.map((r) => header.slice(0, 12).map((_, i) => r[i] ?? "")) });
    setPaste("");
    setOpen(false);
  };
  return (
    <div className="space-y-3">
      <Input label="Judul tabel (opsional)" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      <div className="overflow-x-auto rounded-ctl border border-line">
        <table className="w-full min-w-[480px] text-[14px]">
          <thead>
            <tr className="bg-slate-50">
              {block.columns.map((col, c) => (
                <th key={c} className="p-1.5">
                  <div className="flex items-center gap-1">
                    <input aria-label={`Judul kolom ${c + 1}`} value={col} maxLength={60} className="w-full rounded-ctl border border-slate-300 px-2 py-1.5 font-semibold" onChange={(e) => onChange({ ...block, columns: block.columns.map((x, i) => (i === c ? e.target.value : x)) })} />
                    {block.columns.length > 1 && (
                      <button type="button" aria-label={`Hapus kolom ${c + 1}`} className="grid size-8 shrink-0 place-items-center rounded-ctl hover:bg-red-50" onClick={() => onChange({ ...block, columns: block.columns.filter((_, i) => i !== c), rows: block.rows.map((r) => r.filter((_, i) => i !== c)) })}>
                        <Trash2 className="size-3.5 text-red-700" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="border-t border-line">
                {block.columns.map((_, c) => (
                  <td key={c} className="p-1.5"><input aria-label={`Baris ${r + 1} kolom ${c + 1}`} value={row[c] ?? ""} maxLength={300} className="w-full rounded-ctl border border-slate-300 px-2 py-1.5" onChange={(e) => setCell(r, c, e.target.value)} /></td>
                ))}
                <td className="p-1.5">
                  <button type="button" aria-label={`Hapus baris ${r + 1}`} className="grid size-8 place-items-center rounded-ctl hover:bg-red-50" onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== r) })}>
                    <Trash2 className="size-3.5 text-red-700" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => onChange({ ...block, rows: [...block.rows, block.columns.map(() => "")] })}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Baris</Button>
        {block.columns.length < 12 && <Button variant="secondary" size="sm" onClick={() => onChange({ ...block, columns: [...block.columns, `Kolom ${block.columns.length + 1}`], rows: block.rows.map((r) => [...r, ""]) })}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Kolom</Button>}
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>Tempel dari Excel / CSV</Button>
      </div>
      {open && (
        <div className="space-y-2">
          <Textarea label="Tempel data (baris pertama = judul kolom)" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} hint="Salin sel dari Excel/Google Sheets lalu tempel di sini. Mengganti isi tabel di atas." />
          <Button size="sm" onClick={apply}>Terapkan</Button>
        </div>
      )}
    </div>
  );
}

function ListForm<T>({ items, add, remove, render, max }: { items: T[]; add: () => void; remove: (i: number) => void; render: (item: T, i: number) => React.ReactNode; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 rounded-ctl border border-line p-3">
          <div className="grid min-w-0 flex-1 gap-3">{render(item, i)}</div>
          {items.length > 1 && <Button variant="ghost" size="sm" className="self-start" aria-label={`Hapus butir ${i + 1}`} onClick={() => remove(i)}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>}
        </div>
      ))}
      {items.length < max && <Button variant="secondary" size="sm" onClick={add}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah butir</Button>}
    </div>
  );
}

function StatItemForm({ item, onChange, datasets }: { item: StatItem; onChange: (next: StatItem) => void; datasets: DatasetInfo[] }) {
  const dataset = datasets.find((d) => d.code === item.dataset);
  const numeric = dataset?.fields.filter((f) => f.type === "number" || (["min", "max"].includes(item.aggregate) && f.type === "date")) ?? [];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Label kartu" value={item.label} maxLength={60} onChange={(e) => onChange({ ...item, label: e.target.value })} />
        <DatasetSelect datasets={datasets} value={item.dataset} onChange={(code) => onChange({ ...item, dataset: code, field: "", filters: [] })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Hitung" value={item.aggregate} onChange={(e) => onChange({ ...item, aggregate: e.target.value, field: "" })}>
          {AGGREGATES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </Select>
        {item.aggregate !== "count" && (
          <Select label="Kolom yang dihitung" value={item.field} onChange={(e) => onChange({ ...item, field: e.target.value })}>
            <option value="">Pilih kolom…</option>
            {numeric.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
          </Select>
        )}
        <Select label="Tampilan angka" value={item.format} onChange={(e) => onChange({ ...item, format: e.target.value as StatItem["format"] })}>
          <option value="angka">Angka biasa</option><option value="rupiah">Rupiah (Rp)</option><option value="persen">Persen (%)</option>
        </Select>
      </div>
      <FilterEditor dataset={dataset} filters={item.filters} onChange={(filters) => onChange({ ...item, filters })} />
    </>
  );
}

function SnippetForm({ block, onChange }: Props<Extract<Block, { type: "snippet" }>>) {
  const snippet = snippets[block.name];
  const set = (name: string, value: unknown) => onChange({ ...block, params: { ...block.params, [name]: value } });
  return (
    <div className="space-y-3">
      <Select label="Snippet" value={block.name} onChange={(e) => onChange({ ...block, name: e.target.value, params: {} })}
        hint="Daftar ini dibaca otomatis dari file di frontend/src/snippets/.">
        <option value="">Pilih snippet…</option>
        {snippetList.map((s) => <option key={s.name} value={s.name}>{s.meta.label} — {s.name}</option>)}
      </Select>
      {block.name && !snippet && <Note tone="warn">Snippet "{block.name}" tidak ditemukan. File-nya mungkin sudah dihapus; pilih snippet lain atau hapus blok ini.</Note>}
      {snippet && (
        <>
          <div className="rounded-ctl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
            <p>{snippet.meta.hint}</p>
            <p className="mt-1">Edit tampilan: <code className="font-mono">{snippet.file}</code></p>
            {snippet.meta.hasData && <p>Edit data server: <code className="font-mono">{snippet.pythonFile}</code></p>}
            <p>Di blok Teks: <code className="font-mono">[snippet:{snippet.name}]</code></p>
          </div>
          {(snippet.meta.params ?? []).length === 0 && <p className="text-text-2">Snippet ini tidak punya pengaturan.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {(snippet.meta.params ?? []).map((p) => {
              const value = block.params[p.name] ?? p.default ?? "";
              if (p.type === "boolean") return <Checkbox key={p.name} label={p.label} checked={Boolean(value)} onChange={(on) => set(p.name, on)} />;
              if (p.type === "select") {
                return (
                  <Select key={p.name} label={p.label} value={String(value)} onChange={(e) => set(p.name, e.target.value)}>
                    {(p.options ?? []).map((o) => <option key={o} value={o}>{o || "(semua)"}</option>)}
                  </Select>
                );
              }
              return <Input key={p.name} label={p.label} inputMode={p.type === "number" ? "decimal" : undefined} value={String(value)} onChange={(e) => set(p.name, p.type === "number" ? e.target.value.replace(/[^\d.,-]/g, "") : e.target.value)} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Editor of one block, by type. */
export function BlockForm({ block, onChange, datasets }: Props<Block>) {
  const ctx = { datasets };
  switch (block.type) {
    case "text":
      return <TextForm block={block} onChange={onChange} {...ctx} />;
    case "image":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Alamat gambar (https)" required value={block.url} className="sm:col-span-2" onChange={(e) => onChange({ ...block, url: e.target.value })} />
          <Input label="Teks pengganti (untuk pembaca layar)" value={block.alt} maxLength={120} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <Input label="Keterangan di bawah gambar" value={block.caption} maxLength={200} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          {block.url.startsWith("https://") && block.url.length > 12 && <img src={block.url} alt="" className="max-h-40 rounded-ctl border border-line object-contain sm:col-span-2" />}
        </div>
      );
    case "callout":
      return (
        <div className="grid gap-3">
          <Select label="Jenis" value={block.tone} onChange={(e) => onChange({ ...block, tone: e.target.value as typeof block.tone })}>
            <option value="info">Informasi</option><option value="success">Berhasil / kabar baik</option><option value="warn">Peringatan</option><option value="error">Penting / bahaya</option>
          </Select>
          <Textarea label="Isi" rows={3} value={block.text} maxLength={1000} onChange={(e) => onChange({ ...block, text: e.target.value })} />
        </div>
      );
    case "table":
      return <TableForm block={block} onChange={onChange} {...ctx} />;
    case "accordion":
      return (
        <div className="space-y-3">
          <Input label="Judul bagian (opsional)" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <ListForm items={block.items} max={30} add={() => onChange({ ...block, items: [...block.items, { title: "", text: "" }] })} remove={(i) => onChange({ ...block, items: block.items.filter((_, n) => n !== i) })}
            render={(item, i) => (
              <>
                <Input label="Pertanyaan / judul" value={item.title} maxLength={120} onChange={(e) => onChange({ ...block, items: block.items.map((x, n) => (n === i ? { ...x, title: e.target.value } : x)) })} />
                <Textarea label="Jawaban" rows={3} value={item.text} maxLength={5000} onChange={(e) => onChange({ ...block, items: block.items.map((x, n) => (n === i ? { ...x, text: e.target.value } : x)) })} />
              </>
            )} />
        </div>
      );
    case "links":
      return (
        <div className="space-y-3">
          <Input label="Judul bagian (opsional)" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <ListForm items={block.items} max={12} add={() => onChange({ ...block, items: [...block.items, { label: "", url: "https://" }] })} remove={(i) => onChange({ ...block, items: block.items.filter((_, n) => n !== i) })}
            render={(item, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Teks tombol" value={item.label} maxLength={60} onChange={(e) => onChange({ ...block, items: block.items.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)) })} />
                <Input label="Tujuan (https://… atau /halaman)" value={item.url} onChange={(e) => onChange({ ...block, items: block.items.map((x, n) => (n === i ? { ...x, url: e.target.value } : x)) })} />
              </div>
            )} />
        </div>
      );
    case "data_table": {
      const dataset = datasets.find((d) => d.code === block.dataset);
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Judul tabel (opsional)" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <DatasetSelect datasets={datasets} value={block.dataset} onChange={(code) => onChange({ ...block, dataset: code, columns: datasets.find((d) => d.code === code)?.fields.slice(0, 5).map((f) => f.name) ?? [], sort: "", filters: [] })} />
          </div>
          {dataset && (
            <>
              <fieldset>
                <legend className="mb-1 text-[13px] font-medium">Kolom yang ditampilkan</legend>
                <div className="grid gap-x-4 sm:grid-cols-3">
                  {dataset.fields.map((f) => (
                    <Checkbox key={f.name} label={f.label} checked={block.columns.includes(f.name)}
                      onChange={(on) => onChange({ ...block, columns: on ? [...block.columns, f.name] : block.columns.filter((c) => c !== f.name) })} />
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Urutkan menurut" value={block.sort} onChange={(e) => onChange({ ...block, sort: e.target.value })}>
                  <option value="">(urutan bawaan)</option>
                  {dataset.fields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                </Select>
                <Select label="Arah" value={block.direction} onChange={(e) => onChange({ ...block, direction: e.target.value as "asc" | "desc" })}>
                  <option value="asc">Naik (A→Z, kecil→besar)</option><option value="desc">Turun (Z→A, besar→kecil)</option>
                </Select>
                <Input label="Maksimal baris" inputMode="numeric" value={String(block.limit)} onChange={(e) => onChange({ ...block, limit: Math.max(1, Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 1)) })} hint="1–100" />
              </div>
              <FilterEditor dataset={dataset} filters={block.filters} onChange={(filters) => onChange({ ...block, filters })} />
            </>
          )}
        </div>
      );
    }
    case "stats":
      return (
        <div className="space-y-3">
          <Input label="Judul bagian (opsional)" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <ListForm items={block.items.map((i) => ({ ...i, title: i.label }))} max={6}
            add={() => onChange({ ...block, items: [...block.items, { label: "", dataset: "", aggregate: "count", field: "", format: "angka", filters: [] }] })}
            remove={(i) => onChange({ ...block, items: block.items.filter((_, n) => n !== i) })}
            render={(_, i) => <StatItemForm item={block.items[i]} datasets={datasets} onChange={(next) => onChange({ ...block, items: block.items.map((x, n) => (n === i ? next : x)) })} />} />
        </div>
      );
    case "chart": {
      const dataset = datasets.find((d) => d.code === block.dataset);
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Judul grafik" value={block.title} maxLength={100} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <DatasetSelect datasets={datasets} value={block.dataset} onChange={(code) => onChange({ ...block, dataset: code, group_by: "", field: "", filters: [] })} />
          </div>
          {dataset && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Select label="Kelompokkan menurut" value={block.group_by} onChange={(e) => onChange({ ...block, group_by: e.target.value })}>
                  <option value="">Pilih kolom…</option>
                  {dataset.fields.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                </Select>
                <Select label="Nilai batang" value={block.aggregate} onChange={(e) => onChange({ ...block, aggregate: e.target.value as "count" | "sum", field: "" })}>
                  <option value="count">Jumlah baris</option><option value="sum">Total nilai kolom</option>
                </Select>
                {block.aggregate === "sum" && (
                  <Select label="Kolom angka" value={block.field} onChange={(e) => onChange({ ...block, field: e.target.value })}>
                    <option value="">Pilih…</option>
                    {dataset.fields.filter((f) => f.type === "number").map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
                  </Select>
                )}
                <Input label="Maksimal batang" inputMode="numeric" value={String(block.limit)} onChange={(e) => onChange({ ...block, limit: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) })} hint="1–20" />
              </div>
              <FilterEditor dataset={dataset} filters={block.filters} onChange={(filters) => onChange({ ...block, filters })} />
            </>
          )}
        </div>
      );
    }
    case "snippet":
      return <SnippetForm block={block} onChange={onChange} {...ctx} />;
  }
}
