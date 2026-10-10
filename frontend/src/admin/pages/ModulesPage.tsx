import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ME_KEY } from "@/auth/AuthProvider";
import { NewModuleDialog } from "@/admin/NewModuleDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { api, errorMessage } from "@/lib/api";
import { NamedIcon } from "@/lib/icons";

type Module = {
  code: string;
  name: string;
  icon: string;
  description: string;
  depends_on: string[];
  is_core: boolean;
  is_active: boolean;
  is_orphan: boolean;
  permission_count: number;
};
const KEY = ["admin", "modules"];

export default function ModulesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: () => api.get<Module[]>("/admin/modules/") });
  const [adding, setAdding] = useState(false);
  const names = Object.fromEntries((query.data ?? []).map((m) => [m.code, m.name]));

  const toggle = useMutation({
    mutationFn: ({ code, is_active }: { code: string; is_active: boolean }) => api.patch<Module>(`/admin/modules/${code}/`, { is_active }),
    onSuccess: (m) => toastSuccess(`Modul ${m.name} ${m.is_active ? "diaktifkan" : "dinonaktifkan"}.`),
    onError: (e) => alertError("Modul tidak dapat diubah", errorMessage(e)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  return (
    <>
      <PageHeader
        title="Modul"
        description="Modul ditemukan otomatis dari folder. Nonaktifkan modul untuk menyembunyikan menunya dan menutup API-nya."
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah modul</Button>}
      />
      {query.isError && <Card><p className="p-4 text-red-700">{errorMessage(query.error)}</p></Card>}
      {query.isLoading ? (
        <Card><Skeleton lines={4} /></Card>
      ) : query.data?.length === 0 ? (
        <Card><EmptyState title="Belum ada modul" hint="Buat modul dengan perintah startmodule. Lihat panduan modul." /></Card>
      ) : (
        <ul className="grid gap-3">
          {query.data?.map((m) => (
            <li key={m.code}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700">
                  <NamedIcon name={m.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold">{m.name}</h2>
                    <code className="font-mono text-[12px] text-slate-500">{m.code}</code>
                    {m.is_core && <Chip>Inti</Chip>}
                    {m.is_orphan && <Chip tone="amber">Folder tidak ditemukan</Chip>}
                  </div>
                  {m.description && <p className="mt-0.5 text-text-2">{m.description}</p>}
                  <p className="mt-1 text-[12.5px] text-slate-600">
                    {m.permission_count} izin
                    {m.depends_on.length > 0 && <> · membutuhkan {m.depends_on.map((d) => names[d] ?? d).join(", ")}</>}
                  </p>
                </div>
                <Switch
                  label={`Modul ${m.name}`}
                  checked={m.is_active}
                  disabled={m.is_core || toggle.isPending}
                  onChange={async (next) => {
                    const ok =
                      next ||
                      (await confirmAction({
                        title: `Nonaktifkan modul ${m.name}?`,
                        text: "Menunya hilang dari portal dan API-nya ditutup untuk semua pengguna sampai diaktifkan lagi.",
                        confirmText: "Ya, nonaktifkan",
                        danger: true,
                      }));
                    if (ok) toggle.mutate({ code: m.code, is_active: next });
                  }}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
      <NewModuleDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
