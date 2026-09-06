# Arquitectura — axi-client (frontend)

> **Documento maestro de arquitectura del frontend.** Se consulta SIEMPRE antes de diseñar o implementar cualquier cosa en el proyecto. Si una decisión de código contradice este documento, o el documento está desactualizado, se corrige primero aquí (vía PR) y luego se implementa.
>
> Convención del proyecto: **todo lo técnico en inglés** (nombres de archivos, carpetas, funciones, clases, variables, tipos, componentes); **toda la documentación, comentarios, guías, planes y tareas en español**. Los nombres de propiedades que viajan por la red (DTO/JSON) van en `snake_case` para coincidir 1:1 con el contrato del backend (`axi-server`); ver §5.
>
> Documento hermano: `axi-server/docs/architecture.md` (backend). Este frontend consume su API REST y sus WebSockets. Cuando un contrato cambie, ambos documentos deben quedar consistentes.
>
> **Estado (julio 2026): migrado al backend v2 (axi-connect).** Contrato bajo `/api/v1/*`, tipos generados desde `axi-server/openapi/openapi.json` (`npm run api:types`), errores RFC 7807 discriminados por `code`, WebSocket en namespaces `/inbox` y `/channels`. La guía de consumo del backend es `axi-server/docs/integracion_frontend.md`.
>
> 🧠 **La base de conocimientos del código está en `codebase-memory` (MCP).** Antes de explorar el repo a mano, consulta el grafo indexado: es la primera herramienta para cualquier búsqueda estructural. Ver **§0**.

---

## 0. Base de conocimientos — grafo `codebase-memory` (MCP)

**La base de conocimientos de este proyecto vive en `codebase-memory`**, un servidor MCP que mantiene un grafo del código (símbolos, llamadas, imports, rutas, métricas de complejidad). Es la **primera** herramienta a usar para explorar: sustituye a `grep`/`glob` cuando buscas definiciones, implementaciones o relaciones. `grep`/`glob`/`read` quedan para texto plano, configs y archivos no-código.

Ambos repos del producto están indexados:

| Proyecto | ID en el grafo | Ruta local |
|---|---|---|
| Frontend (este repo) | `home-davela-dev-axi-axi-client` | `/home/davela/dev/axi/axi-client` |
| Backend (hermano) | `home-davela-dev-axi-axi-server` | `/home/davela/dev/axi/axi-server` |

> Los IDs los deriva el MCP de la **ruta absoluta** del repo (el parámetro `name` de `index_repository` se ignora). Si clonas en otra ruta, tus IDs serán distintos: confírmalos con `list_projects`.

### 0.1 Herramientas

- **`search_graph(query="...")`** — búsqueda BM25 en lenguaje natural (parte identificadores camelCase, prioriza funciones/rutas/clases). Punto de entrada por defecto.
- **`search_graph(name_pattern=…/qn_pattern=…)`** — match exacto por regex. **`semantic_query=["a","b"]`** (array, no string) para búsqueda vectorial que salva diferencias de vocabulario.
- **`get_code_snippet(qualified_name)`** — fuente exacta de un símbolo, con rango preciso.
- **`trace_path(function_name, mode=calls|data_flow|cross_service)`** — cadenas de llamada y análisis de impacto.
- **`query_graph(query)`** — Cypher para patrones multi-hop, agregaciones y métricas (`complexity`, `transitive_loop_depth`, `linear_scan_in_loop`).
- **`get_architecture(aspects=[...])`** — estructura, `boundaries`, `hotspots` y `clusters` (detección de comunidades Leiden: revela los módulos de facto, que a menudo cruzan el layout de carpetas).
- Mantenimiento: **`index_repository`**, **`index_status`**, **`detect_changes`**, **`get_graph_schema`**, **`list_projects`**, **`manage_adr`**.

Cada repo tiene además un **ADR versionado**: `docs/adr.md` en este repo y `axi-server/docs/rules/adr.md` en el backend, con decisiones, invariantes y los gotchas del grafo. **El archivo es la fuente de verdad**; la copia del grafo (`manage_adr(mode='get')`) es derivada. Leerlo antes de un cambio arquitectónico.

### 0.2 Mantener el índice fresco

El índice **no se actualiza solo**. Tras cambios relevantes (nuevos slices, refactors, cambios de contrato):

```
index_repository(repo_path="/home/davela/dev/axi/axi-client", mode="full", persistence=true)
```

`mode`: `full` (todos los archivos + aristas de similitud/semántica), `moderate` (filtrado + semántica), `fast` (sin semántica). `detect_changes(project=...)` muestra el diff frente a la base y su impacto.

El artefacto `.codebase-memory/graph.db.zst` está en **`.gitignore`**: cada dev indexa en local (toma segundos). No se versiona.

> ⚠️ **Re-indexar BORRA el ADR del grafo.** Tras `index_repository`, `adr_present` vuelve a `false` y `manage_adr(mode='get')` queda vacío. No se pierde nada: el ADR vive versionado en **`docs/adr.md`**. Recarga el grafo desde el archivo con `manage_adr(project="home-davela-dev-axi-axi-client", mode="update", content=<contenido de docs/adr.md>)`.

### 0.3 Gotchas de este grafo (verificados)

- **Los nodos `Route` NO son los endpoints del backend.** Los 498 nodos mezclan rutas del App Router, navegaciones y literales sueltos de documentación. El path vive en la propiedad **`name`**, no en `path` (`key_path` está vacío salvo nodos de infra).
- **Las llamadas reales al API son aristas `HTTP_CALLS`** (514). Filtra `callee STARTS WITH 'http.'` para quedarte con las **418 reales**; el resto son `router.push`/`router.replace`, o sea navegación de Next, no HTTP.
- Los `url_path` de esas aristas son **relativos al prefijo `/api/v1`** (p.ej. `/orders/:id/cancel`), porque así los expresa `HttpClient` (§7.1).
- **No existen aristas cross-repo automáticas con `axi-server`**: `index_repository(mode='cross-repo-intelligence')` devuelve 0 y es un límite estructural, no un error de configuración — el BFF proxy interpone la indirección y el backend no expone nodos `Route` reales. **Puente manual:** toma el `url_path` del frontend y busca en el backend el `@Controller` cuyo prefijo coincida (`MATCH (c:Class) WHERE c.decorators CONTAINS 'Controller'`). La fuente de verdad del contrato sigue siendo `axi-server/openapi/openapi.json`.
- **Los contadores de `boundaries` de `get_architecture` tienen ruido de resolución.** Incluyen invocaciones de *props callback* (`onSubmit`, `isVisible`, `fetcher`, `onDelete`) que van de `shared` a `modules` **por diseño** — es la inversión de control de los componentes dirigidos por configuración (§12) — y falsos positivos por nombres genéricos (el `fetch` de `HttpClient` resuelto contra el `fetch` de un store, el `render` de Testing Library). **Antes de declarar una violación de las reglas de §3.3, confírmalo con aristas `IMPORTS`, no con `CALLS`.** En el índice actual hay **0 aristas `IMPORTS` desde `core/` y 1 desde `shared/`**, y esa única es un falso positivo verificado (`SiteHero.tsx` hace `import Image from 'next/image'` y el resolutor lo apunta a un test de `modules/catalog`): la regla se sostiene.
- Hotspots de fan-in de este repo: `cn` (410), `errorMessage` (265), `useAlert` (120), `useAuth` (63), `HttpClient.post` (54), `isHttpError` (46). Tocarlos tiene alcance amplio.
- **El ranking de `hotspots` también arrastra colisiones con los globals de los tests.** Al crecer la suite, funciones propias que se llaman igual que un global de Jest suben al top con fan-in falso: `channel-health.describe` (57 "callers", todos archivos `__tests__` que en realidad invocan el `describe()` de Jest) y `DatabaseConnectionSheet.render` (61, el `render` de Testing Library). Antes de tratar un hotspot como punto caliente real, mira de dónde vienen sus callers.

---

## 1. Visión y principios

**axi-connect** es una plataforma SaaS multi-tenant de atención al cliente omnicanal (WhatsApp, Instagram, Messenger) con agentes de IA, handoff a operadores humanos, CRM y marketplace de influencia. Este repositorio (`axi-client`) es la **aplicación web**: landing pública, marketplace, registro autoservicio y onboarding guiado (`docs/modules/onboarding.md`), y el panel privado (dashboard, workspace/inbox en vivo, administración de empresas, agentes, usuarios y RBAC).

Principios rectores (ordenados por prioridad):

