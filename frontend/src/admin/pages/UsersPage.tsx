import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { alertError, confirmAction, showSecret, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type UserRow = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  identifier: string;
  is_active: boolean;
  is_locked: boolean;
  roles: string[];
  last_login: string | null;
};
type Page = { count: number; next: string | null; previous: string | null; results: UserRow[] };
type Options = { roles: { code: string; name: string }[] };

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);

  const options = useQuery({ queryKey: ["admin", "users", "options"], queryFn: () => api.get<Options>("/admin/users/options/") });
  const users = useQuery({
    queryKey: ["admin", "users", { term, role, page }],
    queryFn: () => api.get<Page>(`/admin/users/?page=${page}&q=${encodeURIComponent(term)}&role=${encodeURIComponent(role)}`),
    placeholderData: keepPreviousData,
  });
  const roleName = (code: string) => options.data?.roles.find((r) => r.code === code)?.name ?? code;
  const pages = Math.max(1, Math.ceil((users.data?.count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Buat akun, tetapkan peran, nonaktifkan, atau reset kata sandi."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah pengguna
          </Button>
        }
      />
      <Card>
        <form
          role="search"
          className="flex flex-wrap items-end gap-3 border-b border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
            setPage(1);
          }}
        >
          <Input label="Cari pengguna" placeholder="Nama, username, atau nomor induk" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-56 flex-1" />
          <Select label="Peran" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-48">
            <option value="">Semua peran</option>
            {options.data?.roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
          <Button type="submit" variant="secondary">
            <Search className="size-4" strokeWidth={1.75} aria-hidden="true" /> Cari
          </Button>
        </form>
        <DataTable<UserRow>
          caption="Daftar pengguna"
          rows={users.data?.results}
          rowKey={(u) => u.id}
          loading={users.isLoading}
          error={users.isError ? errorMessage(users.error) : null}
          empty={<EmptyState title="Tidak ada pengguna" hint={term || role ? "Tidak ada yang cocok. Ubah kata kunci atau filter." : "Tambahkan pengguna pertama dengan tombol di atas."} />}
          columns={[
            {
              key: "name",
              header: "Pengguna",
              cell: (u) => (
                <div>
                  <p className="font-semibold">{u.full_name}</p>
                  <p className="text-[12.5px] text-slate-600">
                    {u.username}
                    {u.identifier && ` · ${u.identifier}`}
                  </p>
                </div>
              ),
            },
            {
              key: "roles",
              header: "Peran",
              cell: (u) =>
                u.roles.length ? (
                  <div className="flex flex-wrap gap-1.5">{u.roles.map((r) => <Chip key={r} tone="navy">{roleName(r)}</Chip>)}</div>
                ) : (
                  <span className="text-text-3">Tanpa peran</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              cell: (u) =>
                !u.is_active ? <Chip tone="neutral" dot>Nonaktif</Chip> : u.is_locked ? <Chip tone="amber" dot>Terkunci</Chip> : <Chip tone="green" dot>Aktif</Chip>,
            },
            { key: "login", header: "Masuk terakhir", cell: (u) => (u.last_login ? formatDateTime(u.last_login) : <span className="text-text-3">Belum pernah</span>) },
            {
              key: "actions",
              header: "Tindakan",
              className: "text-right",
              cell: (u) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)} aria-label={`Ubah ${u.full_name}`}>
                    <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" /> Ubah
                  </Button>
                  <ResetButton user={u} />
                </div>
              ),
            },
          ]}
        />
        {users.data && users.data.count > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px]">
            <span>
              Halaman {page} dari {pages} · {users.data.count} pengguna
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!users.data.previous} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="secondary" size="sm" disabled={!users.data.next} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>

      <UserDialog
        target={editing}
        roles={options.data?.roles ?? []}
        onClose={() => setEditing(null)}
        onCreatedPassword={(username, password) => void showSecret({ title: "Akun dibuat", username, password })}
      />
    </>
  );
}

