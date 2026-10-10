import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full border px-3 py-2 text-[14px] text-text placeholder:text-slate-500 disabled:bg-slate-100 disabled:text-slate-500";
const boxed = "rounded-ctl bg-white";
/** Filled style used on the login pages. */
const filled = "rounded-t-ctl border-0 border-b-2 bg-navy-50 py-3";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string;
};

/** Label + control + hint/error, wired with aria attributes. */
export function Field({ label, error, hint, required, children, className }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-slate-800">
        {label}
        {required && <span aria-hidden="true" className="text-red-600"> *</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[13px] text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[13px] text-text-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Visual style: "boxed" (default, forms) or "filled" (login pages). */
  look?: "boxed" | "filled";
  /** Something inside the right edge of the field, e.g. a show/hide password button. */
  endAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ label, error, hint, className, look = "boxed", endAdornment, required, ref, ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          <input
            id={id}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            required={required}
            {...rest}
            className={cn(control, look === "filled" ? filled : boxed, error ? "border-red-600" : "border-slate-300", Boolean(endAdornment) && "pr-12")}
          />
          {endAdornment && <div className="absolute right-1 top-1/2 -translate-y-1/2">{endAdornment}</div>}
        </div>
      )}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string; ref?: Ref<HTMLSelectElement> };

export function Select({ label, error, hint, className, ref, children, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <select
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
          className={cn(control, boxed, error ? "border-red-600" : "border-slate-300")}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string; ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ label, error, hint, className, ref, ...rest }: TextareaProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <textarea
          id={id}
          ref={ref}
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
          className={cn(control, boxed, error ? "border-red-600" : "border-slate-300")}
        />
      )}
    </Field>
  );
}
