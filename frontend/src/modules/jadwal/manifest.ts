import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  code: "jadwal",
  routes: [
    { path: "/jadwal", title: "Jadwal kuliah", section: "Akademik", perm: "jadwal.view", component: lazy(() => import("./pages/JadwalPage")) },
  ],
};

export default manifest;
