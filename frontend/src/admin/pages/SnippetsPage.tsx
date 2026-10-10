import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileCode2, Plus, RotateCcw, Server, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { alertError, alertInfo, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";

type Row = {
  id: number;
  name: string;
  label: string;
  hint: string;
  is_active: boolean;
  created_from_web: boolean;
  has_data: boolean;
  file: string;
  python_file: string;
  file_exists: boolean;
  used_in: number;
  shortcode: string;
};
type Param = { name: string; label: string; type: "text" | "number" | "boolean" | "select"; options: string[]; default: string };

const KEY = ["admin", "snippets"];

async function copy(text: string, what: string) {
  await navigator.clipboard?.writeText(text);
  toastSuccess(`${what} disalin.`);
}

export default function SnippetsPage() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: KEY, queryFn: () => api.get<Row[]>("/admin/snippets/") });
  const [creating, setCreating] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const rows = (list.data ?? []).filter((r) => showDeleted || r.is_active);
  const deletedCount = (list.data ?? []).filter((r) => !r.is_active).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const restore = useMutation({
    mutationFn: (row: Row) => api.post<Row>(`/admin/snippets/${row.id}/restore/`),
    onSuccess: (row) => { toastSuccess(`${row.label || row.name} dipulihkan.`); refresh(); },
    onError: (e) => alertError("Snippet tidak dapat dipulihkan", errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (row: Row) => api.delete<Row>(`/admin/snippets/${row.id}/`),
    onSuccess: (row) => { toastSuccess(`${row.label || row.name} dihapus (file diganti nama *_deleted).`); refresh(); },
    onError: (e) => alertError("Snippet tidak dapat dihapus", errorMessage(e)),
  });
  const askDelete = async (row: Row) => {
    const ok = await confirmAction({
      title: "Hapus snippet?",
      text: `${row.name} akan dinonaktifkan dan file-nya diganti nama menjadi *_deleted (tidak dihapus permanen, bisa dipulihkan).${row.used_in ? ` Snippet ini dipakai di ${row.used_in} tempat; bagian itu akan menampilkan peringatan sampai dilepas.` : ""}`,
      confirmText: "Ya, hapus",
      danger: true,
    });
    if (ok) remove.mutate(row);
  };

  return (
    <>
      <PageHeader
        title="Snippet"
        description="Potongan halaman dari file React. Buat dari sini (file dibuat otomatis dan rapi), lalu developer mengisi tampilannya di IDE. Daftar ini terbaca otomatis dari folder snippets."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Snippet baru</Button>}
      />
      <Note tone="info" className="mb-5">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Snippet baru</strong> membuat file kerangka di <code className="font-mono">frontend/src/snippets/</code> (dan <code className="font-mono">backend/snippets/</code> bila butuh data server). Isinya <em>kerangka</em>; tampilan dan logika diedit developer di IDE lalu di-commit ke Git.</li>
          <li><strong>Hapus</strong> hanya menonaktifkan: file diganti nama jadi <code className="font-mono">nama_deleted.tsx</code> dan bisa <strong>dipulihkan</strong>. Tidak ada yang hilang permanen.</li>
          <li>Di mode pengembangan file baru langsung terbaca. Di server produksi, jalankan <code className="font-mono">npm run build</code> setelah file di-commit agar tampil.</li>
        </ul>
      </Note>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
          <p className="font-semibold">{rows.length} snippet{showDeleted ? "" : " aktif"}</p>
          {deletedCount > 0 && <Checkbox label={`Tampilkan yang dihapus (${deletedCount})`} checked={showDeleted} onChange={setShowDeleted} />}
        </div>
        <DataTable<Row>
          caption="Daftar snippet"
          rows={rows}
          rowKey={(r) => r.id}
          loading={list.isLoading}
          error={list.isError ? errorMessage(list.error) : null}
          empty={<EmptyState title="Belum ada snippet" hint="Buat snippet pertama dengan tombol Snippet baru." />}
          columns={[
            {
              key: "name",
              header: "Snippet",
              cell: (r) => (
                <div className={r.is_active ? "" : "opacity-60"}>
                  <p className="font-semibold">{r.label || r.name}</p>
                  <code className="font-mono text-[12px] text-slate-600">{r.name}</code>
                  {r.hint && <p className="text-[12.5px] text-text-3">{r.hint}</p>}
                </div>
              ),
            },
            {
              key: "files",
              header: "Lokasi file",
              cell: (r) => (
                <div className="space-y-0.5 text-[12.5px] text-slate-600">
                  <p className="flex items-center gap-1.5"><FileCode2 className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" /><code className="break-all font-mono">{r.file}</code></p>
                  {r.has_data && <p className="flex items-center gap-1.5"><Server className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" /><code className="break-all font-mono">{r.python_file}</code></p>}
                </div>
              ),
            },
            {
              key: "src",
              header: "Asal",
              cell: (r) => <Chip tone={r.created_from_web ? "navy" : "neutral"}>{r.created_from_web ? "Dibuat dari web" : "Dari file"}</Chip>,
            },
            { key: "used", header: "Dipakai", cell: (r) => (r.used_in ? `${r.used_in} tempat` : <span className="text-text-3">Belum</span>) },
            {
              key: "status",
              header: "Status",
              cell: (r) => (r.is_active ? <Chip tone="green" dot>Aktif</Chip> : <Chip tone="neutral" dot>Dihapus</Chip>),
            },
            {
              key: "actions",
              header: "Tindakan",
              className: "text-right",
              cell: (r) => (
                <div className="flex justify-end gap-1">
                  {r.is_active ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => copy(r.shortcode, "Kode snippet")} aria-label={`Salin kode ${r.name}`}><Copy className="size-4" strokeWidth={1.75} aria-hidden="true" /> Salin kode</Button>
                      <Button variant="ghost" size="sm" onClick={() => askDelete(r)} aria-label={`Hapus ${r.name}`}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" loading={restore.isPending} onClick={() => restore.mutate(r)} aria-label={`Pulihkan ${r.name}`}><RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" /> Pulihkan</Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Dialog open={creating} onClose={() => setCreating(false)} title="Snippet baru" wide>
        {creating && <CreateForm onClose={() => setCreating(false)} onCreated={(row) => {
          setCreating(false);
          refresh();
          toastSuccess("Snippet dibuat.");
          void alertInfo("File snippet dibuat", `${row.file}${row.has_data ? `  •  ${row.python_file}` : ""}. Edit tampilannya di IDE, lalu pasang di halaman dengan ${row.shortcode}`);
        }} />}
      </Dialog>
    </>
  );
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (row: Row) => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [hint, setHint] = useState("");
  const [hasData, setHasData] = useState(false);
  const [params, setParams] = useState<Param[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const update = (i: number, patch: Partial<Param>) => setParams((prev) => prev.map((p, n) => (n === i ? { ...p, ...patch } : p)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const row = await api.post<Row>("/admin/snippets/", {
        name: name.trim(),
        label,
        hint,
        has_data: hasData,
        params: params.filter((p) => p.name.trim()).map((p) => ({ ...p, label: p.label || p.name })),
      });
      onCreated(row);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      alertError("Snippet belum dapat dibuat", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const path = `frontend/src/snippets/${name.trim().split(".").filter(Boolean).join("/") || "…"}.tsx`;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nama snippet" required value={name} maxLength={120} error={errors.name} onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="pages.data_ijazah" hint="Folder dipisah titik, bebas bertingkat. Contoh: pages.data_ijazah.upload_form" />
        <Input label="Nama tampil di editor" required value={label} maxLength={80} error={errors.label} onChange={(e) => setLabel(e.target.value)} placeholder="contoh: Formulir unggah ijazah" />
      </div>
      <Input label="Deskripsi singkat" value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} />

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium">Isian pengaturan (opsional)</legend>
        <p className="text-[13px] text-text-3">
          Pengaturan yang nanti diisi admin saat memasang snippet ini di halaman, misalnya <em>Judul</em> atau <em>Maksimal baris</em>.
          Tampil sebagai formulir di blok Snippet, atau ditulis di kode: <code className="font-mono">[snippet:nama judul="Laporan"]</code>.
          Nilainya diterima komponen React sebagai <code className="font-mono">params</code>. Kosongkan bila snippet tidak butuh pengaturan; bisa ditambah nanti di file-nya.
        </p>
        {params.map((p, i) => (
          <div key={i} className="grid gap-3 rounded-ctl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input label="Kode isian" value={p.name} maxLength={30} onChange={(e) => update(i, { name: e.target.value.toLowerCase() })} hint="contoh: judul" />
            <Input label="Label" value={p.label} maxLength={60} onChange={(e) => update(i, { label: e.target.value })} />
            <Select label="Jenis" value={p.type} onChange={(e) => update(i, { type: e.target.value as Param["type"] })}>
              <option value="text">Teks</option><option value="number">Angka</option><option value="boolean">Ya / Tidak</option><option value="select">Pilihan</option>
            </Select>
            <Button variant="ghost" size="sm" className="self-end" aria-label={`Hapus isian ${i + 1}`} onClick={() => setParams((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>
            {p.type === "select" && <Input className="sm:col-span-2" label="Opsi (pisahkan koma)" value={p.options.join(", ")} onChange={(e) => update(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })} />}
            <Input className={p.type === "select" ? "sm:col-span-2" : "sm:col-span-4"} label="Nilai awal (opsional)" value={p.default} onChange={(e) => update(i, { default: e.target.value })} />
          </div>
        ))}
        {errors.params && <p className="text-[13px] text-red-700">{errors.params}</p>}
        {params.length < 10 && <Button variant="secondary" size="sm" onClick={() => setParams((prev) => [...prev, { name: "", label: "", type: "text", options: [], default: "" }])}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah isian</Button>}
      </fieldset>

      <Checkbox label="Butuh data dari server" description="Ikut membuat file Python di backend/snippets/ (nama sama) untuk mengirim data ke komponen." checked={hasData} onChange={setHasData} />

      <div className="rounded-ctl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">
        File yang akan dibuat: <code className="font-mono">{path}</code>
        {hasData && <> dan <code className="font-mono">{path.replace("frontend/src", "backend").replace(".tsx", ".py")}</code></>}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" loading={saving}>Buat snippet</Button>
      </div>
    </form>
  );
}
