import { formatDate, formatNumber } from "@/lib/format";

/** Display text of one cell by column type (shared by data tables on pages and in the admin grid). */
export function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "Ya" : "Tidak";
  if (type === "number" && typeof value === "number") return formatNumber(value);
  if (type === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
  return String(value);
}
