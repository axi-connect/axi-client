# Arquitectura — axi-client (frontend)

> **Documento maestro de arquitectura del frontend.** Se consulta SIEMPRE antes de diseñar o implementar cualquier cosa en el proyecto. Si una decisión de código contradice este documento, o el documento está desactualizado, se corrige primero aquí (vía PR) y luego se implementa.
>
> Convención del proyecto: **todo lo técnico en inglés** (nombres de archivos, carpetas, funciones, clases, variables, tipos, componentes); **toda la documentación, comentarios, guías, planes y tareas en español**. Los nombres de propiedades que viajan por la red (DTO/JSON) van en `snake_case` para coincidir 1:1 con el contrato del backend (`axi-server`); ver §5.
>
> Documento hermano: `axi-server/docs/architecture.md` (backend). Este frontend consume su API REST y sus WebSockets. Cuando un contrato cambie, ambos documentos deben quedar consistentes.
>
> **Estado (julio 2026): migrado al backend v2 (axi-connect).** Contrato bajo `/api/v1/*`, tipos generados desde `axi-server/openapi/openapi.json` (`npm run api:types`), errores RFC 7807 discriminados por `code`, WebSocket en namespaces `/inbox` y `/channels`. La guía de consumo del backend es `axi-server/docs/integracion_frontend.md`.

---

## 1. Visión y principios

**axi-connect** es una plataforma SaaS multi-tenant de atención al cliente omnicanal (WhatsApp, Instagram, Messenger) con agentes de IA, handoff a operadores humanos, CRM y marketplace de influencia. Este repositorio (`axi-client`) es la **aplicación web**: landing pública, marketplace, y el panel privado (dashboard, workspace/inbox en vivo, administración de empresas, agentes, usuarios y RBAC).

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
│   │   ├── (private)/                # grupo privado: dashboard, admin/*, rbac/*, workspace/*
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
│   │   ├── channels/  conversations/           # tiempo real
│   │   └── workspace/                           # capa de composición (inbox)
│   └── shared/                       # design system + utilidades reutilizables
│       ├── components/
│       │   ├── ui/                   # primitivos shadcn/ui + Radix (§11)
│       │   ├── features/             # componentes complejos: data-table, detail-sheet,
│       │   │                         #   dynamic-form, tree-view, multi-select (§12)
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
- `conversations` — slice sin UI propia: solo `domain/` + `infrastructure/{services,store}`; su UI la aporta `workspace`.
- `workspace` — **capa de composición** (excepción sancionada): solo `ui/`, agrega los stores/servicios de `channels` y `conversations` para construir el inbox. No tiene dominio propio.

**Regla de escape sancionada:** un slice puramente CRUD puede omitir `application/` (y usar `domain/ + infrastructure/ + ui/`) manteniendo puertos solo donde exista lógica real. No se fabrica ceremonia donde no hay dominio — igual que en el backend.

### 3.3 Reglas de dependencia

Dentro de un slice (dependencias solo hacia adentro):

1. `domain` → solo TypeScript puro y otros tipos de `domain`. **Prohibido** importar React, `http`, `zod`, componentes o infraestructura.
2. `application` → `domain`. Define puertos e implementa casos de uso; **jamás** importa `infrastructure`, `ui` ni React.
3. `infrastructure` → `application` (implementa sus puertos) + `domain` + `core/*` + `shared/api`. Aquí (y solo aquí) se usa `http` y `WebSocketService`.
4. `ui` → `application`/`infrastructure` (stores, hooks, services expuestos) + `domain` + `shared/components`. **La UI nunca llama a `http` directamente**: pasa por un service/store del slice.

Entre slices:

