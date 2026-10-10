import { Menu, ShieldCheck } from "lucide-react";
import { Suspense, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { Breadcrumb, type Crumb } from "@/components/nav/Breadcrumb";
import { MobileDrawer } from "@/components/nav/MobileDrawer";
import { NavBar } from "@/components/nav/NavBar";
import { UserMenu } from "@/components/nav/UserMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { APP_CAPTION, APP_NAME } from "@/config";
import { routes } from "@/modules/registry";

function crumbsFor(pathname: string): Crumb[] {
  const route = routes.find((r) => r.path === pathname);
  if (!route || route.path === "/") return [];
  const items: Crumb[] = [{ label: "Beranda", to: "/" }];
  if (route.section) items.push({ label: route.section });
  items.push({ label: route.title });
  return items;
}

/** Kop + navbar dropdown (desktop) or drawer (< 1024 px). No sidebar. */
export function PortalShell() {
  const { me, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const crumbs = crumbsFor(pathname);
  const menu = me?.menu ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-ctl focus:bg-white focus:px-3 focus:py-2 focus:text-navy-800"
      >
        Lompat ke konten
      </a>
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-7">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/brand/siakadku-mark.svg" alt="" className="size-10 shrink-0 rounded-[10px] ring-1 ring-white/30" />
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold tracking-[0.08em] text-white/70">{APP_CAPTION}</span>
              <span className="block truncate font-serif text-[19px] font-semibold leading-tight">{APP_NAME}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden min-h-10 items-center gap-2 rounded-ctl border border-white/30 px-3.5 text-[13px] font-medium hover:bg-white/10 md:inline-flex"
              >
                <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" /> Panel Admin
              </Link>
            )}
            <UserMenu />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu"
              aria-haspopup="dialog"
              className="grid size-11 place-items-center rounded-ctl hover:bg-white/10 lg:hidden"
            >
              <Menu className="size-6" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <NavBar menu={menu} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} menu={menu} />
      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none sm:px-7">
        {crumbs.length > 0 && <Breadcrumb items={crumbs} />}
        <Suspense fallback={<Skeleton lines={5} />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line py-4 text-center text-[12.5px] text-text-3">
        {APP_NAME} · kerangka sample v0.1 · data fiktif
      </footer>
    </div>
  );
}
