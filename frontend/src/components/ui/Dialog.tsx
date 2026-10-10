import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean };

/** Native <dialog>: focus trap, Esc and inert background come from the browser. */
export function Dialog({ open, onClose, title, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        "m-auto max-h-[92vh] w-[calc(100%-24px)] overflow-auto rounded-card border border-line bg-white p-0 shadow-xl backdrop:bg-slate-900/50",
        wide ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {open && (
        <div>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-10 place-items-center rounded-ctl text-slate-600 hover:bg-slate-100">
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
