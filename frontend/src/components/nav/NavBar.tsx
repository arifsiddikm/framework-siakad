import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation } from "react-router";
import type { MenuNode } from "@/auth/AuthProvider";
import { MenuItem } from "@/components/nav/MenuItem";
import { isNodeActive } from "@/components/nav/paths";
import { useDismiss } from "@/components/nav/useDismiss";
import { cn } from "@/lib/cn";
import { isExternal } from "@/lib/format";

const topClass = (active: boolean, open = false) =>
  cn(
    "flex h-12 items-center gap-1.5 border-b-[3px] px-3.5 text-[14px] font-medium transition-colors",
    active ? "border-white text-white" : "border-transparent text-white/85 hover:text-white",
    open && "bg-white/10 text-white",
  );

/** Desktop navbar with dropdowns. Opens on click/Enter/Space, never on hover (WAI-ARIA disclosure). */
export function NavBar({ menu }: { menu: MenuNode[] }) {
  const { pathname } = useLocation();
  const [openId, setOpenId] = useState<number | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const triggers = useRef(new Map<number, HTMLButtonElement>());
  const focusFirst = useRef(false);
  const baseId = useId();

  const dismiss = useCallback(
    (via: "outside" | "escape") => {
      if (via === "escape" && openId !== null) triggers.current.get(openId)?.focus();
      setOpenId(null);
    },
    [openId],
  );
  useDismiss(openId !== null, dismiss, barRef);

  useEffect(() => {
    if (openId !== null && focusFirst.current) {
      focusFirst.current = false;
      barRef.current?.querySelector<HTMLElement>(`[data-panel="${openId}"] a`)?.focus();
    }
  }, [openId]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const panel = target.closest<HTMLElement>("[data-panel]");
    if (panel && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const links = Array.from(panel.querySelectorAll<HTMLElement>("a"));
      const index = links.indexOf(target.closest("a") as HTMLElement);
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      links[(next + links.length) % links.length]?.focus();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const items = Array.from(barRef.current?.querySelectorAll<HTMLElement>("[data-nav-item]") ?? []);
      const index = items.indexOf(target.closest("[data-nav-item]") as HTMLElement);
      if (index < 0) return;
      event.preventDefault();
      const nextItem = items[(index + (event.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
      const control = nextItem.querySelector<HTMLElement>("button, a");
      control?.focus();
      const nextId = Number(nextItem.dataset.navItem);
      setOpenId(openId !== null && control?.tagName === "BUTTON" ? nextId : null);
    }
  };

  return (
    <nav
      ref={barRef}
      aria-label="Menu utama"
      onKeyDown={onKeyDown}
      className="sticky top-0 z-40 hidden border-t border-white/10 bg-navy-900 text-white lg:block"
    >
      <ul className="mx-auto flex max-w-[1280px] px-4 sm:px-7">
        {menu.map((node) => {
          const active = isNodeActive(node, pathname);
          if (node.children.length === 0) {
            return (
              <li key={node.id} data-nav-item={node.id}>
                {isExternal(node.to) ? (
                  <a href={node.to} target="_blank" rel="noopener noreferrer" className={topClass(false)}>
                    {node.title}
                  </a>
                ) : (
                  <Link to={node.to} className={topClass(active)} aria-current={active ? "page" : undefined}>
                    {node.title}
                  </Link>
                )}
              </li>
            );
          }
          const open = openId === node.id;
          const panelId = `${baseId}-panel-${node.id}`;
          const columns = node.children.length > 6 ? 2 : 1;
          return (
            <li key={node.id} data-nav-item={node.id} className="relative">
              <button
                type="button"
                ref={(el) => {
                  if (el) triggers.current.set(node.id, el);
                  else triggers.current.delete(node.id);
                }}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => setOpenId(open ? null : node.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusFirst.current = true;
                    setOpenId(node.id);
                  }
                }}
                className={topClass(active, open)}
              >
                {node.title}
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {open && (
                <div
                  id={panelId}
                  data-panel={node.id}
                  className={cn(
                    "absolute left-0 top-full z-50 mt-2 max-w-[calc(100vw-32px)] rounded-xl border border-line bg-white p-2 text-text shadow-[0_12px_32px_rgba(11,31,75,.18)]",
                    columns === 2 ? "w-[660px]" : "w-[360px]",
                  )}
                >
                  <span aria-hidden="true" className="absolute -top-1.5 left-8 size-3 rotate-45 border-l border-t border-line bg-white" />
                  <ul className={cn("relative grid gap-0.5", columns === 2 && "grid-cols-2")}>
                    {node.children.map((child) => (
                      <li key={child.id}>
                        <MenuItem node={child} variant="panel" onNavigate={() => setOpenId(null)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
