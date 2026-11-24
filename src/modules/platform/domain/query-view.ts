/**
 * La regla «error ≠ vacío» del panel de plataforma (rediseño F1).
 *
 * El bug que la motiva: en Proveedores, si fallaba la carga de las cuentas se
 * pintaba «Todavía no hay ningún proveedor conectado». Un vacío afirma algo
 * («no hay nada»); un error dice que no lo sabemos. Pintar uno por el otro
 * miente. Esta función decide qué estado mostrar y es la ÚNICA que lo decide
 * (la usa `QueryBoundary`).
 *
 * - Sin datos y con error → `error`. Nunca `empty`.
 * - Cargando la primera vez → `loading`.
 * - Con datos vacíos → `empty`.
 * - Con datos y un refresco fallido → `ready` con `refreshFailed`: no se
 *   tiran los datos que ya se ven por un fallo pasajero, pero se avisa.
 */
export type QueryView = "loading" | "error" | "empty" | "ready";

export type QueryLike<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
};

export function queryView<T>(
  query: QueryLike<T>,
  isEmpty: (data: T) => boolean,
): { view: QueryView; refreshFailed: boolean } {
  if (query.data === undefined) {
    if (query.isError) return { view: "error", refreshFailed: false };
    return { view: "loading", refreshFailed: false };
  }
  if (isEmpty(query.data)) {
    // Un vacío con el último refresco en error no se afirma: puede que ya no lo esté.
    return query.isError ? { view: "error", refreshFailed: false } : { view: "empty", refreshFailed: false };
  }
  return { view: "ready", refreshFailed: query.isError };
}
