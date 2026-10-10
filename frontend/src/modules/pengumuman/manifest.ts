import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  code: "pengumuman",
  routes: [
    { path: "/pengumuman", title: "Pengumuman", section: "Informasi", perm: "pengumuman.view", component: lazy(() => import("./pages/PengumumanPage")) },
  ],
};

export default manifest;
