import { Route, Routes } from "react-router";
import { RequireAdmin } from "@/admin/AdminGuard";
import AdminLoginPage from "@/admin/AdminLoginPage";
import { AdminShell } from "@/admin/AdminShell";
import { adminRoutes } from "@/admin/routes";
import { RequireAuth, RequirePermission } from "@/auth/RouteGuard";
import ContentPage from "@/core/pages/ContentPage";
import ForbiddenPage from "@/core/pages/ForbiddenPage";
import LoginPage from "@/core/pages/LoginPage";
import ModuleInactivePage from "@/core/pages/ModuleInactivePage";
import NotFoundPage from "@/core/pages/NotFoundPage";
import { PortalShell } from "@/layouts/PortalShell";
import { routes } from "@/modules/registry";

/**
 * Two separate areas:
 *  - portal (/masuk, /, modules): header navbar built from the menu the admin configured
 *  - admin panel (/admin/masuk, /admin/*): own login, left sidebar, all settings
 */
export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<LoginPage />} />
      <Route path="/admin/masuk" element={<AdminLoginPage />} />

      <Route
        element={
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        }
      >
        {adminRoutes.map(({ path, perm, component: Page }) => (
          <Route
            key={path}
            path={path}
            element={
              <RequirePermission perm={perm} module="core">
                <Page />
              </RequirePermission>
            }
          />
        ))}
        <Route path="/admin/*" element={<NotFoundPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <PortalShell />
          </RequireAuth>
        }
      >
        {routes.map(({ path, perm, module, component: Page }) => (
          <Route
            key={path}
            path={path}
            element={
              <RequirePermission perm={perm} module={module}>
                <Page />
              </RequirePermission>
            }
          />
        ))}
        <Route path="/:slug" element={<ContentPage />} />
        <Route path="/akses-ditolak" element={<ForbiddenPage />} />
        <Route path="/modul-belum-aktif" element={<ModuleInactivePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
