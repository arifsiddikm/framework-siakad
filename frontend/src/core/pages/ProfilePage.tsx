import { useAuth } from "@/auth/AuthProvider";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProfilePage() {
  const { me } = useAuth();
  if (!me) return null;
  const rows: [string, string][] = [
    ["Nama lengkap", me.user.full_name],
    ["Username", me.user.username],
    ["Nomor induk", me.user.identifier || "—"],
    ["Email", me.user.email || "—"],
  ];
  return (
    <>
      <PageHeader title="Profil saya" description="Data akun Anda. Untuk mengubahnya, hubungi administrator." />
      <Card className="max-w-2xl">
        <CardHeader title="Data akun" />
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:px-5">
              <dt className="text-text-2">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:px-5">
            <dt className="text-text-2">Peran</dt>
            <dd className="flex flex-wrap gap-2">
              {me.roles.length ? me.roles.map((r) => <Chip key={r.code} tone="navy" dot>{r.name}</Chip>) : "—"}
            </dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
