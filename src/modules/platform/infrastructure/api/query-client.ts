/**
 * QueryClient DEDICADO del panel de plataforma (no comparte caché con el
 * frontend de tenant). Política del spec §2.3:
 * - Lecturas: `staleTime` 30 s (las listas suben a 60 s vía options por query).
 * - Mutaciones: 204/202 sin body → `invalidateQueries` del recurso, nunca
 *   optimistic updates.
 * - Polling (FE4/FE6): `refetchInterval` condicional por query, pausado
 *   mientras el `ReLoginModal` esté abierto — las queries consultan el flag
 *   `isReAuthing` de `usePlatformAuth()` y devuelven `false` para detenerse.
 * - Un 401 no se reintenta: dispara el re-login (evento del cliente API).
 */
import { QueryClient } from "@tanstack/react-query";
import { isHttpError } from "@/core/api/problem";

export function createPlatformQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx son errores de contrato/estado (no transitorios): no reintentar.
        retry: (failureCount, error) => {
          if (isHttpError(error) && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
