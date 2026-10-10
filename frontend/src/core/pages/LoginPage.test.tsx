import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/core/pages/LoginPage";
import { baseMe, renderApp } from "@/test/utils";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("LoginPage", () => {
  it("validates required fields before calling the server", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderApp(<LoginPage />, { me: null, path: "/masuk" });
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByText("Username wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Kata sandi wajib diisi.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the server's uniform error message on a wrong password", async () => {
    document.cookie = "csrftoken=abc";
    mockFetch(400, { code: "INVALID_CREDENTIALS", message: "Username atau kata sandi salah. Periksa lalu coba lagi.", fields: {} });
    const user = userEvent.setup();
    renderApp(<LoginPage />, { me: null, path: "/masuk" });
    await user.type(screen.getByLabelText(/Username/), "rina");
    await user.type(screen.getByLabelText(/Kata sandi/), "salah");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Username atau kata sandi salah");
  });

  it("sends the CSRF token with the login request", async () => {
    document.cookie = "csrftoken=token123";
    const spy = mockFetch(400, { code: "X", message: "x", fields: {} });
    const user = userEvent.setup();
    renderApp(<LoginPage />, { me: null, path: "/masuk" });
    await user.type(screen.getByLabelText(/Username/), "rina");
    await user.type(screen.getByLabelText(/Kata sandi/), "rahasia");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-CSRFToken"]).toBe("token123");
  });

  it("redirects away when already signed in", () => {
    renderApp(<LoginPage />, { me: baseMe, path: "/masuk" });
    expect(screen.queryByRole("button", { name: "Masuk" })).not.toBeInTheDocument();
  });
});
