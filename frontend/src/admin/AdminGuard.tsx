import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { useLogout } from "@/auth/useLogout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

/** Gate for the whole admin area: login first, then any admin permission. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { me, loading, isAdmin } = useAuth();
  const location = useLocation();
  const logout = useLogout("admin");
  if (loading) return <Skeleton lines={5} />;
  if (!me) return <Navigate to="/admin/masuk" replace state={{ from: location.pathname }} />;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <Card className="w-full max-w-lg">
          <EmptyState
            title="Akses ditolak"
            hint="Akun ini tidak memiliki izin panel admin. Kembali ke portal, atau masuk dengan akun administrator."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/"><Button>Ke portal pengguna</Button></Link>
                <Button variant="secondary" onClick={() => void logout()}>Ganti akun</Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
