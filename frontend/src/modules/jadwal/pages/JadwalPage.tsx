import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

type Row = { id: number; kode_mk: string; matkul: string; dosen: string; hari: string; jam_mulai: string; jam_selesai: string; ruang: string; kelas: string; semester: string };
type Data = { hari: string[]; results: Row[] };

export default function JadwalPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["jadwal"], queryFn: () => api.get<Data>("/jadwal/") });
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const days = query.data?.hari ?? [];
  const rows = (query.data?.results ?? []).filter((r) => !filter || r.hari === filter);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["jadwal"] });

  const remove = async (row: Row) => {
    const ok = await confirmAction({ title: "Hapus jadwal?", text: `${row.matkul} (${row.hari}, kelas ${row.kelas}) dihapus dari jadwal.`, confirmText: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/jadwal/${row.id}/`);
      toastSuccess("Jadwal dihapus.");
      refresh();
    } catch (e) {
      alertError("Jadwal tidak dapat dihapus", errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Jadwal kuliah"
        description={`Jadwal mingguan ${query.data?.results[0]?.semester ?? ""}`.trim()}
        actions={can("jadwal.manage") && <Button onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah jadwal</Button>}
      />
      <div role="tablist" aria-label="Pilih hari" className="mb-4 flex flex-wrap gap-1.5">
        {["", ...days].map((d) => (
          <button key={d || "semua"} role="tab" type="button" aria-selected={filter === d} onClick={() => setFilter(d)}
            className={cn("min-h-10 rounded-ctl border px-3.5 text-[14px] font-medium", filter === d ? "border-navy-700 bg-navy-700 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50")}>
            {d || "Semua hari"}
          </button>
        ))}
      </div>
      {query.isError && <Note tone="error">{errorMessage(query.error)}</Note>}
      {query.isLoading ? (
        <Card><Skeleton lines={5} /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState title="Tidak ada jadwal" hint={filter ? `Tidak ada kuliah pada hari ${filter}.` : "Jadwal belum diisi."} /></Card>
      ) : (
        <div className="space-y-4">
          {days.filter((d) => rows.some((r) => r.hari === d)).map((d) => (
            <Card key={d}>
              <CardHeader title={d} />
              <ul className="divide-y divide-line">
                {rows.filter((r) => r.hari === d).map((r) => (
                  <li key={r.id} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="tabular-nums"><p className="font-semibold">{r.jam_mulai.slice(0, 5)}</p><p className="text-text-3">{r.jam_selesai.slice(0, 5)}</p></div>
                    <div className="min-w-0"><p className="font-semibold">{r.matkul}</p><p className="text-[12.5px] text-slate-600">{r.kode_mk} · Kelas {r.kelas} · {r.ruang} · {r.dosen}</p></div>
                    {can("jadwal.manage") && <Button variant="ghost" size="sm" aria-label={`Hapus ${r.matkul}`} onClick={() => remove(r)}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Tambah jadwal" wide>
        {adding && <AddForm days={days} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toastSuccess("Jadwal ditambahkan."); refresh(); }} />}
      </Dialog>
    </>
  );
}

function AddForm({ days, onClose, onSaved }: { days: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ kode_mk: "", matkul: "", dosen: "", hari: days[0] ?? "Senin", jam_mulai: "08:00", jam_selesai: "10:00", ruang: "", kelas: "A" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await api.post("/jadwal/", f);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else alertError("Jadwal belum dapat disimpan", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Kode MK" required value={f.kode_mk} maxLength={15} error={errors.kode_mk} onChange={set("kode_mk")} />
        <Input className="sm:col-span-2" label="Mata kuliah" required value={f.matkul} maxLength={100} error={errors.matkul} onChange={set("matkul")} />
      </div>
      <Input label="Dosen" required value={f.dosen} maxLength={100} error={errors.dosen} onChange={set("dosen")} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Select label="Hari" value={f.hari} onChange={set("hari")}>{days.map((d) => <option key={d}>{d}</option>)}</Select>
        <Input label="Mulai" type="time" value={f.jam_mulai} onChange={set("jam_mulai")} error={errors.jam_mulai} />
        <Input label="Selesai" type="time" value={f.jam_selesai} onChange={set("jam_selesai")} error={errors.jam_selesai} />
        <Input label="Kelas" value={f.kelas} maxLength={5} onChange={set("kelas")} />
      </div>
      <Input label="Ruang" required value={f.ruang} maxLength={20} error={errors.ruang} onChange={set("ruang")} />
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={saving}>Simpan</Button></div>
    </form>
  );
}
