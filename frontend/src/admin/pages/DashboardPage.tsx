import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, ListTree, Puzzle, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { firstName, formatNumber, greeting } from "@/lib/format";

type Stat = { perm: string; label: string; value?: number; hint?: string; to: string; icon: LucideIcon };

function StatCard({ label, value, hint, to, icon: Icon }: Omit<Stat, "perm">) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-2">{label}</p>
          <p className="mt-1 text-[28px] font-semibold leading-none text-navy-900">{value === undefined ? "…" : formatNumber(value)}</p>
          {hint && <p className="mt-1.5 text-[12.5px] text-slate-600">{hint}</p>}
        </div>
        <span className="grid size-10 place-items-center rounded-ctl bg-navy-50 text-navy-700">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
      <Link to={to} className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-navy-700 hover:underline">
        Kelola <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const { me, can } = useAuth();
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: () => api.get<unknown[]>("/admin/roles/"), enabled: can("core.roles.manage") });
  const users = useQuery({ queryKey: ["admin", "users", "count"], queryFn: () => api.get<{ count: number }>("/admin/users/?page=1"), enabled: can("core.users.manage") });
  const modules = useQuery({ queryKey: ["admin", "modules"], queryFn: () => api.get<{ is_active: boolean }[]>("/admin/modules/"), enabled: can("core.modules.manage") });
  const menu = useQuery({ queryKey: ["admin", "menu"], queryFn: () => api.get<{ is_active: boolean; to: string }[]>("/admin/menu/"), enabled: can("core.menu.manage") });

  const stats: Stat[] = [
    { perm: "core.users.manage", label: "Pengguna", value: users.data?.count, to: "/admin/pengguna", icon: Users },
    { perm: "core.roles.manage", label: "Peran", value: roles.data?.length, to: "/admin/peran", icon: ShieldCheck },
    {
      perm: "core.modules.manage", label: "Modul aktif",
      value: modules.data?.filter((m) => m.is_active).length,
      hint: modules.data ? `dari ${modules.data.length} modul` : undefined,
      to: "/admin/modul",
      icon: Puzzle,
    },
    {
      perm: "core.menu.manage", label: "Item menu portal",
      value: menu.data?.filter((m) => m.to).length,
      hint: menu.data ? `${menu.data.filter((m) => m.to && !m.is_active).length} disembunyikan` : undefined,
      to: "/admin/menu",
      icon: ListTree,
    },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(me?.user.full_name ?? "")}`}
        description="Ringkasan pengaturan kerangka SIAKAD. Semua perubahan berlaku langsung tanpa deploy ulang."
        actions={
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-white px-4 text-[14px] font-medium hover:bg-slate-50">
            <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" /> Buka portal pengguna
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.filter((stat) => can(stat.perm)).map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} to={stat.to} icon={stat.icon} />
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader title="Cara kerja pengaturan" />
        <ol className="list-decimal space-y-2 px-8 py-4 text-text-2 marker:font-semibold marker:text-navy-700">
          <li><strong className="text-text">Peran & izin</strong>: tentukan siapa boleh melakukan apa. Peran hanyalah kumpulan izin.</li>
          <li><strong className="text-text">Pengguna</strong>: buat akun lalu tetapkan satu peran atau lebih.</li>
          <li><strong className="text-text">Modul</strong>: nyalakan atau matikan layanan. Modul mati = menunya hilang dan API-nya ditutup.</li>
          <li><strong className="text-text">Halaman & akses</strong>: buat halaman baru, pilih peran yang boleh membukanya, dan lihat siapa yang boleh mengakses setiap halaman.</li>
          <li><strong className="text-text">Menu portal</strong>: atur judul, urutan, grup, dan tautan di navbar pengguna. Menyembunyikan menu bukan pengaman, izin tetap diperiksa server.</li>
        </ol>
      </Card>
    </>
  );
}
