import { lazy, Suspense } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { DEV_ADMIN_ACCOUNTS } from "@/auth/devAccounts";
import { LoginForm } from "@/components/auth/LoginForm";
import { preloadShapeWaves } from "@/components/effects/preloadShapeWaves";
import { APP_NAME } from "@/config";
import { api } from "@/lib/api";
import { toastSuccess } from "@/lib/alert";
import { firstName } from "@/lib/format";

// WebGPU effect (React Bits "Shape Waves"). Loaded only where WebGPU exists; elsewhere the panel stays
// navy. Loading starts as early as possible: right when the app boots on an /admin address, or when the
// visitor points at the "Panel Admin" link on the user login.
if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) preloadShapeWaves();
const ShapeWaves = lazy(() => import("@/components/effects/ShapeWaves"));
const hasWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;

/** Separate login for the admin panel. Accounts without admin permissions are refused. */
export default function AdminLoginPage() {
  const { me, loading, isAdmin, setMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!loading && me && isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(380px,5fr)_6fr]">
      {/* dotted tile = instant stand-in while the GPU effect starts */}
      <section className="relative min-h-56 overflow-hidden bg-navy-900 bg-[url('/brand/dots.svg')] lg:min-h-screen">
        {hasWebGpu && (
          <Suspense fallback={null}>
            <div className="absolute inset-0">
              <ShapeWaves
                text={APP_NAME}
                fontFamily='"Source Serif 4", Georgia, serif'
                fontWeight={700}
                textSize={0.3}
                shapes="mixed"
                cellSize={10}
                dotSize={0.75}
                color="#4C6FB5"
                hoverColor="#FFFFFF"
                backgroundColor="#0B1F4B"
                brightness={0.45}
                fade={0.25}
                glow={0.35}
                splashRadius={40}
                splashStrength={0.4}
                intro
                onError={(error) => console.warn("ShapeWaves disabled:", error.message)}
                introDuration={0.9}
              />
            </div>
          </Suspense>
        )}
        <div className="relative z-10 flex items-center gap-3 p-8 lg:p-12">
          <img src="/brand/siakadku-mark.svg" alt="" className="size-11 rounded-[10px] ring-1 ring-white/30" />
          <div className="text-white">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-white/70">PANEL ADMIN</p>
            <p className="font-serif text-xl font-semibold leading-tight">{APP_NAME}</p>
          </div>
        </div>
      </section>

      <main className="grid place-items-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[26px] font-semibold text-navy-900">Masuk panel admin</h1>
          <p className="mb-6 mt-1 text-text-2">Khusus administrator. Pengguna biasa masuk lewat halaman login pengguna.</p>
          <LoginForm
            devAccounts={DEV_ADMIN_ACCOUNTS}
            prefill={DEV_ADMIN_ACCOUNTS[0]}
            onSignedIn={async (profile) => {
              const allowed = profile.permissions.some((code) => code.startsWith("core.") && code.endsWith(".manage"));
              if (!allowed) {
                await api.post("/auth/logout/");
                return "Akun ini tidak memiliki akses panel admin. Gunakan akun administrator, atau masuk lewat halaman login pengguna.";
              }
              setMe(profile);
              const from = (location.state as { from?: string } | null)?.from;
              navigate(from && from.startsWith("/admin") && from !== "/admin/masuk" ? from : "/admin", { replace: true });
              toastSuccess(`Selamat datang, ${firstName(profile.user.full_name)}.`);
              return null;
            }}
          />
        </div>
      </main>
    </div>
  );
}
