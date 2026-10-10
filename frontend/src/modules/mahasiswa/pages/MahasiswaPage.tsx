import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Mahasiswa = { id: number; nim: string; nama: string; prodi: string; angkatan: number; created_at: string };
type Page = { count: number; next: string | null; previous: string | null; results: Mahasiswa[] };

const PAGE_SIZE = 20;
const schema = z.object({
  nim: z
    .string()
    .trim()
    .min(1, "NIM wajib diisi.")
    .max(20, "Maksimal 20 angka.")
    .regex(/^\d+$/, "NIM hanya boleh berisi angka."),
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(150, "Maksimal 150 karakter."),
  prodi: z.string().trim().min(1, "Program studi wajib diisi.").max(100, "Maksimal 100 karakter."),
  angkatan: z.coerce.number({ message: "Angkatan harus berupa angka." }).int().min(1990, "Angkatan minimal 1990.").max(2100, "Angkatan maksimal 2100."),
});

export default function MahasiswaPage() {
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: ["mahasiswa", { term, page }],
    queryFn: () => api.get<Page>(`/mahasiswa/?page=${page}&q=${encodeURIComponent(term)}`),
    placeholderData: keepPreviousData,
  });
  const pages = Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Data mahasiswa"
        description="Modul contoh: membuktikan modul dapat dicolok hanya dengan menaruh satu folder."
        actions={can("mahasiswa.create") && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah mahasiswa
          </Button>
        )}
      />
      <Card>
        <form
          role="search"
          className="flex items-end gap-3 border-b border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
            setPage(1);
          }}
        >
          <Input label="Cari mahasiswa" placeholder="NIM, nama, atau program studi" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
          <Button type="submit" variant="secondary"><Search className="size-4" strokeWidth={1.75} aria-hidden="true" /> Cari</Button>
        </form>
        <DataTable<Mahasiswa>
          caption="Daftar mahasiswa"
          rows={query.data?.results}
          rowKey={(m) => m.id}
          loading={query.isLoading}
          error={query.isError ? errorMessage(query.error) : null}
          empty={<EmptyState title="Belum ada data mahasiswa" hint={term ? "Tidak ada yang cocok dengan pencarian ini." : "Tambahkan mahasiswa pertama dengan tombol di atas."} />}
          columns={[
            { key: "nim", header: "NIM", cell: (m) => <span className="font-mono text-[13px]">{m.nim}</span> },
            { key: "nama", header: "Nama", cell: (m) => <span className="font-semibold">{m.nama}</span> },
            { key: "prodi", header: "Program studi", cell: (m) => m.prodi },
            { key: "angkatan", header: "Angkatan", cell: (m) => m.angkatan },
            { key: "created", header: "Ditambahkan", cell: (m) => formatDate(m.created_at) },
          ]}
        />
        {query.data && query.data.count > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px]">
            <span>Halaman {page} dari {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!query.data.previous} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="secondary" size="sm" disabled={!query.data.next} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Tambah mahasiswa">
        {adding && <AddForm onClose={() => setAdding(false)} />}
      </Dialog>
    </>
  );
}

function AddForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values: z.output<typeof schema>) => {
    setError(null);
    try {
      await api.post("/mahasiswa/", values);
      await queryClient.invalidateQueries({ queryKey: ["mahasiswa"] });
      onClose();
      toastSuccess("Data mahasiswa ditambahkan.");
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        for (const [field, message] of Object.entries(e.fields)) {
          if (field in values) setFieldError(field as keyof typeof values, { message });
          else setError(message);
        }
      } else setError(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && <Note tone="error">{error}</Note>}
      <Input
        label="NIM"
        required
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={20}
        hint="Hanya angka."
        error={errors.nim?.message}
        // Keep the field numeric while typing or pasting.
        onInput={(event) => {
          event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
        }}
        {...register("nim")}
      />
      <Input label="Nama lengkap" error={errors.nama?.message} {...register("nama")} />
      <Input label="Program studi" error={errors.prodi?.message} {...register("prodi")} />
      <Input label="Angkatan" inputMode="numeric" error={errors.angkatan?.message} {...register("angkatan")} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" loading={isSubmitting}>Simpan</Button>
      </div>
    </form>
  );
}
