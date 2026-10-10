import { lazy } from "react";
import type { AppRoute } from "@/modules/types";

/** Admin panel pages. Settings live here only; the portal never links to them. */
export const adminRoutes: AppRoute[] = [
  { path: "/admin", title: "Dashboard", component: lazy(() => import("@/admin/pages/DashboardPage")) },
  { path: "/admin/peran", title: "Peran & izin", perm: "core.roles.manage", component: lazy(() => import("@/admin/pages/RolesPage")) },
  { path: "/admin/pengguna", title: "Pengguna", perm: "core.users.manage", component: lazy(() => import("@/admin/pages/UsersPage")) },
  { path: "/admin/modul", title: "Modul", perm: "core.modules.manage", component: lazy(() => import("@/admin/pages/ModulesPage")) },
  { path: "/admin/halaman/baru", title: "Halaman baru", perm: "core.menu.manage", component: lazy(() => import("@/admin/pages/PageEditorPage")) },
  { path: "/admin/halaman/:id", title: "Ubah halaman", perm: "core.menu.manage", component: lazy(() => import("@/admin/pages/PageEditorPage")) },
  { path: "/admin/halaman", title: "Halaman & akses", perm: "core.menu.manage", component: lazy(() => import("@/admin/pages/PagesPage")) },
  { path: "/admin/snippet", title: "Snippet", perm: "core.menu.manage", component: lazy(() => import("@/admin/pages/SnippetsPage")) },
  { path: "/admin/menu", title: "Menu portal", perm: "core.menu.manage", component: lazy(() => import("@/admin/pages/MenuPage")) },
];
