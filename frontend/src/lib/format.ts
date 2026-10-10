const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const numberFormat = new Intl.NumberFormat("id-ID");

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
export const formatRupiah = (value: number) => `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
export const formatNumber = (value: number) => numberFormat.format(value);

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function firstName(fullName: string): string {
  const skip = /^(dr|prof|ir|drs|dra|h|hj)\.?$/i;
  const words = fullName.split(/\s+/).filter(Boolean);
  return words.find((word) => !skip.test(word))?.replace(/,$/, "") ?? fullName;
}

export const isExternal = (to: string) => to.startsWith("https://");
