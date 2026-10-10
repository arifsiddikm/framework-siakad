import { ExternalLink, Lock } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { MenuNode } from "@/auth/AuthProvider";
import { NamedIcon } from "@/lib/icons";
import { isExternal } from "@/lib/format";
import { cn } from "@/lib/cn";
import { isActivePath } from "@/components/nav/paths";

type Props = { node: MenuNode; onNavigate: () => void; variant: "panel" | "drawer" };

/** One leaf of the menu: internal link, external link, or a locked item (module off). */
export function MenuItem({ node, onNavigate, variant }: Props) {
  const { pathname } = useLocation();
  const active = !node.locked && isActivePath(pathname, node.to);
  const external = isExternal(node.to);

  const content =
    variant === "panel" ? (
      <>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-ctl",
            node.locked ? "bg-amber-50 text-amber-800" : active ? "bg-navy-700 text-white" : "bg-navy-50 text-navy-700",
          )}
        >
          <NamedIcon name={node.icon} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-text">{node.title}</span>
          <span className={cn("block text-[12.5px]", node.locked ? "text-amber-800" : "text-slate-600")}>
            {node.locked ? "Modul belum aktif di kampus Anda" : node.hint}
          </span>
        </span>
        {node.locked && <Lock className="size-4 shrink-0 text-amber-700" strokeWidth={1.75} aria-label="Terkunci" />}
        {external && <ExternalLink className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-label="Tautan luar" />}
      </>
    ) : (
      <>
        <span className="flex-1">{node.title}</span>
        {node.locked && <Lock className="size-4 text-amber-700" strokeWidth={1.75} aria-label="Terkunci" />}
        {external && <ExternalLink className="size-4 text-slate-500" strokeWidth={1.75} aria-label="Tautan luar" />}
      </>
    );

  const className =
    variant === "panel"
      ? cn("flex items-center gap-3 rounded-ctl px-3 py-2.5 hover:bg-slate-50", active && "bg-navy-50")
      : cn(
          "flex min-h-11 items-center gap-2 rounded-ctl px-3 text-[15px]",
          node.locked ? "text-amber-800" : active ? "font-semibold text-navy-800" : "text-slate-800",
        );

  if (external) {
    return (
      <a href={node.to} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>
        {content}
      </a>
    );
  }
  return (
    <Link
      to={node.locked ? "/modul-belum-aktif" : node.to}
      className={className}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}
