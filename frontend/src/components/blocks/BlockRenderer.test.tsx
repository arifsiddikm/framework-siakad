import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { ApiError } from "@/lib/api";
import type { Block } from "@/lib/blocks";
import { renderApp } from "@/test/utils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(async (path: string) => {
        if (path.startsWith("/snippets/pages.data_ijazah.upload_form/")) return { data: { nama_pengunggah: "Rina", maks_mb: Number(new URLSearchParams(path.split("?")[1]).get("maks_mb")) } };
        if (path.startsWith("/snippets/pages.data_ijazah/")) return { data: { rows: [{ nomor: "IJZ-1", nama: "Aulia Rahmawati", prodi: "TI", status: "Siap diambil" }], total: 1 } };
        throw new Error("unexpected " + path);
      }),
    },
  };
});

const loader = vi.fn();

describe("BlockRenderer", () => {
  it("renders the static block types", () => {
    const blocks: Block[] = [
      { id: "1", type: "text", text: "# Selamat" },
      { id: "2", type: "callout", tone: "warn", text: "Batas daftar ulang 31 Oktober" },
      { id: "3", type: "table", title: "Tarif", columns: ["Jenis", "Biaya"], rows: [["SPP", "5.000.000"]] },
      { id: "4", type: "accordion", title: "FAQ", items: [{ title: "Apa itu KRS?", text: "Kartu Rencana Studi." }] },
      { id: "5", type: "links", title: "", items: [{ label: "Situs kampus", url: "https://kampus.ac.id" }, { label: "Beranda", url: "/" }] },
      { id: "6", type: "image", url: "https://x.ac.id/a.png", alt: "Gedung", caption: "Gedung A" },
    ];
    renderApp(<BlockRenderer blocks={blocks} loadData={loader} />);
    expect(screen.getByRole("heading", { name: "Selamat" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Batas daftar ulang");
    expect(screen.getByRole("columnheader", { name: "Biaya" })).toBeInTheDocument();
    expect(screen.getByText("Apa itu KRS?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Situs kampus/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Beranda" })).toHaveAttribute("href", "/");
    expect(screen.getByAltText("Gedung")).toBeInTheDocument();
    expect(loader).not.toHaveBeenCalled();
  });

  it("loads data blocks through the loader and formats cells, stats, and bars", async () => {
    const answers: Record<string, unknown> = {
      t: { columns: [{ name: "nama", label: "Nama", type: "text" }, { name: "sks", label: "SKS", type: "number" }, { name: "tgl", label: "Tanggal", type: "date" }], rows: [{ nama: "Basis Data", sks: 3000, tgl: "2026-10-20" }], total: 5 },
      s: { items: [{ label: "Total biaya", value: 1250000, format: "rupiah" }, { label: "Lulus", value: 87.5, format: "persen" }] },
      c: { bars: [{ label: "A1", value: 5 }, { label: "B2", value: 2.5 }] },
    };
    const blocks: Block[] = [
      { id: "t", type: "data_table", title: "Jadwal", dataset: "d", columns: ["nama"], sort: "", direction: "asc", limit: 10, filters: [] },
      { id: "s", type: "stats", title: "Ringkasan", items: [{ label: "x", dataset: "d", aggregate: "count", field: "", format: "angka", filters: [] }] },
      { id: "c", type: "chart", title: "Per ruang", dataset: "d", group_by: "r", aggregate: "count", field: "", limit: 5, filters: [] },
    ];
    renderApp(<BlockRenderer blocks={blocks} loadData={async (b) => answers[b.id]} />);
    expect(await screen.findByText("Basis Data")).toBeInTheDocument();
    expect(screen.getByText("3.000")).toBeInTheDocument();
    expect(screen.getByText(/20 Oktober 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 1 dari 5 baris/)).toBeInTheDocument();
    expect(await screen.findByText("Rp 1.250.000")).toBeInTheDocument();
    expect(screen.getByText("87,5%")).toBeInTheDocument();
    expect(await screen.findByText("A1")).toBeInTheDocument();
  });

  it("shows a notice (not a crash) when the server refuses a block's data", async () => {
    const blocks: Block[] = [
      { id: "t", type: "data_table", title: "Rahasia", dataset: "d", columns: ["a"], sort: "", direction: "asc", limit: 10, filters: [] },
      { id: "x", type: "text", text: "Teks tetap tampil" },
    ];
    renderApp(<BlockRenderer blocks={blocks} loadData={async () => { throw new ApiError(403, "PERMISSION_DENIED", "ditolak"); }} />);
    expect(await screen.findByText(/tidak memiliki akses ke data ini/)).toBeInTheDocument();
    expect(screen.getByText("Teks tetap tampil")).toBeInTheDocument();
  });

  it("renders a snippet block with params and server data, and warns when the file is missing", async () => {
    const blocks: Block[] = [
      { id: "k", type: "snippet", name: "pages.data_ijazah", params: { judul: "Ijazah saya" } },
      { id: "h", type: "snippet", name: "pages.tidak_ada", params: {} },
    ];
    renderApp(<BlockRenderer blocks={blocks} loadData={loader} />);
    expect(await screen.findByText("Ijazah saya")).toBeInTheDocument();
    expect(await screen.findByText("Aulia Rahmawati")).toBeInTheDocument();
    expect(screen.getByText(/tidak ada di aplikasi ini/)).toBeInTheDocument();
  });

  it("a snippet shortcode on its own line inside a text block renders the snippet; other bracket text stays text", async () => {
    const blocks: Block[] = [{ id: "t", type: "text", text: "Pengantar\n\n[snippet:pages.data_ijazah.upload_form maks_mb=8]\n\n[bukan snippet] dan [link](https://x.ac.id)" }];
    renderApp(<BlockRenderer blocks={blocks} loadData={loader} />);
    expect(await screen.findByText(/format PDF, maksimal 8 MB/)).toBeInTheDocument();
    expect(screen.getByText(/\[bukan snippet\]/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "link" })).toBeInTheDocument();
  });

  it("says so when a page has no blocks", () => {
    renderApp(<BlockRenderer blocks={[]} loadData={loader} />);
    expect(screen.getByText("Halaman ini belum memiliki isi.")).toBeInTheDocument();
  });
});
