import type { SidebarNavItem } from "./types";

/**
 * ¿Esta URL cubre el pathname actual? Exacta o como prefijo de segmento.
 *
 * El `+ "/"` es lo que evita el falso positivo clásico: `/dashboard` NO debe
 * activarse en `/dashboard-legacy`, pero sí en `/dashboard/resumen`.
 */
export function isPathMatch(url: string, pathname: string): boolean {
  return pathname === url || pathname.startsWith(url + "/");
}

/**
 * Rastro de códigos desde el ancestro de nivel superior hasta el ítem activo.
 *
 * Gana la URL **más específica** que cubre el pathname, no la primera que
 * coincide: en `/crm/contacts/<id>` tanto `/crm` como `/crm/contacts` hacen
 * match, y el activo debe ser Contactos, con CRM como ancestro.
 *
 * El último código del rastro es el ítem activo pleno (fondo + barra coral +
 * `aria-current`); los anteriores son ancestros (icono coral, sin fondo) y sus
 * grupos se abren solos.
 *
 * Devuelve `[]` si ninguna ruta del árbol cubre el pathname.
 */
export function findActiveTrail(items: SidebarNavItem[], pathname: string): string[] {
  let best: string[] = [];
  let bestLength = -1;

  const walk = (nodes: SidebarNavItem[], trail: string[]): void => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.code];

      // Los grupos puros no tienen url: participan del rastro solo como
      // ancestros de un descendiente que sí haga match.
      if (node.url && isPathMatch(node.url, pathname) && node.url.length > bestLength) {
        best = nextTrail;
        bestLength = node.url.length;
      }

      walk(node.children, nextTrail);
    }
  };

  walk(items, []);
  return best;
}
