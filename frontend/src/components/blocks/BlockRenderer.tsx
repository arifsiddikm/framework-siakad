import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { Note } from "@/components/ui/Note";
import { Skeleton } from "@/components/ui/Skeleton";
import { type Block, DATA_BLOCKS } from "@/lib/blocks";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, isExternal } from "@/lib/format";
import { RichText } from "@/lib/richtext";
import { formatCell } from "@/components/blocks/cell";
import { SnippetView } from "@/components/blocks/SnippetView";

type Loader = (block: Block) => Promise<unknown>;
type Column = { name: string; label: string; type: string };
type TableData = { columns: Column[]; rows: Record<string, unknown>[]; total: number };
type StatsData = { items: { label: string; value: number | string | null; format: string }[] };
type ChartData = { bars: { label: string; value: number }[] };

function Title({ text }: { text: string }) {
  return text ? <h2 className="mb-3 text-[17px] font-semibold text-navy-900">{text}</h2> : null;
}

function formatStat(value: number | string | null, format: string): string {
  if (value === null) return "—";
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value) : value;
  const rounded = Math.round(value * 100) / 100;
  if (format === "rupiah") return `Rp ${formatNumber(rounded)}`;
  if (format === "persen") return `${formatNumber(rounded)}%`;
  return formatNumber(rounded);
}

/** Loads the data of a data block; a refused block shows its own notice and never breaks the page. */
function useBlockData<T>(block: Block, loader: Loader) {
  return useQuery({ queryKey: ["block-data", block.id, JSON.stringify(block)], queryFn: () => loader(block) as Promise<T>, retry: false });
}

function DataState({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 403) return <Note tone="warn">Anda tidak memiliki akses ke data ini. Hubungi administrator bila Anda memerlukannya.</Note>;
  return <Note tone="error">{error instanceof ApiError ? error.message : "Data tidak dapat dimuat. Muat ulang halaman ini."}</Note>;
}

function DataTableBlock({ block, loader }: { block: Extract<Block, { type: "data_table" }>; loader: Loader }) {
  const query = useBlockData<TableData>(block, loader);
  return (
    <section>
      <Title text={block.title} />
      {query.isLoading ? (
        <div className="rounded-card border border-line bg-surface"><Skeleton lines={4} /></div>
      ) : query.isError || !query.data ? (
        <DataState error={query.error} />
      ) : query.data.rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-text-2">Belum ada data.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[14px]">
              <thead>
                <tr className="bg-slate-50 text-[12.5px] uppercase tracking-wide text-slate-600">
                  {query.data.columns.map((c) => <th key={c.name} scope="col" className={cn("px-4 py-2.5 font-semibold", c.type === "number" && "text-right")}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line odd:bg-white even:bg-slate-50/50">
                    {query.data.columns.map((c) => <td key={c.name} className={cn("px-4 py-2.5", c.type === "number" && "text-right tabular-nums")}>{formatCell(row[c.name], c.type)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.total > query.data.rows.length && (
            <p className="border-t border-line px-4 py-2 text-[12.5px] text-text-3">Menampilkan {query.data.rows.length} dari {formatNumber(query.data.total)} baris.</p>
          )}
        </div>
      )}
    </section>
  );
}

function StatsBlock({ block, loader }: { block: Extract<Block, { type: "stats" }>; loader: Loader }) {
  const query = useBlockData<StatsData>(block, loader);
  return (
    <section>
      <Title text={block.title} />
      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{block.items.map((_, i) => <div key={i} className="h-24 animate-pulse rounded-card bg-slate-100" />)}</div>
      ) : query.isError || !query.data ? (
        <DataState error={query.error} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.items.map((item, i) => (
            <div key={i} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <p className="text-text-2">{item.label}</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight text-navy-900 tabular-nums">{formatStat(item.value, item.format)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChartBlock({ block, loader }: { block: Extract<Block, { type: "chart" }>; loader: Loader }) {
  const query = useBlockData<ChartData>(block, loader);
  const max = Math.max(1, ...(query.data?.bars.map((b) => b.value) ?? [1]));
  return (
    <section>
      <Title text={block.title} />
      {query.isLoading ? (
        <div className="rounded-card border border-line bg-surface"><Skeleton lines={4} /></div>
      ) : query.isError || !query.data ? (
        <DataState error={query.error} />
      ) : query.data.bars.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-text-2">Belum ada data.</p>
      ) : (
        <ul className="space-y-3 rounded-card border border-line bg-surface p-4 sm:p-5" aria-label={block.title || "Grafik batang"}>
          {query.data.bars.map((bar) => (
            <li key={bar.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="min-w-0 truncate font-medium">{bar.label}</span>
                <span className="tabular-nums text-slate-700">{formatNumber(Math.round(bar.value * 100) / 100)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-navy-50">
                <div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.max(2, (bar.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StaticBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <RichText text={block.text} />;
    case "image":
      return (
        <figure>
          <img src={block.url} alt={block.alt} loading="lazy" className="max-h-[520px] w-full rounded-card border border-line object-contain" />
          {block.caption && <figcaption className="mt-1.5 text-center text-[13px] text-text-3">{block.caption}</figcaption>}
        </figure>
      );
    case "callout":
      return <Note tone={block.tone}><span className="whitespace-pre-line">{block.text}</span></Note>;
    case "table":
      return (
        <section>
          <Title text={block.title} />
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <thead><tr className="bg-slate-50 text-[12.5px] uppercase tracking-wide text-slate-600">{block.columns.map((c, i) => <th key={i} scope="col" className="px-4 py-2.5 font-semibold">{c}</th>)}</tr></thead>
              <tbody>{block.rows.map((row, r) => <tr key={r} className="border-t border-line">{row.map((cell, c) => <td key={c} className="px-4 py-2.5">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      );
    case "accordion":
      return (
        <section>
          <Title text={block.title} />
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {block.items.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  {item.title}
                  <span aria-hidden="true" className="text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="whitespace-pre-line px-4 pb-4 text-slate-700">{item.text}</div>
              </details>
            ))}
          </div>
        </section>
      );
    case "links":
      return (
        <section>
          <Title text={block.title} />
          <div className="flex flex-wrap gap-2.5">
            {block.items.map((item, i) => {
              const cls = "inline-flex min-h-11 items-center gap-2 rounded-ctl bg-navy-700 px-5 font-medium text-white hover:bg-navy-800";
              return isExternal(item.url) ? (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className={cls}>{item.label}<ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" /></a>
              ) : (
                <Link key={i} to={item.url} className={cls}>{item.label}</Link>
              );
            })}
          </div>
        </section>
      );
    default:
      return null;
  }
}

/** Renders a page's blocks. `loadData` fetches the numbers of data blocks (portal: saved page; editor: preview). */
export function BlockRenderer({ blocks, loadData }: { blocks: Block[]; loadData: Loader }) {
  if (blocks.length === 0) return <p className="text-text-2">Halaman ini belum memiliki isi.</p>;
  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        if (block.type === "snippet") return <SnippetView key={block.id} name={block.name} params={block.params} />;
        if (!DATA_BLOCKS.includes(block.type)) return <StaticBlock key={block.id} block={block} />;
        if (block.type === "data_table") return <DataTableBlock key={block.id} block={block} loader={loadData} />;
        if (block.type === "stats") return <StatsBlock key={block.id} block={block} loader={loadData} />;
        if (block.type === "chart") return <ChartBlock key={block.id} block={block} loader={loadData} />;
        return null;
      })}
    </div>
  );
}
