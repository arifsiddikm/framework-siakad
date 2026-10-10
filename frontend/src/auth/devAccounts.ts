/**
 * Login shortcuts ("Isi otomatis").
 * - Dev server: portal + admin accounts, passwords from frontend/.env.local (git-ignored).
 * - Production: only if the build sets VITE_PUBLIC_AUTOFILL=1 (portal accounts) and/or
 *   VITE_PUBLIC_AUTOFILL_ADMIN=1 (admin). That puts those passwords in the PUBLIC bundle: use only on a
 *   throw-away sample server with fictional data, never with real accounts.
 * Values are read only inside these gates so a normal production build drops the passwords entirely.
 */
export type DevAccount = { label: string; username: string; password: string };

const portalOn = import.meta.env.DEV || import.meta.env.VITE_PUBLIC_AUTOFILL === "1";

const build = (on: boolean, items: { label: string; username: string; password?: string }[]): DevAccount[] =>
  on ? items.filter((item): item is DevAccount => Boolean(item.password)) : [];

const demo = portalOn ? (import.meta.env.VITE_DEV_DEMO_PASSWORD as string | undefined) : undefined;
const adminOn = import.meta.env.DEV || import.meta.env.VITE_PUBLIC_AUTOFILL_ADMIN === "1";
const admin = adminOn ? (import.meta.env.VITE_DEV_ADMIN_PASSWORD as string | undefined) : undefined;

export const DEV_PORTAL_ACCOUNTS = build(portalOn, [
  { label: "Staf akademik", username: "staf.demo", password: demo },
  { label: "Dosen", username: "dosen.demo", password: demo },
  { label: "Mahasiswa", username: "mahasiswa.demo", password: demo },
  { label: "Pimpinan", username: "pimpinan.demo", password: demo },
]);

export const DEV_ADMIN_ACCOUNTS = build(adminOn, [{ label: "Admin", username: "admin", password: admin }]);
