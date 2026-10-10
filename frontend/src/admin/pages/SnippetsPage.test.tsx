import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SnippetsPage from "@/admin/pages/SnippetsPage";
import { baseMe, renderApp } from "@/test/utils";

vi.mock("@/lib/alert", () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
  toastSuccess: vi.fn(),
  alertError: vi.fn(),
  alertInfo: vi.fn(),
}));

const row = (over: Record<string, unknown> = {}) => ({
  id: 1, name: "pages.data_ijazah", label: "Data ijazah", hint: "Tabel", is_active: true, created_from_web: false, has_data: true,
  file: "frontend/src/snippets/pages/data_ijazah.tsx", python_file: "backend/snippets/pages/data_ijazah.py", file_exists: true,
  used_in: 2, shortcode: "[snippet:pages.data_ijazah]", ...over,
});
const me = { ...baseMe, permissions: ["core.menu.manage"] };
let state: ReturnType<typeof row>[];
const calls: { method: string; url: string; body?: unknown }[] = [];

beforeEach(() => {
  document.cookie = "csrftoken=t";
  calls.length = 0;
  state = [row(), row({ id: 2, name: "pages.lama", label: "Lama", is_active: false, used_in: 0 })];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input).replace("/api", "");
    const method = init?.method ?? "GET";
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (method === "GET") return json(state);
    if (method === "POST" && url.endsWith("/restore/")) return json({ ...state[1], is_active: true });
    if (method === "POST") return json(row({ id: 3, name: "pages.baru", label: "Baru", created_from_web: true }), 201);
    if (method === "DELETE") return json({ ...state[0], is_active: false });
    return json({});
  });
});
afterEach(() => vi.restoreAllMocks());

describe("Snippet admin page", () => {
  it("lists active snippets with file locations, usage, and hides deleted ones by default", async () => {
    renderApp(<SnippetsPage />, { me });
    expect(await screen.findByText("Data ijazah")).toBeInTheDocument();
    expect(screen.getByText("frontend/src/snippets/pages/data_ijazah.tsx")).toBeInTheDocument();
    expect(screen.getByText("backend/snippets/pages/data_ijazah.py")).toBeInTheDocument();
    expect(screen.getByText("2 tempat")).toBeInTheDocument();
    expect(screen.queryByText("pages.lama")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByLabelText(/Tampilkan yang dihapus/));
    expect(await screen.findByText("pages.lama")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pulihkan pages.lama/ })).toBeInTheDocument();
  });

  it("soft-deletes after confirmation and restores a deleted snippet", async () => {
    const user = userEvent.setup();
    renderApp(<SnippetsPage />, { me });
    await user.click(await screen.findByRole("button", { name: "Hapus pages.data_ijazah" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url === "/admin/snippets/1/")).toBe(true));
    await user.click(screen.getByLabelText(/Tampilkan yang dihapus/));
    await user.click(await screen.findByRole("button", { name: /Pulihkan pages.lama/ }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url === "/admin/snippets/2/restore/")).toBe(true));
  });

  it("creates a snippet from the form and shows which files will be written", async () => {
    const user = userEvent.setup();
    renderApp(<SnippetsPage />, { me });
    await user.click(await screen.findByRole("button", { name: /Snippet baru/ }));
    const name = screen.getByLabelText(/Nama snippet/);
    await user.clear(name);
    await user.type(name, "pages.laporan.ringkas");
    await user.type(screen.getByLabelText(/Nama tampil di editor/), "Laporan ringkas");
    await user.click(screen.getByLabelText(/Butuh data dari server/));
    expect(screen.getByText("frontend/src/snippets/pages/laporan/ringkas.tsx")).toBeInTheDocument();
    expect(screen.getByText("backend/snippets/pages/laporan/ringkas.py")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tambah isian" }));
    await user.type(screen.getByLabelText(/Kode isian/), "judul");
    await user.click(screen.getByRole("button", { name: "Buat snippet" }));
    await waitFor(() => expect(calls.find((c) => c.method === "POST" && c.url === "/admin/snippets/")).toBeTruthy());
    const post = calls.find((c) => c.method === "POST" && c.url === "/admin/snippets/")!;
    expect(post.body).toMatchObject({ name: "pages.laporan.ringkas", label: "Laporan ringkas", has_data: true });
    expect((post.body as { params: { name: string }[] }).params[0].name).toBe("judul");
    expect(within(document.body).queryByText("Snippet belum dapat dibuat")).not.toBeInTheDocument();
  });
});
