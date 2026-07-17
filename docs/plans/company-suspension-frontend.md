# Plan: Suspensión de empresa en caliente — expulsión inmediata en el frontend

> **Estado (2026-07-17): F1–F5 IMPLEMENTADAS** (F5: unit tests ✅ — 4 suites, 13 tests; el guion e2e manual de dos sesiones queda pendiente de ejecutar contra el backend local). Verificación: `npm test` 202/202, `tsc` limpio, `next build` verde.
>
> **Contraparte frontend del plan F15 del backend** (`axi-server/docs/plans/company_suspension_plan.md`, las 7 fases ya implementadas). Contrato de consumo: `axi-server/docs/plans/integracion_frontend.md` §3.6 (manejo global del 403) y §7 (evento WS `company.suspended`).
>
> Reglas: `docs/architecture.md` (§7 BFF/HttpClient, §8 auth, §9 estado/CustomEvents, §10 realtime, §14 errores por `code`). Documentación en español, código en inglés.

## Contexto

Desde F15, suspender una empresa (`PATCH /platform/tenants/:id {status:'suspended'}`) **expulsa a los usuarios logueados**: el backend bumpea `token_version` (los access vigentes mueren), revoca todos los refresh, desconecta los sockets desde el server y responde **403 `auth/company_suspended`** en CUALQUIER request — request normal, refresh o login.

Hoy el frontend **no está preparado** para esa expulsión:

| # | Gap | Efecto actual |
|---|---|---|
| G1 | Ningún manejo global del 403 `auth/company_suspended` (solo el login form lo discrimina) | Un usuario activo vería errores genéricos en cada acción; `hydrate()` lo mandaría al login con `?next=`, donde reintentaría en un ciclo confuso |
| G2 | `core/realtime/events.ts` no tipa `company.suspended` (ni en `/inbox` ni en `/channels`) | El evento del server se pierde; nadie reacciona |
| G3 | `socket-manager.ts` reconecta con backoff infinito (`reconnectionAttempts: Infinity`) | Tras la desconexión forzada, el cliente martillea el server con un token muerto |
| G4 | El BFF no propaga el código: `api/auth/session` colapsa cualquier fallo a `{isAuthenticated:false}`; el fallo de refresh dentro del `proxy` responde 401 con el code del refresh sin garantía de conservar el 403 | El interceptor no puede distinguir "suspendida" de "sesión expirada" en los caminos de hidratación/refresh |
| G5 | No existe pantalla bloqueante | Sin destino UX para el estado |
| G6 | Copy del `ConfirmTyped` de platform desactualizado ("Se bloqueará el login…") | El super admin no sabe que la acción expulsa en caliente y pausa la mensajería |

**Objetivo:** ante la suspensión, el usuario del tenant ve de inmediato una pantalla bloqueante *"La empresa está suspendida. Contacta a soporte."* — sin loop de re-login, sin reconexiones WS — y al reactivarse la empresa puede volver a entrar con un login normal.

## Decisiones de diseño

| Decisión | Elección | Por qué |
|---|---|---|
| Superficie de bloqueo | **Estado `suspended` en `AuthProvider`** que renderiza `<CompanySuspendedScreen/>` a pantalla completa en lugar de `children` (no una ruta) | Bloqueo instantáneo sin depender de navegación (crítico en el camino WS); no hay URL "suspendida" que persista o se comparta — cumple la regla §3.6.4 del backend (no cachear el estado más allá de la sesión visual). El grupo `(public)` no se ve afectado porque la pantalla solo sustituye a `children` cuando el estado se activa, y el estado solo se activa por señales de sesión autenticada |
| Señal transversal | CustomEvent del DOM **`auth:company:suspended`** (convención `familia:acción:estado`, architecture §9) | `core/` no puede importar de `modules/`, y la señal nace en tres capas distintas (HttpClient, BFF hydrate, hooks WS). El `AuthProvider` es el único listener |
| Detección HTTP | En **`HttpClient.request`** (browser): si `HttpError.code === API_ERROR_CODES.companySuspended` → dispatch del evento antes de re-lanzar | Un solo choke-point cubre todos los `*-service.adapter.ts` sin tocar slices. Server-side (RSC) no despacha: el error fluye y el cliente lo captura al hidratar |
| Detección en login/hydrate | `api/auth/session` propaga `code` en su respuesta; `hydrate()` discrimina | El login form ya discrimina `companySuspended` (se conserva); hydrate deja de mandar al login cuando la causa es suspensión |
| WS | Evento tipado en ambos namespaces + **`socketManager.halt()`**: desconecta todo y bloquea nuevos `connect()` hasta `reset()` (llamado en login exitoso) | `disconnect()` manual no basta: la desconexión **forzada por el server** sí dispara la reconexión automática de socket.io; sin guard, loop de `connect_error` |
| Reactivación | Botón "Volver a intentar iniciar sesión" → limpia estado + `window.location.href = "/auth/login"` | No hay evento de reactivación (no hay sockets). El login normal funciona de inmediato; si sigue suspendida, el login form ya muestra el mensaje |
| Excepción `/platform` | **Sin cambios** en su capa de datos | El super admin no pertenece al tenant; su token no muere con la suspensión (auth aislado, architecture §8.1). Solo se actualiza copy (F4) |

