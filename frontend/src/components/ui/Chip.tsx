import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  navy: "bg-navy-100 text-navy-800",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
};
const dots = { neutral: "bg-slate-500", navy: "bg-navy-600", green: "bg-green-600", amber: "bg-amber-700", red: "bg-red-600" };

/** Status is never colour alone: text + optional dot. */
export function Chip({ tone = "neutral", dot, children }: { tone?: keyof typeof tones; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium", tones[tone])}>
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
