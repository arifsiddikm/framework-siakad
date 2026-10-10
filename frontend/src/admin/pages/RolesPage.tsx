import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ME_KEY } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

type Role = { id: number; code: string; name: string; description: string; is_system: boolean; permissions: string[]; user_count: number };
type PermissionGroup = {
  module: { code: string; name: string; is_active: boolean };
  permissions: { code: string; name: string }[];
};

const ROLES_KEY = ["admin", "roles"];

const createSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, "Kode 2–40 karakter: huruf kecil, angka, garis bawah atau tanda hubung."),
  name: z.string().trim().min(1, "Nama peran wajib diisi.").max(60, "Maksimal 60 karakter."),
  description: z.string().max(255, "Maksimal 255 karakter."),
});
type CreateValues = z.infer<typeof createSchema>;

export default function RolesPage() {
  const roles = useQuery({ queryKey: ROLES_KEY, queryFn: () => api.get<Role[]>("/admin/roles/") });
  const groups = useQuery({ queryKey: ["admin", "permissions"], queryFn: () => api.get<PermissionGroup[]>("/admin/permissions/") });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const list = roles.data ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? list[0];

  return (
    <>
      <PageHeader
        title="Peran & izin"
        description="Peran adalah kumpulan izin. Perubahan berlaku segera tanpa deploy ulang."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Peran baru
          </Button>
        }
      />
      {roles.isError && <Note tone="error">{errorMessage(roles.error)}</Note>}
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader title="Daftar peran" />
          {roles.isLoading ? (
            <Skeleton />
          ) : list.length === 0 ? (
            <EmptyState title="Belum ada peran" hint="Buat peran pertama dengan tombol Peran baru." />
          ) : (
            <ul>
              {list.map((role) => (
                <li key={role.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    aria-current={selected?.id === role.id ? "true" : undefined}
                    className={cn("flex min-h-14 w-full flex-col items-start px-4 py-2.5 text-left hover:bg-slate-50", selected?.id === role.id && "bg-navy-50")}
                  >
                    <span className="font-semibold">{role.name}</span>
                    <span className="text-[12.5px] text-slate-600">
                      {role.permissions.length} izin · {role.user_count} pengguna
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {selected && groups.data ? (
          <RoleEditor key={selected.id} role={selected} groups={groups.data} onDeleted={() => setSelectedId(null)} />
        ) : (
          <Card>{groups.isLoading || roles.isLoading ? <Skeleton lines={6} /> : <EmptyState title="Pilih peran" hint="Pilih peran di sebelah kiri untuk mengatur izinnya." />}</Card>
        )}
      </div>
      <CreateRoleDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => setSelectedId(id)} />
    </>
  );
}

function RoleEditor({ role, groups, onDeleted }: { role: Role; groups: PermissionGroup[]; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [granted, setGranted] = useState(new Set(role.permissions));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    queryClient.invalidateQueries({ queryKey: ME_KEY });
  };
  const save = useMutation({
    mutationFn: () => api.patch<Role>(`/admin/roles/${role.id}/`, { name, description, permissions: [...granted].sort() }),
    onSuccess: () => {
      toastSuccess("Perubahan disimpan dan langsung berlaku.");
      refresh();
    },
    onError: (e) => {
      if (!(e instanceof ApiError && e.fields.name)) alertError("Peran tidak dapat disimpan", errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/roles/${role.id}/`),
    onSuccess: () => {
      toastSuccess(`Peran ${role.name} dihapus.`);
      refresh();
      onDeleted();
    },
    onError: (e) => alertError("Peran tidak dapat dihapus", errorMessage(e)),
  });
  const askDelete = async () => {
    const ok = await confirmAction({
      title: "Hapus peran?",
      text: `Peran ${role.name} akan dicabut dari ${role.user_count} pengguna. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, hapus",
      danger: true,
    });
    if (ok) remove.mutate();
  };

  const toggle = (code: string, on: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
  };
  const toggleGroup = (codes: string[], on: boolean) => codes.forEach((code) => toggle(code, on));

  const nameError = save.error instanceof ApiError ? save.error.fields.name : undefined;

  return (
    <Card>
      <CardHeader
        title={`Izin untuk ${role.name}`}
        action={role.is_system ? <Chip tone="neutral">Peran bawaan</Chip> : undefined}
      />
      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nama peran" value={name} maxLength={60} error={nameError} onChange={(e) => setName(e.target.value)} />
          <Input label="Kode" value={role.code} disabled hint="Kode tidak dapat diubah." readOnly />
        </div>
        <Textarea label="Keterangan" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />

        <div className="space-y-4">
          {groups.map(({ module, permissions }) => {
            const codes = permissions.map((p) => p.code);
            const all = codes.every((c) => granted.has(c));
            return (
              <fieldset key={module.code} className="rounded-ctl border border-line">
                <legend className="ml-3 px-1.5 text-[13px] font-semibold">
                  {module.name}{" "}
                  {!module.is_active && <Chip tone="amber">Modul nonaktif</Chip>}
                </legend>
                <div className="space-y-1 px-3 pb-3 pt-1">
                  <Checkbox label={<span className="text-[13px] text-slate-600">Pilih semua di modul ini</span>} checked={all} onChange={(on) => toggleGroup(codes, on)} />
                  {permissions.map((perm) => (
                    <Checkbox
                      key={perm.code}
                      checked={granted.has(perm.code)}
                      onChange={(on) => toggle(perm.code, on)}
                      label={
                        <>
                          {perm.name} <code className="ml-1 font-mono text-[12px] text-slate-500">{perm.code}</code>
                        </>
                      }
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Simpan perubahan</Button>
          {!role.is_system && (
            <Button variant="secondary" onClick={askDelete} loading={remove.isPending}>
              <Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /> Hapus peran
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function CreateRoleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { code: "", name: "", description: "" } });

  const close = () => {
    reset();
    setError(null);
    onClose();
  };
  const onSubmit = async (values: CreateValues) => {
    setError(null);
    try {
      const role = await api.post<Role>("/admin/roles/", { ...values, permissions: [] });
      await queryClient.invalidateQueries({ queryKey: ROLES_KEY });
      onCreated(role.id);
      toastSuccess(`Peran ${role.name} dibuat. Sekarang atur izinnya.`);
      close();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        for (const [field, message] of Object.entries(e.fields)) setFieldError(field as keyof CreateValues, { message });
      } else setError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onClose={close} title="Peran baru">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && <Note tone="error">{error}</Note>}
        <Input label="Nama peran" error={errors.name?.message} {...register("name")} />
        <Input label="Kode" hint="Huruf kecil, contoh: koordinator-prodi. Tidak dapat diubah setelah dibuat." error={errors.code?.message} {...register("code")} />
        <Textarea label="Keterangan" error={errors.description?.message} {...register("description")} />
        <p className="text-[13px] text-text-3">Izin diatur setelah peran dibuat.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Batal</Button>
          <Button type="submit" loading={isSubmitting}>Buat peran</Button>
        </div>
      </form>
    </Dialog>
  );
}
