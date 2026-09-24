import { KR_LABELS } from "./labels";

/**
 * Las migas de /comercial para el header privado (V6), en datos para que el
 * layout (servidor) se las pase al header (cliente) sin funciones. Forma de
 * `BreadcrumbConfig` de `shared/components/layout/private-header`:
 *
 *  - `unlinked`: rutas intermedias SIN page.tsx propia (solo `[id]`/`[key]`
 *    debajo): su miga no enlaza, porque enlazarla era un 404.
 *  - `children`: la etiqueta del segmento dinámico bajo una ruta. La última
 *    miga es la única que se ve en móvil: un UUID o «sales» no dicen nada.
 */
export const COMMERCIAL_BREADCRUMBS = {
  unlinked: ["/comercial/acciones", "/comercial/resultados"],
  children: {
    "/comercial/acciones": { "*": "Acción" },
    "/comercial/resultados": { ...KR_LABELS, avg_ticket: "Ticket promedio", "*": "Resultado" },
  },
} as const satisfies {
  unlinked: readonly string[];
  children: Readonly<Record<string, Readonly<Record<string, string>>>>;
};
