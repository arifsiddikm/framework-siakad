import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequirePermission } from "@/auth/RouteGuard";
import { baseMe, renderApp } from "@/test/utils";

const page = <RequirePermission perm="mahasiswa.view" module="mahasiswa"><p>Isi halaman</p></RequirePermission>;

describe("RequirePermission", () => {
  it("shows the page when the permission is held", () => {
    renderApp(page, { me: { ...baseMe, permissions: ["mahasiswa.view"] } });
    expect(screen.getByText("Isi halaman")).toBeInTheDocument();
  });

  it("shows 'Akses ditolak' without the permission", () => {
    renderApp(page);
    expect(screen.getByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.queryByText("Isi halaman")).not.toBeInTheDocument();
  });

  it("shows 'Modul belum aktif' when the module is switched off", () => {
    renderApp(page, { me: { ...baseMe, inactive_modules: ["mahasiswa"] } });
    expect(screen.getByText("Modul belum aktif")).toBeInTheDocument();
  });
});