1. **Organización por capacidad de negocio, no por capa técnica.** El código vive en *vertical slices* (`modules/companies`, `modules/channels`…). Un slice es dueño de su dominio, su acceso a datos, su estado y su UI.
2. **Dependencias hacia adentro.** La UI no conoce los detalles de transporte HTTP; el dominio no conoce React ni el cliente HTTP. Los *puertos* (interfaces) se definen en la capa de aplicación y los *adapters* los implementan en infraestructura (hexagonal).
3. **El navegador nunca ve el token.** Los tokens (`accessToken`, `refreshToken`) son cookies `HttpOnly`. El browser habla con el backend a través de la capa BFF de Next (`/api/auth/*`, `/api/proxy`), que inyecta el `Bearer` del lado del servidor. Ver §7 y §8.
4. **Contratos primero.** Los tipos de dominio y DTOs modelan el contrato del backend. Un cambio de contrato se refleja en `domain/` antes de tocar la UI.
5. **Configuración por datos, no por código.** Tablas (`ColumnDef`), formularios (`FieldConfig` + Zod) y navegación (sidebar desde `/api/auth/sidebar`) se declaran como configuración; los componentes genéricos (`DataTable`, `DynamicForm`) la interpretan.
6. **Accesibilidad y tema son requisitos, no extras.** Todo componente respeta light/dark, `prefers-reduced-motion`, focus management y semántica ARIA (los primitivos vienen de Radix).
7. **Rendimiento por defecto.** RSC donde sea posible, `"use client"` solo cuando hay interactividad, memoización en componentes de listas, y `cache: "no-store"` explícito en datos autenticados.

---

## 2. Stack tecnológico

| Componente | Elección | Justificación |
|---|---|---|
| Framework | **Next.js 15.4.6** (App Router, RSC) | Route groups, parallel/intercepting routes, route handlers como BFF, RSC + streaming |
| UI | **React 19** | Server/Client Components, `Suspense`, transiciones |
| Lenguaje | **TypeScript 5** (`strict`, `moduleResolution: bundler`) | Type-safety end-to-end |
| Estilos | **Tailwind CSS v4** (CSS-first, sin `tailwind.config`) | Tokens semánticos en `globals.css` vía `@theme inline`; `@custom-variant dark` |
| Primitivos UI | **shadcn/ui (estilo "new-york") + Radix UI** | Componentes accesibles, headless, componibles |
| Iconos | **lucide-react** (+ `@heroicons/react`, `react-icons` puntuales) | Set principal lucide |
| Animación | **framer-motion** | Transiciones de sheets/modales; respeta reduced-motion |
| Formularios | **react-hook-form + Zod** (`@hookform/resolvers`) | Un schema Zod = validación + tipo TS |
| Estado | **Zustand** + **React Context** | Estado de slice ligero (§9) |
| Tiempo real | **socket.io-client** | Inbox y canales en vivo (§10) |
| Tema | **next-themes** (estrategia `class`) | light/dark/system |
| Utilidades UI | **class-variance-authority (cva)**, **cmdk** | Variantes de componentes, command palette |
| Testing | **Jest 29 + Testing Library + jsdom + ts-jest** | Unit/component |
| Lint | **ESLint 9** (`next/core-web-vitals` + `next/typescript`) | Calidad y reglas de Next |

Node 20+ (validado con Node 22 LTS). Backend por defecto: `http://172.18.16.1:3001` (configurable, §13).

---

## 3. Arquitectura general

Combinamos tres enfoques complementarios (mismos que el backend, adaptados al frontend):

- **Vertical slice**: el código se organiza por capacidad de negocio en `src/modules/<slice>/`, no por capa técnica global. Cada slice es dueño de sus tipos, su acceso a datos, su estado y su UI.
- **Clean Architecture**: dentro de cada slice, las dependencias apuntan solo hacia adentro (`ui → application → domain`; `infrastructure` implementa hacia `application`).
- **Hexagonal (ports & adapters)**: la capa de aplicación define *puertos* (interfaces); infraestructura los implementa (adapters HTTP, stores, hooks). La UI consume puertos/stores, nunca el transporte directamente.

> **Nota de convergencia (estado actual).** Hoy los slices usan un modelo ligero de tres carpetas (`domain/ + infrastructure/ + ui/`) y la capa de aplicación está implícita (repartida entre stores y config). Este documento fija el **objetivo** (la regla) y marca explícitamente lo que hay que converger. La ceremonia se aplica **donde hay lógica real** (ver regla de escape en §3.2).

### 3.1 Estructura del proyecto

```
axi-client/
├── docs/                              # documentación (este archivo vive aquí)
│   └── architecture.md
├── public/                           # estáticos: fonts/ (Nexa), animations/ (Lottie), images/
├── src/
│   ├── middleware.ts                 # edge guard de rutas privadas (§8)
│   ├── app/                          # App Router (rutas, layouts, BFF)
│   │   ├── layout.tsx                # root: fuentes + providers + slot @modal
│   │   ├── globals.css               # tokens de tema + utilidades de marca (§11)
│   │   ├── @modal/                   # slot paralelo raíz (p.ej. logout interceptado)
│   │   ├── (public)/                 # grupo público: landing, marketplace, auth
│   │   ├── (private)/                # grupo privado: (content)/{dashboard,admin,settings} + workspace/*
│   │   └── api/                      # BFF: auth/* + proxy/[...path] (§7)
│   ├── core/                         # transversal; NUNCA lógica de negocio de un slice
│   │   ├── config/                   # env.ts (vars públicas), routes.ts (rutas públicas)
│   │   ├── services/                 # http.ts (HttpClient), api.ts (ApiResponse, parseHttpError)
│   │   ├── providers/                # theme-provider, auth-provider, alert-provider
│   │   ├── hooks/                    # use-mobile, use-auto-scroll
│   │   ├── lib/                      # utils (cn), icons
│   │   ├── websocket/                # websocket.service, websocket-event-bus
│   │   ├── types/                    # declaraciones globales (.d.ts)
│   │   └── styles/                   # helpers de estilo (gradients)
│   ├── modules/                      # vertical slices (§3.2)
│   │   ├── companies/  agents/  users/  rbac/
│   │   ├── catalog/  orders/  crm/  analytics/  dashboard/  notifications/
│   │   │                                        # docs/modules/<slice>.md por cada uno
│   │   ├── channels/                            # tiempo real: QR y estado de WhatsApp Web
│   │   ├── inbox/                               # conversación, mensajes, handoff, adjuntos y
│   │   │                                        #   rail de contexto (docs/modules/inbox.md)
│   │   ├── quick-actions/  landing/
│   │   ├── platform/                            # consola super admin /platform (auth aislado, §8.1)
│   │   └── workspace/                           # capa de composición: sidebar de canales
│   └── shared/                       # design system + utilidades reutilizables
│       ├── components/
│       │   ├── ui/                   # primitivos shadcn/ui + Radix (§11)
│       │   ├── features/             # componentes complejos: data-table, detail-sheet,
│       │   │                         #   dynamic-form, tree-view, multi-select,
│       │   │                         #   timeline, field-list (§12)
│       │   └── layout/               # sidebar, site (landing), private-header
│       ├── api/                      # buildListParams, usePaginatedList (§9)
│       └── auth/                     # auth.types, auth.hooks, auth.handlers (§8)
├── components.json                   # config shadcn/ui (new-york, alias, lucide)
├── next.config.ts  tsconfig.json  eslint.config.mjs  postcss.config.mjs  jest.config.cjs
└── package.json
```

### 3.2 Anatomía de un slice (objetivo canónico)

```
src/modules/<slice>/
├── public.ts                       # superficie pública para OTROS slices (§3.3 regla 5);
│                                   #   solo si el slice tiene consumidores externos
├── domain/                         # TypeScript PURO: cero React, cero http, cero zod
│   ├── <entity>.ts                 # tipos de dominio + contratos: <Entity>Row, <Entity>DTO,
│   │                               #   Create<Entity>DTO, Update<Entity>DTO, List<Entity>Params
│   ├── enums.ts                    # enums/uniones del dominio (p.ej. ChannelProvider)
│   └── <feature>.types.ts          # tipos de eventos WS, etc. (p.ej. websocket.types.ts)
├── application/                    # (opcional en slices CRUD) casos de uso + puertos
│   ├── ports/                      # interfaces hexagonales + tokens; la UI/infra dependen de esto
│   │   └── <entity>.repository.ts  # interface + const <ENTITY>_REPOSITORY
│   └── use-cases/                  # una intención de negocio por archivo (execute())
├── infrastructure/                 # ADAPTERS (implementan puertos / hablan con el exterior)
│   ├── services/                   # <entity>-service.adapter.ts → usan `http` (§7)
│   ├── store/                      # <slice>.store.ts (Zustand) o <slice>.context.tsx (Context) (§9)
│   ├── hooks/                      # hooks de infra (p.ej. use-channels-websocket.ts) (§10)
│   └── mappers/                    # DTO ↔ Row cuando el mapeo no es trivial
└── ui/                             # presentación React ("use client")
    ├── components/                 # <Entity>DetailSheet.tsx, modales, galerías
    ├── forms/                      # <Entity>Form.tsx + config/<entity>.config.tsx
    │                               #   (Zod schema + defaultValues + build fields + toDTO)
    └── tables/                     # <entity>.config.tsx (ColumnDef[] + fetch<Entity>())
                                    #   + <entity>.actions.tsx (menú de fila)
```

