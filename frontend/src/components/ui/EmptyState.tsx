import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-navy-50 text-navy-700">
        <Inbox className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-md text-text-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