function ResetButton({ user }: { user: UserRow }) {
  const queryClient = useQueryClient();
  const reset = useMutation({
    mutationFn: () => api.post<{ temporary_password: string }>(`/admin/users/${user.id}/reset-password/`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void showSecret({ title: "Kata sandi sementara", username: user.username, password: data.temporary_password });
    },
    onError: (e) => alertError("Kata sandi tidak dapat direset", errorMessage(e)),
  });
  const ask = async () => {
    const ok = await confirmAction({
      title: "Reset kata sandi?",
      text: `Kata sandi ${user.full_name} diganti dengan kata sandi sementara dan kuncinya dibuka. Kata sandi lama tidak berlaku lagi.`,
      confirmText: "Ya, reset",
      danger: true,
    });
    if (ok) reset.mutate();
  };
  return (
    <Button variant="ghost" size="sm" loading={reset.isPending} onClick={ask} aria-label={`Reset kata sandi ${user.full_name}`}>
      <KeyRound className="size-4" strokeWidth={1.75} aria-hidden="true" /> Reset sandi
    </Button>
  );
}

const formSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9._-]{3,50}$/, "Username 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.").or(z.literal("")),
  full_name: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(150, "Maksimal 150 karakter."),
  email: z.string().email("Format email belum benar.").or(z.literal("")),
  identifier: z.string().max(30, "Maksimal 30 karakter."),
  password: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

function UserDialog({
  target,
  roles,
  onClose,
  onCreatedPassword,
}: {
  target: UserRow | "new" | null;
  roles: { code: string; name: string }[];
  onClose: () => void;
  onCreatedPassword: (username: string, password: string) => void;
}) {
  return (
    <Dialog open={target !== null} onClose={onClose} title={target === "new" ? "Tambah pengguna" : "Ubah pengguna"}>
      {target && <UserForm key={target === "new" ? "new" : target.id} target={target} roles={roles} onClose={onClose} onCreatedPassword={onCreatedPassword} />}
    </Dialog>
  );
}

function UserForm({
  target,
  roles,
  onClose,
  onCreatedPassword,
}: {
  target: UserRow | "new";
  roles: { code: string; name: string }[];
  onClose: () => void;
  onCreatedPassword: (username: string, password: string) => void;
}) {
  const queryClient = useQueryClient();
  const isNew = target === "new";
  const [selectedRoles, setSelectedRoles] = useState<string[]>(isNew ? [] : target.roles);
  const [active, setActive] = useState(isNew ? true : target.is_active);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isNew
      ? { username: "", full_name: "", email: "", identifier: "", password: "" }
      : { username: target.username, full_name: target.full_name, email: target.email, identifier: target.identifier, password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      if (isNew) {
        if (!values.username) return setFieldError("username", { message: "Username wajib diisi." });
        const res = await api.post<{ user: UserRow; temporary_password: string | null }>("/admin/users/", {
          username: values.username,
          full_name: values.full_name,
          email: values.email,
          identifier: values.identifier,
          password: values.password,
          roles: selectedRoles,
        });
        if (res.temporary_password) onCreatedPassword(res.user.username, res.temporary_password);
      } else {
        await api.patch(`/admin/users/${target.id}/`, {
          full_name: values.full_name,
          email: values.email,
          identifier: values.identifier,
          is_active: active,
          roles: selectedRoles,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
      toastSuccess(isNew ? "Pengguna dibuat." : "Perubahan disimpan.");
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        for (const [field, message] of Object.entries(e.fields)) {
          if (field in values) setFieldError(field as keyof FormValues, { message });
          else setError(message);
        }
      } else setError(errorMessage(e));
    }
  };

  const toggleRole = (code: string, on: boolean) => setSelectedRoles((prev) => (on ? [...prev, code] : prev.filter((c) => c !== code)));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && <Note tone="error">{error}</Note>}
      <Input label="Username" disabled={!isNew} autoComplete="off" error={errors.username?.message} {...register("username")} />
      <Input label="Nama lengkap" error={errors.full_name?.message} {...register("full_name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nomor induk (NIM/NIP)" error={errors.identifier?.message} {...register("identifier")} />
        <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
      </div>
      <fieldset>
        <legend className="mb-1 text-[13px] font-medium">Peran</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {roles.map((role) => (
            <Checkbox key={role.code} label={role.name} checked={selectedRoles.includes(role.code)} onChange={(on) => toggleRole(role.code, on)} />
          ))}
        </div>
      </fieldset>
      {isNew ? (
        <Input label="Kata sandi awal" type="password" autoComplete="new-password" hint="Kosongkan agar dibuatkan kata sandi sementara secara otomatis." error={errors.password?.message} {...register("password")} />
      ) : (
        <Switch label="Akun aktif" checked={active} onChange={setActive} />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" loading={isSubmitting}>{isNew ? "Buat pengguna" : "Simpan"}</Button>
      </div>
    </form>
  );
}
