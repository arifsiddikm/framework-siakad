import { Chip } from "@/components/ui/Chip";

export type Audience = { everyone: boolean; roles: { code: string; name: string }[] };

/** "Who can open this": everyone, specific roles, or (amber) nobody yet. */
export function AudienceChips({ audience }: { audience: Audience }) {
  if (audience.everyone) return <Chip tone="green" dot>Semua pengguna yang login</Chip>;
  if (audience.roles.length === 0) return <Chip tone="amber" dot>Belum ada peran</Chip>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {audience.roles.map((role) => (
        <Chip key={role.code} tone="navy">{role.name}</Chip>
      ))}
    </div>
  );
}
