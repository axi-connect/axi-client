# ADR — axi-client (frontend Next.js)

> **Este archivo es la fuente de verdad del ADR.** La copia que vive en el grafo de `codebase-memory`
> es **derivada**: `index_repository` la borra en cada indexado. Tras reindexar, recárgala con
> `manage_adr(project="home-davela-dev-axi-axi-client", mode="update", content=<contenido de este archivo>)`.
> Si actualizas algo, actualízalo **aquí primero** y luego recarga el grafo.

Documento maestro de arquitectura: `docs/architecture.md`. Este ADR resume lo que el grafo NO expresa por sí solo.
Índice al día de: commit `9f202c0a` (main, **al día con origin/main**; 305 commits desde el índice anterior: plantillas HSM con cabecera multimedia, isla viva de Alba, autopilot y los hotfixes de fotos/variantes) — 27.049 nodos / 80.500 aristas.

## Contexto
App web de **axi-connect** (SaaS multi-tenant de atención omnicanal). Next.js 15 App Router + React 19 + TS strict. Consume `axi-server` vía REST `/api/v1/*` y WebSocket (`/inbox`, `/channels`). Repo hermano indexado como `home-davela-dev-axi-axi-server`.

## Decisiones estructurales
1. **Vertical slices** en `src/modules/<slice>/`: agents, analytics, autopilot, billing, calls, catalog, channels, cmo, collections, commercial, companies, crm, dashboard, documents, forms, inbox, intake, integrations, landing, marketing, notifications, onboarding, orders, password, payments, platform, prospecting, quick-actions, rbac, scheduling, shipping, support-access, unsubscribe, users, welcome-kit, workspace. (Lista leída del disco en cada indexado, no de memoria.) El reconocimiento de producto NO es un slice propio: sus ajustes viven en `agents` (`domain/recognition.ts`, `RecognitionSettingsView`) y su chip del inbox en `inbox` (`ui/components/media/ProductRecognitionChip.tsx`). Un slice es dueño de su dominio, datos, estado y UI.
2. **Clean + Hexagonal por slice**: `domain/` (TS puro: cero React, cero http, cero zod) → `application/` (puertos + casos de uso, opcional en slices CRUD) → `infrastructure/` (adapters HTTP, stores, hooks) → `ui/`.
3. **Regla de escape sancionada**: un slice puramente CRUD omite `application/`. No se fabrica ceremonia sin dominio real.
4. **`workspace` es capa de composición** (única excepción): solo `ui/`, agrega stores de `channels` + `inbox` para el inbox. Sin dominio propio. ⚠️ **El slice `conversations` ya no existe en este repo** (pasó a llamarse `inbox`, con `infrastructure/stores/inbox.store.ts`). `docs/architecture.md` ya está corregido (§15 pasó a citar `inbox.store`); la mención de `conversations:reply` en §5 es un permiso RBAC y es correcta, no un slice.
5. **El navegador nunca ve el token**: cookies `HttpOnly` + BFF de Next (`src/app/api/auth/*`, `api/proxy/[...path]`) que inyecta el `Bearer` server-side.
6. **Excepción `/platform/*`**: super admin con auth aislado (token en `sessionStorage`, sin refresh, `openapi-fetch` directo al backend, TanStack Query). NO sigue el contrato de cookies.
7. **Wire en `snake_case`** (1:1 con backend); la UI consume `<Entity>Row`. El mapeo DTO→Row vive en `fetch<Entity>()` o un `mapper`, nunca disperso en componentes.

## Reglas de dependencia (estado verificado)
- `domain` no importa React/http/zod. `application` jamás importa `infrastructure`/`ui`.
- **La UI nunca llama a `http` directamente**: pasa por un `*-service.adapter.ts` del slice.
- `core/` y `shared/` **nunca** importan de `modules/`. **Estado real del índice: 0 aristas `IMPORTS` desde `core/`; 1 desde `shared/`, y es un falso positivo verificado y estable a través de 12 indexados** — `SiteHero.tsx` hace `import Image from 'next/image'` y el resolutor lo apunta a `modules/catalog/domain/__tests__/product-images.test.ts`. La regla se sostiene; no hay violación real.

