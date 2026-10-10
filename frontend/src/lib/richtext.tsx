import type { ReactNode } from "react";
import { SnippetView } from "@/components/blocks/SnippetView";
import { snippets } from "@/snippets/registry";

/**
 * Safe renderer for text blocks written in the admin panel. React escapes every string, so nothing the
 * admin types can inject HTML or script. Supported (one per line unless noted):
 *   # Judul  ·  ## Sub judul  ·  - butir  ·  1. butir bernomor  ·  > kutipan  ·  ---  (garis)
 *   ![keterangan](https://gambar)  ·  tabel dengan | a | b |  (baris ke-2: |---|---|)
 *   inline: **tebal**  ·  *miring*  ·  `kode`  ·  [teks](https://alamat)
 *   snippet (on its own line):  [snippet:pages.data_ijazah]  ·  [snippet:pages.data_ijazah limit=5 status="Siap diambil"]
 *   (the bare form [pages.data_ijazah] also works when that snippet file exists)
 * A single line break inside a paragraph is kept; a blank line starts a new paragraph.
 */
const SHORTCODE = /^\[(snippet:)?([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){0,5})((?:\s+[a-z][a-z0-9_]*=(?:"[^"]*"|\S+))*)\s*\]$/;
const PAIR = /([a-z][a-z0-9_]*)=(?:"([^"]*)"|(\S+))/g;

/** Parses a whole-line shortcode; null when the line is not one (so normal text and links are untouched). */
// eslint-disable-next-line react-refresh/only-export-components
export function parseShortcode(line: string): { name: string; params: Record<string, string> } | null {
  const m = SHORTCODE.exec(line);
  if (!m || (!m[1] && !snippets[m[2]])) return null;
  const params: Record<string, string> = {};
  for (const pair of m[3].matchAll(PAIR)) params[pair[1]] = pair[2] ?? pair[3];
  return { name: m[2], params };
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-700 underline underline-offset-2">
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSeparator = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  const key = () => blocks.length;
  const flush = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={key()}>
        {paragraph.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {inline(line)}
          </span>
        ))}
      </p>,
    );
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const shortcode = line.startsWith("[") ? parseShortcode(line) : null;
    if (!line) {
      flush();
    } else if (shortcode) {
      flush();
      blocks.push(<SnippetView key={key()} name={shortcode.name} params={shortcode.params} />);
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push(<h3 key={key()} className="pt-2 text-[17px] font-semibold text-navy-900">{inline(line.slice(3))}</h3>);
    } else if (line.startsWith("# ")) {
      flush();
      blocks.push(<h2 key={key()} className="pt-2 text-[21px] font-semibold text-navy-900">{inline(line.slice(2))}</h2>);
    } else if (/^---+$/.test(line)) {
      flush();
      blocks.push(<hr key={key()} className="border-line" />);
    } else if (line.startsWith("> ")) {
      flush();
      const quote = [line.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("> ")) quote.push(lines[++i].trim().slice(2));
      blocks.push(<blockquote key={key()} className="border-l-4 border-navy-300 bg-navy-50 px-4 py-2 italic text-slate-700">{inline(quote.join(" "))}</blockquote>);
    } else if (/^!\[[^\]]*\]\(https:\/\/[^)\s]+\)$/.test(line)) {
      flush();
      const m = /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/.exec(line)!;
      blocks.push(<img key={key()} src={m[2]} alt={m[1]} loading="lazy" className="max-h-[480px] w-full rounded-card border border-line object-contain" />);
    } else if (/^[-*] /.test(line)) {
      flush();
      const items = [line.slice(2)];
      while (i + 1 < lines.length && /^[-*] /.test(lines[i + 1].trim())) items.push(lines[++i].trim().slice(2));
      blocks.push(<ul key={key()} className="list-disc space-y-1 pl-6">{items.map((it, n) => <li key={n}>{inline(it)}</li>)}</ul>);
    } else if (/^\d+\. /.test(line)) {
      flush();
      const items = [line.replace(/^\d+\. /, "")];
      while (i + 1 < lines.length && /^\d+\. /.test(lines[i + 1].trim())) items.push(lines[++i].trim().replace(/^\d+\. /, ""));
      blocks.push(<ol key={key()} className="list-decimal space-y-1 pl-6">{items.map((it, n) => <li key={n}>{inline(it)}</li>)}</ol>);
    } else if (line.startsWith("|") && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      flush();
      const head = cells(line);
      i += 1;
      const body: string[][] = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) body.push(cells(lines[++i]));
      blocks.push(
        <div key={key()} className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead><tr className="bg-slate-50">{head.map((h, n) => <th key={n} className="px-3 py-2 font-semibold">{inline(h)}</th>)}</tr></thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r} className="border-t border-line">{head.map((_, c) => <td key={c} className="px-3 py-2">{inline(row[c] ?? "")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return <div className="space-y-3 text-[15px] leading-relaxed text-slate-800">{blocks}</div>;
}
