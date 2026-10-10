import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import ForbiddenPage from "@/core/pages/ForbiddenPage";
import NotFoundPage from "@/core/pages/NotFoundPage";
import { ApiError, api } from "@/lib/api";
import type { Block } from "@/lib/blocks";

type PageData = { slug: string; title: string; blocks: Block[]; updated_at: string };

/** A page built in the admin panel, served at /<alamat>. The server decides who may read it and each block's data. */
export default function ContentPage() {
  const { slug = "" } = useParams();
  const { can } = useAuth();
  const query = useQuery({ queryKey: ["page", slug], queryFn: () => api.get<PageData>(`/pages/${slug}/`) });

  if (query.isLoading) return <Skeleton lines={6} />;
  if (query.error instanceof ApiError && query.error.status === 403) return <ForbiddenPage />;
  if (query.isError || !query.data) return <NotFoundPage />;

  return (
    <>
      <PageHeader
        title={query.data.title}
        actions={
          can("core.menu.manage") && (
            <Link
              to={`/admin/halaman?ubah=${slug}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-white px-4 text-[14px] font-medium hover:bg-slate-50"
            >
              <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" /> Ubah halaman
            </Link>
          )
        }
      />
      <BlockRenderer blocks={query.data.blocks} loadData={(block) => api.get(`/pages/${slug}/blocks/${block.id}/`)} />
    </>
  );
}
