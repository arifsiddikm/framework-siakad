import { ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { DEV_PORTAL_ACCOUNTS } from "@/auth/devAccounts";
import { preloadShapeWaves } from "@/components/effects/preloadShapeWaves";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME, CAMPUS_NAME } from "@/config";
import { alertInfo, toastSuccess } from "@/lib/alert";
import { firstName } from "@/lib/format";

/** Portal login: campus photo on the left, form on the right (stacked on phones). */
export default function LoginPage() {
  const { me, loading, setMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!loading && me) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 bg-[url('/brand/pattern.svg')]">
      <header className="flex items-center justify-between px-4 py-3 sm:px-8">
        <span className="font-serif text-[17px] font-semibold text-navy-900">{APP_NAME}</span>
        <Link
          to="/admin"
          onMouseEnter={preloadShapeWaves}
          onFocus={preloadShapeWaves}
          onTouchStart={preloadShapeWaves}
          className="inline-flex min-h-10 items-center gap-2 rounded-ctl border border-navy-200 bg-white/80 px-3.5 text-[13px] font-medium text-navy-800 hover:bg-white"
        >
          <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" /> Panel Admin
        </Link>
      </header>
      <div className="grid flex-1 place-items-center p-4 pb-8 sm:px-8">
      <main className="grid w-full max-w-[1040px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(11,31,75,.12)] md:grid-cols-[1.05fr_1fr]">
        <section className="relative min-h-44 md:min-h-[640px]">
          <img src="/brand/login-campus.svg" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-navy-900/80 px-6 py-5 text-white md:px-8 md:py-7">
            <p className="text-[13px] font-semibold tracking-[0.12em] text-amber-500">SELAMAT DATANG</p>
            <div className="mb-2 mt-1.5 h-0.5 w-24 bg-amber-500" />
            <p className="text-[22px] leading-tight md:text-[30px]">Sistem Informasi Akademik</p>
            <p className="font-serif text-[22px] font-bold leading-tight md:text-[30px]">{CAMPUS_NAME}</p>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-8 sm:px-10 md:px-12 md:py-12">
          <img src="/brand/siakadku-mark.svg" alt="" className="mx-auto size-20 rounded-2xl" />
          <h1 className="mt-5 text-center text-[26px] font-semibold text-navy-900">Masuk</h1>
          <p className="mx-auto mb-6 mt-1 max-w-sm text-center text-text-2">
            Gunakan akun yang diberikan administrator {CAMPUS_NAME} untuk mengakses layanan akademik.
          </p>
          <LoginForm
            devAccounts={DEV_PORTAL_ACCOUNTS}
            belowPassword={
              <button
                type="button"
                className="font-medium text-navy-700 underline underline-offset-2"
                onClick={() =>
                  alertInfo("Lupa kata sandi?", "Hubungi administrator kampus. Admin dapat membuatkan kata sandi sementara untuk Anda.")
                }
              >
                Lupa kata sandi?
              </button>
            }
            onSignedIn={async (profile) => {
              setMe(profile);
              const from = (location.state as { from?: string } | null)?.from;
              navigate(from && from !== "/masuk" ? from : "/", { replace: true });
              toastSuccess(`Selamat datang, ${firstName(profile.user.full_name)}.`);
              return null;
            }}
          />
          <p className="mt-8 text-center text-[12.5px] text-text-3">
            Powered by <span className="font-semibold text-slate-700">{APP_NAME}</span> · kerangka sample, data fiktif
          </p>
        </section>
      </main>
      </div>
    </div>
  );
}
