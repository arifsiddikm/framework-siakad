import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { toastSuccess, alertError } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";

type Row = { id: number; nim: string; kode_mk: string; matkul: string; sks: number; semester: string; huruf: string };
type Data = { scope: "own" | "all"; nim: string; results: Row[]; summary: { sks: number; ipk: number | null; mata_kuliah: number } | null; grades: string[] };

export default function NilaiPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [nim, setNim] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: ["nilai", search],
    queryFn: () => api.get<Data>(`/nilai/?${/^\d+$/.test(search) ? `nim=${search}` : `q=${encodeURIComponent(search)}`}`),
  });
  const data = query.data;
  const semesters = [...new Set((data?.results ?? []).map((r) => r.semester))];

  return (
    <>
      <PageHeader
        title="Nilai & KHS"
        description={data?.scope === "all" ? "Cari mahasiswa berdasarkan NIM (angka) atau kata kunci mata kuliah." : "Hasil studi Anda per semester."}
        actions={can("nilai.input") && <Button onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Input nilai</Button>}
      />
      {data?.scope === "all" && (
        <form role="search" className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setSearch(nim.trim()); }}>
          <Input label="NIM atau kata kunci" value={nim} onChange={(e) => setNim(e.target.value)} placeholder="contoh: 24040012" className="min-w-56 flex-1" />
          <Button type="submit" variant="secondary"><Search className="size-4" strokeWidth={1.75} aria-hidden="true" /> Cari</Button>
        </form>
      )}
      {query.isError && <Note tone="error">{errorMessage(query.error)}</Note>}
      {data?.summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: data.scope === "all" ? `IPK · ${data.nim}` : "IPK", value: data.summary.ipk?.toFixed(2).replace(".", ",") ?? "—" },
            { label: "Total SKS", value: String(data.summary.sks) },
            { label: "Mata kuliah", value: String(data.summary.mata_kuliah) },
          ].map((c) => (
            <Card key={c.label} className="p-4"><p className="text-text-2">{c.label}</p><p className="mt-1 text-[26px] font-semibold leading-tight text-navy-900 tabular-nums">{c.value}</p></Card>
          ))}
        </div>
      )}
      {query.isLoading ? (
        <Card><Skeleton lines={5} /></Card>
      ) : !data || data.results.length === 0 ? (
        <Card>
          <EmptyState
            title={data?.scope === "all" && !search ? "Cari mahasiswa untuk melihat nilai" : "Belum ada nilai"}
            hint={data?.scope === "own" && !data.nim ? "Akun Anda belum memiliki NIM. Hubungi bagian akademik." : data?.scope === "all" && !search ? "Masukkan NIM atau kata kunci di atas." : "Nilai akan tampil di sini setelah diinput dosen."}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {semesters.map((sem) => (
            <Card key={sem}>
              <CardHeader title={sem} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[14px]">
                  <caption className="sr-only">Nilai {sem}</caption>
                  <thead><tr className="bg-slate-50 text-[12.5px] uppercase tracking-wide text-slate-600">
                    {data.scope === "all" && <th scope="col" className="px-4 py-2.5 font-semibold">NIM</th>}
                    <th scope="col" className="px-4 py-2.5 font-semibold">Kode</th><th scope="col" className="px-4 py-2.5 font-semibold">Mata kuliah</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">SKS</th><th scope="col" className="px-4 py-2.5 font-semibold">Nilai</th>
                  </tr></thead>
                  <tbody>
                    {data.results.filter((r) => r.semester === sem).map((r) => (
                      <tr key={r.id} className="border-t border-line">
                        {data.scope === "all" && <td className="px-4 py-2.5 font-mono text-[13px]">{r.nim}</td>}
                        <td className="px-4 py-2.5 font-mono text-[13px]">{r.kode_mk}</td><td className="px-4 py-2.5 font-medium">{r.matkul}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.sks}</td>
                        <td className="px-4 py-2.5"><Chip tone={r.huruf.startsWith("A") ? "green" : r.huruf.startsWith("B") ? "navy" : "amber"}>{r.huruf}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Input nilai">
        {adding && <AddForm grades={data?.grades ?? []} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toastSuccess("Nilai disimpan."); queryClient.invalidateQueries({ queryKey: ["nilai"] }); }} />}
      </Dialog>
    </>
  );
}

function AddForm({ grades, onClose, onSaved }: { grades: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nim: "", kode_mk: "", matkul: "", sks: "3", semester: "Ganjil 2026/2027", huruf: "A" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await api.post("/nilai/", { ...f, sks: Number(f.sks) });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else alertError("Nilai belum dapat disimpan", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-[13px] text-text-3">Nilai dengan NIM, kode MK, dan semester yang sama akan diperbarui.</p>
      <Input label="NIM" required inputMode="numeric" value={f.nim} maxLength={20} error={errors.nim} onChange={(e) => setF({ ...f, nim: e.target.value.replace(/\D/g, "") })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Kode MK" required value={f.kode_mk} maxLength={15} error={errors.kode_mk} onChange={set("kode_mk")} />
        <Input className="sm:col-span-2" label="Mata kuliah" required value={f.matkul} maxLength={100} error={errors.matkul} onChange={set("matkul")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="SKS" inputMode="numeric" value={f.sks} error={errors.sks} onChange={(e) => setF({ ...f, sks: e.target.value.replace(/\D/g, "") })} />
        <Input label="Semester" value={f.semester} maxLength={30} error={errors.semester} onChange={set("semester")} />
        <Select label="Nilai" value={f.huruf} onChange={set("huruf")}>{grades.map((g) => <option key={g}>{g}</option>)}</Select>
      </div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={saving}>Simpan</Button></div>
    </form>
  );
}
