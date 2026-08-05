import { iconFromString } from "@/core/lib/icons";
import { resolveNavPath } from "@/core/config/routes";
import type { NavigationNodeDTO, SidebarNavItem } from "./types";

/**
 * Mapea el árbol recursivo de `/me/navigation` a la forma que consume la UI.
 *
 * Qué hace en cada nivel:
 * - Ordena por `sort_order` entre hermanos (el backend ya lo manda ordenado;
 *   esto lo hace explícito e independiente del transporte).
 * - Traduce el `path` del backend a la ruta real del frontend con
 *   `resolveNavPath`, que devuelve `null` para los módulos que aún no tienen UI.
 * - Resuelve el icono lucide **solo en el nivel 0**: en los subniveles la
 *   indentación y la línea guía sustituyen al icono (decisión de diseño F0).
 * - **Poda** los nodos que no aportan nada: sin ruta navegable y sin hijos
 *   visibles. Es la misma regla del backend, repetida aquí porque el filtrado
 *   por rutas sin UI puede vaciar una rama que el backend sí consideraba viva.
 *
 * Módulo puro (sin React) para poder testearlo aislado.
 */
export function mapNavigation(nodes: NavigationNodeDTO[], depth = 0): SidebarNavItem[] {
  return [...nodes]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((node): SidebarNavItem | null => {
      const children = mapNavigation(node.children, depth + 1);
      const url = resolveNavPath(node.path);

      // Ni ruta propia ni hijos que mostrar: el nodo no se renderiza.
      if (!url && children.length === 0) return null;

      return {
        id: node.id,
        code: node.code,
        title: node.name,
        url: url ?? undefined,
        icon: depth === 0 ? iconFromString(node.icon) : undefined,
        depth,
        children,
      };
    })
    .filter((item): item is SidebarNavItem => item !== null);
}
