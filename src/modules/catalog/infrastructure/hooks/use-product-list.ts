"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HttpError, isHttpError } from "@/core/api/problem";
import type { ProductListItemDTO } from "@/modules/catalog/domain/product";
import {
  serializeProductListQuery,
  toListParams,
  type ProductListQuery,
} from "@/modules/catalog/domain/product-list-query";
import { listProducts } from "@/modules/catalog/infrastructure/services/product-service.adapter";

/** Default del backend para `/catalog/products` (20, no 25). */
export const PRODUCTS_PAGE_SIZE = 20;

/**
 * El listado de productos controlado por la URL (catálogo premium F2).
 *
 * No usa `usePaginatedList` a propósito: ese hook guarda página y búsqueda en
 * su propio estado y siempre arranca en la página 1 sin búsqueda, así que con
 * una URL ya filtrada dispararía primero una petición sin filtros y, si esa
 * respondía después, pintaría la página equivocada. Aquí la URL es la única
 * fuente y cada respuesta se descarta si ya no es la última pedida.
 *
 * `settled` distingue «todavía no sé» de «no hay nada»: el estado vacío no se
 * pinta hasta la primera respuesta (antes podía parpadear en el primer render).
 */
export function useProductList(query: ProductListQuery) {
  const [items, setItems] = useState<ProductListItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<HttpError | null>(null);
  const [nonce, setNonce] = useState(0);
  const generation = useRef(0);
  const key = serializeProductListQuery(query);

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    listProducts({ ...toListParams(query), q: query.q, page: query.page, page_size: PRODUCTS_PAGE_SIZE })
      .then((result) => {
        if (current !== generation.current) return;
        setItems(result.data);
        setTotal(result.meta.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (current !== generation.current) return;
        setError(
          isHttpError(err)
            ? err
            : new HttpError({
                status: 0,
                code: "client/network",
                message: err instanceof Error ? err.message : "Error de red",
              }),
        );
      })
      .finally(() => {
        if (current !== generation.current) return;
        setLoading(false);
        setSettled(true);
      });
    // `key` resume `query`: la petición cambia cuando cambia la URL canónica.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { items, total, loading, settled, error, refresh };
}
