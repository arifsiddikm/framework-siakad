/** Parse pasted spreadsheet text (tab, semicolon or comma separated; "quoted, cells" supported). */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  const first = clean.split("\n", 1)[0];
  const delimiter = ["\t", ";", ","].find((d) => first.includes(d)) ?? ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ""));
}
