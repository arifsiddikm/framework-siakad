import { useAuth } from "@/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CAMPUS_NAME } from "@/config";
import { firstName, greeting } from "@/lib/format";

/** Beranda: a welcome message only. Services are reached through the navbar. */
export default function HomePage() {
  const { me } = useAuth();
  if (!me) return null;
  const hasMenu = me.menu.some((node) => node.to !== "/");

  return (
    <Card className="mx-auto mt-4 max-w-3xl overflow-hidden">
      <div className="bg-navy-900 px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-amber-500">SELAMAT DATANG</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight sm:text-[34px]">
          {greeting()}, {firstName(me.user.full_name)}
        </h1>
        <p className="mt-1 text-white/80">Sistem Informasi Akademik {CAMPUS_NAME}</p>
      </div>
      <div className="space-y-4 px-6 py-6 sm:px-10">
        <div>
          <p className="text-text-2">Anda masuk sebagai</p>
          <p className="text-[17px] font-semibold">{me.user.full_name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {me.roles.length === 0 && <Chip>Belum memiliki peran</Chip>}
            {me.roles.map((role) => (
              <Chip key={role.code} tone="navy" dot>
                {role.name}
              </Chip>
            ))}
          </div>
        </div>
        <p className="text-text-2">
          {hasMenu
            ? "Gunakan menu navigasi untuk membuka layanan yang tersedia untuk Anda."
            : "Belum ada layanan yang dapat Anda akses. Hubungi administrator untuk meminta akses."}
        </p>
      </div>
    </Card>
  );
}
