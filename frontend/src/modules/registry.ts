import { coreRoutes } from "@/core/routes";
import type { AppRoute, ModuleManifest } from "@/modules/types";

// Every folder in src/modules/<kode>/ with a manifest.ts is picked up here (MOD-01).
const found = import.meta.glob<{ default: ModuleManifest }>("./*/manifest.ts", { eager: true });

export const moduleManifests: ModuleManifest[] = Object.values(found).map((m) => m.default);

export type RegisteredRoute = AppRoute & { module: string };

export const routes: RegisteredRoute[] = [
  ...coreRoutes.map((route) => ({ ...route, module: "core" })),
  ...moduleManifests.flatMap((manifest) => manifest.routes.map((route) => ({ ...route, module: manifest.code }))),
];
