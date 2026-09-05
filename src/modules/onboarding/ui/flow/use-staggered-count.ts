import { useEffect, useState } from "react";

/**
 * Cuenta de 0 a `total` avanzando uno cada `everyMs`: la cadencia con la que
 * la ruta enciende sus paradas en «Listo» y el resumen entra escalonado.
 * Con `immediate` (reduced-motion) devuelve `total` desde el primer render:
 * nada parpadea, todo aparece encendido. Con `total` 0 no arranca nada.
 *
 * Es una cadena de `setTimeout` y no un intervalo para que cada paso se
 * programe desde el anterior (si el hilo va cargado, no se acumulan) y para
 * que desmontar a mitad limpie el único temporizador vivo.
 */
export function useStaggeredCount(total: number, everyMs: number, immediate = false): number {
  const [count, setCount] = useState(immediate ? total : 0);

  useEffect(() => {
    if (immediate) {
      setCount(total);
      return;
    }
    setCount(0);
    if (total <= 0) return;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      step += 1;
      setCount(step);
      if (step < total) timer = setTimeout(tick, everyMs);
    };
    timer = setTimeout(tick, everyMs);
    return () => clearTimeout(timer);
  }, [total, everyMs, immediate]);

  return Math.min(count, total);
}
