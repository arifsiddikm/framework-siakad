import { ChevronDown, LogOut, ShieldCheck, User, UserCog } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { useLogout } from "@/auth/useLogout";
import { useDismiss } from "@/components/nav/useDismiss";
import { cn } from "@/lib/cn";

const row = "flex min-h-11 w-full items-center gap-3 rounded-ctl px-3 text-[14px] hover:bg-slate-50";

export function UserMenu() {
  const { me, isAdmin } = useAuth();
  const logout = useLogout("portal");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((via: "outside" | "escape") => {
    if (via === "escape") triggerRef.current?.focus();
    setOpen(false);
  }, []);
  useDismiss(open, dismiss, boxRef);

  if (!me) return null;
  const roleNames = me.roles.map((r) => r.name).join(", ") || "Tanpa peran";

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? "menu-akun" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn("flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/10", open && "bg-white/10")}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-600 text-[13px] font-semibold text-white">
          {me.user.initials}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block max-w-48 truncate text-[14px] font-semibold leading-tight">{me.user.full_name}</span>
          <span className="block max-w-48 truncate text-[12.5px] leading-tight text-white/75">{roleNames}</span>
        </span>
        <ChevronDown className="hidden size-4 md:block" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only md:hidden">Menu akun {me.user.full_name}</span>
      </button>
      {open && (
        <div
          id="menu-akun"
          className="absolute right-0 top-full z-50 mt-2 w-[310px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-white p-2 text-text shadow-[0_12px_32px_rgba(11,31,75,.18)]"
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="text-[14px] font-semibold">{me.user.full_name}</p>
            <p className="text-[12.5px] text-slate-600">
              {me.user.identifier ? `${me.user.identifier} · ` : ""}
              {me.user.username}
            </p>
            <p className="mt-0.5 text-[12.5px] text-slate-600">{roleNames}</p>
          </div>
          <ul className="pt-2">
            {isAdmin && (
              <li>
                <Link to="/admin" className={row} onClick={() => setOpen(false)}>
                  <UserCog className="size-[18px] text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Panel Admin
                </Link>
              </li>
            )}
            <li>
              <Link to="/profil" className={row} onClick={() => setOpen(false)}>
                <User className="size-[18px] text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Profil saya
              </Link>
            </li>
            <li>
              <Link to="/keamanan" className={row} onClick={() => setOpen(false)}>
                <ShieldCheck className="size-[18px] text-slate-600" strokeWidth={1.75} aria-hidden="true" /> Keamanan akun
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={cn(row, "text-red-700")}
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
              >
                <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden="true" /> Keluar
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
