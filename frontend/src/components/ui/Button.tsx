import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
  loading?: boolean;
};

const variants = {
  primary: "bg-navy-700 text-white hover:bg-navy-800 disabled:bg-navy-300",
  secondary: "border border-line bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-500",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  ghost: "text-navy-700 hover:bg-navy-50 disabled:text-slate-500",
};

export function Button({ variant = "primary", size = "md", loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-medium transition-colors disabled:cursor-not-allowed",
        size === "md" ? "min-h-11 px-4 sm:min-h-10" : "min-h-9 px-3 text-[13px]",
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