## Fases

### F1 — Núcleo: estado + pantalla bloqueante

**Archivos:** `core/providers/auth-provider.tsx`, `core/components/company-suspended-screen.tsx` (nuevo), `shared/auth/auth.types.ts`.

- `AuthStatus` gana el valor `"suspended"`. Nueva acción interna `markSuspended()`: `setUser(null)` + `setStatus("suspended")` + best-effort `POST /api/auth/logout` (borra cookies; el backend ya revocó todo — esto solo limpia el browser).
- `AuthProvider` escucha `auth:company:suspended` (`window.addEventListener`, cleanup en unmount) → `markSuspended()`.
- `hydrate()`: si `SessionResponse` trae `code === API_ERROR_CODES.companySuspended` → `markSuspended()` en lugar de `redirectToLogin()`.
- Render: `status === "suspended"` → `<CompanySuspendedScreen/>` en lugar de `children`.
- `CompanySuspendedScreen` (client component, sin dependencias de slices): pantalla completa `bg-background`, `BrandMark`, título "La empresa está suspendida", texto "Contacta a soporte para reactivar el servicio.", botón "Volver a intentar iniciar sesión" (→ `/auth/login` con `window.location`, que además resetea todo estado en memoria). Tokens semánticos, light/dark, `role="alert"`. **Sin** botón de reintento automático ni countdown (spec §3.6.1).

### F2 — Interceptor HTTP + propagación en el BFF

**Archivos:** `core/services/http.ts`, `core/api/problem.ts` (solo si falta helper), `app/api/auth/session/route.ts`, `shared/auth/auth.handlers.ts`, `app/api/proxy/[...path]/route.ts`.

- `http.ts` (`request()`): tras `parseHttpError`, si es browser y `error.code === API_ERROR_CODES.companySuspended` → `window.dispatchEvent(new CustomEvent("auth:company:suspended"))`; re-lanza el `HttpError` igual (los callers mantienen su manejo local; el overlay tapa cualquier alert residual).
- `session/route.ts`: capturar el `HttpError` de `/auth/me`; si `code === companySuspended` → responder `{ isAuthenticated: false, code }` **sin** intentar el refresh de rescate (fallaría con el mismo 403). Tipar `code?` en `SessionResponse` (`auth.types.ts`).
- `auth.handlers.ts#refreshToken()`: propagar el `code` del fallo (hoy devuelve `{ok:false, code}` — verificar que el 403 del refresh conserve `companySuspended` y no se re-etiquete como `invalidRefresh`).
- `proxy/[...path]/route.ts`: en las dos ramas de refresh fallido (proactivo y por 401), si el code es `companySuspended` responder **403** con ese code (hoy responde 401 genérico). La rama principal ya pasa el 403 del backend verbatim → no tocar.

### F3 — Tiempo real: evento tipado + halt de reconexión

**Archivos:** `core/realtime/events.ts`, `core/realtime/socket-manager.ts`, `modules/inbox/infrastructure/realtime/use-inbox-socket.ts`, `modules/channels/infrastructure/hooks/use-channels-realtime.ts`.

