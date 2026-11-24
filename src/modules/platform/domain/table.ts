/**
 * La aritmética de `PlatformTable` (rediseño F1): buscar, ordenar y paginar
 * en el cliente, declarados UNA vez. TypeScript puro y con tests.
 *
 * Ninguna lista de la consola pagina en el servidor (plan §5): la tabla
 * trabaja sobre la lista completa, así que las cifras del pie («N de M») son
 * sobre el total y no sobre la página (el bug de Cartera).
 */
import { normalize } from "./command-search";

export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;

/** Filas que contienen TODAS las palabras en alguno de sus textos (sin tildes ni mayúsculas). */
export function filterRows<T>(rows: readonly T[], query: string, textsOf: (row: T) => readonly (string | null | undefined)[]): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...rows];
  return rows.filter((row) => {
    const haystack = normalize(textsOf(row).filter(Boolean).join(" "));
    return words.every((word) => haystack.includes(word));
  });
}

/**
 * Orden estable: números por valor, textos con `localeCompare` en español
 * (las fechas ISO ordenan como texto). Los vacíos van SIEMPRE al final,
 * también en descendente: «sin dato» no es «el menor».
 */
export function sortRowsBy<T>(rows: readonly T[], valueOf: (row: T) => SortValue, dir: SortDir): T[] {
  const indexed = rows.map((row, index) => ({ row, index, value: valueOf(row) }));
  indexed.sort((a, b) => {
    const aEmpty = a.value === null || a.value === undefined || a.value === "";
    const bEmpty = b.value === null || b.value === undefined || b.value === "";
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
    const cmp =
      typeof a.value === "number" && typeof b.value === "number"
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), "es", { numeric: true });
    if (cmp === 0) return a.index - b.index;
    return dir === "asc" ? cmp : -cmp;
  });
  return indexed.map((entry) => entry.row);
}

export type PageSlice<T> = { rows: T[]; page: number; pageCount: number; from: number; to: number; total: number };

/** La página pedida, recortada a las que existen (un filtro que deja menos filas no deja una página vacía). */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return { rows: slice, page: current, pageCount, from: total === 0 ? 0 : start + 1, to: start + slice.length, total };
}
