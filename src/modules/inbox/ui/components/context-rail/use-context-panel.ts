"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Panel de contexto activo, persistido en el query param `?panel=`.
 *
 * Vivir en la URL hace el panel compartible (`/workspace/inbox/{id}?panel=history`),
 * permite que el botón atrás lo cierre y lo recuerda al recargar.
 *
 * Estrategia de historial: `push` al ABRIR desde cerrado (así el back cierra el
 * panel, que es lo que espera el usuario, sobre todo en móvil donde ocupa toda
 * la pantalla) y `replace` al alternar entre items o al cerrar (alternar cinco
 * pestañas no debe dejar cinco entradas de historial que recorrer).
 */

const PARAM = "panel";

export function useContextPanel(validIds: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(PARAM);
  // Un `?panel=` desconocido (link viejo, item sin permiso) se ignora en vez de
  // romper: el rail se comporta como si estuviera cerrado.
  const activeId = raw !== null && validIds.includes(raw) ? raw : null;

  const setActiveId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === null) params.delete(PARAM);
      else params.set(PARAM, id);
      const query = params.toString();
      const href = query === "" ? pathname : `${pathname}?${query}`;
      const opening = activeId === null && id !== null;
      if (opening) router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [activeId, pathname, router, searchParams],
  );

  const toggle = useCallback(
    (id: string) => setActiveId(activeId === id ? null : id),
    [activeId, setActiveId],
  );

  return { activeId, setActiveId, toggle };
}