- `events.ts`: `CompanySuspendedEvent = { company_id: string; previous: string; current: string; reason?: string }`; añadir `"company.suspended"` a `InboxServerEvents` **y** `ChannelsServerEvents` (llega a ambos namespaces).
- `socket-manager.ts`: flag interno `halted`. `halt()`: `disconnectAll()` + `halted = true`; `connect()` es no-op mientras `halted`; `reset()` lo limpia. `AuthProvider.login()` (éxito) llama `reset()` — import permitido: provider (core) → core/realtime.
- Hooks de slice: `useSocketEvent(socket, "company.suspended", …)` → `socketManager.halt()` + dispatch de `auth:company:suspended`. Con el halt puesto, el `disconnect` forzado posterior no re-intenta (spec §3.6.2). Si el evento se pierde (socket ya caído), el siguiente request HTTP cae en F2.

### F4 — Panel platform: copy honesto

**Archivos:** `modules/platform/ui/features/tenants/TenantRowActions.tsx`.

- `ConfirmTyped` de suspender: "Se **expulsará inmediatamente** a todos los usuarios conectados (sesiones y WebSocket), se bloqueará el login y la **mensajería quedará en pausa** (los mensajes entrantes se conservan y se re-procesan al reactivar). Las conversaciones y datos se conservan."
- Alert de éxito: suspendido → "Los usuarios de X fueron expulsados y la mensajería quedó en pausa."; reactivado → "X vuelve a operar; los mensajes pendientes se re-encolan automáticamente."

### F5 — Tests y verificación

- **Unit (Jest):**
  - `auth-provider`: evento `auth:company:suspended` → estado `suspended` + render de la pantalla; `hydrate` con `code` de suspensión NO redirige a login.
  - `http.ts`: respuesta 403 con code `companySuspended` → dispatch del CustomEvent + `HttpError` re-lanzado (mock de `fetch` + spy de `dispatchEvent`).
  - `socket-manager`: `halt()` bloquea `connect()`; `reset()` lo restaura.
  - `session/route` (o `auth.handlers`): 403 suspendida → `{isAuthenticated:false, code}` sin intento de refresh.
- **E2E manual (dos navegadores, backend local):** sesión A logueada en `/workspace/inbox` (tenant demo) + sesión B en `/platform` → suspender el tenant → verificar en A: pantalla bloqueante inmediata (camino WS), sin reconexiones en la pestaña Network (socket.io), y que un F5 aterriza en la misma pantalla vía hydrate (camino HTTP). Reactivar desde B → "Volver a intentar" en A → login normal entra.
- `npm run lint` + `npm test` + `npm run build` verdes; `npm run api:types:check` sin drift (el contrato REST no cambia — el 403 es respuesta de error, no schema nuevo).

## Orden y dependencias

```
F1 (estado + pantalla) ──→ F2 (HTTP/BFF) ──→ F5 (tests/e2e)
                      └──→ F3 (WS)      ──↗
F4 (copy platform) — independiente, cualquier momento
```

F1+F2 ya dan cobertura completa por polling HTTP (peor caso: el usuario ve la pantalla en su siguiente request). F3 la hace instantánea. Tamaño estimado: F1 y F3 pequeñas-medianas, F2 mediana (tocar el proxy con cuidado), F4 trivial, F5 mediana.

## QA manual (e2e) — guion por fase

**Preparación:** backend (`../axi-server`, :3000) y frontend (:3001) corriendo. Dos navegadores o perfiles separados: **A** = usuario del tenant demo (`owner@axi.dev`), **B** = super admin en `/platform`. La suspensión se ejecuta siempre desde B: Tenants → fila del tenant demo → Suspender (ConfirmTyped).

> Truco para no esperar 15 min: borrar la cookie `accessToken` en A (DevTools → Application → Cookies) fuerza el camino del refresh en el siguiente request.

### F1 — Pantalla bloqueante

