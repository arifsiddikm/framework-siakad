import { cn } from "@/lib/cn";

type Props = { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; showState?: boolean };

export function Switch({ checked, onChange, label, disabled, showState = true }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
    >
      <span className={cn("relative h-6 w-10 rounded-full transition-colors", checked ? "bg-navy-700" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {showState && <span className="w-14 text-left text-[13px] font-medium text-slate-700">{checked ? "Aktif" : "Nonaktif"}</span>}
    </button>
  );
}
