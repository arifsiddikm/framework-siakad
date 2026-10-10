import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Note } from "@/components/ui/Note";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, api } from "@/lib/api";
import { snippets, withDefaults } from "@/snippets/registry";

/** Renders one snippet (a React file from frontend/src/snippets/) with its params and, if any, its server data. */
export function SnippetView({ name, params }: { name: string; params: Record<string, unknown> }) {
  const snippet = snippets[name];
  const merged = snippet ? withDefaults(snippet, params) : params;
  const query = useQuery({
    queryKey: ["snippet-data", name, JSON.stringify(merged)],
    queryFn: () => {
      const search = new URLSearchParams(Object.entries(merged).map(([k, v]) => [k, String(v)])).toString();
      return api.get<{ data: unknown }>(`/snippets/${name}/data/?${search}`);
    },
    enabled: Boolean(snippet?.meta.hasData),
    retry: false,
  });

  if (!snippet) return <Note tone="warn">Snippet "{name}" tidak ada di aplikasi ini. Pastikan file-nya ada di frontend/src/snippets/.</Note>;
  if (snippet.meta.hasData && query.isLoading) return <div className="rounded-card border border-line bg-surface"><Skeleton lines={3} /></div>;
  if (snippet.meta.hasData && (query.isError || !query.data)) {
    const denied = query.error instanceof ApiError && query.error.status === 403;
    return <Note tone={denied ? "warn" : "error"}>{denied ? "Anda tidak memiliki akses ke data ini. Hubungi administrator bila Anda memerlukannya." : query.error instanceof ApiError ? query.error.message : "Data tidak dapat dimuat."}</Note>;
  }
  const Component = snippet.component;
  return (
    <Suspense fallback={<Skeleton lines={3} />}>
      <Component params={merged} data={query.data?.data} />
    </Suspense>
  );
}
