import { iconFromString } from "@/core/lib/icons";
import {
  HIDDEN_NAV_CODES,
  NAV_ENTRY_HREFS,
  NAV_LABEL_OVERRIDES,
  resolveNavPath,
} from "@/core/config/routes";
import type { NavigationNodeDTO, SidebarNavItem } from "./types";

/**
 * Mapea el árbol recursivo de `/me/navigation` a la forma que consume la UI.
 *
 * Qué hace en cada nivel:
 * - Ordena por `sort_order` entre hermanos (el backend ya lo manda ordenado;
 *   esto lo hace explícito e independiente del transporte).
 * - Traduce el `path` del backend a la ruta real del frontend con
 *   `resolveNavPath`, que devuelve `null` para los módulos que aún no tienen UI.
 * - Quita los ítems de `HIDDEN_NAV_CODES` (la página existe, el menú no la
 *   lista) y aplica los rótulos de `NAV_LABEL_OVERRIDES` y los destinos de
 *   clic de `NAV_ENTRY_HREFS`.
 * - Resuelve el icono lucide **solo en el nivel 0**: en los subniveles la
 *   indentación y la línea guía sustituyen al icono (decisión de diseño F0).
 * - **Poda** los nodos que no aportan nada: sin ruta navegable y sin hijos
 *   visibles. Es la misma regla del backend, repetida aquí porque el filtrado
 *   por rutas sin UI puede vaciar una rama que el backend sí consideraba viva.
 *
 * Módulo puro (sin React) para poder testearlo aislado.
 */
export function mapNavigation(nodes: NavigationNodeDTO[], depth = 0): SidebarNavItem[] {
  const relabeled = new Set<string>();

  const items = [...nodes]
    .filter((node) => !HIDDEN_NAV_CODES.has(node.code))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((node): SidebarNavItem | null => {
      const children = mapNavigation(node.children, depth + 1);
      const url = resolveNavPath(node.path);

      // Ni ruta propia ni hijos que mostrar: el nodo no se renderiza.
      if (!url && children.length === 0) return null;

      const override = NAV_LABEL_OVERRIDES[node.code];
      const title = override ?? node.name;
      if (override && override.length !== node.name.length) relabeled.add(node.code);

      const href = url ? NAV_ENTRY_HREFS[url] : undefined;

      return {
        id: node.id,
        code: node.code,
        title,
        url: url ?? undefined,
        ...(href ? { href } : {}),
        icon: depth === 0 ? iconFromString(node.icon) : undefined,
        depth,
        children,
      };
    })
    .filter((item): item is SidebarNavItem => item !== null);

  return relabeled.size > 0 ? placeByLength(items, relabeled) : items;
}

/**
 * Recoloca los ítems cuyo rótulo cambió en el frontend según la regla del
 * menú: entre hermanos, el texto más corto primero y el más largo de último.
 *
 * El backend ya ordenó con esa regla (anclados primero, después por longitud;
 * `flattenUiModuleTree` en el seeder), pero con el rótulo viejo. El frontend no
 * sabe qué hermanos están anclados, así que no reordena todo: saca cada ítem
 * renombrado y lo pone justo después del último hermano cuyo rótulo no es más
 * largo que el suyo (el empate va detrás, como el `sort` estable del backend).
 * Si ninguno es más corto o igual, se queda donde el backend lo puso, que
 * respeta a los anclados.
 */
function placeByLength(items: SidebarNavItem[], relabeled: Set<string>): SidebarNavItem[] {
  let result = [...items];

  for (const code of relabeled) {
    const from = result.findIndex((item) => item.code === code);
    if (from === -1) continue;

    const [moved] = result.splice(from, 1);
    let to = -1;
    result.forEach((item, index) => {
      if (item.title.length <= moved.title.length) to = index;
    });

    result = to === -1
      ? [...result.slice(0, from), moved, ...result.slice(from)]
      : [...result.slice(0, to + 1), moved, ...result.slice(to + 1)];
  }

  return result;
}
