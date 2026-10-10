/** Contract of a snippet file (frontend/src/snippets/**.tsx): `export const meta` + `export default` component. */
export type SnippetParam = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
  default?: unknown;
};

export type SnippetMeta = {
  /** Name shown in the page builder. */
  label: string;
  hint?: string;
  /** True when backend/snippets/<same path>.py exists; its data arrives as `props.data`. */
  hasData?: boolean;
  /** Settings the admin can fill (in the Snippet block, or as key=value in the shortcode). */
  params?: SnippetParam[];
};

export type SnippetProps = {
  /** Admin's settings, defaults already applied. Values from a shortcode arrive as strings. */
  params: Record<string, unknown>;
  /** Result of the Python half (`data()`), if `meta.hasData`. */
  data?: unknown;
};
