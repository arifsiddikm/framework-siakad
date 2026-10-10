import type { ReactNode } from "react";
import { Note } from "@/components/ui/Note";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; className?: string };

type Props<T> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  empty: ReactNode;
  caption: string;
};

/** Four states: loading, error, empty, normal. */
export function DataTable<T>({ columns, rows, rowKey, loading, error, empty, caption }: Props<T>) {
  if (loading) return <Skeleton lines={4} />;
  if (error) return <div className="p-4"><Note tone="error">{error}</Note></div>;
  if (!rows || rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-slate-50 text-[12.5px] uppercase tracking-wide text-slate-600">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-4 py-2.5 font-semibold", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