## Cómo consultar este grafo (gotchas verificados)
- **El re-indexado BORRA el ADR del grafo.** `index_repository` deja `adr_present: false` y `manage_adr(mode='sections')` vuelve vacío. Confirmado en doce indexados consecutivos. Por eso existe este archivo: recarga el grafo desde aquí.
- **Nodos `Route` NO son endpoints del backend.** Son 790 nodos que mezclan rutas del App Router, navegaciones y literales de docs. El path vive en la propiedad **`name`**, no en `path` (`key_path` vacío salvo nodos `infra`).
- **Llamadas reales al API**: aristas `HTTP_CALLS` (758) con `url_path` + `callee`. Filtrar `callee STARTS WITH 'http.'` deja **589 llamadas reales**; el resto son `router.push/replace` (navegación Next, no HTTP).
- Los `url_path` son **relativos al prefijo** `/api/v1` (p.ej. `/orders/:id/cancel`), porque `HttpClient` los expresa así. Para cruzar al backend hay que buscar el controller por decorador (ver `axi-server/docs/rules/adr.md`), no por match de path. ⚠️ **Nunca cruzar con `target_projects=["*"]`.** El MCP ya tiene 6 proyectos indexados (axi, megaguay, catabix) y el comodín produjo **36 aristas FALSAS** de `axi-client` a `megaguay-server`/`catabix-server`: son productos distintos que comparten rutas genéricas (`/orders`, `/orders/stats`, `/channels`). Se detectó repitiendo el cruce con el ID explícito del repo hermano, que devolvió 0 y además limpió las aristas espurias. **Usa siempre el ID explícito**, nunca el comodín.
- **Los contadores de `boundaries` tienen ruido de resolución**: incluyen (a) invocaciones de props callback (`onSubmit`, `isVisible`, `fetcher`, `onDelete`) que van de `shared` a `modules` por diseño — inversión de control de los componentes dirigidos por configuración —, y (b) falsos positivos por nombres genéricos (`fetch` del `HttpClient` resuelto contra el `fetch` de un store, `render` de Testing Library, `Image` de `next/image`). **Antes de declarar una violación de capas, confirmar con aristas `IMPORTS` y abrir el archivo.**
- **La documentación cuenta como nodos.** Editar `docs/architecture.md` cambia el conteo del grafo (los `.md` se indexan como nodos `Section`) sin que haya cambiado una línea de código.
- **`certificates/` y `docs/design/mockups/__pycache__/` se excluyen del índice** (el primero por el HTTPS local del popup de Meta; el segundo apareció con los scripts python de los mockups).
- Hotspots de fan-in: `cn` (702), `errorMessage` (428), `useAlert` (212), `formatMoney` (117), `useAuth` (101), `isHttpError` (98), `HttpClient.post` (86). Tocarlos tiene alcance amplio.
- **El ranking de `hotspots` arrastra colisiones con los globals de los tests.** Al crecer la suite, funciones propias homónimas de un global de Jest suben al top con fan-in falso: `channel-health.describe` (**544** "callers", todos `__tests__` invocando el `describe()` de Jest — 57 → 100 → 106 → 121 → 471 → 544 en seis indexados: crece con la suite, no con el código), `PlanFormSheet.render` (174, el `render` de Testing Library) y `tasks.store.act` (108, el `act()` de Testing Library). Ocupan los puestos 2, 5 y 7 del ranking. Verificar el origen de los callers antes de tratar un hotspot como punto caliente real.

## Consecuencias
- Un listado nuevo = `DataTable` + `usePaginatedList`; un formulario = `DynamicForm` + `*.config.tsx` con Zod; un detalle = `DetailSheet` con `fetchDetail`.
- `src/core/api/schema.d.ts` es **generado** (`npm run api:types` desde `axi-server/openapi/openapi.json`); nunca se edita a mano. `api:types:check` detecta drift en CI.
- Errores RFC 7807 discriminados **siempre por `code`**, nunca por texto.