**Slice canónico de referencia: `companies`** (patrón CRUD completo)

- `domain/company.ts` — contratos puros: `CompanyRow` (forma que consume la tabla), `CompanyDTO`/`ApiCompaniesPayload` (respuesta del backend), `CreateCompanyDTO`/`UpdateCompanyDTO`, `ListCompaniesParams`.
- `infrastructure/company-service.adapter.ts` — funciones async contra `/identities/companies` que devuelven `ApiResponse<T>` usando el singleton `http`.
- `ui/form/company.config.tsx` — `companyFormSchema` (Zod), `defaultCompanyFormValues`, `buildCompanyFormFields()` (con `createInputField`/`createCustomField`) y `toCreateCompanyDTO()`.
- `ui/form/CompanyForm.tsx` — wrapper de `<DynamicForm>`; decide create vs update según `defaultValues.id`.
- `ui/table/company.config.tsx` — `companyColumns: ColumnDef[]` + `fetchCompanies()` (hace el mapeo DTO→Row).
- `ui/table/company.actions.tsx` — `CompanyRowActions`: dropdown Ver/Editar/Eliminar + modal de confirmación.

**Casos representativos:**
- `channels` — slice con tiempo real: añade `domain/enums.ts`, `domain/websocket.types.ts`, `infrastructure/hooks/` (WS) e `infrastructure/store/{channels.store.ts, websocket.context.tsx}`.
- `inbox` — slice más grande y el de mayor superficie de tiempo real: añade `domain/inbox.ts` (alias de `Schemas` + tipos de UI + parsers puros), `infrastructure/{services,stores,realtime,hooks}` y una `ui/` con subcarpetas por capacidad (`composer/`, `media/`, `context-rail/`). Consume `crm` **solo** por su `public.ts` para el rail de contexto (§3.3.5). Doc: `docs/modules/inbox.md`.
- `marketing` — slice con el `domain/` más grande del panel (10 módulos puros: máquina de estados de campaña, embudo, borrador del wizard, motivos de omisión, espejo del renderer de plantillas). Consume `crm`, `catalog` y `channels` **solo** por sus barrels. Doc: `docs/modules/marketing.md`.
- `workspace` — **capa de composición** (excepción sancionada): solo `ui/`, monta el sidebar de canales del workspace agregando `channels`. No tiene dominio propio.

**Regla de escape sancionada:** un slice puramente CRUD puede omitir `application/` (y usar `domain/ + infrastructure/ + ui/`) manteniendo puertos solo donde exista lógica real. No se fabrica ceremonia donde no hay dominio — igual que en el backend.

### 3.3 Reglas de dependencia

Dentro de un slice (dependencias solo hacia adentro):

1. `domain` → solo TypeScript puro y otros tipos de `domain`. **Prohibido** importar React, `http`, `zod`, componentes o infraestructura.
2. `application` → `domain`. Define puertos e implementa casos de uso; **jamás** importa `infrastructure`, `ui` ni React.
3. `infrastructure` → `application` (implementa sus puertos) + `domain` + `core/*` + `shared/api`. Aquí (y solo aquí) se usa `http` y `WebSocketService`.
4. `ui` → `application`/`infrastructure` (stores, hooks, services expuestos) + `domain` + `shared/components`. **La UI nunca llama a `http` directamente**: pasa por un service/store del slice.

Entre slices:

5. Un slice importa de otro **solo a través de su barrel `public.ts`** (`src/modules/<slice>/public.ts`), que declara explícitamente su superficie pública: tipos de `domain`, labels/helpers puros, sus hooks/store/context y sus puertos. **Prohibido** importar rutas internas de otro slice (`infrastructure/`, `ui/components/`, casos de uso), incluso si el símbolo está exportado. Si un slice necesita algo que no está en el `public.ts` del otro, se **añade al barrel en el mismo PR** (decisión consciente y revisable), nunca se importa por la ruta profunda.
   - Un slice sin consumidores externos **no necesita `public.ts`**: el barrel aparece cuando aparece el primer consumidor.
   - Lo que se publica queda acoplado: preferir tipos y hooks a componentes. Un componente en el barrel debe ser presentacional o autosuficiente (traer sus propios datos), no depender del contexto del slice dueño.
   - Barrels existentes:
     - `modules/crm/public.ts` — consumido por `inbox` (rail de contexto de la conversación), `dashboard` (labels de ciclo de vida) y `marketing` (el DSL de audiencia: `AudienceFilterBuilder`, `describeSegmentFilters`, `compactSegmentFilters`, `listSegments`, `listTags`).
     - `modules/catalog/public.ts` — consumido por `marketing` para el `VariantPicker` del regalo de una promoción.
     - `modules/channels/public.ts` — consumido por `marketing` para elegir el canal cloud del que cuelgan las plantillas de Meta (se creó en vez de duplicar la llamada a `/channels`: el dueño del recurso es uno solo) y por `onboarding`, que embebe el wizard de conexión (`ConnectChannelFlow`) en su paso «WhatsApp»: es el MISMO flujo de `/settings/channels/connect`, no una copia.
     - `modules/companies/public.ts` — `SchedulesEditor`, `loadMyCompanyOnce`, `invalidateMyCompanyCache`; consumido por `scheduling` y `onboarding`.
     - `modules/agents/public.ts` — tipos y caché de agentes (para `crm`) y, desde el onboarding, el catálogo de personajes (`listCharacters`, `characterStyle`) y `AiAgentDTO`.
     - `modules/landing/public.ts` — la oferta comercial (`PRICING`, `MODULES`, precios y helpers, `MODULE_ICONS`); consumido por `onboarding` para preseleccionar y resumir lo elegido en `/comenzar`. La landing es la única dueña de ese copy y de esas cifras.
     - `modules/onboarding/public.ts` — `OnboardingResumeBanner` (autosuficiente) para el `dashboard`.
6. `workspace` es la única capa de composición: puede consumir `channels` para montar el sidebar del workspace (documentado).
7. `core/` y `shared/` **nunca** importan de `modules/`. Comunicación desacoplada preferente: `WebSocketEventBus` (§10), stores compartidos, o CustomEvents del DOM (§9).

**Deuda saldada en la migración v2** (histórico):
- ✅ Los tipos de tiempo real viven en `core/realtime/` (core ya no importa de `modules/`).
- ✅ Subcarpetas unificadas en plural (`services/`, `stores/`, `forms/`, `tables/`, `hooks/`, `realtime/`).
- ✅ La autenticación es el **default** del `HttpClient`; `authenticate: false` existe solo para endpoints públicos (login/refresh).
- ✅ `cn()` usa `clsx` + `tailwind-merge`.
- ✅ La verja de ESLint está activa en `next build` (0 errores).

Estas reglas son la política del proyecto; el objetivo es hacerlas cumplir con `eslint` (import boundaries) como en el backend.

---

## 4. Capa transversal — `core/` y `shared/`

### 4.1 `src/core/` (infraestructura transversal; sin lógica de negocio)

