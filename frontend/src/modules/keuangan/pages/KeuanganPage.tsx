import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";

type Row = { id: number; nim: string; keterangan: string; jumlah: number; jatuh_tempo: string; status: "belum" | "lunas"; dibayar_pada: string | null };
type Data = { scope: "own" | "all"; nim: string; results: Row[]; summary: { lunas: number; belum: number; total: number } };

export default function KeuanganPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const query = useQuery({ queryKey: ["keuangan", term, status], queryFn: () => api.get<Data>(`/keuangan/?q=${encodeURIComponent(term)}&status=${status}`) });
  const data = query.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["keuangan"] });

  const markPaid = async (row: Row) => {
    const ok = await confirmAction({ title: "Tandai lunas?", text: `${row.keterangan} (${row.nim}) — ${formatRupiah(row.jumlah)} ditandai sudah dibayar.`, confirmText: "Ya, lunas" });
    if (!ok) return;
    try {
      await api.patch(`/keuangan/${row.id}/`, { status: "lunas" });
      toastSuccess("Tagihan ditandai lunas.");
      refresh();
    } catch (e) {
      alertError("Status tidak dapat diubah", errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Tagihan"
        description={data?.scope === "all" ? "Semua tagihan mahasiswa. Cari berdasarkan NIM atau keterangan." : "Tagihan dan status pembayaran Anda."}
        actions={can("keuangan.manage") && <Button onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Buat tagihan</Button>}
      />
      {data && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {[{ label: "Belum dibayar", value: data.summary.belum }, { label: "Sudah dibayar", value: data.summary.lunas }, { label: "Total tagihan", value: data.summary.total }].map((c) => (
            <Card key={c.label} className="p-4"><p className="text-text-2">{c.label}</p><p className="mt-1 text-[24px] font-semibold leading-tight text-navy-900 tabular-nums">{formatRupiah(c.value)}</p></Card>
          ))}
        </div>
      )}
      {data?.scope === "all" && (
        <form role="search" className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
          <Input label="Cari" value={q} onChange={(e) => setQ(e.target.value)} placeholder="NIM atau keterangan" className="min-w-56 flex-1" />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44"><option value="">Semua</option><option value="belum">Belum dibayar</option><option value="lunas">Lunas</option></Select>
          <Button type="submit" variant="secondary"><Search className="size-4" strokeWidth={1.75} aria-hidden="true" /> Cari</Button>
        </form>
      )}
      {data?.scope === "own" && !data.nim && <Note tone="info" className="mb-4">Akun Anda belum memiliki NIM sehingga tidak ada tagihan. Hubungi bagian akademik.</Note>}
      <Card>
        <DataTable<Row>
          caption="Daftar tagihan"
          rows={data?.results}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          error={query.isError ? errorMessage(query.error) : null}
          empty={<EmptyState title="Tidak ada tagihan" hint="Tagihan akan tampil di sini setelah diterbitkan." />}
          columns={[
            ...(data?.scope === "all" ? [{ key: "nim", header: "NIM", cell: (r: Row) => <span className="font-mono text-[13px]">{r.nim}</span> }] : []),
            { key: "ket", header: "Keterangan", cell: (r) => <span className="font-medium">{r.keterangan}</span> },
            { key: "jumlah", header: "Jumlah", className: "text-right tabular-nums", cell: (r) => formatRupiah(r.jumlah) },
            { key: "tempo", header: "Jatuh tempo", cell: (r) => formatDate(r.jatuh_tempo) },
            { key: "status", header: "Status", cell: (r) => (r.status === "lunas" ? <Chip tone="green" dot>Lunas</Chip> : new Date(r.jatuh_tempo) < new Date() ? <Chip tone="red" dot>Lewat tempo</Chip> : <Chip tone="amber" dot>Belum dibayar</Chip>) },
            ...(can("keuangan.manage") ? [{ key: "aksi", header: "Tindakan", className: "text-right", cell: (r: Row) => (r.status === "belum" ? <Button variant="ghost" size="sm" onClick={() => markPaid(r)}><CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tandai lunas</Button> : null) }] : []),
          ]}
        />
      </Card>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Buat tagihan">
        {adding && <AddForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toastSuccess("Tagihan dibuat."); refresh(); }} />}
      </Dialog>
    </>
  );
}

function AddForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nim: "", keterangan: "", jumlah: "", jatuh_tempo: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await api.post("/keuangan/", { ...f, jumlah: Number(f.jumlah) });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else alertError("Tagihan belum dapat dibuat", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="NIM" required inputMode="numeric" value={f.nim} maxLength={20} error={errors.nim} onChange={(e) => setF({ ...f, nim: e.target.value.replace(/\D/g, "") })} />
      <Input label="Keterangan" required value={f.keterangan} maxLength={120} error={errors.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Jumlah (Rp)" required inputMode="numeric" value={f.jumlah} error={errors.jumlah} onChange={(e) => setF({ ...f, jumlah: e.target.value.replace(/\D/g, "") })} />
        <Input label="Jatuh tempo" required type="date" value={f.jatuh_tempo} error={errors.jatuh_tempo} onChange={(e) => setF({ ...f, jatuh_tempo: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={saving}>Simpan</Button></div>
    </form>
  );
}
