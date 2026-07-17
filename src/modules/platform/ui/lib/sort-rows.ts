/**
 * Orden client-side genérico para las tablas del panel (ningún listado tiene
 * paginación server). Único comparador del slice — números por valor,
 * strings con `localeCompare` es (las fechas ISO ordenan lexicográficamente).
 */
export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  by: keyof T & string,
  dir: "asc" | "desc",
): T[] {
  const sorted = [...rows].sort((a, b) => {
    const va = a[by];
    const vb = b[by];
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va ?? "").localeCompare(String(vb ?? ""), "es");
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}
