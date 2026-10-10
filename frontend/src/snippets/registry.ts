import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { SnippetMeta, SnippetProps } from "@/snippets/types";

// Every .tsx file in this folder (any depth) is a snippet. Ignored: names starting with "_" and soft-deleted
// files (<name>_deleted.tsx, made by the admin panel's Delete).
// (Vite needs the glob patterns written out literally, so they appear twice.)
const metas = import.meta.glob<SnippetMeta>(["./**/*.tsx", "!./**/_*", "!./**/_*/**", "!./**/*_deleted.tsx", "!./**/*_deleted_*.tsx"], { eager: true, import: "meta" });
const loaders = import.meta.glob<ComponentType<SnippetProps>>(["./**/*.tsx", "!./**/_*", "!./**/_*/**", "!./**/*_deleted.tsx", "!./**/*_deleted_*.tsx"], { import: "default" });

export type RegisteredSnippet = {
  /** "pages.data_ijazah" for frontend/src/snippets/pages/data_ijazah.tsx */
  name: string;
  /** Path to edit, relative to the project root. */
  file: string;
  /** Where the optional Python half lives. */
  pythonFile: string;
  meta: SnippetMeta;
  component: LazyExoticComponent<ComponentType<SnippetProps>>;
};

const toName = (path: string) => path.replace(/^\.\//, "").replace(/\.tsx$/, "").split("/").join(".");

export const snippets: Record<string, RegisteredSnippet> = Object.fromEntries(
  Object.keys(loaders).map((path) => {
    const name = toName(path);
    const rel = name.split(".").join("/");
    const meta: SnippetMeta = metas[path] ?? { label: name };
    return [
      name,
      { name, file: `frontend/src/snippets/${rel}.tsx`, pythonFile: `backend/snippets/${rel}.py`, meta, component: lazy(async () => ({ default: await loaders[path]() })) },
    ] as const;
  }),
);

export const snippetList: RegisteredSnippet[] = Object.values(snippets).sort((a, b) => a.name.localeCompare(b.name));

export function withDefaults(snippet: RegisteredSnippet, params: Record<string, unknown>): Record<string, unknown> {
  const defaults = Object.fromEntries((snippet.meta.params ?? []).filter((p) => p.default !== undefined).map((p) => [p.name, p.default]));
  return { ...defaults, ...params };
}
