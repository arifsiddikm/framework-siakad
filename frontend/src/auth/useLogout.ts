import { useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { confirmAction, toastError, toastSuccess } from "@/lib/alert";

/** Ask, sign out, go to the given login page. `area` picks the login the person lands on. */
export function useLogout(area: "portal" | "admin") {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return async () => {
    const ok = await confirmAction({
      title: "Keluar dari akun?",
      text: "Anda harus masuk lagi untuk memakai aplikasi.",
      confirmText: "Ya, keluar",
    });
    if (!ok) return;
    try {
      await logout();
      navigate(area === "admin" ? "/admin/masuk" : "/masuk", { replace: true });
      toastSuccess("Anda sudah keluar.");
    } catch {
      toastError("Gagal keluar. Coba lagi.");
    }
  };
}
