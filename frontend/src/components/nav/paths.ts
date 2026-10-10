import type { MenuNode } from "@/auth/AuthProvider";

export function isActivePath(pathname: string, to: string): boolean {
  if (!to || to.startsWith("https://")) return false;
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export const isNodeActive = (node: MenuNode, pathname: string): boolean =>
  isActivePath(pathname, node.to) || node.children.some((child) => isNodeActive(child, pathname));
