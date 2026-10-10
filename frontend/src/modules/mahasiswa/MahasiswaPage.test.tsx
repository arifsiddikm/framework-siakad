import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MahasiswaPage from "@/modules/mahasiswa/pages/MahasiswaPage";
import { baseMe, renderApp } from "@/test/utils";

vi.mock("@/lib/alert", () => ({ toastSuccess: vi.fn(), toastError: vi.fn(), alertError: vi.fn() }));

const me = { ...baseMe, permissions: ["mahasiswa.view", "mahasiswa.create"] };

beforeEach(() => {
  document.cookie = "csrftoken=t";
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] }), { status: 200, headers: { "Content-Type": "application/json" } }),
  );
});
afterEach(() => vi.restoreAllMocks());

describe("Tambah mahasiswa: NIM", () => {
  it("only accepts digits while typing or pasting", async () => {
    const user = userEvent.setup();
    renderApp(<MahasiswaPage />, { me });
    await user.click(await screen.findByRole("button", { name: /Tambah mahasiswa/ }));
    const nim = screen.getByLabelText(/NIM/);
    await user.type(nim, "24A04-0001x");
    expect(nim).toHaveValue("2404" + "0001");
    expect(nim).toHaveAttribute("inputmode", "numeric");
  });

  it("requires a NIM", async () => {
    const user = userEvent.setup();
    renderApp(<MahasiswaPage />, { me });
    await user.click(await screen.findByRole("button", { name: /Tambah mahasiswa/ }));
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.getByText("NIM wajib diisi.")).toBeInTheDocument());
  });
});