- **`config/env.ts`** — variables públicas: `API_BASE_URL` (default `http://localhost:3000`), `API_PREFIX = "/api/v1"`, `WS_BASE_URL`. Única fuente de URLs del backend.
- **`config/routes.ts`** — `PUBLIC_PATHS` + `isPublicPath(pathname)`, más `NAV_PATH_ALIASES`/`UNIMPLEMENTED_NAV_PATHS`/`resolveNavPath()` (mapeo de paths de `/me/navigation` a rutas del frontend).
- **`api/`** — el contrato del backend: `schema.d.ts` (GENERADO con `npm run api:types` desde `axi-server/openapi/openapi.json`; nunca se edita a mano), `types.ts` (`Schemas`, `Paginated<T>`, `CursorPage<T>`) y `problem.ts` (`ProblemDetails`, `HttpError`, `parseHttpError`, `API_ERROR_CODES` — RFC 7807, discriminación por `code`).
- **`services/http.ts`** — `HttpClient` + singleton `http` (§7). Autentica por defecto; lanza `HttpError`.
- **`realtime/`** — `events.ts` (mapas tipados de eventos/comandos WS por namespace), `socket-manager.ts` (singleton por namespace, rotación de token, backoff) y `use-socket.ts` (hooks base). Ver §10.
- **`providers/`** — `ThemeProvider` (next-themes), `AuthProvider` (sesión + `hasPermission(code)` con wildcard `resource:*`; expone `useAuth`/`useSession`), `AlertProvider` (`showAlert`/`showModal`/`closeModal`, expone `useAlert`), `SplashProvider` (splash post-login; expone `useSplash`/`useSplashOptional` + `AppReadySignal`).
- **`styles/motion.ts`** — presets de animación de marca (`spring`, `fade`, `press`, `splash`); nunca curvas/duraciones ad-hoc en componentes (DESIGN-SYSTEM §6).
- **`hooks/`** — `useIsMobile()` (breakpoint 1024) y `useAutoScroll()` (auto-scroll de chat con anclaje al fondo).
- **`lib/utils.ts`** — `cn()` con `clsx` + `tailwind-merge`. **`lib/error-messages.ts`** — `errorMessage(err)` (mensajes ES por `code`) y `applyServerValidation(err, form)` (mapea `errors[]` de `validation/failed` a RHF). **`lib/icons.ts`** — `iconFromString()` (diccionario lucide del sidebar con fallback).

### 4.2 `src/shared/` (design system + utilidades reutilizables)

- **`components/ui/`** — primitivos shadcn/ui + Radix (§11).
- **`components/features/`** — componentes complejos reutilizables (§12).
- **`components/layout/`** — `sidebar/` (sistema completo + `AppSidebar`), `site/` (landing), `private-header.tsx`.

**Sidebar del tenant — navegación jerárquica.** El menú es un **árbol recursivo** que llega de `/me/navigation` (contrato en `axi-server/docs/plans/integracion_frontend.md`); hoy el seed usa 3 niveles. Piezas:

  - **`nav-tree.ts`** — `mapNavigation()`: ordena por `sort_order` en cada nivel, aplica `resolveNavPath`, resuelve el icono lucide **solo en el nivel 0** (en los subniveles la indentación y la línea guía sustituyen al icono) y **poda** los nodos sin ruta navegable y sin hijos visibles. Módulo puro, testeado aislado.
  - **`nav-active.ts`** — `findActiveTrail()`: devuelve el rastro de `code` del ancestro al activo, ganando la URL **más específica** que prefija el `pathname` (match por segmento, `url + "/"`, para que `/dashboard` no se active en `/dashboard-legacy`). El último código es el activo pleno; los anteriores son ancestros y se pintan distinto.
  - **`components/nav-item.tsx`** — fila recursiva. Un padre **con** página propia navega en la fila y pliega con un chevron aparte (`aria-expanded` + `aria-controls`, hit-area táctil propia); un **grupo puro** (`path: null`) no genera link y la fila entera es el toggle, y es ella la que declara `aria-expanded`/`aria-controls`. Despliegue animado con `spring.snappy` + `useReducedMotion`. **Invariante:** fila y chevron van juntos en un `div.relative` propio, porque el `<li>` de los primitivos también contiene el submenú y un chevron `absolute top-1/2` posicionado contra él se sale de su fila al desplegar (ver DESIGN-SYSTEM §9.2); hay un test que lo blinda.
  - **`components/nav-flyout.tsx`** — en modo icono los subniveles están ocultos por CSS, así que los grupos abren un `Popover` glass a la derecha con sus descendientes (aplanados a dos planos). Los ítems hoja usan la prop `tooltip` de `SidebarMenuButton`.
  - **`components/sidebar-collapse-button.tsx`** — activa el modo icono desde la cabecera del sidebar. Icono y `aria-label` derivan del estado (`useSidebar()`), y en móvil se convierte en el cierre del `Sheet`, cuyo botón nativo está oculto en `core.tsx`. El `SidebarTrigger` de `private-header.tsx` **no es redundante**: con el sheet cerrado es la única entrada, así que se conserva (con tooltip y etiqueta en español). El estado se persiste en la cookie `sidebar_state`, que lee `(private)/layout.tsx` para el `defaultOpen` del provider.
  - **Estado y persistencia** — los grupos abiertos viven en `AppSidebar` como un `Set` de `code` (estable entre entornos, a diferencia del uuid `id`) y se persisten en la cookie `sidebar_nav_open`; **solo se guardan códigos de grupo**, nunca hojas. La rama activa se abre siempre, aunque no esté en la cookie.
  - **Precarga en el servidor** — `app/(private)/layout.tsx` (server component) llama a `/me/navigation` y pasa `initialItems`, más `defaultOpenCodes` y el `defaultOpen` del `SidebarProvider` leídos de cookies. Así el menú sale completo en el primer paint: sin `SidebarNavSkeleton` y sin round-trip del browser. El prefetch **falla en silencio**: si el backend está caído, `AppSidebar` cae a su fetch cliente (`/api/auth/sidebar`) y a su estado de error con reintento.

  La identidad del tenant entra por la prop `identity` inyectada desde la capa app (mismo patrón que `PrivateHeader actions`, §3.3), y el footer expone el menú de cuenta con "Cerrar sesión" → modal interceptado `/auth/logout`.
- **`api/`** — `buildListParams()` (construye `{ limit, offset, sortBy, sortDir, [searchField], ...extra }`) y `usePaginatedList()` (hook de listado paginado sobre un `fetcher` que devuelve `ApiResponse<T>`). **Reutilizar siempre** para listados en tablas.
- **`auth/`** — `auth.types.ts` (`AuthUser`, `Tokens`, `LoginPayload`, `SignupPayload`, `SessionResponse`, `COOKIE_NAMES`), `auth.hooks.ts` (`useAuth`, `useSession`), `auth.handlers.ts` (`refreshToken()` server-side) y **`entitlements.store.ts` + `entitlements.hooks.ts`** (`useEntitlements()`: capacidades del plan del tenant desde `GET /me/entitlements`, una carga por sesión; `hasCapability('sales')` gatea UI que el backend también gatea con `403 entitlements/capability_not_granted` — el sidebar ya llega filtrado por `/me/navigation`, así que aquí solo se adaptan superficies compuestas como el dashboard o el paso de catálogo del onboarding; si la carga falla responde `true` y deja al servidor decir 403).

---

## 5. Convenciones de naming

**Regla base:** todo lo técnico en **inglés**; toda la documentación y comentarios en **español**.

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de componente React | `PascalCase.tsx` | `CompanyForm.tsx`, `DetailSheet.tsx` |
| Archivos no-componente (service/store/config/hook/util) | `kebab-case` + sufijo con punto | `company-service.adapter.ts`, `agent.store.ts`, `company.config.tsx`, `use-mobile.ts` |
| Carpetas | `kebab-case` | `detail-sheet/`, `data-table/` |
| Clases / tipos / interfaces / enums / componentes | `PascalCase` | `HttpClient`, `CompanyRow`, `ChannelProvider` |
| Hooks | `camelCase` con prefijo `use` | `useAuth`, `usePaginatedList` |
| Funciones / métodos / variables | `camelCase` | `listCompanies()`, `fetchChannels()` |
| **Propiedades de datos wire (DTO/API/JSON)** | `snake_case` (1:1 con backend) | `company_id`, `last_message_at` |
| Props/estado local de componentes | `camelCase` | `isLoading`, `onOpenChange` |
| Constantes globales / tokens DI | `SCREAMING_SNAKE` | `API_BASE_URL`, `PUBLIC_PATHS`, `COOKIE_NAMES`, `CONVERSATION_REPOSITORY` |
| Eventos WS / dominio | `familia.acción` | `conversation.message_received`, `channel.qr_code` |
| CustomEvents del DOM (§9) | `familia:acción:estado` | `companies:edit:open`, `channels:detail:open` |
| Permisos RBAC | `resource:action` | `conversations:reply` |
| Segmentos de URL | `kebab-case` | `/admin/companies`, `/workspace/inbox` |

**Por qué `snake_case` en el wire:** el backend expone `snake_case` end-to-end (DB → API → JSON). Mantenerlo en los DTO del frontend elimina una capa de mapeo de nombres y hace que los tipos coincidan con el spec del backend. La conversión a la forma que consume la UI (`<Entity>Row`) ocurre explícitamente en `fetch<Entity>()` o en un `mapper`, no de forma implícita.