- [ ] A logueado en `/dashboard`; suspender desde B → al siguiente request/evento, A ve la pantalla "La empresa está suspendida" (isotipo + texto de soporte + un único botón).
- [ ] La app de fondo NO está en el DOM (inspeccionar: `children` fue sustituido, no tapado) — no se puede interactuar con nada detrás.
- [ ] La pantalla se ve correcta en light y dark.
- [ ] F5 con la empresa suspendida → vuelve a aterrizar en la pantalla (vía hydrate), no en el login ni en el dashboard.
- [ ] Botón "Volver a intentar iniciar sesión" → `/auth/login`; con la empresa aún suspendida, el login responde con el mensaje de suspensión en el form — sin loop ni redirecciones.
- [ ] Reactivar desde B → botón en A → login normal entra al dashboard de inmediato.

### F2 — Interceptor HTTP y BFF

- [ ] **Request normal:** A en una vista sin sockets (`/settings/company`); suspender desde B; ejecutar cualquier acción (buscar en una tabla, guardar) → pantalla bloqueante inmediata. En Network: el request devuelve **403** con `code: "auth/company_suspended"`.
- [ ] **Refresh:** con la empresa suspendida, borrar la cookie `accessToken` en A y hacer un request → `/api/proxy/*` responde **403** (no 401) con el code de suspensión.
- [ ] **Hydrate:** F5 → en Network, `/api/auth/session` responde `{ isAuthenticated: false, code: "auth/company_suspended" }` y las cookies quedan borradas (Application → Cookies vacío).
- [ ] **No-regresión sesión expirada:** con la empresa ACTIVA, borrar ambas cookies → la app redirige al login normal (`?next=`), JAMÁS a la pantalla de suspensión.
- [ ] **No-regresión RBAC:** un 403 de permisos (usuario con rol limitado intentando una acción vetada) muestra el error puntual de siempre, no la pantalla bloqueante.

### F3 — WebSocket

- [ ] A en `/workspace/inbox` con el socket conectado (Network → WS: frames activos). Suspender desde B → pantalla bloqueante en <1 s **sin tocar nada** (camino WS puro).
- [ ] En Network → WS: tras `company.suspended` llega el disconnect del server y **no aparecen nuevos intentos** de conexión socket.io (sin spam de `connect_error` en consola).
- [ ] Reactivar + re-login → el inbox reconecta el WS (halt reseteado): los mensajes en vivo vuelven a llegar (enviar un mensaje de prueba al canal demo).
- [ ] **Evento perdido:** cortar la red de A (DevTools → offline), suspender desde B, restaurar la red → el siguiente request HTTP muestra la pantalla (cae en F2, sin depender del WS).

### F4 — Panel platform

- [ ] El ConfirmTyped de suspender menciona: expulsión inmediata (sesiones y tiempo real), bloqueo de login, pausa de mensajería con conservación/re-proceso, y conservación de datos.
- [ ] Alert de éxito al suspender: "fueron expulsados y la mensajería quedó en pausa".
- [ ] Alert al reactivar: "vuelve a operar; los mensajes pendientes se re-encolan automáticamente".
- [ ] La sesión del super admin en `/platform` NO se ve afectada al suspender (su auth es aislado).

### F5 — Regresiones generales

- [ ] Login y logout normales con empresa activa.
- [ ] Sesión larga con empresa activa (>15 min con la app abierta): el refresh silencioso sigue funcionando, sin pantallas falsas.
- [ ] Inbox en tiempo real con empresa activa: mensajes, typing y handoff funcionan igual que antes.

## Riesgos y mitigaciones

- **Evento WS perdido** (socket caído en el momento de la suspensión): cubierto por diseño — el siguiente request HTTP devuelve el 403 y activa F2. Mismo cinturón que el backend.
- **Carrera hydrate vs evento**: `markSuspended()` es idempotente (mismo estado final); no importa qué señal llegue primero.
- **Falsos positivos**: el interceptor discrimina **solo** por `code` RFC 7807 (nunca por status 403 a secas — un 403 de RBAC normal no debe expulsar).
- **`/platform` afectado por el interceptor**: su capa de datos usa `openapi-fetch` propio, no `HttpClient` → el interceptor de F2 no lo toca. El `AuthProvider` de tenant no envuelve el guard de `/platform` en la práctica (ruta pública + guard propio), y sus requests jamás emiten el CustomEvent.
- **Regresión del refresh normal**: los tests de F5 cubren que `invalidRefresh`/`unauthorized` siguen yendo a `redirectToLogin()` y solo `companySuspended` va a la pantalla.
