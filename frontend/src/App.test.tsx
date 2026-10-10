import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { baseMe, node, renderApp } from "@/test/utils";

vi.mock("@/lib/alert", () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  alertError: vi.fn(),
  alertInfo: vi.fn(),
  showSecret: vi.fn(),
}));

const adminMe = {
  ...baseMe,
  user: { ...baseMe.user, full_name: "Ayu Administrator", initials: "AA" },
  roles: [{ code: "admin", name: "Admin" }],
  permissions: ["core.roles.manage", "core.users.manage", "core.modules.manage", "core.menu.manage"],
  menu: [node(1, "Beranda", "/")],
};

function fakeServer(routes: Record<string, unknown> = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (url.includes("/auth/logout/")) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(key ? routes[key] : {}), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

beforeEach(() => {
  document.cookie = "csrftoken=t";
});
afterEach(() => vi.restoreAllMocks());

describe("portal vs admin areas", () => {
  it("logging out from the portal lands on the login page (regression: stayed on '/')", async () => {
    const server = fakeServer();
    const user = userEvent.setup();
    renderApp(<App />, { me: { ...baseMe, menu: [node(1, "Beranda", "/")] }, path: "/" });
    await user.click(await screen.findByRole("button", { name: /Menu akun|Rina Lestari/ }));
    await user.click(screen.getByRole("button", { name: /Keluar/ }));
    expect(await screen.findByRole("heading", { name: "Masuk" })).toBeInTheDocument();
    expect(server.mock.calls.some(([url]) => String(url).includes("/auth/logout/"))).toBe(true);
  });

  it("sends anonymous visitors of /admin to the admin login, not the user login", async () => {
    renderApp(<App />, { me: null, path: "/admin/pengguna" });
    expect(await screen.findByRole("heading", { name: "Masuk panel admin" })).toBeInTheDocument();
  });

  it("shows 'Akses ditolak' in /admin to a signed-in user without admin permissions", async () => {
    renderApp(<App />, { path: "/admin" });
    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Menu admin" })).not.toBeInTheDocument();
  });

  it("shows the sidebar with only the categories the admin may manage", async () => {
    fakeServer();
    renderApp(<App />, { me: { ...adminMe, permissions: ["core.menu.manage"] }, path: "/admin" });
    const nav = await screen.findByRole("navigation", { name: "Menu admin" });
    expect(nav).toHaveTextContent("Dashboard");
    expect(nav).toHaveTextContent("Konten portal");
    expect(nav).not.toHaveTextContent("Akses & pengguna");
    expect(nav).not.toHaveTextContent("Pengguna");
  });

  it("opens a sidebar category as a dropdown by click and closes it again", async () => {
    fakeServer({ "/admin/menu/": [] });
    const user = userEvent.setup();
    renderApp(<App />, { me: { ...adminMe, permissions: ["core.menu.manage"] }, path: "/admin" });
    const group = await screen.findByRole("button", { name: "Konten portal" });
    expect(group).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Menu portal" })).not.toBeInTheDocument();
    await user.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Menu portal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Snippet" })).toBeInTheDocument();
    await user.click(group);
    expect(screen.queryByRole("link", { name: "Menu portal" })).not.toBeInTheDocument();
  });

  it("keeps the category of the current page open", async () => {
    fakeServer();
    renderApp(<App />, { me: { ...adminMe, permissions: ["core.menu.manage"] }, path: "/admin/menu" });
    expect(await screen.findByRole("button", { name: "Konten portal" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Menu portal" })).toHaveAttribute("aria-current", "page");
  });

  it("offers a 'Panel Admin' link in the portal only to admins", async () => {
    renderApp(<App />, { me: adminMe, path: "/" });
    expect(await screen.findByRole("link", { name: /Panel Admin/ })).toHaveAttribute("href", "/admin");
  });

  it("does not show the admin link to regular users", async () => {
    renderApp(<App />, { path: "/" });
    await screen.findByText(/Anda masuk sebagai/);
    expect(screen.queryByRole("link", { name: /Panel Admin/ })).not.toBeInTheDocument();
  });

  it("the user login page links to the admin panel", async () => {
    renderApp(<App />, { me: null, path: "/masuk" });
    expect(await screen.findByRole("link", { name: /Panel Admin/ })).toHaveAttribute("href", "/admin");
  });

  it("the admin login has no marketing text or link back, only the logo", async () => {
    renderApp(<App />, { me: null, path: "/admin/masuk" });
    expect(await screen.findByRole("heading", { name: "Masuk panel admin" })).toBeInTheDocument();
    expect(screen.queryByText(/tanpa menyentuh kode/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Peran dan izin akses/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kembali ke login pengguna/)).not.toBeInTheDocument();
    expect(screen.getByText("PANEL ADMIN")).toBeInTheDocument();
  });

  it("opens an admin-written page at /<slug> and shows 'Akses ditolak' when the server says 403", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/pages/terbuka/")) {
        return new Response(JSON.stringify({ slug: "terbuka", title: "Panduan KRS", blocks: [{ id: "b1", type: "text", text: "# Langkah\n\nIsi **penting**." }], updated_at: "2026-10-09T00:00:00Z" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ code: "PERMISSION_DENIED", message: "x", fields: {} }), { status: 403, headers: { "Content-Type": "application/json" } });
    });
    const { unmount } = renderApp(<App />, { path: "/terbuka" });
    expect(await screen.findByRole("heading", { name: "Panduan KRS" })).toBeInTheDocument();
    expect(screen.getByText("penting").tagName).toBe("STRONG");
    unmount();
    renderApp(<App />, { path: "/tertutup" });
    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
  });

  it("shows 'Ubah halaman' on an admin-written page only to admins", async () => {
    fakeServer({ "/pages/panduan/": { slug: "panduan", title: "Panduan", blocks: [{ id: "b", type: "text", text: "Isi" }], updated_at: "2026-10-09T00:00:00Z" } });
    const { unmount } = renderApp(<App />, { me: adminMe, path: "/panduan" });
    expect(await screen.findByRole("link", { name: /Ubah halaman/ })).toHaveAttribute("href", "/admin/halaman?ubah=panduan");
    unmount();
    renderApp(<App />, { path: "/panduan" });
    await screen.findByRole("heading", { name: "Panduan" });
    expect(screen.queryByRole("link", { name: /Ubah halaman/ })).not.toBeInTheDocument();
  });

  it("shows the 404 page for an address that is no page, and the page-builder routes exist for admins", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ code: "NOT_FOUND", message: "x", fields: {} }), { status: 404, headers: { "Content-Type": "application/json" } }),
    );
    renderApp(<App />, { path: "/halaman-ngawur" });
    expect(await screen.findByText("Halaman tidak ditemukan")).toBeInTheDocument();
  });

  it("refuses an admin-login for an account without admin permissions", async () => {
    document.cookie = "csrftoken=t";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/login/")) return new Response(JSON.stringify(baseMe), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(null, { status: 204 });
    });
    const user = userEvent.setup();
    renderApp(<App />, { me: null, path: "/admin/masuk" });
    await user.type(await screen.findByLabelText(/Username/), "rina");
    await user.type(screen.getByLabelText(/Kata sandi/), "rahasia123");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("tidak memiliki akses panel admin"));
    expect(screen.queryByRole("heading", { name: /Selamat/ })).not.toBeInTheDocument();
  });
});
