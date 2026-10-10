import { lazy } from "react";
import type { AppRoute } from "@/modules/types";

export const coreRoutes: AppRoute[] = [
  { path: "/", title: "Beranda", component: lazy(() => import("@/core/pages/HomePage")) },
  { path: "/profil", title: "Profil saya", component: lazy(() => import("@/core/pages/ProfilePage")) },
  { path: "/keamanan", title: "Keamanan akun", component: lazy(() => import("@/core/pages/SecurityPage")) },
];
