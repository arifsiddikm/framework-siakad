import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseShortcode, RichText } from "@/lib/richtext";
import { slugify } from "@/lib/slug";

describe("RichText", () => {
  it("renders headings, lists, bold, and https links", () => {
    render(<RichText text={"# Judul\n\nParagraf **tebal** dan [situs](https://contoh.ac.id).\n\n- satu\n- dua"} />);
    expect(screen.getByRole("heading", { name: "Judul" })).toBeInTheDocument();
    expect(screen.getByText("tebal").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "situs" })).toHaveAttribute("href", "https://contoh.ac.id");
    expect(screen.getByRole("link", { name: "situs" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("never turns typed HTML or javascript: links into markup", () => {
    const { container } = render(<RichText text={'<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[klik](javascript:alert(1))'} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
    expect(container.textContent).toContain("[klik](javascript:alert(1))");
  });
});

describe("RichText (extended format)", () => {
  it("keeps single line breaks, and renders quotes, ordered lists, rules, images and tables", () => {
    const { container } = render(
      <RichText text={"baris satu\nbaris dua\n\n> kutipan\n\n1. a\n2. b\n\n---\n\n![gedung](https://x.ac.id/a.png)\n\n| Nama | Nilai |\n|---|---|\n| Budi | 90 |\n| *Ani* | **95** |"} />,
    );
    expect(container.querySelector("br")).not.toBeNull();
    expect(container.querySelector("blockquote")?.textContent).toBe("kutipan");
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("hr")).not.toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://x.ac.id/a.png");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(container.querySelector("tbody em")?.textContent).toBe("Ani");
  });

  it("refuses http images and javascript: image sources", () => {
    const { container } = render(<RichText text={"![x](http://tidak-aman.ac.id/a.png)\n\n![y](javascript:alert(1))"} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Panduan KRS & Nilai!")).toBe("panduan-krs-nilai");
    expect(slugify("  Café Müller  ")).toBe("cafe-muller");
    expect(slugify("x".repeat(80))).toHaveLength(60);
  });
});

describe("snippet shortcodes", () => {
  it("parses names, nested names, and key=value params (quoted or not)", () => {
    expect(parseShortcode("[snippet:pages.data_ijazah]")).toEqual({ name: "pages.data_ijazah", params: {} });
    expect(parseShortcode('[snippet:pages.data_ijazah.upload_form limit=5 status="Siap diambil"]')).toEqual({
      name: "pages.data_ijazah.upload_form",
      params: { limit: "5", status: "Siap diambil" },
    });
  });
  it("accepts the bare form only for snippets that exist, and never hijacks links or normal brackets", () => {
    expect(parseShortcode("[pages.data_ijazah]")?.name).toBe("pages.data_ijazah");
    expect(parseShortcode("[pages.tidak_ada]")).toBeNull();
    expect(parseShortcode("[teks](https://x.ac.id)")).toBeNull();
    expect(parseShortcode("[catatan penting]")).toBeNull();
    expect(parseShortcode("[snippet:Bad Name]")).toBeNull();
    expect(parseShortcode("teks [snippet:pages.data_ijazah] di tengah")).toBeNull();
  });
});
