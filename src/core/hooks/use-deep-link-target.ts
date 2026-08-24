"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Abrir un elemento concreto desde un enlace externo (`?promotion=<id>`).
 *
 * Existe porque hay pantallas cuyo panel de detalle vive en el estado del
 * componente y no en la URL, así que no se pueden enlazar. Desde el chat de Axel
 * hace falta llevar al dueño al borrador REAL que acabó de armar, y aterrizar en
 * una tabla para que lo busque a mano no es llevarlo a ninguna parte.
 *
 * Tres decisiones:
 *
 * 1. **Se dispara UNA sola vez por id.** Si volviera a dispararse, cerrar el
 *    panel lo reabriría de inmediato: el parámetro sigue en la URL hasta que
 *    alguien lo limpie.
 * 2. **Espera a que los datos estén.** Con `items === null` todavía no se sabe
 *    si el elemento existe; adelantarse daría un «no está» falso.
 * 3. **`clear()` quita el parámetro con `replace`**, no con `push`: el enlace ya
 *    se consumió y no merece una entrada en el historial — el back del navegador
 *    debe volver al chat, no reabrir el panel.
 */
export function useDeepLinkTarget<T extends { id: string }>(
  param: string,
  items: readonly T[] | null,
  handlers: { onFound: (item: T) => void; onMissing?: (id: string) => void },
): { id: string | null; clear: () => void } {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get(param);
  const consumed = useRef<string | null>(null);

  // Las handlers cambian en cada render (cierres sobre el estado); guardarlas en
  // una ref evita que el efecto se vuelva a disparar por eso.
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (id === null || items === null || consumed.current === id) return;
    consumed.current = id;
    const found = items.find((item) => item.id === id);
    if (found === undefined) latest.current.onMissing?.(id);
    else latest.current.onFound(found);
  }, [id, items]);

  const clear = () => {
    if (id === null) return;
    // Se quita SOLO este parámetro. Reemplazar por el pathname a secas se
    // llevaba cualquier otro que hubiera en la URL —un filtro, una pestaña— y el
    // día que una de estas vistas gane uno, cerrar el panel lo borraría.
    const rest = new URLSearchParams(params.toString());
    rest.delete(param);
    const query = rest.toString();
    router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  return { id, clear };
}
