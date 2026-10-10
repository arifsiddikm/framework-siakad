import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Copy, ExternalLink, Puzzle, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ME_KEY } from "@/auth/AuthProvider";
import { BlockForm } from "@/admin/blocks/BlockForm";
import type { DatasetInfo } from "@/admin/blocks/types";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { alertError, confirmAction, toastSuccess } from "@/lib/alert";
import { ApiError, api, errorMessage } from "@/lib/api";
import { BLOCK_TYPES, type Block, type BlockType, newBlock, newId } from "@/lib/blocks";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { snippetList, snippets } from "@/snippets/registry";

type PageDetail = {
  id: number;
  slug: string;
  path: string;
  title: string;
  blocks: Block[];
  is_published: boolean;
  roles: string[];
  menu: { enabled: boolean; id: number | null; title: string; parent: number | null };
};
type MenuRow = { id: number; title: string; to: string; parent: number | null };
type Options = { roles: { code: string; name: string }[] };

export default function PageEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const page = useQuery({ queryKey: ["admin", "page", id], queryFn: () => api.get<PageDetail>(`/admin/pages/${id}/`), enabled: !isNew });
  if (!isNew && page.isLoading) return <Card><Skeleton lines={8} /></Card>;
  if (!isNew && (page.isError || !page.data)) return <Note tone="error">{errorMessage(page.error)}</Note>;
  return <Editor key={id ?? "baru"} page={page.data ?? null} />;
}

