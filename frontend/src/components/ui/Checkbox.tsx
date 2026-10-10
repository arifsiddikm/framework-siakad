import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "children"> & {
  label: ReactNode;
  description?: ReactNode;
  onChange?: (checked: boolean) => void;
};

/** Styled checkbox. The native input stays in the DOM (keyboard, forms, screen readers); only its look changes. */
export function Checkbox({ label, description, onChange, className, disabled, ...rest }: Props) {
  return (
    <label className={cn("group flex min-h-10 items-start gap-2.5 py-1.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)}>
      <input type="checkbox" disabled={disabled} className="peer sr-only" onChange={(e) => onChange?.(e.target.checked)} {...rest} />
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid size-5 shrink-0 place-items-center rounded-[6px] border-2 border-slate-400 bg-white text-white transition-colors",
          "group-hover:border-navy-500 peer-checked:border-navy-700 peer-checked:bg-navy-700",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-500",
          "[&>svg]:scale-50 [&>svg]:opacity-0 [&>svg]:transition peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] leading-snug">{label}</span>
        {description && <span className="block text-[12.5px] text-text-3">{description}</span>}
      </span>
    </label>
  );
}
