import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useState, type FormEvent } from "react";
import { ME_KEY } from "@/auth/AuthProvider";
import { AudienceChips, type Audience } from "@/components/AudienceChips";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Radio";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { NamedIcon } from "@/lib/icons";

type Item = {
  id: number;
  title: string;
  hint: string;
  icon: string;
  to: string;
  parent: number | null;
  order: number;
  module: string | null;
  permission: string | null;
  audience: Audience;
  page_slug: string | null;
  is_active: boolean;
  is_system: boolean;
  is_orphan: boolean;
};
type Options = {
  pages: { path: string; title: string; written: boolean }[];
  permissions: { code: string; name: string; module: string }[];
  modules: { code: string; name: string }[];
  roles: { code: string; name: string }[];
  icons: string[];
};

const KEY = ["admin", "menu"];
const OTHER_URL = "__url__";

const bySort = (a: Item, b: Item) => a.order - b.order || a.id - b.id;

export default function MenuPage() {
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: KEY, queryFn: () => api.get<Item[]>("/admin/menu/") });
  const options = useQuery({ queryKey: [...KEY, "options"], queryFn: () => api.get<Options>("/admin/menu/options/") });
  const [editing, setEditing] = useState<Item | "new" | null>(null);

  const refreshMenus = () => queryClient.invalidateQueries({ queryKey: ME_KEY });
  const patch = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Item> }) => api.patch<Item>(`/admin/menu/${id}/`, data),
    onSuccess: (item) => toastSuccess(item.is_active ? `${item.title} ditampilkan.` : `${item.title} disembunyikan.`),
    onError: (e) => alertError("Menu tidak dapat diubah", errorMessage(e)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      refreshMenus();
    },
  });
  const move = useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) => api.post<Item[]>(`/admin/menu/${id}/move/`, { direction }),
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
    onError: (e) => alertError("Urutan tidak dapat diubah", errorMessage(e)),
    onSettled: refreshMenus,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/menu/${id}/`),
    onSuccess: () => {
      toastSuccess("Item menu dihapus.");
      queryClient.invalidateQueries({ queryKey: KEY });
      refreshMenus();
    },
    onError: (e) => alertError("Item tidak dapat dihapus", errorMessage(e)),
  });
  const askDelete = async (item: Item) => {
    const ok = await confirmAction({
      title: "Hapus item menu?",
      text: `${item.title}${item.to ? "" : " beserta sub-menunya"} akan hilang dari navbar semua pengguna. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, hapus",
      danger: true,
    });
    if (ok) remove.mutate(item.id);
  };

  const all = items.data ?? [];
  const roots = all.filter((i) => i.parent === null).sort(bySort);
  const childrenOf = (id: number) => all.filter((i) => i.parent === id).sort(bySort);

  const Row = ({ item, siblings, nested }: { item: Item; siblings: Item[]; nested?: boolean }) => {
    const index = siblings.findIndex((s) => s.id === item.id);
    return (
      <div className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4", nested && "pl-6 sm:pl-10", !item.is_active && "bg-slate-50")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700">
          <NamedIcon name={item.icon} className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold", !item.is_active && "text-slate-500 line-through")}>{item.title}</span>
            {item.is_system && <Chip>Inti</Chip>}
            {!item.is_active && <Chip tone="neutral" dot>Disembunyikan</Chip>}
            {item.is_orphan && <Chip tone="amber" dot>Yatim</Chip>}
            {!item.to && <Chip tone="navy">Grup</Chip>}
          </div>
          <p className="truncate text-[12.5px] text-slate-600">
            {item.to ? <code className="font-mono">{item.to}</code> : "Berisi sub-menu"}
          </p>
          {item.to && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-600">
              <span>Dapat diakses oleh:</span>
              <AudienceChips audience={item.audience} />
              {item.page_slug && (
                <Link to={`/admin/halaman?ubah=${item.page_slug}`} className="ml-1 font-medium text-navy-700 underline underline-offset-2">
                  Ubah isi halaman
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label={`Naikkan ${item.title}`} disabled={index === 0 || move.isPending} onClick={() => move.mutate({ id: item.id, direction: "up" })}>
            <ArrowUp className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" aria-label={`Turunkan ${item.title}`} disabled={index === siblings.length - 1 || move.isPending} onClick={() => move.mutate({ id: item.id, direction: "down" })}>
            <ArrowDown className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <Switch label={`Tampilkan ${item.title}`} checked={item.is_active} showState={false} onChange={(next) => patch.mutate({ id: item.id, data: { is_active: next } })} />
          <Button variant="ghost" size="sm" aria-label={`Ubah ${item.title}`} onClick={() => setEditing(item)}>
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Button>
          {!item.is_system && (
            <Button variant="ghost" size="sm" aria-label={`Hapus ${item.title}`} onClick={() => askDelete(item)}>
              <Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Menu portal"
        description="Susun menu navigasi di header portal pengguna. Item inti hanya dapat diganti judul dan urutannya, atau disembunyikan. Menyembunyikan menu bukan pengaman: izin tetap diperiksa server."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Tambah item
          </Button>
        }
      />
      <Note tone="info" className="mb-5">
        <p className="font-semibold">Cara menambah menu</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>Klik <strong>Tambah item</strong>. Pilih <em>Grup</em> untuk dropdown, atau <em>Tautan</em> untuk satu menu.</li>
          <li>Tautan bisa ke halaman yang ada, halaman buatan Anda, atau alamat https situs lain.</li>
          <li>Centang peran yang boleh melihatnya; kosong = semua pengguna yang sudah login.</li>
        </ol>
        <p className="mt-2">Ingin membuat halaman baru sekaligus menunya? Buka <Link to="/admin/halaman" className="font-medium underline">Halaman & akses</Link>.</p>
      </Note>
      {items.isError && <Note tone="error">{errorMessage(items.error)}</Note>}
      <Card>
        {items.isLoading ? (
          <Skeleton lines={6} />
        ) : roots.length === 0 ? (
          <EmptyState title="Belum ada item menu" hint="Tambahkan grup atau tautan pertama dengan tombol di atas." />
        ) : (
          <ul className="divide-y divide-line">
            {roots.map((root) => (
              <li key={root.id}>
                <Row item={root} siblings={roots} />
                {!root.to && (
                  <ul className="divide-y divide-line border-t border-line">
                    {childrenOf(root.id).map((child, _i, list) => (
                      <li key={child.id}><Row item={child} siblings={list} nested /></li>
                    ))}
                    {childrenOf(root.id).length === 0 && <li className="py-2.5 pl-10 text-[13px] text-text-3">Grup kosong tidak tampil di navbar.</li>}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah item menu" : "Ubah item menu"} wide>
        {editing && options.data && (
          <ItemForm
            key={editing === "new" ? "new" : editing.id}
            item={editing === "new" ? null : editing}
            options={options.data}
            groups={roots.filter((r) => !r.to)}
            onClose={() => setEditing(null)}
            onSaved={() => {
              toastSuccess(editing === "new" ? "Item menu dibuat." : "Item menu disimpan.");
              setEditing(null);
              queryClient.invalidateQueries({ queryKey: KEY });
              refreshMenus();
            }}
          />
        )}
      </Dialog>
    </>
  );
}

function ItemForm({ item, options, groups, onClose, onSaved }: { item: Item | null; options: Options; groups: Item[]; onClose: () => void; onSaved: () => void }) {
  const system = item?.is_system ?? false;
  const knownPage = item ? options.pages.some((p) => p.path === item.to) : false;
  const [kind, setKind] = useState<"link" | "group">(item && !item.to ? "group" : "link");
  const [title, setTitle] = useState(item?.title ?? "");
  const [hint, setHint] = useState(item?.hint ?? "");
  const [icon, setIcon] = useState(item?.icon ?? "");
  const [target, setTarget] = useState(item?.to ? (knownPage ? item.to : OTHER_URL) : "");
  const [url, setUrl] = useState(item?.to && !knownPage ? item.to : "https://");
  const [parent, setParent] = useState<string>(item?.parent ? String(item.parent) : "");
  const [roles, setRoles] = useState<string[]>(item?.audience.roles.map((r) => r.code) ?? []);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setError(null);
    const payload = system
      ? { title, is_active: active }
      : {
          title,
          hint,
          icon,
          to: kind === "group" ? "" : target === OTHER_URL ? url.trim() : target,
          parent: kind === "group" || parent === "" ? null : Number(parent),
          is_active: active,
          // Roles only for custom links; page links follow their page, groups have no access of their own.
          ...(kind === "link" && !isPageLink ? { roles } : {}),
        };
    setSaving(true);
    try {
      if (item) await api.patch(`/admin/menu/${item.id}/`, payload);
      else await api.post("/admin/menu/", payload);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const isPageLink = Boolean(options.pages.find((p) => p.path === target)?.written);

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {system && <Note tone="info">Item inti: hanya judul dan tampil/sembunyi yang dapat diubah. Urutan diatur dengan tombol panah di daftar.</Note>}
      {error && <Note tone="error">{error}</Note>}
      <fieldset disabled={system} className="space-y-4 disabled:opacity-100">
        {!system && (
          <fieldset className="flex flex-wrap gap-x-6">
            <legend className="mb-1 text-[13px] font-medium">Jenis</legend>
            {(["link", "group"] as const).map((k) => (
              <Radio key={k} name="kind" checked={kind === k} onChange={() => setKind(k)} label={k === "link" ? "Tautan ke halaman" : "Grup (berisi sub-menu)"} />
            ))}
          </fieldset>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Judul" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} error={errors.title} hint="Maksimal 40 karakter, unik dalam induk yang sama." />
        <Input label="Keterangan singkat" value={hint} maxLength={140} disabled={system} onChange={(e) => setHint(e.target.value)} error={errors.hint} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Ikon" value={icon} disabled={system} onChange={(e) => setIcon(e.target.value)} error={errors.icon}>
          <option value="">(tanpa ikon)</option>
          {options.icons.map((name) => <option key={name} value={name}>{name}</option>)}
        </Select>
        {kind === "link" && (
          <Select label="Induk" value={parent} disabled={system} onChange={(e) => setParent(e.target.value)} error={errors.parent} hint="Kedalaman maksimal 2 tingkat.">
            <option value="">(tingkat atas)</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </Select>
        )}
      </div>
      {kind === "link" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tujuan" value={target} disabled={system} onChange={(e) => setTarget(e.target.value)} error={errors.to}>
            <option value="">Pilih halaman…</option>
            {options.pages.map((p) => <option key={p.path} value={p.path}>{p.title} ({p.path})</option>)}
            <option value={OTHER_URL}>Alamat https lain…</option>
          </Select>
          {target === OTHER_URL && <Input label="Alamat https" value={url} disabled={system} onChange={(e) => setUrl(e.target.value)} error={errors.to} />}
        </div>
      )}
      {kind === "link" && (
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium">Siapa yang boleh melihat menu ini</legend>
          {system || isPageLink ? (
            <div className="space-y-1.5">
              {item && <AudienceChips audience={item.audience} />}
              <p className="text-[13px] text-text-3">
                {system
                  ? "Akses item inti mengikuti izin modulnya. Ubah lewat Peran & izin."
                  : "Akses mengikuti halamannya. Ubah di Halaman & akses."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-1 sm:grid-cols-2">
                {options.roles.map((role) => (
                  <Checkbox
                    key={role.code}
                    label={role.name}
                    checked={roles.includes(role.code)}
                    onChange={(on) => setRoles((prev) => (on ? [...prev, role.code] : prev.filter((c) => c !== role.code)))}
                  />
                ))}
              </div>
              <p className="mt-1 text-[13px] text-text-3">
                {roles.length === 0 ? "Tidak ada yang dicentang: semua pengguna yang sudah login melihat menu ini." : "Hanya peran yang dicentang yang melihat menu ini."}
              </p>
              {errors.roles && <p className="mt-1 text-[13px] text-red-700">{errors.roles}</p>}
            </>
          )}
        </fieldset>
      )}
      <Switch label="Tampilkan di navbar" checked={active} onChange={setActive} showState />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" loading={saving}>Simpan</Button>
      </div>
    </form>
  );
}
