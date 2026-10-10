import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

const manifest: ModuleManifest = {
  code: "keuangan",
  routes: [
    { path: "/keuangan", title: "Tagihan", section: "Keuangan", perm: "keuangan.view", component: lazy(() => import("./pages/KeuanganPage")) },
  ],
};

export default manifest;
