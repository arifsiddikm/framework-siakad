import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: { box: "border-navy-200 bg-navy-50 text-navy-900", Icon: Info },
  success: { box: "border-green-600/30 bg-green-50 text-green-700", Icon: CircleCheck },
  warn: { box: "border-amber-500/40 bg-amber-50 text-amber-800", Icon: TriangleAlert },
  error: { box: "border-red-600/30 bg-red-50 text-red-700", Icon: CircleAlert },
};

export function Note({ tone = "info", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-ctl border px-3.5 py-3 text-[14px]", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