function Editor({ page }: { page: PageDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const datasets = useQuery({ queryKey: ["admin", "datasets"], queryFn: () => api.get<DatasetInfo[]>("/admin/datasets/") });
  const options = useQuery({ queryKey: ["admin", "menu", "options"], queryFn: () => api.get<Options & Record<string, unknown>>("/admin/menu/options/") });
  const menu = useQuery({ queryKey: ["admin", "menu"], queryFn: () => api.get<MenuRow[]>("/admin/menu/") });
  const groups = (menu.data ?? []).filter((m) => !m.to && m.parent === null);

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(page?.blocks ?? [newBlock("text")]);
  const [roles, setRoles] = useState<string[]>(page?.roles ?? []);
  const [published, setPublished] = useState(page?.is_published ?? true);
  const [inMenu, setInMenu] = useState(page?.menu.enabled ?? false);
  const [menuTitle, setMenuTitle] = useState(page?.menu.title ?? "");
  const [menuParent, setMenuParent] = useState(page?.menu.parent ? String(page.menu.parent) : "");
  const [tab, setTab] = useState<"susun" | "pratinjau">("susun");
  const [open, setOpen] = useState<Set<string>>(new Set(blocks.length === 1 ? [blocks[0].id] : []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = <T,>(setter: (v: T) => void) => (value: T) => {
    setDirty(true);
    setter(value);
  };
  const setBlock = (index: number, next: Block) => touch(setBlocks)(blocks.map((b, i) => (i === index ? next : b)));
  const move = (index: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    touch(setBlocks)(next);
  };
  const add = (block: Block) => {
    touch(setBlocks)([...blocks, block]);
    setOpen((prev) => new Set(prev).add(block.id));
  };
  const toggle = (blockId: string) => setOpen((prev) => { const next = new Set(prev); if (next.has(blockId)) next.delete(blockId); else next.add(blockId); return next; });

  const save = useMutation({
    mutationFn: () => {
      const common = { title, blocks, roles, is_published: published, menu_enabled: inMenu, menu_title: (menuTitle || title).slice(0, 40), menu_parent: menuParent === "" ? null : Number(menuParent) };
      return page ? api.patch<PageDetail>(`/admin/pages/${page.id}/`, common) : api.post<PageDetail>("/admin/pages/", { slug, ...common });
    },
    onSuccess: (saved) => {
      setDirty(false);
      setErrors({});
      toastSuccess(page ? "Halaman disimpan." : "Halaman dibuat.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      queryClient.invalidateQueries({ queryKey: ME_KEY });
      if (!page) navigate(`/admin/halaman/${saved.id}`, { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      alertError("Halaman belum dapat disimpan", errorMessage(e));
    },
  });

  const remove = async () => {
    if (!page) return;
    const ok = await confirmAction({ title: "Hapus halaman?", text: `${page.title} beserta tautan menunya akan dihapus. Tindakan ini tidak dapat dibatalkan.`, confirmText: "Ya, hapus", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/pages/${page.id}/`);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ME_KEY });
      toastSuccess("Halaman dihapus.");
      navigate("/admin/halaman", { replace: true });
    } catch (e) {
      alertError("Halaman tidak dapat dihapus", errorMessage(e));
    }
  };

  const label = (block: Block) => (block.type === "snippet" && snippets[block.name] ? `Snippet: ${snippets[block.name].meta.label}` : BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type);
  const icon = (block: Block) => BLOCK_TYPES.find((t) => t.type === block.type)?.icon ?? Puzzle;
  const summary = (block: Block) => {
    if ("title" in block && block.title) return block.title;
    if (block.type === "text") return block.text.split("\n").find((l) => l.trim())?.replace(/^[#>\-*\d. ]+/, "").slice(0, 70) ?? "";
    if (block.type === "callout") return block.text.slice(0, 70);
    if (block.type === "image") return block.caption || block.alt;
    return "";
  };

  return (
    <>
      <PageHeader
        title={page ? "Ubah halaman" : "Halaman baru"}
        description="Susun isi halaman dari blok. Simpan, lalu halaman tampil di portal sesuai peran yang Anda pilih."
        actions={
          <>
            <Link to="/admin/halaman" className="inline-flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-white px-4 text-[14px] font-medium hover:bg-slate-50">
              <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" /> Kembali
            </Link>
            {page && (
              <Link to={page.path} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-white px-4 text-[14px] font-medium hover:bg-slate-50">
                <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" /> Lihat di portal
              </Link>
            )}
            <Button onClick={() => save.mutate()} loading={save.isPending}><Save className="size-4" strokeWidth={1.75} aria-hidden="true" /> Simpan</Button>
          </>
        }
      />
      {dirty && <Note tone="warn" className="mb-4">Ada perubahan yang belum disimpan.</Note>}
      {errors.blocks && <Note tone="error" className="mb-4">{errors.blocks}</Note>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <Input label="Judul halaman" required value={title} maxLength={80} error={errors.title}
              onChange={(e) => { touch(setTitle)(e.target.value); if (!page && !slugEdited) setSlug(slugify(e.target.value)); }} />
          </Card>

          <div role="tablist" aria-label="Mode editor" className="inline-flex rounded-ctl border border-line bg-white p-1">
            {(["susun", "pratinjau"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={cn("min-h-9 rounded-[6px] px-4 text-[14px] font-medium", tab === t ? "bg-navy-700 text-white" : "text-slate-700 hover:bg-slate-100")}>
                {t === "susun" ? "Susun blok" : "Pratinjau"}
              </button>
            ))}
          </div>

          {tab === "pratinjau" ? (
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-[22px] font-semibold text-navy-900">{title || "Judul halaman"}</h2>
              <BlockRenderer blocks={blocks} loadData={(block) => api.post("/admin/blocks/preview/", { block })} />
            </Card>
          ) : (
            <>
              {blocks.length === 0 && <Card className="p-8 text-center text-text-2">Belum ada blok. Tambahkan dari daftar di bawah.</Card>}
              {blocks.map((block, index) => {
                const Icon = icon(block);
                const isOpen = open.has(block.id);
                return (
                  <Card key={block.id}>
                    <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                      <button type="button" onClick={() => toggle(block.id)} aria-expanded={isOpen} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700"><Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold">{index + 1}. {label(block)}</span>
                          <span className="block truncate text-[12.5px] text-slate-600">{summary(block) || "Belum diisi"}</span>
                        </span>
                        <ChevronDown className={cn("ml-auto size-4 shrink-0 transition-transform", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <div className="flex shrink-0 items-center">
                        <Button variant="ghost" size="sm" aria-label={`Naikkan blok ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp className="size-4" strokeWidth={1.75} aria-hidden="true" /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Turunkan blok ${index + 1}`} disabled={index === blocks.length - 1} onClick={() => move(index, index + 1)}><ArrowDown className="size-4" strokeWidth={1.75} aria-hidden="true" /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Gandakan blok ${index + 1}`} onClick={() => touch(setBlocks)([...blocks.slice(0, index + 1), { ...structuredClone(block), id: newId() }, ...blocks.slice(index + 1)])}><Copy className="size-4" strokeWidth={1.75} aria-hidden="true" /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Hapus blok ${index + 1}`} onClick={() => touch(setBlocks)(blocks.filter((_, i) => i !== index))}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /></Button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-line p-4 sm:p-5">
                        <BlockForm block={block} onChange={(next) => setBlock(index, next)} datasets={datasets.data ?? []} />
                      </div>
                    )}
                  </Card>
                );
              })}

              <Card>
                <CardHeader title="Tambah blok" />
                <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                  {BLOCK_TYPES.filter((t) => t.type !== "snippet").map(({ type, label: text, hint, icon: Icon }) => (
                    <button key={type} type="button" onClick={() => add(newBlock(type as BlockType))} className="flex items-start gap-3 rounded-ctl border border-line p-3 text-left hover:border-navy-300 hover:bg-navy-50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700"><Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
                      <span><span className="block text-[14px] font-semibold">{text}</span><span className="block text-[12.5px] text-slate-600">{hint}</span></span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-line p-3 sm:p-4">
                  <p className="mb-1 text-[13px] font-medium">Snippet dari file <span className="font-normal text-text-3">(dibuat developer)</span></p>
                  <p className="mb-2 text-[12.5px] text-text-3">Tambah atau edit file di <code className="font-mono">frontend/src/snippets/</code> — lihat <code className="font-mono">EDIT_ADD_FILE_HERE</code>. Daftar ini terbaca otomatis.</p>
                  {snippetList.length === 0 ? (
                    <p className="text-[13px] text-text-3">Belum ada snippet.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {snippetList.map((sn) => (
                        <button key={sn.name} type="button" onClick={() => add({ id: newId(), type: "snippet", name: sn.name, params: {} })} className="flex items-start gap-3 rounded-ctl border border-dashed border-navy-300 p-3 text-left hover:bg-navy-50">
                          <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-navy-700 text-white"><Puzzle className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
                          <span className="min-w-0"><span className="block text-[14px] font-semibold">{sn.meta.label}</span><span className="block text-[12.5px] text-slate-600">{sn.meta.hint}</span><code className="block truncate font-mono text-[11.5px] text-slate-500">{sn.file.replace("frontend/src/", "")}</code></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <Card>
            <CardHeader title="Pengaturan halaman" />
            <div className="space-y-4 p-4">
              <Input label="Alamat" required value={slug} disabled={Boolean(page)} maxLength={60} error={errors.slug}
                onChange={(e) => { setSlugEdited(true); touch(setSlug)(slugify(e.target.value)); }}
                hint={page ? "Alamat tidak dapat diubah setelah dibuat." : `Halaman akan tampil di /${slug || "alamat-halaman"}`} />
              <fieldset>
                <legend className="mb-1 text-[13px] font-medium">Peran yang boleh melihat</legend>
                {options.data?.roles.map((role) => (
                  <Checkbox key={role.code} label={role.name} checked={roles.includes(role.code)} onChange={(on) => touch(setRoles)(on ? [...roles, role.code] : roles.filter((c) => c !== role.code))} />
                ))}
                <p className="mt-1 text-[13px] text-text-3">{roles.length === 0 ? "Tidak ada yang dicentang: semua pengguna yang sudah login dapat membuka halaman ini." : "Hanya peran yang dicentang yang dapat membuka halaman ini."}</p>
                {errors.roles && <p className="mt-1 text-[13px] text-red-700">{errors.roles}</p>}
              </fieldset>
              <Switch label="Terbitkan halaman" checked={published} onChange={touch(setPublished)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Menu portal" />
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Switch label="Tampilkan di menu portal" checked={inMenu} onChange={touch(setInMenu)} showState={false} />
                <span className="font-medium">Tampilkan di menu portal</span>
              </div>
              {inMenu && (
                <>
                  <Input label="Judul di menu" value={menuTitle} maxLength={40} placeholder={title.slice(0, 40)} onChange={(e) => touch(setMenuTitle)(e.target.value)} error={errors.menu_title} hint="Maksimal 40 karakter." />
                  <Select label="Masuk ke grup" value={menuParent} onChange={(e) => touch(setMenuParent)(e.target.value)} error={errors.menu_parent}>
                    <option value="">(tingkat atas navbar)</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                </>
              )}
            </div>
          </Card>
          {page && <Button variant="secondary" className="w-full" onClick={remove}><Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" /> Hapus halaman</Button>}
          <Button variant="primary" className="w-full xl:hidden" onClick={() => save.mutate()} loading={save.isPending}>Simpan halaman</Button>
        </aside>
      </div>
    </>
  );
}
