import type { ComponentType, LazyExoticComponent } from "react";

export type AppRoute = {
  path: string;
  /** Page title, also used in the breadcrumb. */
  title: string;
  /** Breadcrumb section, e.g. "Administrasi". */
  section?: string;
  /** Permission code required to open the page. Omit for any signed-in user. */
  perm?: string;
  component: LazyExoticComponent<ComponentType>;
};

export type ModuleManifest = {
  code: string;
  routes: AppRoute[];
};