**Sufijos estándar de archivo por rol:**

| Sufijo | Rol |
|---|---|
| `*-service.adapter.ts` | Adapter HTTP del slice (funciones que usan `http`) |
| `*.store.ts` | Store Zustand (`create<...>()`) |
| `*.context.tsx` | React Context + Provider + hook `useX` |
| `*.config.tsx` (en `forms/config/`) | Zod schema + defaults + builder de campos + mappers a DTO |
| `*.config.tsx` (en `tables/config/`) | `ColumnDef[]` + `fetch<Entity>()` |
| `*.actions.tsx` | `<Entity>RowActions` (menú Ver/Editar/Eliminar) |
| `*.types.ts` / `*.d.ts` | Tipos / declaraciones |
| `use-*.ts` | Custom hook |

---

## 6. Enrutamiento (App Router)

Grupos de ruta bajo `src/app/`, más la capa BFF (`api/`), slots paralelos y tres superficies de primer nivel con shell propio.

**Grupos de ruta** (`(...)` no afectan la URL, solo el layout):
- **`(public)`** — shell de marketing (`SiteHeader`/`SiteFooter`). Páginas: `/` (landing), `/precios`, `/marketplace`, `/auth/{login,logout}`.
- **`(private)`** — shell autenticado (`SidebarProvider` + `AppSidebar` + `PrivateHeader` + superficie full-width). Dentro, el sub-grupo **`(content)`** centra el contenido (`mx-auto max-w-7xl p-4 md:p-6`, DESIGN-SYSTEM §4.2) para `/dashboard`, `/admin/agents` y `/settings/{company,users,roles}`; `/workspace/{inbox,inbox/[id]}` queda fuera del grupo y es full-bleed.
- **`(onboarding)`** — `/onboarding`, la configuración guiada tras el registro (`docs/modules/onboarding.md`). Es privada (el middleware exige sesión) pero **fuera de `(private)`** a propósito: el shell del panel precarga `/me/navigation` y pintaría un sidebar de módulos que el usuario aún no configuró. Habla el mismo lenguaje «Flow» que `/comenzar` (`docs/modules/onboarding.md` B.11): el layout es «el suelo» (`.flow-ground`, con su propio scroller), la bienvenida llega sobre el campo coral y se hunde al empezar, y la ruta animada al pie (`FlowRoute`) es la única barra de progreso; `AppReadySignal` cierra el splash abierto por `/comenzar`.

**Superficies de primer nivel** (ni `(public)` ni `(private)`; heredan solo el layout raíz):
- **`/platform`** — consola super admin, auth aislado (§8.1).
- **`/pay`** — pago sin sesión (billing).
- **`/verificar-correo`** — destino del enlace del correo de verificación (`docs/modules/onboarding.md` B.8). Pública y `noindex`; llama al API sin sesión y refresca la sesión si la hay.
- **`/comenzar`** — registro autoservicio: cinco pantallas de una pregunta (Oferta, Empresa, Ubicación, Tú, Cuenta) sobre el campo de marca `.signup-field`, con la ruta animada al pie (`docs/modules/onboarding.md` B.10). Público (`PUBLIC_PATHS`) y `noindex`; monta `PublicAnalytics` porque es la superficie de conversión y no expone datos de tenants. Al crear la cuenta, `POST /api/auth/signup` siembra las cookies de sesión y manda a `/onboarding`.

**Rutas paralelas** (slots como props del layout):
- `@modal` — en la raíz (logout interceptado) y en `workspace` (crear/ver canal).
- `@form` — en `admin/agents` y `rbac` (crear/editar en modal).
- Cada slot lleva `default.tsx → return null` para no renderizar nada cuando está inactivo.

**Rutas interceptadas** `(.)segment` — muestran una ruta destino como overlay/modal en navegación *soft*, y como página completa en navegación *hard*/refresh. Ejemplos: `workspace/@modal/(.)channels/create` renderiza `ChannelForm` en `Modal`; `admin/agents/@form/(.)create` renderiza `ModalFormAgent`.

**Regla:** los overlays/modales de una sección se implementan con slot paralelo (`@modal`/`@form`) + ruta interceptada, no con estado local, para que la URL sea compartible y el back del navegador cierre el modal.

**Convenciones de archivos de ruta:** `page.tsx` (página), `layout.tsx` (shell + providers del segmento), `loading.tsx` (UI de carga a nivel de ruta), `default.tsx` (fallback de slot paralelo).

---

## 7. Capa BFF y cliente HTTP

El navegador **no** habla directo con el backend para datos autenticados: pasa por route handlers de Next que inyectan el token del lado del servidor.

### 7.1 Cliente HTTP — `core/services/http.ts`

Singleton `http` (instancia de `HttpClient`) con `get/post/put/patch/delete<T>()`. Los paths se expresan **relativos al prefijo del API** (`/users`, `/auth/me`…). Opciones: `{ authenticate?: boolean; headers?; signal? }` — **autentica por defecto**; `authenticate: false` solo para endpoints públicos (login/refresh).

Patrón **dual browser/server**:
- **En el browser**: la URL se reescribe a `/api/proxy<path>`. El cliente **no** adjunta el token (no puede leer la cookie `HttpOnly`); delega en el proxy, que antepone `/api/v1`.
- **En el server (RSC/route handler)**: llama directo a `${API_BASE_URL}/api/v1<path>` leyendo `cookies().get("accessToken")` vía `next/headers`.

Detalles: soporta `FormData`, usa `cache: "no-store"`, `202/204` sin body devuelven `undefined`, captura `Retry-After`, y en `!res.ok` lanza **`HttpError`** (RFC 7807 parseado por `parseHttpError` — discrimina por `code`, nunca por texto).

**Regla:** ningún componente construye URLs del backend a mano ni usa `fetch` crudo para datos de dominio; todo pasa por un `*-service.adapter.ts` del slice.

### 7.2 Route handlers — `src/app/api/`

- **`api/proxy/[...path]/route.ts`** (`runtime = "nodejs"`) — proxy autenticado genérico para `GET/POST/PUT/PATCH/DELETE`. Reconstruye la URL contra `API_BASE_URL`, copia headers, inyecta `Authorization: Bearer` desde la cookie, y hace **refresh proactivo**: decodifica el `exp` del JWT y si expira en ≤60s refresca antes de reenviar. Devuelve status/body del backend verbatim.
- **`api/auth/login`** (`POST`) — llama al backend `/auth/login`, setea cookies `HttpOnly` `accessToken` (15 min) y `refreshToken` (7 días).
- **`api/auth/logout`** (`POST`) — best-effort al backend, borra ambas cookies.
- **`api/auth/refresh`** (`POST`) — delega en `refreshToken()` (rota tokens).
- **`api/auth/session`** (`GET`) — hidratación: llama `/auth/me`; si falla intenta un refresh y reintenta; devuelve `{ isAuthenticated, user? }`.
- **`api/auth/sidebar`** (`GET`) — `/me/navigation` → el array `data` del `NavigationDto` (árbol recursivo) para el `AppSidebar`. Es el **fallback**: el camino normal es la precarga en el layout server (§4.2).
- **`api/auth/token`** (`GET`) — devuelve el `accessToken` crudo + `expiresAt` **solo** para el handshake de WebSocket (Socket.IO no lee cookies `HttpOnly`).

---

## 8. Autenticación y seguridad

**Contrato de cookies** (idéntico en login y refresh): `HttpOnly`, `sameSite=lax`, `secure` en producción, `path=/`. `accessToken` maxAge 15 min; `refreshToken` maxAge 7 días. `COOKIE_NAMES` centraliza los nombres en `shared/auth/auth.types.ts`.

**Middleware** (`src/middleware.ts`) — guard en el edge para toda ruta que no sea `_next`/`api`/estáticos. Si `isPublicPath` → pasa; si no, exige presencia de `accessToken` **o** `refreshToken`; si faltan ambos → redirige a `/auth/login?next=<pathname>`. **Solo comprueba presencia, no validez** (la validez la fuerzan el endpoint `session` y el `proxy`).