5. Un slice importa de otro **solo sus contratos públicos**: tipos de `domain`, su `store`/`context`/hook, o sus puertos. **Prohibido** importar `infrastructure/` interna, componentes internos o casos de uso de otro slice.
6. `workspace` es la única capa de composición: puede consumir `channels` y `conversations` para orquestar el inbox (documentado).
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
- **`components/layout/`** — `sidebar/` (sistema completo + `AppSidebar` que lee `/api/auth/sidebar`, con `SidebarNavSkeleton` mientras carga), `site/` (landing), `private-header.tsx`.
- **`api/`** — `buildListParams()` (construye `{ limit, offset, sortBy, sortDir, [searchField], ...extra }`) y `usePaginatedList()` (hook de listado paginado sobre un `fetcher` que devuelve `ApiResponse<T>`). **Reutilizar siempre** para listados en tablas.
- **`auth/`** — `auth.types.ts` (`AuthUser`, `Tokens`, `LoginPayload`, `SessionResponse`, `COOKIE_NAMES`), `auth.hooks.ts` (`useAuth`, `useSession`) y `auth.handlers.ts` (`refreshToken()` server-side).

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

Tres grupos de ruta bajo `src/app/`, más la capa BFF (`api/`) y slots paralelos.

**Grupos de ruta** (`(...)` no afectan la URL, solo el layout):
- **`(public)`** — shell de marketing (`SiteHeader`/`SiteFooter`). Páginas: `/` (landing), `/marketplace`, `/auth/{login,logout,forgot-password,reset-password}`.
- **`(private)`** — shell autenticado (`SidebarProvider` + `AppSidebar` + `PrivateHeader`). Segmentos: `/dashboard`, `/admin/{companies,users,agents}`, `/rbac/overview`, `/workspace/{inbox,inbox/[id]}`.

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
- **`api/auth/sidebar`** (`GET`) — `/auth/me/sidebar` → `SidebarSectionDTO[]` para el `AppSidebar`.
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

**RBAC / navegación:** el sidebar se arma desde `/auth/me/sidebar` (el backend filtra por permisos del rol). El frontend no decide autorización; refleja lo que el backend autoriza. Los permisos siguen el formato `resource:action`.

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
- **Integración por slice** — `channels/infrastructure/hooks/use-channels-realtime.ts` (namespace `/channels` → `channels.store`); `inbox/infrastructure/realtime/use-inbox-socket.ts` (namespace `/inbox` → `inbox.store`, comandos `claim/takeover/return_to_ai/close/send_message/mark_read/typing`, re-join automático al reconectar, `handoff_conflict` → re-fetch).

**Reglas:** las acciones del inbox van SIEMPRE por WS (mismos use cases y RBAC que REST); REST solo como fallback con el socket caído. Los envíos y acciones wweb son **202/ack = aceptado, no confirmado**: la confirmación llega por evento (`conversation.message_sent`, `channel.status_changed`). Ningún componente usa `socket.io-client` directo.

---

## 11. Design System y theming

**Setup shadcn/ui** (`components.json`): estilo **new-york**, `rsc: true`, `tsx: true`, Tailwind con `cssVariables` y `baseColor: zinc` (sin `tailwind.config` — v4), iconos **lucide**. Alias: `ui → @/shared/components/ui`, `utils → @/core/lib/utils`, `lib → @/core/lib`, `hooks → @/core/hooks`.

**Primitivos** (`shared/components/ui/`): `alert`, `badge`, `button` (+`button-group`), `command`, `context-menu`, `dialog`, `dropdown-menu`, `floating-alert`, `form`, `input`, `label`, `modal`, `notice` (`StatusAlert`), `pagination` (`BasicPagination`), `popover`, `progress`, `select`, `separator`, `sheet`, `skeleton`, `sparkles`, `table`, `tabs`, `textarea`, `tooltip`. Variantes con **cva**.

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

**Regla:** un nuevo listado usa `DataTable` + `usePaginatedList`; un nuevo formulario usa `DynamicForm` + un `*.config.tsx` con Zod; un nuevo panel de detalle usa `DetailSheet` con `fetchDetail`.

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
```

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
