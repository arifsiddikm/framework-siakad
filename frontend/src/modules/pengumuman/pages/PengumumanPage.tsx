import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Item = { id: number; judul: string; isi: string; kategori: string; penting: boolean; tanggal: string };
type Page = { count: number; next: string | null; previous: string | null; results: Item[] };
const KATEGORI = ["umum", "akademik", "keuangan", "kegiatan"];

export default function PengumumanPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [kategori, setKategori] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: ["pengumuman", { term, kategori, page }],
    queryFn: () => api.get<Page>(`/pengumuman/?page=${page}&q=${encodeURIComponent(term)}&kategori=${kategori}`),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pengumuman"] });

  const remove = async (item: Item) => {
    const ok = await confirmAction({ title: "Hapus pengumuman?", text: `"${item.judul}" akan dihapus dari portal semua pengguna.`, confirmText: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/pengumuman/${item.id}/`);
      toastSuccess("Pengumuman dihapus.");
      refresh();
    } catch (e) {
      alertError("Pengumuman tidak dapat dihapus", errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Pengumuman"
        description="Kabar terbaru dari kampus."
        actions={can("pengumuman.manage") && <Button onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Buat pengumuman</Button>}
      />
      <form role="search" className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(1); }}>
        <Input label="Cari pengumuman" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-56 flex-1" />
        <Select label="Kategori" value={kategori} onChange={(e) => { setKategori(e.target.value); setPage(1); }} className="w-44">
          <option value="">Semua</option>
          {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
        <Button type="submit" variant="secondary"><Search className="size-4" strokeWidth={1.75} aria-hidden="true" /> Cari</Button>
      </form>
      {query.isError && <Note tone="error">{errorMessage(query.error)}</Note>}
      {query.isLoading ? (
        <Card><Skeleton lines={5} /></Card>
      ) : query.data?.results.length === 0 ? (
        <Card><EmptyState title="Tidak ada pengumuman" hint={term || kategori ? "Tidak ada yang cocok. Ubah kata kunci atau kategori." : "Belum ada pengumuman."} /></Card>
      ) : (
        <ul className="space-y-3">
          {query.data?.results.map((item) => (
            <li key={item.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-navy-900">{item.judul}</h2>
                      {item.penting && <Chip tone="amber" dot>Penting</Chip>}
                      <Chip>{item.kategori}</Chip>
                    </div>
                    <p className="text-[12.5px] text-text-3">{formatDate(item.tanggal)}</p>
                  </div>
                  {can("pengumuman.manage") && <Button variant="ghost" size="sm" aria-label={`Hapus ${item.judul}`} onClick={() => remove(item)}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>}
                </div>
                <p className="mt-2 whitespace-pre-line text-slate-700">{item.isi}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {query.data && (query.data.previous || query.data.next) && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={!query.data.previous} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
          <Button variant="secondary" size="sm" disabled={!query.data.next} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
        </div>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Buat pengumuman">
        {adding && <AddForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toastSuccess("Pengumuman dibuat."); refresh(); }} />}
      </Dialog>
    </>
  );
}

function AddForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ judul: "", isi: "", kategori: "umum", penting: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await api.post("/pengumuman/", form);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else alertError("Pengumuman belum dapat dibuat", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="Judul" required value={form.judul} maxLength={120} error={errors.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
      <Textarea label="Isi" rows={5} value={form.isi} maxLength={2000} error={errors.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })} />
      <Select label="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
        {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
      </Select>
      <Checkbox label="Tandai sebagai penting" checked={form.penting} onChange={(on) => setForm({ ...form, penting: on })} />
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={saving}>Terbitkan</Button></div>
    </form>
  );
}
