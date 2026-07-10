import type { LucideIcon } from "lucide-react";
import type { Schemas } from "@/core/api/types";

/**
 * Ítem del árbol de navegación que emite `GET /me/navigation` (vía
 * `/api/auth/sidebar`), ya filtrado por permisos en el backend.
 */
export type NavigationItemDTO = Schemas["NavigationDto"]["data"][number];
export type NavigationChildDTO = NavigationItemDTO["children"][number];

/** Forma que consume la UI del sidebar (icono resuelto, path de frontend). */
export type SidebarNavItem = {
  id: string;
  title: string;
  url?: string;
  icon?: LucideIcon;
  children?: SidebarNavItem[];
};
