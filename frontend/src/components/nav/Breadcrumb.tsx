import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export type Crumb = { label: string; to?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Jejak halaman" className="mb-3 text-[13px] text-slate-600">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="text-navy-700 underline-offset-2 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
