import { StatusPage } from "@/core/pages/StatusPage";

export default function ForbiddenPage() {
  return <StatusPage title="Akses ditolak" hint="Akun Anda belum memiliki izin untuk halaman ini. Hubungi administrator bila Anda memerlukannya." />;
}
