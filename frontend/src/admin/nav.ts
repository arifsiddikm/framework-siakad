import { FileCode, FileText, KeyRound, LayoutDashboard, LayoutTemplate, ListTree, Puzzle, ShieldCheck, Users, type LucideIcon } from "lucide-react";

export type AdminNavLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Permission needed to see the item. Omit for any admin. */
  perm?: string;
  /** Match only the exact path (dashboard). */
  end?: boolean;
};

/** A category: renders as a dropdown (disclosure) in the sidebar; hidden when no child is visible. */
export type AdminNavGroup = {
  label: string;
  icon: LucideIcon;
  children: AdminNavLink[];
};

export type AdminNavEntry = AdminNavLink | AdminNavGroup;

export const isNavGroup = (entry: AdminNavEntry): entry is AdminNavGroup => "children" in entry;

export const adminNav: AdminNavEntry[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  {
    label: "Akses & pengguna",
    icon: KeyRound,
    children: [
      { to: "/admin/peran", label: "Peran & izin", icon: ShieldCheck, perm: "core.roles.manage" },
      { to: "/admin/pengguna", label: "Pengguna", icon: Users, perm: "core.users.manage" },
    ],
  },
  {
    label: "Konten portal",
    icon: LayoutTemplate,
    children: [
      { to: "/admin/halaman", label: "Halaman & akses", icon: FileText, perm: "core.menu.manage" },
      { to: "/admin/snippet", label: "Snippet", icon: FileCode, perm: "core.menu.manage" },
      { to: "/admin/menu", label: "Menu portal", icon: ListTree, perm: "core.menu.manage" },
    ],
  },
  { to: "/admin/modul", label: "Modul", icon: Puzzle, perm: "core.modules.manage" },
];

/** Keeps only what `can` allows; groups left without children are dropped. */
export function visibleNav(entries: AdminNavEntry[], can: (perm: string) => boolean): AdminNavEntry[] {
  const allowed = (link: AdminNavLink) => !link.perm || can(link.perm);
  return entries.flatMap((entry): AdminNavEntry[] => {
    if (!isNavGroup(entry)) return allowed(entry) ? [entry] : [];
    const children = entry.children.filter(allowed);
    return children.length ? [{ ...entry, children }] : [];
  });
}
