import { Code2, Copy, FileText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { toastSuccess } from "@/lib/alert";

const CODE_RE = /^[a-z][a-z0-9_]{1,29}$/;

/** "How do I add a module?" — two honest answers: no-code (Data + Halaman) or code (startmodule, in git). */
export function NewModuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const valid = CODE_RE.test(code);
  const name = title.trim() || code.replace(/_/g, " ");
  const commands = [
    "cd backend",
    `.venv/bin/python manage.py startmodule ${valid ? code : "kode_modul"} --title "${name || "Nama Modul"}"`,
    ".venv/bin/python manage.py makemigrations && .venv/bin/python manage.py migrate",
    "# restart backend: pm2 restart siakad-backend",
  ].join("\n");

  return (
    <Dialog open={open} onClose={onClose} title="Tambah modul" wide>
      <div className="space-y-5">
        <section className="rounded-card border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700"><FileText className="size-5" strokeWidth={1.75} aria-hidden="true" /></span>
            <div>
              <h3 className="text-[15px] font-semibold">Tanpa modul: Halaman + Snippet</h3>
              <p className="mt-0.5 text-text-2">Cukup untuk layanan berbasis informasi: pengumuman, panduan, jadwal, tabel, statistik, grafik. Susun halaman dari blok di panel admin; butuh tampilan khusus? Developer menambah <em>snippet</em> (satu file React di <code className="font-mono">frontend/src/snippets/</code>) yang bisa dipasang di halaman mana pun. Akses diatur per peran.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link onClick={onClose} to="/admin/halaman/baru" className="inline-flex min-h-10 items-center rounded-ctl bg-navy-700 px-4 text-[14px] font-medium text-white hover:bg-navy-800">Buat halaman</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-ctl bg-navy-50 text-navy-700"><Code2 className="size-5" strokeWidth={1.75} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold">Dengan kode: modul developer</h3>
              <p className="mt-0.5 text-text-2">Untuk fitur dengan tabel database sendiri, form khusus, aturan bisnis, atau tampilan custom (KRS, nilai, keuangan). Kodenya masuk Git agar bisa di-review tim; admin tinggal mengaktifkan dan mengatur aksesnya di sini.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input label="Kode modul" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="contoh: nilai" error={code && !valid ? "Huruf kecil/angka/garis bawah, diawali huruf, 2–30 karakter." : undefined} />
                <Input label="Nama modul" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="contoh: Nilai & KHS" />
              </div>
              <pre className="mt-3 overflow-x-auto rounded-ctl bg-navy-950 p-3 font-mono text-[12.5px] leading-relaxed text-white/90">{commands}</pre>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={!valid} onClick={async () => { await navigator.clipboard?.writeText(commands); toastSuccess("Perintah disalin."); }}>
                  <Copy className="size-4" strokeWidth={1.75} aria-hidden="true" /> Salin perintah
                </Button>
                <span className="text-[13px] text-text-3">Jalankan di terminal proyek, lalu <code className="font-mono">git add</code> dan commit.</span>
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13.5px] text-slate-700">
                <li>Isi <code className="font-mono">manifest.py</code> (izin, menu), <code className="font-mono">models.py</code>, <code className="font-mono">views.py</code> di <code className="font-mono">backend/modules/{valid ? code : "kode"}/</code>.</li>
                <li>Isi halaman React di <code className="font-mono">frontend/src/modules/{valid ? code : "kode"}/pages/</code>.</li>
                <li>Mau potongan tampilan siap-pakai untuk halaman? <code className="font-mono">manage.py startsnippet pages.nama_snippet</code>.</li>
                <li>Kembali ke sini: modul muncul di daftar, atur aksesnya di <em>Peran & izin</em>.</li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
