import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NavBar } from "@/components/nav/NavBar";
import { node, renderApp } from "@/test/utils";

const menu = [
  node(1, "Beranda", "/"),
  node(2, "Akademik", "", [node(21, "Data mahasiswa", "/mahasiswa"), node(22, "Evaluasi dosen", "/evaluasi", [], true)]),
  node(3, "Administrasi", "", [node(31, "Pengguna", "/admin/pengguna")]),
];

describe("NavBar", () => {
  it("renders top-level links and collapsed dropdown triggers", () => {
    renderApp(<NavBar menu={menu} />);
    expect(screen.getByRole("link", { name: "Beranda" })).toHaveAttribute("href", "/");
    const trigger = screen.getByRole("button", { name: "Akademik" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(screen.queryByRole("link", { name: /Data mahasiswa/ })).not.toBeInTheDocument();
  });

  it("opens on click, shows only one panel, and closes with Escape returning focus", async () => {
    const user = userEvent.setup();
    renderApp(<NavBar menu={menu} />);
    const akademik = screen.getByRole("button", { name: "Akademik" });
    await user.click(akademik);
    expect(akademik).toHaveAttribute("aria-expanded", "true");
    expect(akademik).toHaveAttribute("aria-controls");
    expect(screen.getByRole("link", { name: /Data mahasiswa/ })).toHaveAttribute("href", "/mahasiswa");

    await user.click(screen.getByRole("button", { name: "Administrasi" }));
    expect(akademik).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: /Pengguna/ })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: /Pengguna/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Administrasi" })).toHaveFocus();
  });

  it("opens with ArrowDown and moves focus between items", async () => {
    const user = userEvent.setup();
    renderApp(<NavBar menu={menu} />);
    screen.getByRole("button", { name: "Akademik" }).focus();
    await user.keyboard("{ArrowDown}");
    const first = await screen.findByRole("link", { name: /Data mahasiswa/ });
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: /Evaluasi dosen/ })).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <NavBar menu={menu} />
        <p>Konten</p>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Akademik" }));
    await user.click(screen.getByText("Konten"));
    expect(screen.getByRole("button", { name: "Akademik" })).toHaveAttribute("aria-expanded", "false");
  });

  it("sends a locked item to the 'module not active' page", async () => {
    const user = userEvent.setup();
    renderApp(<NavBar menu={menu} />);
    await user.click(screen.getByRole("button", { name: "Akademik" }));
    expect(screen.getByRole("link", { name: /Evaluasi dosen/ })).toHaveAttribute("href", "/modul-belum-aktif");
    expect(screen.getByText("Modul belum aktif di kampus Anda")).toBeInTheDocument();
  });

  it("marks the current page", () => {
    renderApp(<NavBar menu={menu} />, { path: "/mahasiswa" });
    expect(screen.getByRole("button", { name: "Akademik" }).className).toContain("border-white");
  });
});
