import Swal from "sweetalert2";

const skin = {
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup: "sk-swal",
    confirmButton: "sk-btn sk-btn-primary",
    cancelButton: "sk-btn sk-btn-secondary",
    denyButton: "sk-btn sk-btn-secondary",
  },
} as const;

const dialog = Swal.mixin(skin);
const toast = Swal.mixin({
  toast: true,
  position: "bottom-end", // never cover the header (account menu, hamburger)
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: "sk-toast" },
});

/** Light feedback that disappears by itself (saved, created, signed out). */
export const toastSuccess = (title: string) => toast.fire({ icon: "success", title });
export const toastError = (title: string) => toast.fire({ icon: "error", title, timer: 5000 });

/** Something failed and the person must read it: say what happened and what to do next. */
export const alertError = (title: string, text: string) =>
  dialog.fire({ icon: "error", title, text, confirmButtonText: "Mengerti" });

export const alertInfo = (title: string, text: string) =>
  dialog.fire({ icon: "info", title, text, confirmButtonText: "Mengerti" });

/** Ask before anything that cannot be undone. Resolves true when confirmed. */
export async function confirmAction(options: {
  title: string;
  text: string;
  confirmText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await dialog.fire({
    icon: options.danger ? "warning" : "question",
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Ya, lanjutkan",
    cancelButtonText: "Batal",
    focusCancel: options.danger,
    customClass: {
      ...skin.customClass,
      confirmButton: options.danger ? "sk-btn sk-btn-danger" : "sk-btn sk-btn-primary",
    },
  });
  return result.isConfirmed;
}

/** Show a one-time secret (temporary password) with a copy button. */
export async function showSecret(options: { title: string; username: string; password: string }) {
  const box = document.createElement("div");
  const note = document.createElement("p");
  note.textContent = `Kata sandi ini hanya tampil sekali. Salin dan berikan kepada ${options.username}, lalu minta diganti lewat Keamanan akun.`;
  const code = document.createElement("code");
  code.className = "sk-secret";
  code.textContent = options.password;
  box.append(note, code);

  await dialog.fire({
    icon: "warning",
    title: options.title,
    html: box,
    confirmButtonText: "Selesai",
    showDenyButton: true,
    denyButtonText: "Salin kata sandi",
    allowOutsideClick: false,
    preDeny: async () => {
      await navigator.clipboard?.writeText(options.password);
      const button = Swal.getDenyButton();
      if (button) button.textContent = "Tersalin";
      return false; // keep the dialog open
    },
  });
}
