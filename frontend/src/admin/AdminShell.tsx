import { ChevronDown, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, matchPath, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { useLogout } from "@/auth/useLogout";
import { useDismiss } from "@/components/nav/useDismiss";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminNav, isNavGroup, visibleNav, type AdminNavGroup, type AdminNavLink } from "@/admin/nav";
import { adminRoutes } from "@/admin/routes";
import { APP_NAME } from "@/config";
import { cn } from "@/lib/cn";

function SidebarLink({ item, nested, onNavigate }: { item: AdminNavLink; nested?: boolean; onNavigate?: () => void }) {
  const { to, label, icon: Icon, end } = item;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-ctl border-l-[3px] px-3 text-[14px] font-medium transition-colors",
          nested && "ml-3",
          isActive ? "border-white bg-white/10 text-white" : "border-transparent text-white/80 hover:bg-white/5 hover:text-white",
        )
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      {label}
    </NavLink>
  );
}

/** Category with a dropdown of links. Opens by click/keyboard; stays open while one of its pages is active. */
function SidebarGroup({ group, onNavigate }: { group: AdminNavGroup; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const hasActive = group.children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? hasActive;
  const listId = useId();
  const Icon = group.icon;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setManual(!open)}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-ctl border-l-[3px] border-transparent px-3 text-left text-[14px] font-medium transition-colors hover:bg-white/5 hover:text-white",
          hasActive && !open ? "text-white" : "text-white/80",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex-1">{group.label}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="mt-1 space-y-1">
          {group.children.map((child) => (
            <li key={child.to}>
              <SidebarLink item={child} nested onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const entries = visibleNav(adminNav, can);
  return (
    <div className="flex h-full flex-col bg-navy-900 text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <img src="/brand/siakadku-mark.svg" alt="" className="size-9 rounded-lg ring-1 ring-white/30" />
        <div className="leading-tight">
          <p className="font-serif text-[17px] font-semibold">{APP_NAME}</p>
          <p className="text-[10.5px] font-semibold tracking-[0.1em] text-white/70">PANEL ADMIN</p>
        </div>
      </div>
      <nav aria-label="Menu admin" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.1em] text-white/60">PENGATURAN</p>
        <ul className="space-y-1">
          {entries.map((entry) =>
            isNavGroup(entry) ? (
              <SidebarGroup key={entry.label} group={entry} onNavigate={onNavigate} />
            ) : (
              <li key={entry.to}>
                <SidebarLink item={entry} onNavigate={onNavigate} />
              </li>
            ),
          )}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-ctl px-3 text-[14px] text-white/80 hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /> Buka portal pengguna
        </Link>
      </div>
    </div>
  );
}

/** Admin panel frame: fixed left sidebar (drawer on phones) + top bar + content. */
export function AdminShell() {
  const { me } = useAuth();
  const { pathname } = useLocation();
  const logout = useLogout("admin");
  const [drawer, setDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuOpen, closeMenu, menuRef);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const title = adminRoutes.find((r) => matchPath({ path: r.path, end: true }, pathname))?.title ?? "Panel admin";

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Menu admin" className="absolute inset-y-0 right-0 w-72 max-w-[85%]">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Tutup menu" className="absolute right-2 top-3 z-10 grid size-11 place-items-center rounded-ctl text-white hover:bg-white/10">
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-navy-900">{title}</p>
        </div>
        <div className="flex items-center gap-1">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100"
          >
            <span className="grid size-9 place-items-center rounded-full bg-navy-700 text-[12.5px] font-semibold text-white">{me?.user.initials}</span>
            <span className="hidden md:block">
              <span className="block max-w-48 truncate text-[14px] font-semibold leading-tight">{me?.user.full_name}</span>
              <span className="block max-w-48 truncate text-[12.5px] leading-tight text-text-2">{me?.roles.map((r) => r.name).join(", ")}</span>
            </span>
            <ChevronDown className="hidden size-4 md:block" strokeWidth={1.75} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-[0_12px_32px_rgba(11,31,75,.18)]">
              <Link to="/" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-ctl px-3 text-[14px] hover:bg-slate-50">
                <ExternalLink className="size-[18px] text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Buka portal pengguna
              </Link>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-ctl px-3 text-[14px] text-red-700 hover:bg-red-50"
                onClick={() => {
                  closeMenu();
                  void logout();
                }}
              >
                <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /> Keluar
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setDrawer(true)} aria-label="Buka menu admin" aria-haspopup="dialog" className="grid size-11 place-items-center rounded-ctl hover:bg-slate-100 lg:hidden">
          <Menu className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
        <Suspense fallback={<Skeleton lines={5} />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
