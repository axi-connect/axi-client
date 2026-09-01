# ADR — axi-client (frontend Next.js)

> **Este archivo es la fuente de verdad del ADR.** La copia que vive en el grafo de `codebase-memory`
> es **derivada**: `index_repository` la borra en cada indexado. Tras reindexar, recárgala con
> `manage_adr(project="home-davela-dev-axi-axi-client", mode="update", content=<contenido de este archivo>)`.
> Si actualizas algo, actualízalo **aquí primero** y luego recarga el grafo.

Documento maestro de arquitectura: `docs/architecture.md`. Este ADR resume lo que el grafo NO expresa por sí solo.
Índice al día de: commit `e16ab3b` (main) — 9.746 nodos / 25.182 aristas.

## Contexto
App web de **axi-connect** (SaaS multi-tenant de atención omnicanal). Next.js 15 App Router + React 19 + TS strict. Consume `axi-server` vía REST `/api/v1/*` y WebSocket (`/inbox`, `/channels`). Repo hermano indexado como `home-davela-dev-axi-axi-server`.

## Decisiones estructurales
1. **Vertical slices** en `src/modules/<slice>/`: companies, agents, users, rbac, catalog, channels, conversations, crm, quick-actions, forms, marketing, **billing**, platform, workspace. Un slice es dueño de su dominio, datos, estado y UI.
2. **Clean + Hexagonal por slice**: `domain/` (TS puro: cero React, cero http, cero zod) → `application/` (puertos + casos de uso, opcional en slices CRUD) → `infrastructure/` (adapters HTTP, stores, hooks) → `ui/`.
3. **Regla de escape sancionada**: un slice puramente CRUD omite `application/`. No se fabrica ceremonia sin dominio real.
4. **`workspace` es capa de composición** (única excepción): solo `ui/`, agrega stores de `channels` + `conversations` para el inbox. Sin dominio propio.
5. **El navegador nunca ve el token**: cookies `HttpOnly` + BFF de Next (`src/app/api/auth/*`, `api/proxy/[...path]`) que inyecta el `Bearer` server-side.
6. **Excepción `/platform/*`**: super admin con auth aislado (token en `sessionStorage`, sin refresh, `openapi-fetch` directo al backend, TanStack Query). NO sigue el contrato de cookies.
7. **Wire en `snake_case`** (1:1 con backend); la UI consume `<Entity>Row`. El mapeo DTO→Row vive en `fetch<Entity>()` o un `mapper`, nunca disperso en componentes.

## Reglas de dependencia (estado verificado)
- `domain` no importa React/http/zod. `application` jamás importa `infrastructure`/`ui`.
- **La UI nunca llama a `http` directamente**: pasa por un `*-service.adapter.ts` del slice.
- `core/` y `shared/` **nunca** importan de `modules/`. **Estado real del índice: 0 aristas `IMPORTS` desde `core/`; 1 desde `shared/`, y es un falso positivo verificado y estable a través de 6 indexados** — `SiteHero.tsx` hace `import Image from 'next/image'` y el resolutor lo apunta a `modules/catalog/domain/__tests__/product-images.test.ts`. La regla se sostiene; no hay violación real.

## Cómo consultar este grafo (gotchas verificados)
- **El re-indexado BORRA el ADR del grafo.** `index_repository` deja `adr_present: false` y `manage_adr(mode='sections')` vuelve vacío. Confirmado en seis indexados consecutivos. Por eso existe este archivo: recarga el grafo desde aquí.
- **Nodos `Route` NO son endpoints del backend.** Son 380 nodos que mezclan rutas del App Router, navegaciones y literales de docs. El path vive en la propiedad **`name`**, no en `path` (`key_path` vacío salvo nodos `infra`).
- **Llamadas reales al API**: aristas `HTTP_CALLS` (417) con `url_path` + `callee`. Filtrar `callee STARTS WITH 'http.'` deja **328 llamadas reales**; el resto son `router.push/replace` (navegación Next, no HTTP).
- Los `url_path` son **relativos al prefijo** `/api/v1` (p.ej. `/orders/:id/cancel`), porque `HttpClient` los expresa así. Para cruzar al backend hay que buscar el controller por decorador (ver `axi-server/docs/rules/adr.md`), no por match de path.
- **Los contadores de `boundaries` tienen ruido de resolución**: incluyen (a) invocaciones de props callback (`onSubmit`, `isVisible`, `fetcher`, `onDelete`) que van de `shared` a `modules` por diseño — inversión de control de los componentes dirigidos por configuración —, y (b) falsos positivos por nombres genéricos (`fetch` del `HttpClient` resuelto contra el `fetch` de un store, `render` de Testing Library, `Image` de `next/image`). **Antes de declarar una violación de capas, confirmar con aristas `IMPORTS` y abrir el archivo.**
- **La documentación cuenta como nodos.** Editar `docs/architecture.md` cambia el conteo del grafo (los `.md` se indexan como nodos `Section`) sin que haya cambiado una línea de código.
- **`certificates/` se excluye del índice** (apareció al añadir HTTPS local para el popup de Meta).
- Hotspots de fan-in: `cn` (374), `errorMessage` (220), `showAlert` (146), `useAlert` (105), `HttpClient.post` (50), `HttpClient.get` (40). Tocarlos tiene alcance amplio.

## Consecuencias
- Un listado nuevo = `DataTable` + `usePaginatedList`; un formulario = `DynamicForm` + `*.config.tsx` con Zod; un detalle = `DetailSheet` con `fetchDetail`.
- `src/core/api/schema.d.ts` es **generado** (`npm run api:types` desde `axi-server/openapi/openapi.json`); nunca se edita a mano. `api:types:check` detecta drift en CI.
- Errores RFC 7807 discriminados **siempre por `code`**, nunca por texto.
