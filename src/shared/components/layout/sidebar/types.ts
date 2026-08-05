import type { LucideIcon } from "lucide-react";
import type { Schemas } from "@/core/api/types";

/**
 * Nodo del árbol de navegación que emite `GET /me/navigation` (vía
 * `/api/auth/sidebar`), ya filtrado y podado por permisos en el backend.
 * Es RECURSIVO: `children` contiene nodos de la misma forma, no hojas.
 * `path` es nullable — NULL = grupo puro que agrupa hijos sin página propia.
 */
export type NavigationNodeDTO = Schemas["NavigationDto"]["data"][number];

/**
 * Forma que consume la UI del sidebar: icono resuelto, path de frontend
 * y profundidad ya calculada.
 */
export type SidebarNavItem = {
  id: string;
  /**
   * Código del módulo. Estable entre entornos (el `id` es un uuid que cambia
   * por base), así que es la clave con la que se persisten los grupos abiertos
   * y con la que se expresa el rastro activo.
   */
  code: string;
  title: string;
  /** Ausente en los grupos puros: la fila solo despliega, no navega. */
  url?: string;
  /** Solo en el nivel 0: en los subniveles la indentación sustituye al icono. */
  icon?: LucideIcon;
  /** 0 = nivel superior. */
  depth: number;
  children: SidebarNavItem[];
};
