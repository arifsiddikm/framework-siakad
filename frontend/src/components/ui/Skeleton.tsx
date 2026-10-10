export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Memuat">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}