**Flujo end-to-end:**
1. `LoginForm` → `useAuth().login()` → `POST /api/auth/login` → cookies seteadas → `hydrate()`.
2. `AuthProvider.hydrate()` → `GET /api/auth/session` (`/auth/me`, con refresh de rescate) → `status = authenticated` + `user`.
3. Redirección a `?next` o `/dashboard`.
4. Datos autenticados → `http` con `{ authenticate: true }` → browser va a `/api/proxy` → inyecta Bearer + refresh proactivo.
5. Refresh: `auth.handlers.ts#refreshToken()` → `POST /auth/refresh` (rotación) → nuevas cookies.
6. WebSocket: `WebSocketService` obtiene el JWT crudo vía `/api/auth/token` para el handshake.
7. Logout: modal interceptado → `useAuth().logout()` → `POST /api/auth/logout` → borra cookies → `/auth/login`.

**RBAC / navegación:** el sidebar se arma desde `/me/navigation` (el backend filtra el árbol por permisos del rol y poda los grupos que quedan vacíos). El frontend no decide autorización; refleja lo que el backend autoriza. Los permisos siguen el formato `resource:action`.

### 8.1 Excepción sancionada: panel de plataforma (`/platform/*`)

La consola interna de super admin (slice `modules/platform`, rutas `src/app/platform/`; spec: `axi-server/docs/plans/frontend_platform_plan.md`) tiene un modelo de auth **aislado** que difiere a propósito del contrato de cookies:

- **Token en `sessionStorage`** (`axi.platform.token/exp/email`) + espejo en memoria — access ~15 min **sin refresh**; al vencer, re-login superpuesto (`ReLoginModal`), nunca redirect. No usa el BFF: `openapi-fetch` llama directo al backend con `Bearer` (decisión D2 del spec: la sesión de super admin no persiste entre cierres del navegador y el aislamiento del auth de tenant pesa más que el riesgo XSS de un token de 15 min).
- **`"/platform"` está en `PUBLIC_PATHS`**: el middleware edge y el `AuthProvider` de tenant no lo interceptan; el guard real es `PlatformGuard` (client-side, binario — la barrera de seguridad es el backend).
- **Capa de datos propia**: TanStack Query (`QueryClient` dedicado, sin caché compartida con el tenant) + cliente `openapi-fetch` tipado con el mismo `schema.d.ts`. REST puro + polling (el WS rechaza tokens sin `company_id`).
- Reutiliza sin duplicar: `core/api/problem.ts` (RFC 7807), `core/lib/error-messages.ts`, primitivos de `shared/components/ui` y `shared/components/layout/sidebar/core`.

Estas decisiones aplican SOLO a `/platform/*`; el resto de la app sigue el contrato de cookies HttpOnly + BFF de este documento.

**Reglas de seguridad:**
- Los tokens **nunca** se exponen a JS del cliente ni se guardan en `localStorage`. Solo cookies `HttpOnly`.
- Ninguna credencial ni secreto en variables `NEXT_PUBLIC_*` (son visibles en el bundle).
- Rutas privadas siempre bajo `(private)` + cubiertas por el middleware.
- *Deuda:* el `proxy` tiene `console.log` de depuración → eliminar antes de producción.

---

## 9. Estado y datos

Tres mecanismos, con criterio de uso:

1. **Zustand** (`<slice>.store.ts`) — estado de dominio del slice compartido entre vistas: listas, entidades, sincronización con WS. Es el **default** para datos. Ejemplos: `useChannelStore`, `useConversationStore` (dedupe, orden por `last_message`, merge de eventos WS).
2. **React Context** (`<slice>.context.tsx`) — cuando el estado se acota a un subárbol montado por un `layout` (paginación local, providers de sección). Ejemplos: `AgentsProvider`, `OverviewProvider`, `WebSocketProvider`. Los providers se montan en los `layout.tsx` del segmento.
3. **`usePaginatedList`** (`shared/api`) — para listados de tabla server-side (paginación/orden/búsqueda sobre un `fetcher`). **Reutilizar** en lugar de reimplementar estado de tabla.

**Regla de decisión:** ¿el estado debe sobrevivir a la navegación entre vistas del slice o sincronizarse con WS? → **Zustand**. ¿Está acotado a un subárbol y su ciclo de vida es el del layout? → **Context**. ¿Es un listado paginado de tabla? → **`usePaginatedList`**.

**Comunicación tabla ↔ formulario/detalle** — hoy vía **CustomEvents del DOM** (`window.dispatchEvent(new CustomEvent("companies:edit:open", { detail }))`, `"...:delete:success"`, `"channels:detail:open"`). Es el bus de bajo acoplamiento entre la fila de una tabla y el modal/sheet. **Regla:** nombrar los eventos `familia:acción:estado`; documentar los eventos que emite/escucha cada slice. *Convergencia sugerida:* evaluar mover estas señales a un store del slice para tipado y trazabilidad.

**Regla:** la UI nunca llama a `http` ni construye requests; consume un store/hook/service del slice. El mapeo DTO→Row vive en `fetch<Entity>()` o en un `mapper`, nunca disperso en componentes.

---

## 10. Tiempo real (WebSocket)

Dos namespaces del backend: **`/inbox`** (eventos de conversación/uso/notificaciones + comandos con ack) y **`/channels`** (QR y estados de WhatsApp Web, solo lectura).

- **`core/realtime/events.ts`** — contrato tipado completo: `InboxServerEvents`, `InboxCommands` (ack `{ok:true,data} | {ok:false,error:{code,message}}`), `ChannelsServerEvents`. Incluye ya los eventos `usage.*` y `notification.created` para los módulos futuros.
- **`core/realtime/socket-manager.ts`** — singleton por namespace sobre `socket.io-client`. Token vía `GET /api/auth/token` (que auto-refresca si expira en <60 s) en `handshake.auth.token`. **Rotación**: antes de que el access (15 min) caduque, obtiene token nuevo y hace `disconnect()`+`connect()` (Socket.IO no re-negocia auth en caliente). `connect_error` → token fresco + backoff (1s→2s→5s→…30s). `emitWithAck` con timeout.
- **`core/realtime/use-socket.ts`** — `useSocket(namespace)` (conexión con contador de consumidores) y `useSocketEvent(socket, event, handler)` (suscripción declarativa con cleanup).
- **Integración por slice** — `channels/infrastructure/hooks/use-channels-realtime.ts` (namespace `/channels` → `channels.store`); `inbox/infrastructure/realtime/use-inbox-socket.ts` (namespace `/inbox` → `inbox.store`, comandos `claim/takeover/return_to_ai/close/send_message/mark_read/typing`, re-join automático al reconectar, `handoff_conflict` → re-fetch). Ese mismo hook escucha además los eventos `contact.*`, `crm.*` y `order.*` que traen `contact_id` para refrescar el rail de contexto de la conversación (`docs/modules/inbox.md` §C.4): el backend **no** emite `contact.updated`, así que ese es el único mecanismo de refresco del panel.

**Reglas:** las acciones del inbox van SIEMPRE por WS (mismos use cases y RBAC que REST); REST solo como fallback con el socket caído. Los envíos y acciones wweb son **202/ack = aceptado, no confirmado**: la confirmación llega por evento (`conversation.message_sent`, `channel.status_changed`). Ningún componente usa `socket.io-client` directo.

---

## 11. Design System y theming

**Setup shadcn/ui** (`components.json`): estilo **new-york**, `rsc: true`, `tsx: true`, Tailwind con `cssVariables` y `baseColor: zinc` (sin `tailwind.config` — v4), iconos **lucide**. Alias: `ui → @/shared/components/ui`, `utils → @/core/lib/utils`, `lib → @/core/lib`, `hooks → @/core/hooks`.

**Primitivos** (`shared/components/ui/`): `alert`, `avatar` (imagen con fallback de inicial), `badge`, `brand-loader`/`brand-mark`, `button` (+`button-group`), `command`, `context-menu`, `dialog`, `dropdown-menu`, `floating-alert`, `form`, `input`, `label`, `modal`, `notice` (`StatusAlert`), `pagination` (`BasicPagination`), `popover`, `progress`, `select`, `separator`, `sheet`, `skeleton`, `sparkles`, `table`, `tabs`, `textarea`, `tooltip`. Variantes con **cva**.

**Theming** (`src/app/globals.css`, Tailwind v4 `@theme inline`):
- Tokens de marca (`:root`): `--axi-brand: #E65759`, `--axi-brand-2: #e02f2f`, `--axi-muted: #f4f4f5`. Dark (`.dark`): `--axi-brand: #fb7185`, `--axi-brand-2: #df4f4f`, `--axi-muted: #18181b`.
- Semánticos derivados con `color-mix`: `--color-primary/ring/brand → --axi-brand`, `--color-destructive → --axi-brand-2`, `--color-border/secondary/accent/input`.
- Estrategia dark: clase `.dark` en `<html>` vía `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`).
- Utilidades de marca: `.text-brand`, `.bg-brand`, `.bg-brand-gradient`, `.text-brand-gradient`, `.glass` (backdrop blur), `.sidebar-scroll` (scrollbar de marca).

