"use client"

import { cn } from "@/core/lib/utils"

export type SelectionBannerMessages = {
  /** «Seleccionaste los 25 de esta página.» */
  page: (count: number) => string
  /**
   * «175 seleccionados.» — cuando lo marcado NO cabe en la página.
   *
   * Existe porque hay un estado real entre los otros dos: se pidieron «los 175
   * que cumplen» y después se destildó una fila, así que ya no son todos los que
   * cumplen pero siguen siendo más de los que hay en pantalla. Decir «los 175 de
   * esta página» ahí es mentira, y era la mitad de un informe de que el número
   * del botón y el del diálogo no cuadraban.
   */
  selected: (count: number) => string
  /** «Los 412 leads que cumplen el filtro están seleccionados.» */
  allMatching: (count: number) => string
  /** «Seleccionar los 412 que cumplen el filtro» */
  selectAll: (count: number) => string
  clear: string
  /** Lo que se dice cuando hay más de los que se pueden seleccionar de golpe. */
  toomany: (limit: number) => string
}

export const DEFAULT_SELECTION_MESSAGES: SelectionBannerMessages = {
  page: (n) => `Seleccionaste ${n === 1 ? "1 de esta página" : `los ${n} de esta página`}.`,
  selected: (n) => `${n} seleccionados.`,
  allMatching: (n) => `Los ${n} que cumplen el filtro están seleccionados.`,
  selectAll: (n) => `Seleccionar los ${n} que cumplen el filtro`,
  clear: "Quitar la selección",
  toomany: (limit) =>
    `Son demasiados para seleccionarlos de una (máximo ${limit}). Afina el filtro o hazlo por páginas.`,
}

type SelectionBannerProps = {
  /** Cuántos hay marcados AHORA, ya sea la página o todo lo que cumple. */
  count: number
  /** Cuántos cumplen el filtro. De `meta.total`: cero peticiones extra. */
  matchingTotal?: number
  /** Cuántas filas hay en pantalla. Decide si se puede decir «de esta página». */
  pageCount?: number
  allMatching: boolean
  onSelectAllMatching?: () => void
  onClear: () => void
  /** Por encima de esto la oferta NO se pinta. */
  limit?: number
  messages?: Partial<SelectionBannerMessages>
  /** Los botones de lote: los pone quien llama, que es quien sabe qué hacen. */
  actions?: React.ReactNode
  /** Una línea de aviso bajo los botones, donde de verdad se lee. */
  note?: React.ReactNode
  className?: string
}

/**
 * La banda de selección: cuántos hay marcados y qué se puede hacer con ellos.
 *
 * **Ofrecer «los N que cumplen el filtro» es un SEGUNDO PASO explícito.** La
 * casilla de la cabecera nunca pasa de la página, porque una acción en lote
 * sobre un conjunto que el usuario no vio es la forma de promover 412 leads
 * creyendo que marcó 25 — y promover escribe datos de terceros en el CRM y no se
 * deshace.
 *
 * **El número no se sobrevende.** Se dice «que cumplen el filtro» y nunca «se
 * promoverán 412»: qué filas son elegibles lo decide un predicado del cliente,
 * así que el modo «todos» no puede saberlo. La verdad la cuenta después el
 * resultado por lead que devuelve el endpoint.
 *
 * **No es pegajosa.** Pegajosa entraría en una discusión de z-index con la
 * cabecera del panel, que ya es `sticky`, a cambio de casi nada sobre 25 filas.
 */
export function SelectionBanner({
  count,
  matchingTotal,
  pageCount,
  allMatching,
  onSelectAllMatching,
  onClear,
  limit,
  messages,
  actions,
  note,
  className,
}: SelectionBannerProps) {
  const msgs = { ...DEFAULT_SELECTION_MESSAGES, ...messages }

  const canOfferAll =
    !allMatching &&
    onSelectAllMatching !== undefined &&
    typeof matchingTotal === "number" &&
    matchingTotal > count
  const overLimit = canOfferAll && limit !== undefined && (matchingTotal ?? 0) > limit

  return (
    <div
      // Superficie propia y elevada, NO un bloque de color: lo único que va en
      // color de acción es el botón, que sí es una acción.
      className={cn(
        "border-border bg-background shadow-float flex flex-wrap items-center gap-3 rounded-md border px-3.5 py-2.5",
        className,
      )}
    >
      <p className="text-sm" aria-live="polite">
        <span className="font-semibold">
          {allMatching
            ? msgs.allMatching(count)
            : pageCount !== undefined && count > pageCount
              ? msgs.selected(count)
              : msgs.page(count)}
        </span>
      </p>

      {canOfferAll && !overLimit && (
        <button
          type="button"
          onClick={onSelectAllMatching}
          className="decoration-primary hover:text-primary focus-visible:ring-ring/50 rounded-sm text-sm font-semibold underline decoration-[1.5px] underline-offset-[3px] outline-none focus-visible:ring-[3px]"
        >
          {msgs.selectAll(matchingTotal)}
        </button>
      )}
      {overLimit && (
        <span className="text-muted-foreground text-[11.5px]">
          {msgs.toomany(limit as number)}
        </span>
      )}
      {allMatching && (
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm font-medium underline underline-offset-[3px] outline-none focus-visible:ring-[3px]"
        >
          {msgs.clear}
        </button>
      )}

      {actions !== undefined && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
      {note !== undefined && (
        <div className="text-muted-foreground flex w-full items-center gap-1.5 text-[11.5px]">
          {note}
        </div>
      )}
    </div>
  )
}
