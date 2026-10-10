import { describe, expect, it } from "vitest";
import { firstName, greeting, isExternal } from "@/lib/format";

describe("format", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 9, 9, 8))).toBe("Selamat pagi");
    expect(greeting(new Date(2026, 9, 9, 13))).toBe("Selamat siang");
    expect(greeting(new Date(2026, 9, 9, 16))).toBe("Selamat sore");
    expect(greeting(new Date(2026, 9, 9, 20))).toBe("Selamat malam");
  });

  it("skips academic titles when picking a first name", () => {
    expect(firstName("Rizky Aditya Pratama")).toBe("Rizky");
    expect(firstName("Dr. Hendra Wijaya, M.Kom.")).toBe("Hendra");
    expect(firstName("Prof. Budi Santoso")).toBe("Budi");
  });

  it("detects external links", () => {
    expect(isExternal("https://kampus.ac.id")).toBe(true);
    expect(isExternal("/profil")).toBe(false);
  });
});
