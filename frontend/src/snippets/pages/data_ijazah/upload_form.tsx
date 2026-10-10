import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { toastSuccess } from "@/lib/alert";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

/**
 * CONTOH snippet di folder bertingkat: frontend/src/snippets/pages/data_ijazah/upload_form.tsx
 * Nama: pages.data_ijazah.upload_form   ->   [snippet:pages.data_ijazah.upload_form maks_mb=8]
 * Backend-nya cukup satu endpoint (backend/snippets/pages/data_ijazah/upload_form.py -> data()).
 * Formulir ini hanya contoh tampilan: belum mengirim apa pun ke server.
 */
export const meta: SnippetMeta = {
  label: "Formulir unggah ijazah (contoh)",
  hint: "Contoh snippet di folder bertingkat",
  hasData: true,
  params: [{ name: "maks_mb", label: "Ukuran maksimal (MB)", type: "number", default: 5 }],
};

export default function UploadForm({ data }: SnippetProps) {
  const info = data as { nama_pengunggah: string; maks_mb: number };
  const [file, setFile] = useState<File | null>(null);
  return (
    <Card className="p-5">
      <h3 className="text-[16px] font-semibold text-navy-900">Unggah berkas ijazah</h3>
      <p className="mb-3 text-text-2">Halo, {info.nama_pengunggah} — format PDF, maksimal {info.maks_mb} MB.</p>
      <div className="grid gap-3 sm:max-w-md">
        <Input label="Berkas (PDF)" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={!file} onClick={() => toastSuccess("Contoh saja: hubungkan ke endpoint unggah milik Anda.")}>Kirim</Button>
      </div>
    </Card>
  );
}
