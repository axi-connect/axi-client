/**
 * Escala de capas de apilamiento (DESIGN-SYSTEM §4.4).
 *
 * Regla: **el contenido flotante vive siempre por encima de la superficie que
 * lo ancla**. Un `Select`/`Popover`/`DropdownMenu` se portaliza a
 * `document.body`, así que su z-index compite con el de los overlays — no con
 * el del formulario que lo contiene. Si el contenido flotante empata o queda
 * por debajo del panel opaco que lo abre, el listado desaparece detrás y el
 * clic lo recibe el panel: el control parece "no funcionar".
 *
 * Nunca introducir un z-index suelto: si hace falta una capa nueva, se añade
 * aquí y se documenta en DESIGN-SYSTEM §4.4.
 */
export const LAYERS = {
  /** Overlays de Radix con backdrop propio: `Dialog`, `Sheet`, `Modal`. */
  overlay: 50,
  /** Panel del `DetailSheet` (su backdrop se pinta en `detailSheet - 1`). */
  detailSheet: 60,
  /**
   * Contenido portalado a `body`: select, popover, dropdown, tooltip,
   * context-menu. Por encima de TODOS los overlays anteriores.
   */
  floating: 70,
  /**
   * Viewport de los avisos (sileo, `core/notifications`): siempre lo último
   * visible. No lo consume ningún componente: sileo no acepta clase ni estilo,
   * así que el valor está repetido en `globals.css` (`:root [data-sileo-viewport]`).
   * Si cambia aquí, cambia allí.
   */
  alert: 9999,
} as const

export type Layer = keyof typeof LAYERS