**Tipografías** (montadas en `app/layout.tsx` como CSS variables):
- **Nexa** (local, `public/fonts/nexa/`, pesos 200/700) → headings (`--font-headings`).
- **Poppins** (Google, 300–700) → cuerpo/sans (`--font-sans`, `--font-body`).
- **Geist** / **Geist Mono** (Google) → alternativa / monoespaciada (`--font-mono`).

**Providers montados** (orden en `app/layout.tsx`): `ThemeProvider → AuthProvider → AlertProvider → {children} + {modal}`.

**Reglas de UI:**
- Usar tokens semánticos (`bg-background`, `text-foreground`, `border-border`, `text-brand`), nunca colores hex sueltos.
- Todo componente debe verse correcto en light y dark, y respetar `prefers-reduced-motion`.
- Componer sobre primitivos de `shared/components/ui`; no reinventar botones/inputs/diálogos.
- Iconos desde `lucide-react` por defecto.

---

## 12. Componentes clave (features reutilizables)

`src/shared/components/features/` — componentes genéricos dirigidos por configuración. **Reutilizar siempre** en lugar de reconstruir tablas/formularios/paneles.

- **`DataTable<T>`** (`data-table/`) — tabla responsive. Props: `data`, `columns: ColumnDef<T>[]`, `pagination` (con `total` ⇒ server-side; sin `total` ⇒ cliente), `sorting`, `search` (debounce o submit), `rowContextMenu`, `messages` (i18n, español por defecto), `preferredSearchFields`. Ref imperativa `DataTableRef` (`getCurrentPage`/`goToPage`). `ColumnDef<T>`: `accessorKey`, `header`, `sortable`, `cell({ row.original })`, `minWidth`, `alwaysVisible`. Oculta columnas por ancho, menú contextual por fila, memoización.
- **`DynamicForm<TValues>`** (`dynamic-form/`) — formularios declarativos sobre RHF + Zod. Props: `schema` (Zod), `fields: FieldConfig[]`, `defaultValues`, `onSubmit`, `columns` (grid responsive, default `{base:1, md:2}`), `actions`. `FieldConfig` = `InputFieldConfig` (`inputKind`: text/email/password/number/date/textarea/hidden) | `CustomFieldConfig` (`render(...)`). Builders: `createInputField`, `createCustomField`. Soporta visibilidad/disabled condicional por valores y reset al cambiar `defaultValues` (edición async).
- **`DetailSheet<Id>`** (`detail-sheet/`) — panel lateral (desktop) / bottom sheet (móvil) sobre Radix Dialog + framer-motion. Props: `open`, `onOpenChange`, `id`, `title`, `subtitle`, `size` (xs–xl o número), `side` (`auto|left|right|bottom`), `fetchDetail(id)` (carga async con guard anti-race + `skeleton`), `closeOnEsc`, `closeOnOverlayClick`, `renderHeader/renderFooter`. Drag-to-dismiss, focus management, scroll lock, `prefers-reduced-motion`.
- **`TreeView<T>`** (`tree-view/`) — árbol genérico: `data`, `mapToNode`, expansión controlada, selección, renderers (`renderLabel/renderActions/getIcon`), `search`, CRUD async y lazy-load (`loadChildren`).
- **`MultiSelect`** (`multi-select.tsx`) — selección múltiple sobre Popover + Command + Badge: grupos, búsqueda, select-all, animaciones configurables.
- **`Timeline`** (`timeline/`) — timeline vertical genérico (línea conectora + nodo tonal con icono + hasta 3 líneas). `TimelineItem` = `{ id, icon, tone, title, description?, meta?, badge? }`; `tone` ∈ `neutral|info|success|warning|destructive|violet`. Presentacional puro: los datos, la paginación y los labels los aporta el slice. Incluye `TimelineSkeleton` y `AiBadge` (✦IA violeta). **Única implementación del patrón**: la consumen el historial 360 del contacto, la actividad del pedido y el rail de contexto del inbox.
- **`FieldList`** (`field-list/`) — `<dl>` etiqueta→valor para rails y cards de detalle. `FieldItem` = `{ label, value, copyable?, block?, hideWhenEmpty? }`; **oculta los campos vacíos por defecto** (los DTO traen casi todo nullable) y no trata `0`/`false` como vacío. `layout` `rows` (rail estrecho) o `grid` (card ancha).

**Regla:** un nuevo listado usa `DataTable` + `usePaginatedList`; un nuevo formulario usa `DynamicForm` + un `*.config.tsx` con Zod; un nuevo panel de detalle usa `DetailSheet` con `fetchDetail`; un nuevo feed de actividad usa `Timeline`; un nuevo bloque de datos de entidad usa `FieldList`.

---

## 13. Configuración del proyecto

- **`next.config.ts`** — `images.remotePatterns`: `pps.whatsapp.net` (https), `res.cloudinary.com` (assets), `172.18.16.1:3001/public/qr-images/**` (QR). *(La línea `eslint.ignoreDuringBuilds` está comentada; ver §15.)*
- **`tsconfig.json`** — `strict`, `moduleResolution: bundler`, `noEmit`, `jsx: preserve`, plugin de Next; alias `@/*` → `./src/*`.
- **`postcss.config.mjs`** — único plugin `@tailwindcss/postcss` (Tailwind v4). **No hay `tailwind.config`**: el tema vive en `globals.css` (`@theme inline`).
- **`eslint.config.mjs`** — flat config; extiende `next/core-web-vitals` + `next/typescript`.
- **`jest.config.cjs`** — `ts-jest` + `jsdom`, `setupFilesAfterEach: jest.setup.ts`, `moduleNameMapper` (`@/*`→`src/*`, CSS→`identity-obj-proxy`), `testMatch: **/__tests__/**/*.test.(ts|tsx)`, `tsconfig.jest.json`.
- **`components.json`** — config shadcn (§11).

