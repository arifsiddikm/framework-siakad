import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import ForbiddenPage from "@/core/pages/ForbiddenPage";
import ModuleInactivePage from "@/core/pages/ModuleInactivePage";
import { Skeleton } from "@/components/ui/Skeleton";

/** Sends anonymous visitors to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Skeleton lines={5} />;
  if (!me) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/**
 * Page-level permission check (RBAC-02). This is a convenience only — the server answers 403
 * for every API call the page makes without the permission.
 */
export function RequirePermission({ perm, module, children }: { perm?: string; module: string; children: ReactNode }) {
  const { can, moduleInactive } = useAuth();
  if (!perm) return <>{children}</>;
  if (moduleInactive(module)) return <ModuleInactivePage />;
  if (!can(perm)) return <ForbiddenPage />;
  return <>{children}</>;
}
