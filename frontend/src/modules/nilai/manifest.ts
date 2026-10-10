import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  code: "nilai",
  routes: [
    { path: "/nilai", title: "Nilai & KHS", section: "Akademik", perm: "nilai.view", component: lazy(() => import("./pages/NilaiPage")) },
  ],
};

export default manifest;
