/**
 * Barrel de tipos del contrato del backend (axi-server, OpenAPI 3.0).
 *
 * `schema.d.ts` se genera con `npm run api:types` desde
 * `../axi-server/openapi/openapi.json` — nunca se edita a mano.
 * Los slices derivan sus DTOs desde `Schemas` en lugar de duplicar interfaces.
 */
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type ApiPaths = paths;

/** Meta de paginación offset del backend (`?page&page_size`). */
export type OffsetMeta = {
  total: number;
  page: number;
  page_size: number;
};

/** Lista paginada por offset: `{ data, meta: { total, page, page_size } }`. */
export type Paginated<T> = {
  data: T[];
  meta: OffsetMeta;
};

/** Página de un timeline paginado por cursor: `{ data, next_cursor? }`. */
export type CursorPage<T> = {
  data: T[];
  next_cursor?: string;
};

/** Query params de paginación offset (defaults del backend: page 1, page_size 25, máx 100). */
export type OffsetQuery = {
  page?: number;
  page_size?: number;
};

/** Query params de paginación cursor (defaults del backend: limit 50, máx 100). */
export type CursorQuery = {
  cursor?: string;
  limit?: number;
};
