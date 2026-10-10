import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ME_KEY } from "@/auth/AuthProvider";
import { AudienceChips, type Audience } from "@/components/AudienceChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note } from "@/components/ui/Note";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction, alertError, toastSuccess } from "@/lib/alert";
import { api, errorMessage } from "@/lib/api";

type Row = {
  path: string;
  title: string;
  kind: "halaman" | "modul" | "bawaan";
  module: string;
  module_active: boolean;
  permission: string | null;
  audience: Audience;
  menus: { title: string; is_active: boolean }[];
  page_id: number | null;
  is_published: boolean;
};

const KEY = ["admin", "access-map"];

export default function PagesPage() {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: KEY, queryFn: () => api.get<Row[]>("/admin/access-map/") });
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const wanted = params.get("ubah");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
    queryClient.invalidateQueries({ queryKey: ME_KEY });
  };

  // Deep link from the portal ("Ubah halaman"): /admin/halaman?ubah=<slug> opens that page's editor.
  useEffect(() => {
    const row = wanted ? rows.data?.find((r) => r.path === `/${wanted}`) : undefined;
    if (!row?.page_id) return;
    setParams({}, { replace: true });
    navigate(`/admin/halaman/${row.page_id}`, { replace: true });
  }, [wanted, rows.data, setParams, navigate]);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/pages/${id}/`),
    onSuccess: () => {
      toastSuccess("Halaman dihapus.");
      refresh();
    },
    onError: (e) => alertError("Halaman tidak dapat dihapus", errorMessage(e)),
  });
  const askDelete = async (row: Row) => {
    const ok = await confirmAction({
      title: "Hapus halaman?",
      text: `${row.title} beserta tautan menunya akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, hapus",
      danger: true,
    });
    if (ok && row.page_id) remove.mutate(row.page_id);
  };

  return (
    <>
      <PageHeader
        title="Halaman & akses"
        description="Semua halaman di portal dan siapa saja yang boleh membukanya. Buat halaman baru dengan blok (teks, gambar, tabel, data, grafik), lalu tampilkan di menu."
        actions={
          <Link to="/admin/halaman/baru" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl bg-navy-700 px-4 font-medium text-white hover:bg-navy-800 sm:min-h-10">
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" /> Halaman baru
          </Link>
        }
      />

      <Note tone="info" className="mb-5">
        <p className="font-semibold">Cara menambah halaman dan menu</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>Klik <strong>Halaman baru</strong>, isi judul, lalu tambah blok isi: teks, gambar, tabel, data dari database, kartu statistik, atau grafik.</li>
          <li>Pilih <strong>peran yang boleh melihat</strong> (kosong = semua pengguna yang sudah login).</li>
          <li>Nyalakan <strong>Tampilkan di menu portal</strong> agar langsung muncul di navbar pengguna.</li>
        </ol>
        <p className="mt-2">
          Menu tanpa halaman (tautan ke situs lain, grup) diatur di <Link to="/admin/menu" className="font-medium underline">Menu portal</Link>.
          Halaman modul dan blok kustom dibuat pengembang lewat kode; di sini Anda hanya melihat aksesnya, dan mengubahnya lewat{" "}
          <Link to="/admin/peran" className="font-medium underline">Peran & izin</Link>.
        </p>
      </Note>

      <Card>
        <DataTable<Row>
          caption="Daftar halaman portal dan akses per peran"
          rows={rows.data}
          rowKey={(r) => r.path}
          loading={rows.isLoading}
          error={rows.isError ? errorMessage(rows.error) : null}
          empty={<EmptyState title="Belum ada halaman" hint="Buat halaman pertama dengan tombol Halaman baru." />}
          columns={[
            {
              key: "page",
              header: "Halaman",
              cell: (r) => (
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <code className="font-mono text-[12px] text-slate-600">{r.path}</code>
                </div>
              ),
            },
            {
              key: "kind",
              header: "Jenis",
              cell: (r) =>
                r.kind === "halaman" ? (
                  <Chip tone="navy">Halaman admin</Chip>
                ) : r.kind === "modul" ? (
                  <div className="space-y-1">
                    <Chip>Modul {r.module}</Chip>
                    {!r.module_active && <div><Chip tone="amber" dot>Modul nonaktif</Chip></div>}
                  </div>
                ) : (
                  <Chip>Bawaan</Chip>
                ),
            },
            { key: "who", header: "Dapat diakses oleh", cell: (r) => <AudienceChips audience={r.audience} /> },
            {
              key: "menu",
              header: "Di menu",
              cell: (r) =>
                r.menus.length === 0 ? (
                  <span className="text-text-3">Tidak di menu</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {r.menus.map((m) => (
                      <Chip key={m.title} tone={m.is_active ? "neutral" : "amber"}>{m.is_active ? m.title : `${m.title} (disembunyikan)`}</Chip>
                    ))}
                  </div>
                ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (r.kind === "halaman" && !r.is_published ? <Chip tone="neutral" dot>Draf</Chip> : <Chip tone="green" dot>Tayang</Chip>),
            },
            {
              key: "actions",
              header: "Tindakan",
              className: "text-right",
              cell: (r) =>
                r.kind === "halaman" ? (
                  <div className="flex justify-end gap-1">
                    <Link to={r.path} target="_blank" aria-label={`Buka ${r.title}`} className="grid size-9 place-items-center rounded-ctl text-navy-700 hover:bg-navy-50">
                      <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <Link to={`/admin/halaman/${r.page_id}`} aria-label={`Ubah ${r.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-3 text-[13px] font-medium text-navy-700 hover:bg-navy-50">
                      <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" /> Ubah
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => askDelete(r)} aria-label={`Hapus ${r.title}`}>
                      <Trash2 className="size-4 text-red-700" strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                  </div>
                ) : r.kind === "modul" ? (
                  <Link to="/admin/peran" className="inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-navy-700 hover:underline">
                    Atur akses <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                ) : null,
            },
          ]}
        />
      </Card>

    </>
  );
}

