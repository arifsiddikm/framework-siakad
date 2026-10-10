import { describe, expect, it } from "vitest";
import { adminRoutes } from "@/admin/routes";
import { moduleManifests, routes } from "@/modules/registry";

describe("module registry", () => {
  it("discovers module manifests from src/modules/*/manifest.ts", () => {
    expect(moduleManifests.map((m) => m.code)).toContain("mahasiswa");
  });

  it("registers core and module routes with their module code and permission", () => {
    const mahasiswa = routes.find((r) => r.path === "/mahasiswa");
    expect(mahasiswa).toMatchObject({ module: "mahasiswa", perm: "mahasiswa.view" });
  });

  it("has no duplicate paths", () => {
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("guards every module page with a permission", () => {
    for (const route of routes.filter((r) => r.module !== "core")) {
      expect(route.perm, route.path).toBeTruthy();
    }
  });

  it("keeps admin pages out of the portal and guards each one", () => {
    expect(routes.some((r) => r.path.startsWith("/admin"))).toBe(false);
    expect(adminRoutes.map((r) => r.path)).toContain("/admin/halaman");
    for (const route of adminRoutes.filter((r) => r.path !== "/admin")) {
      expect(route.perm, route.path).toMatch(/^core\..+\.manage$/);
    }
  });
});
