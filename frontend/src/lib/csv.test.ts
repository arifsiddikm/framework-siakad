import { describe, expect, it } from "vitest";
import { parseDelimited } from "@/lib/csv";

describe("parseDelimited", () => {
  it("reads tab-separated text pasted from a spreadsheet", () => {
    expect(parseDelimited("Nama\tSKS\nBasis Data\t3\nWeb\t4")).toEqual([["Nama", "SKS"], ["Basis Data", "3"], ["Web", "4"]]);
  });
  it("reads semicolon and comma files, quotes, and skips blank lines", () => {
    expect(parseDelimited('a;b\n"x;y";2\n\n')).toEqual([["a", "b"], ["x;y", "2"]]);
    expect(parseDelimited('a,b\n"satu, dua","dia bilang ""hai"""')).toEqual([["a", "b"], ["satu, dua", 'dia bilang "hai"']]);
  });
  it("returns nothing for empty input", () => {
    expect(parseDelimited("  \n ")).toEqual([]);
  });
});