**Variables de entorno** (archivo `.env.local`, no versionado — `.env*` en `.gitignore`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000   # backend axi-server (API bajo /api/v1)
NEXT_PUBLIC_WS_BASE_URL=http://localhost:3000    # WebSocket (namespaces /inbox y /channels)
NEXT_PUBLIC_SALES_WHATSAPP=573224970950          # WhatsApp comercial de axi. OBLIGATORIA: sin ella el build
                                                 #   aborta (§13.1). Dígitos con indicativo; un celular
                                                 #   colombiano sin indicativo se completa solo
NEXT_PUBLIC_APP_URL=http://localhost:3001        # Origen público del sitio. OBLIGATORIA: sin ella el build
                                                 #   aborta (§13.2). En producción https://axi-connect.co
NEXT_PUBLIC_GA_ID=                               # GA4 (G-XXXXXXX). OPCIONAL: si falta, no hay analítica
NEXT_PUBLIC_META_PIXEL_ID=                       # Píxel de Meta. OPCIONAL, mismo criterio
NEXT_PUBLIC_TURNSTILE_SITE_KEY=                  # Captcha del registro /comenzar. OPCIONAL: sin ella el widget
                                                 #   no se monta y el backend valida con su verificador noop
                                                 #   (prohibido en producción); mal formada aborta el build
```

**§13.1 — El WhatsApp comercial tiene un único punto de definición.** `core/config/env.ts` expone `SALES_WHATSAPP` (normalizado), `salesWhatsAppUrl(message?)` y `formatSalesWhatsApp()`; **nadie más construye un `wa.me` ni escribe el número**. De ahí cuelgan los cinco puntos donde aparece: hero y CTA final de la landing, enlace y texto de `/contacto`, `CompanySuspendedScreen` y el `PrerequisitesChecklist` de canales. (`TrialCountdownBanner` dejó de usarlo en 2026-09: con el registro autoservicio la conversión al fin de la prueba es del tenant y su CTA lleva a `/billing`.)

Se resuelve en carga del módulo y **lanza si la variable falta**, en vez de degradar a cadena vacía. La razón es que las `NEXT_PUBLIC_*` se hornean en el bundle en tiempo de build: una variable ausente no produce error en ningún sitio, solo deja la app desplegada sin ningún CTA de ventas y sin señal alguna. Consecuencias operativas de ese contrato:

- El `Dockerfile` declara su `ARG`/`ENV` y `.github/workflows/deploy.yml` pasa el build arg (con default sobreescribible por una Variable del repositorio). Si se añade otro pipeline, tiene que pasarla.
- `jest.env.ts` (en `setupFiles`, antes que `setupFilesAfterEnv`) la fija para la suite: `env.ts` entra transitivamente por `core/services/http.ts` en casi cualquier test.
- La normalización acepta `+`, espacios, guiones y paréntesis, y aplica la regla Colombia-first de `axi-server/src/core/system/kernel/phone.ts` (10 dígitos que empiezan por `3` ⇒ se antepone `57`).

**§13.2 — El origen público del sitio y la analítica.** `core/config/env.ts` expone también `SITE_URL` (origen normalizado, sin barra final) y `siteUrl(path)`; **nadie más escribe el dominio**. De ahí cuelgan `metadataBase`, los `canonical` de las doce rutas públicas, las URLs absolutas de Open Graph, `sitemap.xml`, `robots.txt` y los `@id` del JSON-LD.

La política de fallo es distinta según la variable, y es deliberada:

| Variable | Ausente | Mal formada |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | **aborta el build** | **aborta el build** |
| `NEXT_PUBLIC_GA_ID` | degrada a `null` | **aborta el build** |
| `NEXT_PUBLIC_META_PIXEL_ID` | degrada a `null` | **aborta el build** |

`APP_URL` aborta porque su ausencia no produce ningún error: el sitio se despliega declarando que su contenido canónico vive en `localhost`, y nadie se entera. Fue el estado real del repositorio hasta agosto de 2026. Los ids de analítica degradan porque un desarrollador que solo quiere levantar la landing no puede quedarse sin build por no tener una propiedad de GA — pero un id **con un typo** sí aborta, porque aparenta estar configurado y no mide nada.

Como con `SALES_WHATSAPP`: el `Dockerfile` declara sus `ARG`/`ENV` y `.github/workflows/deploy.yml` pasa los build args; `jest.env.ts` fija `APP_URL` para la suite.

**Regla para toda página pública nueva.** Además del alta en `PUBLIC_PATHS` (§8), necesita: `metadata` propia vía `pageMetadata()` (`core/seo/metadata.ts`, que compone título, descripción, `canonical`, Open Graph y Twitter Card de una vez), una entrada en `INDEXABLE_ROUTES` (`core/seo/routes.ts`, de donde se deriva el sitemap entero) y un `<h1>` único. Las rutas que redirigen (308 en `next.config.ts`) **no** se listan como indexables: una URL que redirige no es canónica.

**Analítica.** `core/analytics/` (transversal; no confundir con `modules/analytics/`, que es el módulo de producto del panel). Se monta **solo** en `app/(public)/layout.tsx`: el layout raíz también envuelve `(private)` y `/platform`, y montarla ahí enviaría a Google y a Meta las rutas de las conversaciones de los clientes. Los CTA se instrumentan por **delegación de eventos** (`core/analytics/outbound.ts`), no con `onClick`, para no convertir en componentes de cliente los Server Components que enlazan a `wa.me`. `track()` es la única salida; el píxel de Meta no carga sin consentimiento explícito.

Registrar el origin del frontend (p.ej. `http://localhost:3001`) en `CORS_ORIGINS` del backend.

**Regla:** solo variables `NEXT_PUBLIC_*` estrictamente públicas (URLs). Nunca secretos: se filtran al bundle del cliente.

**Scripts:** `dev`, `build`, `start`, `lint`, `test` / `test:watch`, **`api:types`** (regenera `src/core/api/schema.d.ts` desde `../axi-server/openapi/openapi.json`) y **`api:types:check`** (verifica en CI que el schema commiteado no tenga drift con el spec del backend).

---

## 14. Manejo de errores y transversales

- **Errores HTTP:** `HttpClient` lanza `HttpError` (RFC 7807: `status`, `code`, `problem`, `retryAfterSeconds`). La UI usa `errorMessage(err)` (`core/lib/error-messages.ts`, mensajes ES por `code`) con `useAlert()`, y `applyServerValidation(err, form)` para mapear `validation/failed.errors[]` a los campos RHF. **Discriminar siempre por `code`**, nunca por texto.
- **Respuesta estándar del backend:** recursos planos SIN envelope; listas offset `{ data, meta: { total, page, page_size } }` (query `page`/`page_size`); timelines cursor `{ data, next_cursor? }` (query `cursor`/`limit`). `usePaginatedList` consume la forma offset.
- **Feedback al usuario:** `AlertProvider` centraliza notificaciones (`showAlert`) y confirmaciones (`showModal`). Las tablas confirman borrados con `Modal` antes de ejecutar.
- **Carga y vacío:** toda ruta privada lleva `loading.tsx` (skeleton estructural — `TableSkeleton`/`FormSkeleton`/`InboxSkeleton` de `shared/components/features/loading/` — o `BrandLoader` de `shared/components/ui/`), feedback de navegación en el sidebar vía `useLinkStatus`, y estados vacíos explícitos en listas/inbox. Jerarquía y reglas en `docs/design/LOADING.md`; el splash post-login lo orquesta `SplashProvider` (`core/providers`).
- **Suspense:** envolver componentes que dependen de `useSearchParams`/datos en `<Suspense>` (ya aplicado en login).
- **Tema/hidratación:** `next-themes` con estrategia `class` para evitar flash; no leer `window`/tema en render de servidor.

---

## 15. Testing y calidad

| Nivel | Alcance | Herramientas |
|---|---|---|
| Unit/Component | Componentes y hooks (`__tests__/**/*.test.tsx`) | Jest + Testing Library + jsdom + ts-jest |

- Ubicación: `__tests__/` junto al componente (p.ej. `detail-sheet/__tests__/DetailSheet.test.tsx`).
- Alias y CSS ya mapeados en `jest.config.cjs`.
- **Prioridad de cobertura:** `DataTable`, `DynamicForm`, `DetailSheet`, hooks de `shared/api` y `core/hooks`, y la lógica de stores (dedupe/orden en `conversations.store`).

**Estado y reglas de build:**
- `next build` está **verde con la verja de ESLint ACTIVA** (0 errores; quedan warnings menores en componentes de landing). `npm test`: suites de `parseHttpError`, `usePaginatedList`, refresh single-flight, reducers del `inbox.store` y `DetailSheet`.
- **Regla:** el código nuevo no introduce `any` ni errores de lint; `npm run lint` debe pasar limpio en los archivos tocados.
- Los tests de `DetailSheet` requieren `react` y `react-dom` alineados (misma minor); mantener `react-dom` en el mismo rango que `react` (`^19.2.0`).

---

## 16. Reglas de oro (checklist antes de implementar)

**Antes de crear un slice o una feature:**
- [ ] ¿Vive en `src/modules/<slice>/` con `domain/ + infrastructure/ + ui/` (+ `application/` si hay lógica real)?
- [ ] ¿`domain/` es TypeScript puro (sin React, sin `http`, sin `zod`)?
- [ ] ¿Se respetan las direcciones de dependencia (§3.3)? ¿La UI llama a un store/service, nunca a `http` directo?
- [ ] ¿Subcarpetas en plural (`services/`, `store/`, `forms/`, `tables/`)?

**Antes de llamar al backend:**
- [ ] ¿Se usa el singleton `http` con `{ authenticate: true }` para recursos privados?
- [ ] ¿La función vive en un `*-service.adapter.ts` del slice y devuelve `ApiResponse<T>`?
- [ ] ¿El mapeo DTO→Row está en `fetch<Entity>()`/`mapper`, no disperso en la UI?
- [ ] ¿Los nombres de propiedades wire van en `snake_case`?

**Antes de construir UI:**
- [ ] ¿Listado con `DataTable` + `usePaginatedList`? ¿Formulario con `DynamicForm` + `*.config.tsx` (Zod)? ¿Detalle con `DetailSheet`?
- [ ] ¿Solo tokens semánticos y utilidades de marca (light + dark)? ¿Iconos lucide?
- [ ] ¿`"use client"` solo donde hay interactividad; RSC por defecto?
- [ ] ¿Overlays con slot paralelo (`@modal`/`@form`) + ruta interceptada, no estado local?

**Antes de tiempo real:**
- [ ] ¿Vía `WebSocketService` + hooks del slice, nunca `socket.io-client` directo?
- [ ] ¿Los tipos de eventos coinciden con el backend?

**Siempre:**
- [ ] Código en inglés; documentación, comentarios y planes en español.
- [ ] Cero secretos en `NEXT_PUBLIC_*`; tokens solo en cookies `HttpOnly`.
- [ ] `npm run lint` limpio en lo tocado; sin `any` nuevos; sin `console.log` de depuración.
- [ ] Accesibilidad y estados de carga/vacío/error cubiertos.
