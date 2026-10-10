import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "children"> & {
  label: ReactNode;
  description?: ReactNode;
  onChange?: () => void;
};

/** Styled radio button (same approach as Checkbox). */
export function Radio({ label, description, onChange, className, disabled, ...rest }: Props) {
  return (
    <label className={cn("group flex min-h-10 items-start gap-2.5 py-1.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)}>
      <input type="radio" disabled={disabled} className="peer sr-only" onChange={() => onChange?.()} {...rest} />
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid size-5 shrink-0 place-items-center rounded-full border-2 border-slate-400 bg-white transition-colors",
          "group-hover:border-navy-500 peer-checked:border-navy-700",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-500",
          "after:size-2.5 after:scale-0 after:rounded-full after:bg-navy-700 after:transition-transform peer-checked:after:scale-100",
        )}
      />
      <span className="min-w-0">
        <span className="block text-[14px] leading-snug">{label}</span>
        {description && <span className="block text-[12.5px] text-text-3">{description}</span>}
      </span>
    </label>
  );
}
