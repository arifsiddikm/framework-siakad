import { ChevronDown, LogOut, ShieldCheck, User, UserCog, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth, type MenuNode } from "@/auth/AuthProvider";
import { useLogout } from "@/auth/useLogout";
import { MenuItem } from "@/components/nav/MenuItem";
import { isNodeActive } from "@/components/nav/paths";
import { cn } from "@/lib/cn";
import { isExternal } from "@/lib/format";
import { NamedIcon } from "@/lib/icons";
import { APP_NAME } from "@/config";

const row = "flex min-h-11 w-full items-center gap-3 rounded-ctl px-3 text-[15px] text-slate-800 hover:bg-slate-50";

type Props = { open: boolean; onClose: () => void; menu: MenuNode[] };

/** Menu for < 1024 px: a drawer with accordions. Esc closes; focus stays inside while open. */
export function MobileDrawer({ open, onClose, menu }: Props) {
  const { me, isAdmin } = useAuth();
  const logout = useLogout("portal");
  const { pathname } = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open || !me) return null;
  const isOpen = (node: MenuNode) => expanded.has(node.id) || isNodeActive(node, pathname);
  const toggle = (node: MenuNode) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isOpen(node)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="absolute inset-y-0 right-0 flex w-[88%] max-w-[390px] flex-col bg-white shadow-xl"
      >
        <div className="bg-navy-900 px-4 pb-4 pt-3 text-white">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[17px] font-semibold">{APP_NAME}</span>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup menu" className="grid size-11 place-items-center rounded-ctl hover:bg-white/10">
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-navy-600 text-[13px] font-semibold">{me.user.initials}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{me.user.full_name}</p>
              <p className="truncate text-[12.5px] text-white/75">{me.roles.map((r) => r.name).join(", ") || me.user.username}</p>
            </div>
          </div>
        </div>

        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {menu.map((node) => {
              const active = isNodeActive(node, pathname);
              if (node.children.length === 0) {
                return (
                  <li key={node.id}>
                    {isExternal(node.to) ? (
                      <MenuItem node={node} variant="drawer" onNavigate={onClose} />
                    ) : (
                      <Link
                        to={node.to}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(row, active && "bg-navy-50 font-semibold text-navy-800")}
                      >
                        <NamedIcon name={node.icon} className="size-5 text-navy-700" />
                        {node.title}
                      </Link>
                    )}
                  </li>
                );
              }
              const expandedNow = isOpen(node);
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    aria-expanded={expandedNow}
                    onClick={() => toggle(node)}
                    className={cn(row, active && "bg-navy-50 font-semibold text-navy-800")}
                  >
                    <NamedIcon name={node.icon} className="size-5 text-navy-700" />
                    <span className="flex-1 text-left">{node.title}</span>
                    <ChevronDown className={cn("size-4 transition-transform", expandedNow && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  {expandedNow && (
                    <ul className="ml-5 mt-1 space-y-0.5 border-l border-line pl-3">
                      {node.children.map((child) => (
                        <li key={child.id}>
                          <MenuItem node={child} variant="drawer" onNavigate={onClose} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-line pt-3">
            {isAdmin && (
              <li>
                <Link to="/admin" className={cn(row, "font-medium text-navy-800")} onClick={onClose}>
                  <UserCog className="size-5 text-navy-700" strokeWidth={1.75} aria-hidden="true" /> Panel Admin
                </Link>
              </li>
            )}
            <li>
              <Link to="/profil" className={row} onClick={onClose}>
                <User className="size-5 text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Profil saya
              </Link>
            </li>
            <li>
              <Link to="/keamanan" className={row} onClick={onClose}>
                <ShieldCheck className="size-5 text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Keamanan akun
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={cn(row, "text-red-700 hover:bg-red-50")}
                onClick={() => {
                  onClose();
                  void logout();
                }}
              >
                <LogOut className="size-5" strokeWidth={1.75} aria-hidden="true" /> Keluar
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
