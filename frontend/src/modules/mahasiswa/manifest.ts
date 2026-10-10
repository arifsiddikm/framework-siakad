import { lazy } from "react";
import type { ModuleManifest } from "@/modules/types";

// Frontend half of the module contract. The backend half is backend/modules/mahasiswa/manifest.py.
const manifest: ModuleManifest = {
  code: "mahasiswa",
  routes: [
    {
      path: "/mahasiswa",
      title: "Data mahasiswa",
      section: "Akademik",
      perm: "mahasiswa.view",
      component: lazy(() => import("./pages/MahasiswaPage")),
    },
  ],
};

export default manifest;
