# Plan frontend — Conexión de canales Meta "de un botón"

> **Estado**: aprobado 2026-08-08. Ampliado a documento auditable 2026-08-08.
> Rama: `feat/channels-frontend` (worktree `axi-client/.claude/worktrees/feat-channels-frontend`).
> Plan hermano del backend: `axi-server/docs/plans/meta_channels_onboarding_plan.md`
> (worktree `axi-server/.claude/worktrees/feat-meta-channels`, rama `feat/meta-channels`).

---

## 0. Cómo leer este documento

Este documento existe para que la fase se pueda **auditar sin abrir el código**. Por eso
cada fase (F0 a F5) tiene siempre las mismas cinco secciones, en el mismo orden:

1. **Objetivo y por qué** — qué problema resuelve la fase y por qué se resuelve así.
2. **Inventario de archivos** — la lista completa de archivos nuevos y modificados, con ruta
   absoluta desde la raíz del repositorio. Cada archivo "modificado" fue comprobado como
   existente en el repositorio y cada archivo "nuevo" fue comprobado como inexistente.
3. **Contrato con el backend** — qué endpoints consume la fase, con la forma exacta de
   petición y respuesta, y qué PR del backend los entrega. Incluye la marca de bloqueo:
   qué PR del frontend no puede mergearse hasta que exista qué PR del backend.
4. **Criterio de cierre** — la lista concreta y verificable de lo que debe cumplirse para
   dar la fase por terminada: comandos que deben pasar y comportamiento observable.
5. **Riesgos de la fase y su mitigación**, y **qué NO entra en la fase**.

La sección §2 recoge la verificación de las afirmaciones del plan original contra el
repositorio real, incluidas las que resultaron **falsas o imprecisas**. La sección §9 recoge
las **incertidumbres declaradas**: cosas que no se pudieron verificar y que por tanto no se
afirman.

Convención de escritura del proyecto: prosa en español, identificadores técnicos en inglés y
`snake_case`. Nada de nombres a medio traducir.

---

## 1. Contexto

El tenant que hoy quiere conectar WhatsApp se encuentra un formulario que le pide **Phone
Number ID**, **WABA ID** y un **access token** que empieza por `EAAG…`. Para conseguirlos
tiene que crear una app en `developers.facebook.com`, crear un System User y generar un token
permanente. Ningún cliente no técnico completa eso solo, y cada alta consume horas de
soporte. El formulario es `src/modules/channels/ui/forms/ChannelForm.tsx`, y sus campos
`provider_account_id`, `waba_id` y `access_token` (líneas 194-236) son literalmente el flujo
de desarrollador disfrazado de producto.

El objetivo: un botón, una ventana de Meta, y el canal conectado en un par de minutos.

Instagram y Messenger aparecen hoy como una pastilla deshabilitada que dice "próximamente"
(`ChannelForm.tsx:184-186`). Entran en el alcance (fase F5), pero el diseño debe garantizar
que sumarlos **no sea un rediseño**.

### 1.1 Estado actual del frontend, verificado archivo por archivo

Todo lo de esta lista fue comprobado leyendo el repositorio en el worktree
`feat-channels-frontend`, no de memoria.

**El slice `channels` es pequeño y está completo en siete archivos.** Su árbol real es:

```
src/modules/channels/domain/channel.ts
src/modules/channels/domain/enums.ts
src/modules/channels/infrastructure/hooks/use-channels-realtime.ts
src/modules/channels/infrastructure/services/channels-service.adapter.ts
src/modules/channels/infrastructure/stores/channels.store.ts
src/modules/channels/ui/components/ChannelDetailSheet.tsx
src/modules/channels/ui/forms/ChannelForm.tsx
```

No tiene `application/`, no tiene `public.ts` y no tiene ningún directorio `__tests__`. La
ausencia de `public.ts` es correcta según `docs/architecture.md §3.3` regla 5 ("un slice sin
consumidores externos no necesita `public.ts`"), aunque `modules/workspace` ya importa
rutas internas del slice; eso lo cubre la **regla 6**, que sanciona a `workspace` como única
capa de composición autorizada a consumir `channels`.

**No existe página real de canales.** Las dos únicas rutas de canales son *intercepting
routes* dentro del workspace:

```
src/app/(private)/workspace/@modal/(.)channels/create/page.tsx
src/app/(private)/workspace/@modal/(.)channels/[id]/page.tsx
src/app/(private)/workspace/@modal/default.tsx
```

Un refresco sobre `/workspace/channels/create` da **404**, porque una intercepting route sin
ruta subyacente solo resuelve en navegación blanda. La segunda de las dos, `(.)channels/[id]`,
**no renderiza ningún modal**: despacha el `CustomEvent` `channels:detail:open` y hace
`router.back()` inmediatamente, para que el `ChannelDetailSheet` montado en el layout se
abra. Es un deep-link que en carga directa nunca llega a ejecutarse.

**`/settings/channels` ya está sembrado en el backend** con el path exacto, icono `plug` y
permiso `channels:read`, en `axi-server/prisma/seeders/security.seeder.ts` líneas 278-284. No
hay que inventar ruta ni pedir cambio de seed: hay que sacar el path de
`UNIMPLEMENTED_NAV_PATHS`.

**Permisos reales del slice**: `channels:read` y `channels:manage`. El frontend los evalúa
con `useAuth().hasPermission(...)` de `src/core/providers/auth-provider.tsx:153-160`, que hace
coincidencia con comodines (`channels:*` cubre ambos).

**Cero SDK de Facebook** en todo el repositorio: `package.json` no declara ninguna dependencia
de Meta y no hay ningún `<script>` de `connect.facebook.net`.

**Lo que funciona bien y se reutiliza**: el realtime del namespace `/channels`
(`src/core/realtime/events.ts:409-414`, tres eventos más `company.suspended`), el QR de
WhatsApp Web en vivo, el BFF proxy con refresh de token (`src/core/services/http.ts`), y el
design system completo (`docs/design/DESIGN-SYSTEM.md`).

**Código muerto que este plan resucita**: `updateChannelCredentials`
(`channels-service.adapter.ts:29`), `getWwebPairingState` (línea 53) y
`requestWwebPairingCode` (línea 58) están definidos y **no tienen un solo consumidor** en
todo `src/`. Verificado con búsqueda de cada símbolo en el árbol completo: la única
coincidencia de cada uno es su propia definición.

---

## 2. Verificación del plan original contra el repositorio

Esta sección es el registro de la auditoría técnica previa. Cada afirmación del plan
aprobado se contrastó contra el código. Lo que se confirmó queda como confirmado; lo que no
cuadró está corregido aquí **y** en la fase correspondiente.

### 2.1 Afirmaciones confirmadas

| Afirmación del plan original | Evidencia |
|---|---|
| `/settings/channels` está en `UNIMPLEMENTED_NAV_PATHS` | `src/core/config/routes.ts:61`, dentro del `Set` que abre en la línea 56 |
| Existen las dos intercepting routes de canales bajo `@modal` | `(.)channels/create/page.tsx` y `(.)channels/[id]/page.tsx` |
| El slot `@modal` no tiene otros consumidores | Solo `workspace` declara `@modal`. Los demás slots paralelos del repo son `@form` (agents, quick-actions, crm/contacts, crm/pipeline, crm/tasks) y `@sheet` (orders, crm/pipeline). Bajo `workspace/@modal/` solo cuelgan esas dos páginas y `default.tsx` |
| `StepIndicator` y `EmptyState` viven en `src/modules/platform/ui/components/` | Ambos archivos existen ahí; no hay copia en `shared` |
| `updateChannelCredentials`, `requestWwebPairingCode` y `getWwebPairingState` existen en el adapter y no tienen consumidores en UI | Búsqueda por símbolo en todo `src/`: una sola coincidencia cada uno, la definición |
| `next.config.ts` usa `output: "standalone"` | Línea con el comentario del tamaño de la imagen Docker |
| `next.config.ts` no define `headers()` | El objeto `NextConfig` declara `output`, `poweredByHeader`, `redirects()` e `images` — nada más |
| `GET /channels` no pagina | `ChannelListDto` en `src/core/api/schema.d.ts:5812` es `{ data: [...] }` **sin** bloque `meta`. Contrasta con `Paginated<T>` de `src/core/api/types.ts`, que sí exige `meta` |
| `useChannelsRealtime()` solo se monta en el layout del workspace | Única invocación en `src/app/(private)/workspace/layout.tsx:16` |
| El mapa de estados de canal está duplicado | `STATUS_DOT` en `ChannelDetailSheet.tsx:33-39` y `STATUS_COLORS` en `ChannelList.tsx:23-29` son idénticos carácter a carácter |
| Hay exactamente dos `router.push` que van a la ruta rota | `ChannelSection.tsx:45` y `ChannelSection.tsx:62`, ambos a `/workspace/channels/create` |
| El backend no expone todavía ningún endpoint de Meta | `grep "channels/meta\|embedded-signup" axi-server/openapi/openapi.json` no devuelve nada |

### 2.2 Afirmaciones falsas o imprecisas, corregidas

**(a) «`StepIndicator` y `EmptyState` tienen 5 consumidores».** Falso, y por un margen
grande. El recuento real, por archivo importador:

- `StepIndicator`: **3 importadores directos** (`RunWizard.tsx`, `MigrationSection.tsx`,
  `TenantDatabaseView.tsx`) más **1 re-export** (`WizardStepper.tsx`, que solo hace
  `export { StepIndicator as WizardStepper }`) con **1 consumidor propio**
  (`TenantWizard.tsx`).
- `EmptyState`: **15 importadores directos**, todos dentro de `modules/platform/ui/features/`.

El total de archivos a reapuntar si se promueven ambos primitivos "sin shims" es de **19
archivos**, no 5. Esto cambia el tamaño de F1 lo suficiente como para cambiar la decisión:
véase la decisión **D6** en §3, que revisa el alcance de la promoción.

Dato adicional relevante para la auditoría: **ninguno de los dos primitivos tiene test
propio**. El único test bajo `src/modules/platform/ui/components/__tests__/` es
`ConfirmTyped.test.tsx`. Mover los archivos no rompe ninguna suite existente; el riesgo es
puramente de importaciones rotas, que el compilador detecta.

**(b) «El adapter del slice usa paths relativos».** Falso. Los siete archivos del slice
`channels` usan **exclusivamente** el alias absoluto `@/`. Por ejemplo,
`channels-service.adapter.ts` importa `@/core/services/http`, `@/core/api/types` y
`@/modules/channels/domain/channel`. El adapter nuevo de F2 debe seguir esa misma convención
absoluta, no relativa.

**(c) «El mapa de estados está duplicado entre `ChannelDetailSheet` y `ChannelList`»** — el
hecho es cierto, pero la ubicación que el plan sugería es engañosa. `ChannelList.tsx` **no
vive en el slice `channels`**: está en
`src/modules/workspace/ui/sidebar/components/channel-section/ChannelList.tsx`. Extraer un
`ChannelStatusBadge` a `modules/channels` y consumirlo desde `workspace` es legal por la
regla 6 de `architecture.md §3.3`, pero es un cruce de slices que debe declararse en el PR,
no un refactor interno.

**(d) «Dos redirects permanentes en `next.config.ts`».** Impreciso en la mecánica: el archivo
**ya tiene** una función `redirects()` con **siete** entradas (la capa pública de GTM). Los
dos redirects de canales se **añaden al array existente**; no se crea la función. Un PR que
declare una segunda `redirects()` sobreescribiría en silencio los siete redirects públicos.

**(e) «`refreshMetaChannelHealth(id)` y `disconnectMetaChannel(id)`».** Estos dos endpoints
**no existen en el plan del backend**. El plan del backend declara exactamente **tres**
endpoints nuevos en B4 y **uno** de plataforma en B7. La reconexión, según §4.4 del plan del
backend, se hace **sin endpoint nuevo**: se reabre el popup y se vuelve a llamar a
`POST /channels/meta/embedded-signup` con el mismo `phone_number_id`. Y la desconexión
voluntaria por parte del tenant no está contemplada en ninguna fase del backend. Corregido en
F2 y F4, y convertido en una petición explícita al backend (§4.3).

**(f) «`ChannelDto` += `quality_rating`, `messaging_limit_tier`, `name_status`,
`business_id`, `token_expires_at`, `last_health_check_at`, `platform_type`».** Impreciso en
tres sentidos distintos:

- `waba_id` **ya existe** en `ChannelDto` (`schema.d.ts:5792-5811`), igual que
  `display_phone_number`, `verified_name`, `credentials_configured` y `token_last4`. No hay
  que pedirlo.
- `business_id` y `last_health_check_at` **sí** son columnas nuevas en B3 del backend, pero
  el plan del backend **no declara que se expongan en `ChannelDto`**; solo las expone en
  `GET /platform/channels/health`, que es un endpoint de super-admin al que el tenant no tiene
  acceso.
- `messaging_limit_tier`, `name_status` y `platform_type` **no aparecen en ninguna parte del
  plan del backend** como campos expuestos. `platform_type` se captura en el paso 6 del use
  case, pero solo para decidir si hay que registrar el número.

Consecuencia: la tarjeta de salud de F4 se apoya hoy en un contrato que **nadie se ha
comprometido a entregar**. Convertido en la petición de contrato más importante de §4.3.

**(g) «Evento de salud en el namespace `/channels`».** El plan del backend **no declara
ningún evento WebSocket nuevo**. Su B6 emite `channel.disconnected` como **evento de dominio
interno** que consume un `NotificationWriterSubscriber` para escribir una notificación
in-app. Eso llega al frontend por la campanita (`notification.created` en el namespace
`/inbox`), no por `/channels`. El único camino ya existente para que la tarjeta de salud se
actualice en vivo es `channel.status_changed`, que sí existe hoy.

**(h) «`getMetaSignupConfig(product?)`».** El endpoint del backend, tal como está declarado
en B4, **no acepta parámetro de producto**: devuelve un único `config_id`. La tabla
`channel_meta_app` de B3 sí guarda `config_id_whatsapp`, `config_id_instagram` y
`config_id_messenger`, así que la capacidad existe en el modelo, pero el contrato HTTP no la
expone. Es una petición para F5 (§4.3), no un hecho.

**(i) Un hallazgo nuevo que el plan original no menciona y que afecta al criterio de cierre
de todas las fases: `npm test` dentro de este worktree no ejecuta ningún test.**
`jest.config.cjs` declara `testPathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/',
'/.next/']`. Como el worktree vive precisamente bajo `.claude/worktrees/`, la ruta absoluta de
**todos** sus tests coincide con el patrón de exclusión. Comprobado: `npx jest --listTests`
devuelve **cero** archivos, con código de salida 0 (es decir, falla en silencio); el mismo
comando sobreescribiendo el patrón devuelve **83** archivos. El criterio de cierre de cada
fase lo tiene en cuenta.

**(j) Un segundo hallazgo nuevo: `axi-client` no tiene script `typecheck`.** Sus scripts son
`dev`, `build`, `start`, `lint`, `test`, `test:watch`, `api:types` y `api:types:check`. El
plan del backend habla de `npm run typecheck` porque el backend sí lo tiene; aquí la
comprobación de tipos se hace con `npx tsc --noEmit` o, indirectamente, con `npm run build`
(que además corre ESLint, porque la verja de lint está activa en el build).

### 2.3 Hechos del repositorio que el plan original no registraba y que cambian decisiones

- **No existe primitivo `Checkbox` ni `Card` en `src/shared/components/ui/`**, y
  `package.json` no declara `@radix-ui/react-checkbox`. El repo resuelve las casillas con
  `<input type="checkbox">` nativo en ocho lugares (por ejemplo
  `src/modules/catalog/ui/forms/VariantForm.tsx:216`). El checklist de F3 usa el input nativo:
  cumple el requisito de accesibilidad ("checkboxes reales, no `div onClick`") sin añadir
  ninguna dependencia.
- **Ya existe un diccionario canónico de errores por `code`**: `MESSAGES_BY_CODE` en
  `src/core/lib/error-messages.ts`, con más de cuarenta entradas y consumido por
  `errorMessage()`, que a su vez tiene 143 llamadas en el repo. La traducción de los errores
  de Meta de F3 **extiende ese diccionario**; no crea uno paralelo.
- **El namespace `/channels` ya tiene dos consumidores distintos hoy**: el hook
  `useChannelsRealtime()` del workspace y `use-dashboard-realtime.ts:17`, que llama
  `useSocket("channels")` directamente. Es decir, el contador de referencias de
  `src/core/realtime/use-socket.ts:15-58` ya está ejercitado en producción con más de un
  consumidor. La afirmación de F4 de que montar el realtime en tres vistas más es seguro está
  respaldada por el código y por el uso actual.
- **El patrón de página delgada está confirmado**: `settings/voice/page.tsx` son cinco líneas
  que devuelven `<VoiceSettingsView />`, y `settings/voice/loading.tsx` devuelve
  `<FormSkeleton />` importado de `@/shared/components/features/loading`. Es el patrón que
  siguen las rutas nuevas.
- **El layout de `(content)` ya aporta el ancho y el padding**:
  `src/app/(private)/(content)/layout.tsx` es `<div className="mx-auto w-full max-w-7xl p-4
  md:p-6">`. Las páginas nuevas no añaden padding propio, tal como manda `DESIGN-SYSTEM §4.2`.

---

## 3. Decisiones de arquitectura que gobiernan todo el plan

**D1 — La configuración de Meta la sirve el backend, no `NEXT_PUBLIC_*`.**
`next.config.ts` usa `output: "standalone"`, así que cualquier `NEXT_PUBLIC_META_APP_ID`
queda **horneada en build time** dentro de la imagen Docker: rotar el `config_id` exigiría
reconstruir y redesplegar la imagen. Además el `config_id` difiere por producto (WhatsApp,
Instagram, Messenger) y por app (la de axi o la del cliente que trae la suya, que es un
requisito explícito del plan del backend §4.1). Por tanto el frontend consume
`GET /channels/meta/embedded-signup/config` y no conoce ningún identificador de Meta en
tiempo de compilación.

Fallback documentado: si el endpoint devuelve 404 o 503, el flujo degrada al camino manual de
§F3. Se descarta añadir variables `NEXT_PUBLIC_META_*` opcionales en `src/core/config/env.ts`
como segundo camino, porque tener dos fuentes de verdad para el mismo `config_id` es
exactamente el modo de fallo que D1 busca evitar: alguien sube la variable, olvida el
endpoint, y el popup abre contra una configuración de Meta que ya no existe.

**D2 — El SDK se precarga al montar, nunca al hacer clic.**
`FB.login()` **debe** invocarse de forma síncrona dentro del handler del clic. Si el handler
hace `await loadSdk()` antes, se rompe la cadena de gesto de usuario y el navegador **bloquea
el popup**. Consecuencia de diseño, no opcional: el botón nace deshabilitado con un spinner y
solo se habilita cuando el SDK resolvió. Cualquier "simplificación" que cargue el SDK dentro
del `onClick` rompe la feature en los navegadores que más importan.

**D3 — Registry de proveedores, no `if (kind === ...)`.**
Todo lo que la UI necesita saber de un canal (icono, color de marca, estrategia de conexión,
prerrequisitos, disponibilidad) vive en un descriptor de dominio. Añadir Instagram consiste en
añadir un descriptor y un `config_id`. Es la condición para que F5 no sea un rediseño, y es
también lo que permite que el criterio de éxito de F5 sea medible ("el diff cabe en un archivo
de dominio").

**D4 — URLs canónicas en `/settings/channels`; el workspace es consumidor.**
El sidebar del workspace sigue siendo la vista operativa (estado en vivo, QR), pero deja de
ser el dueño de las rutas de creación y detalle. La razón es de producto, no de estética:
conectar un canal es una tarea de administración que se hace una vez, y el workspace es una
vista de aplicación full-bleed pensada para trabajar conversaciones. Meter un wizard de cuatro
pasos dentro de un modal del inbox es pelear contra el layout (`DESIGN-SYSTEM §4.2` distingue
explícitamente vistas documentales de vistas de aplicación).

**D5 — El `code` es de un solo uso y dura 30 s.** Nunca se reintenta un `code`; un fallo del
intercambio siempre reabre `FB.login`. Nunca se persiste en `localStorage`, ni en un store, ni
en la URL. El plan del backend lo confirma desde el otro lado: su código de error
`channels/meta_code_expired` cubre tanto "vencido" como "ya canjeado".

**D6 (nueva, consecuencia de la verificación §2.2a) — La promoción de primitivos se limita a
`StepIndicator`, y `EmptyState` se resuelve con un componente propio del slice.**

El plan original asumía cinco consumidores; son diecinueve. Promover `EmptyState` obligaría a
reapuntar quince archivos de `modules/platform`, todos ellos de un módulo (el panel de
super-admin) que **no tiene nada que ver con esta feature**. Un PR de canales que toca quince
archivos de plataforma es un PR que nadie puede revisar por su diff, y cuyo riesgo de
regresión no lo paga la feature que lo introduce.

La decisión, entonces:

- **`StepIndicator` sí se promueve** a `src/shared/components/ui/step-indicator.tsx`. Son
  tres importadores directos más un re-export, es genuinamente un primitivo de UI sin estado
  ni dominio, y el wizard de F3 lo necesita. El re-export `WizardStepper.tsx` **se conserva**
  apuntando a la nueva ruta: es el único alias con nombre semántico del repo y borrarlo
  obligaría a tocar `TenantWizard.tsx` sin ganar nada.
- **`EmptyState` no se mueve.** El vacío de canales se resuelve con un componente propio del
  slice, `src/modules/channels/ui/components/ChannelsEmptyState.tsx`, con el tono neutro que
  la vista necesita. El coste es una duplicación de unas veinte líneas de layout; el beneficio
  es que F1 no toca quince archivos ajenos. Se documenta como deuda consciente en el propio
  archivo, con la nota de que la unificación de estados vacíos merece su propio PR de
  design system, desacoplado de esta feature.

Esta decisión también elimina la necesidad de la prop `tone` que el plan original pedía
añadir a `EmptyState`: el acento violeta de `EmptyState` (`bg-accent-violet/10` +
`text-accent-violet`, líneas 21-22) es correcto **en su contexto**, que es el panel de
plataforma, y no hay por qué renegociarlo desde aquí.

---

## 4. Mapa de fases y acoplamiento con el backend

### 4.1 Orden y paralelismo

```
F0 (mockup, GATE)
   │
   ├── F1 ──────────────────────────────────┐
   │    (sin dependencia del backend)       │
   │                                        ▼
   └── F2 ── F3 ── F4 ── F5
        (F2 depende de B4; F4 de B6)
```

F1 y F2 tocan archivos disjuntos salvo el store del slice, así que pueden desarrollarse en
paralelo. **F1 tiene valor propio y puede mergearse aunque el backend se retrase
indefinidamente**: arregla el 404 y entrega la primera página real de canales, que es una
funcionalidad que los tenants ya piden hoy.

F3 depende de F2 (necesita la máquina de estados) y de F1 (necesita la ruta y el registry).
F4 depende de F3 solo por continuidad de UI; su bloqueo real es de contrato. F5 depende de
todo lo anterior y de una capacidad del backend que hoy no está declarada.

### 4.2 Tabla de bloqueo entre PRs

Esta tabla es el contrato de secuenciación. La columna "no se mergea hasta" es normativa.

| PR frontend | Depende de | No se mergea hasta que exista | Motivo del bloqueo |
|---|---|---|---|
| **F0** | — | — | Es un mockup, no toca `src/` |
| **F1** | F0 aprobado | — | No consume ningún endpoint nuevo. Es el PR que se puede mergear primero pase lo que pase |
| **F2** | F1 (registry, store) | **B4 mergeado y `openapi/openapi.json` regenerado en `axi-server`** | Los tipos del adapter salen de `Schemas[...]` tras `npm run api:types`. Sin los DTOs en el `openapi.json`, `api:types:check` falla y el adapter tendría tipos inventados a mano |
| **F3** | F1 + F2 | **B4** (heredado de F2) | Consume `POST /channels/meta/embedded-signup` en vivo |
| **F4** | F3 | **B6**, y además el acuerdo de contrato de §4.3 sobre los campos de salud en `ChannelDto` | Sin B6 no hay `expires_at` poblado ni detección de revocación; sin el acuerdo de campos, la tarjeta de salud no tiene qué mostrar |
| **F5** | F4 | **B9** del backend **y** la extensión del endpoint de config con parámetro de producto (§4.3, petición 4) | Sin B9 no hay adaptador de Instagram/Messenger: el canal se crearía y no podría enviar ni recibir |

Regla operativa que se deriva: **F2 y F4 se desarrollan contra un `openapi.json` que todavía
no tiene los endpoints**, así que durante el desarrollo el adapter usa tipos locales marcados
explícitamente como provisionales, y el paso final de cada PR es sustituirlos por
`Schemas[...]` tras regenerar. Un PR de F2 o F4 con tipos locales sin sustituir **no está
terminado**, aunque compile.

### 4.3 Contrato que este plan pide al backend

Estas son las peticiones que el frontend hace al plan del backend. Cada una está redactada
para que se pueda aceptar, rechazar o modificar en la revisión conjunta de los dos planes. No
son supuestos: son negociaciones abiertas, y mientras no se cierren, la fase que depende de
ellas no puede darse por planificada.

**Petición 1 (bloquea F2) — Fijar los nombres de los DTOs en el `openapi.json`.** El plan del
backend describe la respuesta de `GET /channels/meta/embedded-signup/config` como
`{ enabled, app_id, config_id, graph_api_version }` pero no dice cómo se llamará el schema. El
frontend necesita el nombre exacto porque `src/core/api/types.ts` deriva todo de
`components["schemas"]`. Nombres propuestos, coherentes con la convención existente
(`ChannelDto`, `ChannelListDto`, `CreateChannelDto`): `MetaEmbeddedSignupConfigDto`,
`CompleteMetaEmbeddedSignupDto` (petición) y la reutilización de `ChannelDto` para la
respuesta.

**Petición 2 (bloquea F2/F3) — Confirmar la forma exacta del cuerpo de
`POST /channels/meta/embedded-signup`.** Del plan del backend se deducen con certeza dos
campos: `code` (aparece en la lista de *redact* de B7 como `req.body.code` y es el argumento
del paso 4) y `register_pin` (aparece como `req.body.register_pin`). Un tercero,
`phone_number_id`, es seguro porque es la clave del lock de Redis
(`channel:onboarding:{company_id}:{phone_number_id}`) y la clave natural de idempotencia. Dos
más se infieren de §4.2 del plan del backend pero no están escritos como campos de petición:
`waba_id` (necesario para el chequeo de `target_ids` del paso 5) y `business_id` (hay columna
en B3). Y uno no aparece en absoluto: **el nombre del canal**. Hoy `POST /channels` exige
`name` (`CreateChannelDto`); si el nuevo endpoint no lo acepta, el canal nacerá con un nombre
autogenerado y el paso 4 del wizard tendrá que renombrarlo con un `PATCH` posterior. Hay que
decidirlo, porque cambia la UI.

**Petición 3 (bloquea F4) — Exponer los campos de salud en `ChannelDto`, no solo en el panel
de plataforma.** El plan del backend guarda `quality_rating` en `config.health` (B3) y lo
expone en `GET /platform/channels/health` (B7), que es super-admin. El tenant no lo ve por
ningún sitio. F4 necesita, como mínimo, estos campos en `ChannelDto`, todos anulables:
`quality_rating`, `connection_method`, `last_health_check_at`, `token_expires_at` (el
`expires_at` de la credencial, que B6 empieza a poblar) y el bloque `onboarding` con su
`status`. Si el backend prefiere no ensanchar `ChannelDto`, la alternativa es un
`GET /channels/:id/health` propio; lo que no es viable es que F4 dependa de un endpoint de
plataforma.

**Petición 4 (bloquea F5) — Parametrizar el endpoint de config por producto.** La tabla
`channel_meta_app` ya tiene `config_id_whatsapp`, `config_id_instagram` y
`config_id_messenger`, pero el endpoint devuelve un `config_id` a secas. F5 necesita
`GET /channels/meta/embedded-signup/config?product=whatsapp|instagram|messenger`, o bien que
la respuesta devuelva el mapa completo de `config_id` por producto y el frontend elija. La
segunda opción es preferible: ahorra un round-trip por cada cambio de proveedor en el paso 1
del wizard.

**Petición 5 (afecta a F4, no la bloquea) — Decidir si existe una desconexión voluntaria.**
Hoy el tenant solo puede **eliminar** el canal (`DELETE /channels/:id`, que el frontend ya
consume desde `ChannelDetailSheet.tsx:104`). El mockup de F0 contempla un botón "Desconectar"
distinto de "Eliminar", con la promesa de que el historial se conserva. Si el backend no
implementa un endpoint para eso, **el botón no debe existir**: prometer en la UI una
semántica que el backend no tiene es peor que no ofrecerla. La decisión afecta al mockup, así
que conviene cerrarla antes del gate de F0.

**Petición 6 (afecta a F4, no la bloquea) — Confirmar si habrá evento WebSocket de salud.**
El plan del backend no declara ninguno. Si no lo hay, F4 se apoya en `channel.status_changed`
(que ya existe) más un refetch al montar la vista, y la notificación de desconexión llega por
la campanita. Es aceptable, pero hay que escribirlo para que la auditoría no busque un evento
que nadie va a emitir.

---

## 5. Fases

### F0 — Mockup HTML navegable (GATE, sin código de producción)

#### Objetivo y por qué

Regla del proyecto: mockup de alta fidelidad aprobado **antes** de codificar. La razón
específica en esta feature es que el flujo tiene ocho estados asíncronos que el usuario no
controla, y discutir sobre ASCII cómo se ve un `popup_blocked` frente a un `unavailable`
frente a un `cancelled` no funciona. Hay que poder pulsar y ver la transición.

#### Inventario de archivos

**Nuevos**: ninguno dentro de `src/`. El entregable es un HTML autocontenido publicado como
Artifact privado. Si se quiere conservar en el repositorio, el sitio es
`docs/design/mockups/channels-connect.html` (el directorio `docs/design/` existe y contiene
hoy `DESIGN-SYSTEM.md`, `DESIGN.md`, `IMPLEMENTATION-PLAN.md` y `LOADING.md`; no existe
subcarpeta `mockups/`).

**Modificados**: `docs/plans/channels_meta_embedded_signup_frontend_plan.md` (este archivo),
para pegar los mockups aprobados como ASCII, siguiendo la convención de
`docs/plans/crm_frontend_plan.md`, cuya §5 se titula "Mockups por fase (gate de aprobación)"
y contiene un bloque por fase.

El HTML lleva los tokens de la capa 1 de `DESIGN-SYSTEM.md §2.1` copiados como `:root` y
`.dark`. Los valores exactos verificados en `src/app/globals.css` son:
`--axi-brand` `#E65759` en light y `#FB7185` en dark; `--axi-violet` `#7C3AED` / `#A78BFA`;
`--axi-success` `#16A34A` / `#4ADE80`; `--axi-warning` `#D97706` / `#FBBF24`;
`--axi-destructive` `#DC2626` / `#F87171`.

#### Pantallas que debe cubrir

1. `/settings/channels` en dos versiones: vacío (cero canales) y poblado (tres canales con
   estados distintos, incluido uno en `error`).
2. `/settings/channels/connect`, paso 1: galería de proveedores.
3. Paso 2: checklist de prerrequisitos, incluida la rama "no cumplo esto todavía".
4. Paso 3: el botón, con sus **ocho estados** conmutables mediante botones de "simular"
   (`preparing`, `ready`, `unavailable`, `popup_open`, `popup_blocked`, `exchanging`,
   `cancelled`, `error`; el noveno, `success`, es la pantalla 5).
5. Paso 4: éxito, con resumen, asignación de agente y mensaje de prueba.
6. `/settings/channels/[id]`: tarjeta de salud, renovación de conexión y desconexión.
7. El fallback manual desplegado desde "Opciones avanzadas".

Todo en **light y dark**, porque el checklist de `DESIGN-SYSTEM §11` lo exige y porque los
tres tonos de calidad (alta, media, baja) son el punto donde el contraste falla primero.

#### Contrato con el backend

Ninguno. F0 no consume nada. Sí depende de que estén **decididas** las peticiones 3 y 5 de
§4.3, porque determinan qué campos y qué botones existen en las pantallas 6 y 7: dibujar una
tarjeta de salud con métricas que nadie va a servir es fabricar trabajo que habrá que
deshacer.

#### Criterio de cierre

- El HTML abre en un navegador sin servidor, sin red y sin CDN (es autocontenido).
- Las siete pantallas son alcanzables por clic desde la primera, sin editar la URL.
- Los ocho estados del paso 3 se pueden simular sin recargar.
- El conmutador light/dark funciona y ninguna de las siete pantallas pierde contraste.
- Aprobación **explícita** del usuario. Según la regla de gate por fase del proyecto, un "sigue
  adelante" genérico o un "antes de proceder" **no** cuenta como aprobación de la fase
  siguiente: hay que cerrar F0, reportar y esperar.
- Los mockups aprobados quedan pegados como ASCII en este documento.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| El mockup usa colores crudos y luego el código no puede reproducirlos con tokens | Los tokens se copian literalmente de `globals.css` al `:root` del HTML; cualquier color que no salga de un token es una señal de que el diseño no es implementable |
| Se aprueba un mockup que promete datos que el backend no sirve (calidad, límite de mensajería, desconexión suave) | Cerrar las peticiones 3 y 5 de §4.3 **antes** del gate; cada dato del mockup debe poder señalarse a un campo de un contrato |
| El mockup se aprueba y luego se implementa "libremente" | Los ASCII pegados en este documento son la referencia de la revisión de F1-F4, no una decoración |

#### Qué NO entra en F0

No entra ningún archivo dentro de `src/`. No entra el registry de proveedores (es F1, y es
código de dominio). No entra ninguna llamada real ni simulada al backend. No entra el copy
definitivo de los mensajes de error de Meta: en el mockup van como texto de muestra, y el
diccionario real se escribe en F3.

---

### F1 — Fundaciones: página real, fin del 404, primitivos

#### Objetivo y por qué

Entregar la primera página real de canales y eliminar la deuda de las intercepting routes sin
página subyacente. No hay nada de Meta todavía, a propósito: es la parte del trabajo que **no
depende del backend**, y aislarla significa que si Meta o el App Review se retrasan, el tenant
igualmente gana una pantalla de administración de canales que hoy no tiene.

#### Inventario de archivos

**Archivos nuevos** (comprobados como inexistentes hoy):

| Ruta | Qué es |
|---|---|
| `src/app/(private)/(content)/settings/channels/page.tsx` | Página delgada que devuelve `<ChannelsView />` |
| `src/app/(private)/(content)/settings/channels/loading.tsx` | Devuelve `<TableSkeleton />` de `@/shared/components/features/loading` |
| `src/app/(private)/(content)/settings/channels/[id]/page.tsx` | Página delgada que devuelve `<ChannelDetailView />` |
| `src/app/(private)/(content)/settings/channels/[id]/loading.tsx` | Skeleton estructural del detalle |
| `src/modules/channels/domain/channel-providers.ts` | Registry de proveedores (TypeScript puro, sin React) |
| `src/modules/channels/ui/components/ChannelsView.tsx` | Vista de lista |
| `src/modules/channels/ui/components/ChannelCard.tsx` | Tarjeta de canal |
| `src/modules/channels/ui/components/ChannelStatusBadge.tsx` | Badge de estado, extraído del mapa duplicado |
| `src/modules/channels/ui/components/ChannelsEmptyState.tsx` | Estado vacío propio del slice (decisión D6) |
| `src/modules/channels/ui/components/ChannelDetailView.tsx` | Vista de detalle (esqueleto; su contenido de salud llega en F4) |
| `src/shared/components/ui/step-indicator.tsx` | `StepIndicator` promovido (decisión D6) |
| `src/modules/channels/domain/__tests__/channel-providers.test.ts` | Test del registry |

Nota sobre el directorio `(content)/settings/channels/`: no existe hoy. Los directorios
hermanos que sí existen y confirman el patrón son `settings/company`, `settings/forms`,
`settings/orders`, `settings/quick-actions`, `settings/roles`, `settings/users` y
`settings/voice`.

**Archivos modificados** (todos comprobados como existentes):

| Ruta | Cambio |
|---|---|
| `src/core/config/routes.ts` | Quitar `"/settings/channels"` del `Set` `UNIMPLEMENTED_NAV_PATHS` (línea 61) y actualizar el comentario del bloque (líneas 47-55), que enumera "usage, audit, channels, scheduling, métodos de pago" |
| `next.config.ts` | **Añadir dos entradas al array que ya devuelve `redirects()`**, sin crear una segunda función |
| `src/app/(private)/workspace/layout.tsx` | Quitar la prop `modal` de la firma (línea 15) y su render (dentro del `div` de children) |
| `src/modules/workspace/ui/sidebar/components/channel-section/ChannelSection.tsx` | Reapuntar los dos `router.push("/workspace/channels/create")` (líneas 45 y 62) a `/settings/channels/connect` |
| `src/modules/workspace/ui/sidebar/components/channel-section/ChannelList.tsx` | Sustituir el mapa local `STATUS_COLORS` (líneas 23-29) por `ChannelStatusBadge` del slice `channels` |
| `src/modules/channels/ui/components/ChannelDetailSheet.tsx` | Sustituir el mapa local `STATUS_DOT` (líneas 33-39) por el mismo componente |
| `src/modules/channels/infrastructure/stores/channels.store.ts` | Añadir `upsertChannel` y `removeChannel` al tipo `ChannelStore` y a la implementación |
| `src/modules/platform/ui/features/quality/runs/wizard/RunWizard.tsx` | Reapuntar el import de `StepIndicator` (línea 27) |
| `src/modules/platform/ui/features/tenants/detail/database/MigrationSection.tsx` | Reapuntar el import (línea 56) |
| `src/modules/platform/ui/features/tenants/detail/database/TenantDatabaseView.tsx` | Reapuntar el import (línea 35) |
| `src/modules/platform/ui/features/tenants/wizard/WizardStepper.tsx` | Reapuntar el re-export (línea 6) a la nueva ruta compartida |

**Archivos eliminados**:

| Ruta | Por qué |
|---|---|
| `src/app/(private)/workspace/@modal/(.)channels/create/page.tsx` | Intercepting route sin ruta subyacente; su destino ahora es una página real |
| `src/app/(private)/workspace/@modal/(.)channels/[id]/page.tsx` | Ídem; además no renderiza modal, solo despacha un `CustomEvent` |
| `src/app/(private)/workspace/@modal/default.tsx` | Queda huérfano al desaparecer el slot |

**Archivo que NO se elimina y por qué**: `src/modules/channels/ui/forms/ChannelForm.tsx` se
conserva intacto. Es el fallback manual que F3 necesita, y es también el escape hatch de
soporte que el plan del backend preserva explícitamente ("`createChannelSchema` no se toca").

**No se elimina el `ChannelDetailSheet`.** El clic sobre un canal del sidebar del workspace
**conserva** el `CustomEvent` `channels:detail:open` que abre el sheet. Es correcto: en el
workspace no queremos sacar al operador de su vista para mirar el estado de un canal. La
página `/settings/channels/[id]` es la versión completa para quien administra.

#### Detalle de las decisiones de la fase

**Por qué se borran las intercepting routes en vez de añadirles la página subyacente.** La
alternativa "barata" sería crear `workspace/channels/create/page.tsx` para que la
interceptación tuviera algo que interceptar. Se descarta porque duplicaría el wizard en dos
URLs y porque contradice D4: las URLs canónicas viven en `/settings/channels`. Borrar y
redirigir elimina la deuda; parchear la multiplica.

**Por qué redirects permanentes (308) y no un simple borrado.** Los dos paths ya circulan:
`ChannelSection.tsx` los empuja con `router.push`, así que están en el historial de navegación
de los usuarios actuales y probablemente en algún enlace compartido. Un 308 los reconduce sin
dejar una ruta fantasma en `app/`. Se usan permanentes, no temporales, porque es una decisión
de arquitectura de URLs, coherente con los siete redirects que el archivo ya tiene.

**Por qué grid de tarjetas y no `DataTable`.** Los canales de un tenant son ≤5 filas con
estado en vivo. Una tabla con paginación, ordenación y filtros es la herramienta equivocada
para cinco elementos que parpadean. Además `GET /channels` **no pagina** (verificado:
`ChannelListDto` no tiene bloque `meta`), así que `usePaginatedList` de
`src/shared/api/use-paginated-list.ts` no aplica: se alimentaría de un contrato que no existe.

**Estados obligatorios de la vista** (`DESIGN-SYSTEM §9`, y su §9.1 para la jerarquía):
cargando con skeleton estructural de anchos **deterministas** (nada de `Math.random()`, que
rompe la hidratación SSR: está escrito como prohibición explícita en §9.1), vacío con
`ChannelsEmptyState` y una llamada a la acción, y error con reintento.

**El registry** (`channel-providers.ts`) es TypeScript puro, sin React, sin `zod` y sin
`http`, porque vive en `domain/` y la regla 1 de `architecture.md §3.3` lo exige. Sus campos:
`kind`, `label`, `tagline`, `icon`, `brandColor` (nombre de token, **nunca un hex**, por
`DESIGN-SYSTEM §7` y el primer punto del checklist de §11), `connectStrategy`
(`embedded_signup` | `qr` | `manual`), `availability`, `recommended`, `prerequisites[]` y
`metaProduct?`. Sustituye los chips codificados a mano de `ChannelForm.tsx:168-186`, incluida
la pastilla "Instagram / Messenger (próximamente)".

Un matiz de la regla 1 que hay que resolver en la implementación: `icon` no puede ser un
componente de React dentro de `domain/`. El registry guarda un **identificador de icono**
(string) y la capa `ui/` lo resuelve contra un diccionario cerrado, exactamente como hace el
sidebar con `core/lib/icons.ts` según `DESIGN-SYSTEM §9.2`. Los iconos de marca vienen de
`react-icons` (`FaWhatsapp`, `FaInstagram`, `FaFacebookMessenger`), que es lo que ya usa
`ChannelList.tsx:7` y lo que `DESIGN-SYSTEM §7` autoriza para logos de terceros.

**Ubicación de las páginas**: dentro del grupo `(content)`. Son vistas **documentales**, así
que **no llevan `data-app-view`** y **no ponen padding propio** (lo aporta el layout del
grupo). Está normado en `DESIGN-SYSTEM §4.2`, cuyo texto distingue explícitamente las vistas
documentales (deben crecer, scrollea el panel) de las de aplicación (quedan topadas, scrollea
su interior).

#### Contrato con el backend

**Endpoints consumidos**: solo los que ya existen y ya están en el `openapi.json` de hoy.

| Endpoint | Uso en esta fase | Ya existe |
|---|---|---|
| `GET /channels` | Lista de la vista. Respuesta `ChannelListDto = { data: ChannelDto[] }`, sin paginación | Sí |
| `GET /channels/:id` | Detalle. Respuesta `ChannelDto` | Sí |
| `DELETE /channels/:id` | Eliminar canal desde el detalle | Sí |
| `PATCH /channels/:id` | Renombrar y asignar agente por defecto | Sí |

**PR del backend del que depende: ninguno.** F1 es mergeable en cualquier momento. Es la
propiedad más valiosa de esta fase y la razón de que exista separada.

**Dependencia indirecta**: el ítem del menú aparece porque el backend ya siembra
`/settings/channels` con permiso `channels:read`. Si el tenant de pruebas no tiene ese
permiso, el ítem no se verá, y eso es correcto, no un bug. Recordatorio operativo del
proyecto: para tocar navegación y permisos hay que sembrar **solo RBAC** (`seedRbac`), nunca
el seed completo, porque `npm run seed` sobrescribe el formulario `order_intake` y el
catálogo del tenant demo.

#### Criterio de cierre

Comandos (los ejecuta el usuario; este plan no arranca servidores de desarrollo ni mata los
suyos):

- `npm run lint` pasa sin errores nuevos.
- `npx tsc --noEmit` pasa. (No existe script `typecheck` en este repositorio; véase §2.2j.)
- `npx jest --testPathIgnorePatterns "/node_modules/" "/.next/"` pasa. **El `npm test` a
  secas no sirve dentro de este worktree**: descubre cero tests y devuelve éxito, por el
  patrón de exclusión de `jest.config.cjs` (§2.2i). Alternativa igualmente válida: ejecutar
  `npm test` desde el repositorio padre una vez fusionada la rama.
- `npm run build` pasa. Es la verja real: la comprobación de ESLint está activa en el build.

Comportamiento observable:

- Navegar a `/settings/channels` con un usuario con `channels:read` muestra la lista, y el
  ítem "Canales" aparece en el sidebar bajo Configuración.
- Con cero canales se ve el estado vacío con su llamada a la acción, no una pantalla en
  blanco.
- **Cargar directamente `/workspace/channels/create` en la barra de direcciones ya no da
  404**: redirige a `/settings/channels/connect`. Este es el defecto concreto que la fase
  cierra y debe comprobarse con recarga completa, no con navegación blanda.
- Cargar directamente `/workspace/channels/<uuid>` redirige a `/settings/channels/<uuid>`.
- Los dos botones del sidebar del workspace (el "+" de la cabecera y el del estado vacío)
  llevan a la nueva ruta.
- Hacer clic en un canal del sidebar del workspace **sigue abriendo el sheet**, no navega.
- El mismo indicador de estado (color y etiqueta) se ve en el sidebar y en el sheet, porque
  ambos consumen el mismo componente.
- Los cuatro consumidores de `StepIndicator` en el panel de plataforma siguen funcionando: el
  wizard de alta de tenants, el wizard de ejecuciones de quality, la sección de migración y la
  vista de base de datos dedicada.
- Checklist completo de `DESIGN-SYSTEM §11` corrido sobre las dos vistas nuevas, en light y
  dark.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| Alguien declara una segunda función `redirects()` en `next.config.ts` y borra en silencio los siete redirects de la capa pública | Está escrito en el inventario como "añadir al array existente". En la revisión, comprobar que el array final tiene **nueve** entradas |
| Al quitar la prop `modal` del layout queda un `@modal` huérfano o al revés | Los tres archivos del slot se borran en el **mismo** commit que la firma del layout. Next no avisa: un slot declarado sin `default.tsx` produce un 404 en las rutas hermanas |
| El skeleton usa anchos aleatorios y rompe la hidratación | Prohibición explícita en `DESIGN-SYSTEM §9.1`; se revisa en el diff |
| El registry acaba importando React dentro de `domain/` | El icono se guarda como identificador string y se resuelve en `ui/`. Es la violación de la regla 1 más fácil de cometer y la más fácil de ver en el diff |
| Mover `StepIndicator` rompe una importación no detectada | Ningún test lo referencia (verificado), así que la red de seguridad es el compilador: `npx tsc --noEmit` es obligatorio, no opcional, en el criterio de cierre |
| El deep-link `/workspace/channels/:id` deja de abrir el sheet y ahora navega a otra página | Es un **cambio de comportamiento deliberado**, no una regresión: hoy ese deep-link solo funciona en navegación blanda y en carga directa da 404. Debe anotarse como tal en la descripción del PR |

#### Qué NO entra en F1

No entra **nada** de Meta: ni SDK, ni adapter de signup, ni máquina de estados, ni botón de
conexión. No entra el wizard `/settings/channels/connect` (la ruta destino del redirect
**todavía no existe** al final de F1; véase el riesgo abajo). No entra la tarjeta de salud: la
`ChannelDetailView` de esta fase muestra lo mismo que hoy muestra el sheet, ni más ni menos.
No entra la promoción de `EmptyState` (decisión D6). No entra ningún cambio en
`ChannelForm.tsx`. No entra el enlace "Administrar canales" en el sidebar del workspace (es
limpieza de F5).

> **Consecuencia que hay que decidir en la revisión de F1**: si F1 se mergea antes que F3, el
> redirect a `/settings/channels/connect` apunta a una ruta que aún no existe, y un usuario
> que recargue el enlace viejo pasaría de un 404 a otro. Dos salidas posibles, ambas
> aceptables, pero hay que elegir una explícitamente: (1) que F1 incluya una
> `connect/page.tsx` mínima que solo monte el `ChannelForm` actual, y F3 la sustituya por el
> wizard; o (2) que el redirect de F1 apunte a `/settings/channels` y F3 lo repunte a
> `/connect`. La opción 2 es menos trabajo y no promete nada que no exista; la opción 1 da
> continuidad de URL. Recomendación: **opción 2**, porque la opción 1 crea una página
> transitoria que existe durante un PR y hay que acordarse de borrar.

---

### F2 — Infraestructura de Embedded Signup (sin UI visible)

#### Objetivo y por qué

Construir las tres piezas que hacen posible el botón, sin renderizar todavía ningún botón: el
cargador del SDK, el adapter HTTP y la máquina de estados. Se separan de F3 porque son la
parte con más aristas técnicas (gestos de usuario, `postMessage`, condiciones de carrera,
cabeceras de aislamiento de origen) y porque revisarlas mezcladas con copy y layout garantiza
que nadie las revise bien.

#### Inventario de archivos

**Archivos nuevos**:

| Ruta | Qué es |
|---|---|
| `src/modules/channels/infrastructure/services/facebook-sdk.ts` | Cargador singleton del SDK de Facebook |
| `src/modules/channels/infrastructure/services/meta-signup.adapter.ts` | Adapter HTTP del onboarding |
| `src/modules/channels/infrastructure/hooks/use-embedded-signup.ts` | Máquina de estados del flujo |
| `src/modules/channels/domain/meta-signup.ts` | Tipos del flujo: fases, resultado, error tipado, alias de `Schemas[...]` |
| `src/modules/channels/infrastructure/hooks/__tests__/use-embedded-signup.test.ts` | Test de la máquina de estados |
| `src/modules/channels/infrastructure/services/__tests__/facebook-sdk.test.ts` | Test del cargador (memoización, timeout) |

Los tres directorios de destino (`infrastructure/services/`, `infrastructure/hooks/`,
`domain/`) **ya existen** en el slice. Los dos directorios `__tests__` no existen y se crean.

**Archivos modificados**:

| Ruta | Cambio |
|---|---|
| `next.config.ts` | Añadir la función `headers()`, que hoy **no existe** |
| `src/core/api/schema.d.ts` | Regenerado con `npm run api:types` tras B4. **No se edita a mano**, como dice su propio encabezado en `src/core/api/types.ts` |

#### Detalle de las decisiones de la fase

**El cargador del SDK** es un singleton de módulo con promesa memoizada, de modo que haya una
sola carga por pestaña y sea resistente a los remontajes dobles de React 19 en StrictMode.
Inyecta el `<script>` de `connect.facebook.net` y espera su `onload`; **no** usa
`window.fbAsyncInit`, que es un global compartido y frágil si algún día hubiera un segundo
cargador. Llama `FB.init({ xfbml: false, cookie: false, autoLogAppEvents: false })`;
`cookie: false` es deliberado, porque no queremos que el SDK escriba cookies de sesión de
Facebook en nuestro dominio. Tiene un timeout de 15 segundos que produce un error **tipado**:
los bloqueadores de anuncios y muchas redes corporativas bloquean `connect.facebook.net`, y
**ese caso hay que verlo, no tragárselo**, porque es el disparador del fallback manual. El
tipado del global `window.FB` vive dentro de este mismo archivo, para no ensuciar
`src/core/types/`.

**Se descarta `next/script` a propósito.** No entrega una promesa por instancia, deduplica por
`src` con semántica opaca, y su `onLoad` no es fiable si el componente se remonta. El punto
crítico (D2) es saber **con certeza** si el SDK está listo antes del clic, y `next/script` no
da esa certeza.

**El adapter HTTP** sigue la convención del slice: imports absolutos con `@/` (corrección de
§2.2b) y uso del singleton `http` de `@/core/services/http`, nunca `fetch` directo. Sus
funciones, ya alineadas con lo que el backend de verdad ofrece (corrección de §2.2e):

- `getMetaSignupConfig()` para `GET /channels/meta/embedded-signup/config`.
- `completeMetaSignup(payload)` para `POST /channels/meta/embedded-signup`.
- `registerMetaPhoneNumber(id, pin)` para `POST /channels/:id/meta/register`.

Las dos funciones que el plan original inventaba, `refreshMetaChannelHealth` y
`disconnectMetaChannel`, **no se escriben**, porque no tienen endpoint detrás.

**La máquina de estados**, con nueve fases: `preparing`, `ready`, `unavailable`, `popup_open`,
`popup_blocked`, `exchanging`, `success`, `cancelled`, `error`. Su mecánica sigue el orden
exacto que impone Meta:

1. Al montar, cargar el SDK y la configuración en paralelo. El resultado es `ready` o
   `unavailable`.
2. **Antes** de `FB.login`, no después, registrar el listener de `message`. Filtra
   `event.origin` contra una lista blanca por **igualdad exacta**; jamás
   `includes("facebook.com")`, que dejaría pasar `evilfacebook.com.attacker.io`. El
   `JSON.parse` va dentro de un `try`. Acepta solo `type === "WA_EMBEDDED_SIGNUP"`,
   distinguiendo `FINISH`, `CANCEL` y `ERROR`.
3. `FB.login` con `config_id`, `response_type: "code"`,
   `override_default_response_type: true` y
   `extras: { setup: {}, featureType: "", sessionInfoVersion: "3" }`, invocado
   **síncronamente** desde el `onClick`. `sessionInfoVersion: "3"` es lo que garantiza que el
   `message` llegue en formato JSON.
4. **Convergencia de dos fuentes asíncronas.** El `code` (por el callback de `FB.login`) y el
   `sessionInfo` (por el evento `message`) llegan en orden **no determinista**. Se guardan en
   refs y el POST sale en cuanto ambos están. Si a los 8 segundos de tener el `code` no llegó
   el `sessionInfo`, se envía con lo que haya (el backend puede resolver el `waba_id` desde el
   token, según el paso 5 de su use case) y se registra la degradación en la consola.
5. **Los 30 segundos del `code`.** El POST sale inmediatamente, sin confirmación del usuario y
   sin ningún `await` evitable en medio. Un fallo lleva a `error` con una acción que reinicia
   desde `FB.login`, nunca reintentando el mismo `code` (D5).
6. **Watchdog de abandono**: 3 minutos desde `popup_open` sin ninguna señal produce
   `cancelled`.
7. **Limpieza determinista**: `removeEventListener` más `clearTimeout` en el `finally` de cada
   intento **y** en el cleanup del efecto. Sin esto, tras tres intentos hay tres listeners
   vivos y el cuarto POST se dispara por triplicado.
8. Al llegar a `success`, `upsertChannel` en el store; el realtime va afinando el estado
   después.

**Cabeceras HTTP.** `next.config.ts` no define `headers()` y el proyecto no tiene CSP, así que
hoy el SDK cargaría sin tocar nada. Lo que este PR hace es **blindar el flujo contra la CSP
que llegará**:

- Fijar **`Cross-Origin-Opener-Policy: same-origin-allow-popups`** en las rutas del panel. Es
  el punto que rompe el flujo **en silencio**: con `same-origin` (el valor que uno pone "por
  seguridad") el popup pierde `window.opener` y el callback de `FB.login` **nunca se
  ejecuta**; el usuario ve el popup completarse y la aplicación quedarse colgada en
  "procesando". Se fija explícitamente, con comentario, para que nadie lo endurezca sin
  entender la consecuencia.
- **No** establecer `Cross-Origin-Embedder-Policy: require-corp`, que rompe los iframes del
  SDK. Se documenta como prohibición en el comentario.
- Dejar un bloque comentado con la CSP objetivo (`script-src` con `connect.facebook.net`,
  `frame-src` y `connect-src` con los dominios de Facebook y Graph) listo para cuando el
  proyecto adopte una.

#### Contrato con el backend

**Entregado por: B4** (`presentation/http/meta_onboarding.controller.ts` del plan del
backend). **F2 no se mergea hasta que B4 esté mergeado y `axi-server/openapi/openapi.json`
regenerado.**

**Endpoint 1 — `GET /channels/meta/embedded-signup/config`**

- Permiso requerido: `channels:manage`.
- Petición: sin cuerpo ni parámetros. En el navegador viaja por el BFF, es decir
  `GET /api/proxy/channels/meta/embedded-signup/config`; el adapter escribe el path relativo
  al prefijo, `"/channels/meta/embedded-signup/config"`, como todo el repositorio.
- Respuesta 200 (forma declarada literalmente en B4):

  ```json
  { "enabled": true, "app_id": "…", "config_id": "…", "graph_api_version": "v21.0" }
  ```

- Respuesta 503 con `code: "channels/meta_signup_disabled"` cuando el flag está apagado o la
  configuración está incompleta. **El frontend trata este caso como `unavailable`, no como
  error**: no es un fallo, es una capacidad no habilitada, y la diferencia es visible para el
  usuario (uno ofrece el camino manual, el otro ofrece un botón de reintentar).
- Nombre del schema en `Schemas[...]`: **no está fijado**. Es la petición 1 de §4.3.
- **Modo de fallo específico que el adapter debe tolerar**: el plan del backend advierte en su
  B4 de una colisión de rutas entre `GET /channels/meta/embedded-signup/config` y
  `GET /channels/:id`, que lleva `ParseUUIDPipe`. Si el backend registra los controladores en
  el orden equivocado, este endpoint devuelve **400 de uuid inválido** en lugar de la
  configuración. El adapter debe tratar un 400 en este path como `unavailable` y registrarlo
  con un mensaje que nombre la causa, en vez de propagar un error incomprensible. Es barato y
  ahorra una tarde de depuración.

**Endpoint 2 — `POST /channels/meta/embedded-signup`**

- Permiso requerido: `channels:manage`. Auditado en el backend con
  `@Audited('channel.meta_connected')`.
- Cuerpo de la petición, con el nivel de confianza de cada campo marcado:

  | Campo | Tipo | Confianza | Origen |
  |---|---|---|---|
  | `code` | `string` | **Confirmado** | Paso 4 del use case; aparece en la lista de *redact* de B7 como `req.body.code` |
  | `phone_number_id` | `string` | **Confirmado** | Clave del lock Redis `channel:onboarding:{company_id}:{phone_number_id}` y clave natural de idempotencia |
  | `waba_id` | `string` | **Inferido** | §4.2 del plan del backend lo captura en el navegador; el paso 5 compara `target_ids` contra él |
  | `business_id` | `string?` | **Inferido** | §4.2 lo captura; B3 crea la columna |
  | `register_pin` | `string?` | **Confirmado** | Lista de *redact* de B7 (`req.body.register_pin`); paso 9 "solo si … o vino pin" |
  | `name` | `string?` | **No declarado** | Petición 2 de §4.3: hay que decidirlo |

- Respuesta 201: `ChannelDto` más un bloque de onboarding cuya forma exacta no está fijada
  (petición 1 de §4.3). El sub-estado `onboarding.status` toma los valores `completed`,
  `awaiting_registration`, `awaiting_payment_method` o `failed`. Es un **sub-estado de
  diagnóstico**, no una segunda máquina de estados: la máquina sigue siendo `ChannelStatus`, y
  el frontend no debe tratarlo como tal.
- Errores que el frontend debe distinguir, todos con `code` RFC 7807 (el `HttpError` de
  `src/core/api/problem.ts` lo expone como propiedad `code`):

  | `code` | HTTP | Qué significa para el usuario | Acción de la UI |
  |---|---|---|---|
  | `channels/meta_signup_disabled` | 503 | La conexión automática no está habilitada | Ir a `unavailable`, desplegar el camino manual |
  | `channels/meta_code_expired` | 422 | Tardó demasiado o el código ya se usó | Ir a `error` con acción "volver a intentar", que reabre `FB.login` |
  | `channels/meta_missing_scopes` | 422 | No concedió todos los permisos | Ir a `error` explicando qué falta |
  | `channels/meta_account_mismatch` | 422 | El número no pertenece a la cuenta autorizada | Ir a `error` |
  | `channels/onboarding_in_progress` | 409 | Ya hay una conexión en curso para ese número | Ir a `error` con mensaje de "espera unos segundos"; **es el resultado del doble clic** |
  | `channels/provider_account_taken` | 409 | El número ya está conectado en otra empresa | Ir a `error` con mensaje que dirija a soporte |
  | `channels/meta_registration_required` | 409 | Falta registrar el número con un PIN | Ir a un estado que pida el PIN y llame al endpoint 3 |

**Endpoint 3 — `POST /channels/:id/meta/register`**

- Permiso requerido: `channels:manage`.
- Cuerpo: se infiere `{ register_pin: string }` por el nombre que aparece en la lista de
  *redact* de B7. **No está declarado explícitamente**; es parte de la petición 2 de §4.3.
- Cubre el caso `133005` de Graph (PIN incorrecto) y la recuperación del sub-estado
  `awaiting_registration`.

**Lo que este contrato NO incluye, y que el plan original daba por hecho**: no hay endpoint de
refresco de salud, no hay endpoint de desconexión suave, y no hay ningún evento WebSocket
nuevo. Véanse las peticiones 5 y 6 de §4.3.

#### Criterio de cierre

Comandos:

- `npm run api:types` ejecutado, y `npm run api:types:check` pasa (es decir, el
  `schema.d.ts` commiteado coincide exactamente con el `openapi.json` del backend). Este
  comando es el que **demuestra** que el bloqueo con B4 está resuelto: si el backend no ha
  mergeado B4, falla.
- `npx tsc --noEmit` pasa **sin ningún tipo local provisional en el adapter**. Concretamente:
  `meta-signup.adapter.ts` no debe declarar ningún `type` propio para las respuestas del
  backend; todo sale de `Schemas[...]`. Es el criterio que separa "compila" de "terminado".
- `npx jest --testPathIgnorePatterns "/node_modules/" "/.next/"` pasa, incluidos los dos tests
  nuevos.
- `npm run lint` y `npm run build` pasan.

Comportamiento observable y verificable en revisión:

- El test de la máquina de estados **monta y desmonta el hook tres veces** y comprueba que no
  quedan listeners de `message` acumulados. Es la comprobación que cubre el riesgo de los POST
  triplicados, y es la razón de que este test sea obligatorio y no opcional.
- El test cubre las dos órdenes de llegada de `code` y `sessionInfo`, y el caso de que
  `sessionInfo` no llegue nunca (degradación a los 8 s).
- El test comprueba que un `origin` de `https://evilfacebook.com.attacker.io` es rechazado.
- El test del cargador comprueba que dos llamadas concurrentes producen **una sola** inyección
  de `<script>`, y que un `onload` que nunca llega produce el error tipado a los 15 s (con
  timers falsos, no con esperas reales).
- `next.config.ts` declara `headers()` con `Cross-Origin-Opener-Policy:
  same-origin-allow-popups` y un comentario que explica por qué `same-origin` rompería el
  flujo. Y los **nueve** redirects de F1 siguen ahí.
- **La aplicación se ve exactamente igual que antes.** F2 no renderiza nada. Si algo cambió
  visualmente, algo se coló de F3.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| Alguien "simplifica" el hook cargando el SDK dentro del `onClick` y el navegador bloquea el popup | D2 está escrito como decisión de arquitectura, no como detalle. El botón deshabilitado hasta `ready` es la consecuencia visible: si en la revisión el botón nace habilitado, la regla se rompió |
| El filtro de `origin` se escribe con `includes("facebook.com")` | Lista blanca por igualdad exacta, con test que prueba el dominio atacante. Punto obligatorio de la revisión de código |
| Listeners acumulados tras varios intentos, con POST duplicados | Limpieza en el `finally` de cada intento **y** en el cleanup del efecto; test que monta y desmonta tres veces |
| El `code` expira porque hay un `await` innecesario antes del POST | El POST sale sin confirmación intermedia. En la revisión: contar los `await` entre la recepción del `code` y la llamada `http.post` |
| Un bloqueador de anuncios impide `connect.facebook.net` y la UI se queda colgada | Timeout de 15 s con error tipado que lleva a `unavailable`; F3 despliega el camino manual solo |
| El PR se mergea con tipos escritos a mano porque B4 se retrasó | Está en el criterio de cierre como condición explícita: `api:types:check` debe pasar. Un PR de F2 con tipos locales **no está terminado** |
| Se añade `Cross-Origin-Embedder-Policy: require-corp` "por seguridad" y se rompen los iframes | Prohibición documentada en el propio `next.config.ts`, junto al COOP |

#### Qué NO entra en F2

No entra **ninguna** pieza visible: ni botón, ni wizard, ni ruta nueva. No entra el registro de
consumidores del hook (nadie lo llama todavía; eso es F3). No entran las funciones
`refreshMetaChannelHealth` ni `disconnectMetaChannel`, que se eliminan del plan por no tener
endpoint. No entra la CSP real, solo su bloque comentado. No entra la traducción de los
errores de Meta a español: la máquina de estados propaga el `code`, y el diccionario es de F3.

---

### F3 — El flujo de conexión

#### Objetivo y por qué

La fase donde la feature se vuelve visible. Un wizard de cuatro pasos en
`/settings/channels/connect`, construido sobre la máquina de estados de F2 y el registry de
F1.

El diseño del wizard tiene una tesis explícita: **el abandono no ocurre en nuestra UI, ocurre
dentro del popup de Meta**, donde no controlamos nada y donde los mensajes de error son
incomprensibles para un no técnico. Todo el paso 2 existe para mover el descubrimiento de los
bloqueos **antes** del popup, que es donde son baratos.

#### Inventario de archivos

**Archivos nuevos**:

| Ruta | Qué es |
|---|---|
| `src/app/(private)/(content)/settings/channels/connect/page.tsx` | Página delgada que devuelve `<ConnectChannelView />` |
| `src/app/(private)/(content)/settings/channels/connect/loading.tsx` | Skeleton estructural del wizard |
| `src/modules/channels/ui/components/connect/ConnectChannelView.tsx` | Contenedor del wizard, dueño del paso actual |
| `src/modules/channels/ui/components/connect/ProviderGallery.tsx` | Paso 1, renderizado desde el registry |
| `src/modules/channels/ui/components/connect/PrerequisitesChecklist.tsx` | Paso 2 |
| `src/modules/channels/ui/components/connect/EmbeddedSignupButton.tsx` | Paso 3, consumidor de `useEmbeddedSignup` |
| `src/modules/channels/ui/components/connect/ConnectSuccess.tsx` | Paso 4 |
| `src/modules/channels/ui/components/connect/ManualCredentialsFallback.tsx` | Acordeón "avanzado" que envuelve el `ChannelForm` actual |
| `src/modules/channels/ui/components/connect/QrPairingPanel.tsx` | Camino QR de WhatsApp Web dentro del mismo wizard |
| `src/modules/channels/ui/components/connect/__tests__/PrerequisitesChecklist.test.tsx` | Test del gating del botón "Continuar" |
| `src/modules/channels/ui/components/connect/__tests__/EmbeddedSignupButton.test.tsx` | Test de los nueve estados y de las regiones vivas |

El directorio `src/modules/channels/ui/components/` ya existe (contiene hoy
`ChannelDetailSheet.tsx`); la subcarpeta `connect/` es nueva.

**Archivos modificados**:

| Ruta | Cambio |
|---|---|
| `src/core/lib/error-messages.ts` | Añadir al diccionario `MESSAGES_BY_CODE` las entradas de los `code` de Meta (§2.3). **No se crea un diccionario paralelo** |
| `next.config.ts` | Repuntar el redirect de F1 a `/settings/channels/connect`, si en la revisión de F1 se eligió la opción 2 (véase la nota al final de F1) |
| `src/modules/channels/ui/forms/ChannelForm.tsx` | **Solo si es imprescindible.** El objetivo declarado es envolverlo sin tocar su lógica. Si hay que tocarlo, se limita a permitir que el `kind` venga fijado desde fuera |

#### Detalle de la fase

**Estructura**: `mx-auto max-w-3xl` más el `StepIndicator` promovido en F1, cuatro pasos.

**Paso 1 — ¿Qué quieres conectar?** Galería renderizada **desde el registry**, con tarjetas
grandes en lugar de chips. Los proveedores con `availability: "coming_soon"` llevan
`aria-disabled` y `tabIndex={-1}` sobre la acción, pero **no se ocultan**: comunican hoja de
ruta, que es información comercial útil.

**Paso 2 — Antes de empezar.** Checklist con casillas que el usuario debe marcar; "Continuar"
se habilita solo con todas marcadas. No es un control de seguridad y no pretende serlo: es el
dispositivo de UX que evita que la persona descubra el bloqueo dentro del popup de Meta. Los
cinco ítems, cada uno con un acordeón "¿Qué significa esto?" (el primitivo `Accordion` existe
en `src/shared/components/ui/accordion.tsx`):

1. **El número NO está registrado en WhatsApp ni en WhatsApp Business.** Es el que más rompe.
   Con la advertencia explícita de que al conectarlo **dejará de funcionar en el celular**.
2. **Puedo recibir un SMS o una llamada en ese número ahora mismo**, porque la verificación
   ocurre dentro del popup, en vivo.
3. **Tengo o puedo crear una cuenta de Business Manager.** Se puede crear dentro del propio
   popup, así que esto baja de requisito a aviso.
4. **Soy administrador de esa cuenta.** Si no lo es, el popup falla al final; se ofrece un
   botón "Enviar estos pasos a quien administra".
5. **Sé que para escribir fuera de 24 h harán falta verificación y método de pago**, declarado
   **NO bloqueante para conectar**. Esto está alineado con el plan del backend, que en su §3
   dice literalmente que el método de pago "va en el checklist del frontend marcado como no
   bloqueante para conectar". Es la diferencia entre un tenant que conecta hoy y uno que
   abandona.

Salida lateral al pie: "Todavía no cumplo alguno de estos", que lleva a la guía completa y al
contacto por WhatsApp usando `salesWhatsAppUrl()` de `src/core/config/env.ts`, que ya existe y
ya se usa para el CTA del trial. axi vende por el canal que predica.

**Paso 3 — Conectar.** Un botón, un estado visible a la vez. Durante `popup_open` se muestra
un panel con los cuatro sub-pasos que verá dentro del popup (elegir negocio, elegir número,
verificar por SMS, aceptar permisos): saber cuánto falta reduce el abandono. `popup_blocked`
lleva instrucciones por navegador. `error` lleva **mensaje traducido**, no el de Meta.

**Regla de copy transversal: cero jerga.** El usuario nunca lee `phone_number_id`, `WABA`,
`token`, `code` ni `Graph API`. Todo eso vive en el acordeón "Detalles técnicos" del paso 4,
que existe para que soporte pueda pedirle al cliente que lo despliegue.

**Paso 4 — Listo.** Resumen, asignación del agente IA (reutilizando el `Select` que
`ChannelForm.tsx:238-260` ya monta, con su carga de agentes vía `listAgents`) y envío de un
mensaje de prueba.

**Fallback manual escondido**: acordeón colapsado al pie del paso 3, con el texto "Ya tengo
mis credenciales de Meta (avanzado)", que contiene el `ChannelForm` actual **sin modificar su
lógica**. Sube automáticamente a aviso visible cuando la fase es `unavailable`: si el SDK está
bloqueado por la red corporativa, el camino manual **debe** ser evidente, no estar escondido
detrás de un acordeón. Esto da por fin un consumidor real a `updateChannelCredentials`, que
lleva muerto en el adapter desde que se escribió.

**El camino QR** entra por el mismo wizard, reutilizando `startWwebSession` y el QR en vivo del
store, y da consumidor a `requestWwebPairingCode` y `getWwebPairingState`: el código de ocho
dígitos es la alternativa accesible para quien no puede escanear un QR, y el snapshot por
polling es el respaldo del WebSocket.

#### Contrato con el backend

**Entregado por: B4** (el mismo que F2). **F3 hereda el bloqueo de F2: no se mergea hasta que
B4 esté mergeado.** No introduce ningún endpoint nuevo respecto a F2.

Endpoints que la fase ejerce en vivo, todos ya descritos en el contrato de F2:

| Endpoint | Dónde se usa | Fase del backend |
|---|---|---|
| `GET /channels/meta/embedded-signup/config` | Al montar el paso 3 | B4 |
| `POST /channels/meta/embedded-signup` | Al converger `code` y `sessionInfo` | B4 |
| `POST /channels/:id/meta/register` | Cuando el resultado es `awaiting_registration` | B4 |

Endpoints ya existentes que la fase también consume:

| Endpoint | Dónde | Existe hoy |
|---|---|---|
| `POST /channels` | Fallback manual (`ChannelForm`) | Sí |
| `PUT /channels/:id/credentials` | Fallback manual, rotación de token | Sí (`updateChannelCredentials`) |
| `PATCH /channels/:id` | Asignación de agente en el paso 4 | Sí |
| `POST /channels/:id/whatsapp-web/session` | Camino QR | Sí |
| `GET /channels/:id/whatsapp-web/qr` | Respaldo por polling del QR | Sí |
| `POST /channels/:id/whatsapp-web/pairing-code` | Código de 8 dígitos | Sí |
| `GET /ai-agents` (vía `listAgents`) | Selector de agente | Sí |

**Punto de contrato que hay que cerrar antes de implementar el paso 4**: si el cuerpo de
`POST /channels/meta/embedded-signup` **no** acepta `name` (petición 2 de §4.3), el paso 4
tendrá que ofrecer el renombrado y hacer un `PATCH /channels/:id` adicional. Es un cambio de
UI, no de infraestructura, pero cambia el mockup de F0.

#### Criterio de cierre

Comandos: los mismos cuatro de F2 (`api:types:check`, `npx tsc --noEmit`, jest con el patrón
sobreescrito, `npm run lint` y `npm run build`).

Comportamiento observable:

- `/settings/channels/connect` carga en recarga completa, no solo en navegación blanda.
- Con `META_EMBEDDED_SIGNUP_ENABLED` apagado en el backend (503 con
  `channels/meta_signup_disabled`), el paso 3 muestra el camino manual **desplegado** y no un
  error rojo.
- Con el SDK bloqueado (simulable bloqueando `connect.facebook.net` en las herramientas de
  desarrollo), a los 15 s la fase pasa a `unavailable` y el fallback manual sube a aviso
  visible.
- El botón "Continuar" del paso 2 está deshabilitado hasta que las cinco casillas están
  marcadas, y su `aria-describedby` explica por qué. Un botón deshabilitado sin explicación es
  un callejón sin salida.
- El botón del paso 3 **nace deshabilitado** con spinner y se habilita al llegar a `ready`.
  Si nace habilitado, D2 se rompió.
- Cada uno de los siete `code` de error de la tabla de F2 produce un mensaje **en español y
  sin jerga**. Se comprueba con el diccionario, no con capturas.
- Un lector de pantalla anuncia las transiciones: contenedor con `role="status"` y
  `aria-live="polite"` para las fases en curso, y `role="alert"` con `aria-live="assertive"`
  para `error` y `cancelled`.
- El foco vuelve al botón en cada transición terminal, al cerrarse el popup.
- El camino QR completa una vinculación de WhatsApp Web de principio a fin, incluido el código
  de ocho dígitos.
- El fallback manual crea un canal `whatsapp_cloud` con credenciales pegadas a mano, igual que
  hoy.
- Checklist de `DESIGN-SYSTEM §11` corrido sobre las cuatro pantallas, en light y dark.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| El checklist se implementa con `div onClick` en lugar de casillas reales | Se usa `<input type="checkbox">` nativo, patrón ya presente en ocho archivos del repositorio; no hace falta dependencia nueva (§2.3). Punto del checklist de `DESIGN-SYSTEM §10` |
| Se crea un diccionario de errores paralelo al de `error-messages.ts` | El inventario lo dice explícitamente: se **modifica** `MESSAGES_BY_CODE`. Un `Record<string,string>` nuevo dentro de `modules/channels` es un hallazgo de revisión |
| El copy se llena de jerga de Meta en los mensajes de error | La regla "cero jerga" es verificable: buscar `phone_number_id`, `WABA`, `token`, `Graph` en el diff de los strings visibles |
| El fallback manual queda tan escondido que en `unavailable` nadie lo encuentra | Comportamiento condicional explícito: en `unavailable` sube a aviso visible. Es un caso de prueba del criterio de cierre |
| El paso 2 se convierte en un muro que reduce la conversión | Los cinco ítems son marcables por el usuario, no validados por el sistema. El ítem 5 (método de pago) está declarado **no bloqueante**, alineado con el plan del backend |
| El wizard se rompe si el usuario recarga en mitad del paso 3 | El estado del wizard es efímero a propósito y el `code` **nunca** se persiste (D5). Recargar vuelve al paso 1; es el comportamiento correcto, y debe anotarse para que no se reporte como bug |

#### Qué NO entra en F3

No entra la tarjeta de salud ni ninguna traducción de `quality_rating` (es F4). No entra la
renovación de conexión de un canal existente (es F4). No entra Instagram ni Messenger, que
siguen en `coming_soon` en el registry (es F5). No entra ningún cambio en el sidebar del
workspace más allá de lo ya hecho en F1. No entra la lógica interna de `ChannelForm.tsx`: se
envuelve, no se reescribe.

---

### F4 — Salud, reconexión y desconexión

#### Objetivo y por qué

Que el tenant se entere de que su canal está mal **antes** de que un cliente enfadado se lo
diga. Es la fase que convierte una integración que funciona el primer día en una que sigue
funcionando el mes tres.

El plan del backend lo dice desde el otro lado, en su §2.2 punto 5: hoy `expires_at` existe y
**nunca se escribe**, no se escuchan `account_update` ni `phone_number_quality_update`, y un
token revocado solo se descubre cuando falla un envío. F4 es la cara visible de B6.

#### Inventario de archivos

**Archivos nuevos**:

| Ruta | Qué es |
|---|---|
| `src/modules/channels/ui/components/ChannelHealthCard.tsx` | Tarjeta de salud compartida entre la vista de detalle y el sheet del workspace |
| `src/modules/channels/domain/channel-health.ts` | Traducciones puras: `quality_rating`, tier de mensajería, sub-estado de onboarding |
| `src/modules/channels/domain/__tests__/channel-health.test.ts` | Test de las traducciones (funciones puras, sin React) |
| `src/modules/channels/ui/components/ReconnectChannelDialog.tsx` | Relanza el Embedded Signup sobre un canal existente |

**Archivos modificados**:

| Ruta | Cambio |
|---|---|
| `src/modules/channels/ui/components/ChannelDetailView.tsx` | Pasa del esqueleto de F1 al detalle completo: monta `ChannelHealthCard`, renovación y desconexión |
| `src/modules/channels/ui/components/ChannelDetailSheet.tsx` | Sustituye su bloque de datos codificado a mano (líneas 136-157) por `ChannelHealthCard`, eliminando la duplicación |
| `src/modules/channels/domain/channel.ts` | Alias nuevos de `Schemas[...]` para los campos de salud, una vez el backend los exponga |
| `src/app/(private)/(content)/settings/channels/page.tsx` | Montar `useChannelsRealtime()` |
| `src/app/(private)/(content)/settings/channels/[id]/page.tsx` | Montar `useChannelsRealtime()` |
| `src/app/(private)/(content)/settings/channels/connect/page.tsx` | Montar `useChannelsRealtime()` |
| `src/core/api/schema.d.ts` | Regenerado tras B6 |

Nota sobre el montaje del realtime: las tres páginas son hoy páginas delgadas sin
`"use client"`. Montar un hook exige que el componente sea de cliente. La forma correcta, y la
que respeta el patrón de página delgada del repositorio, es montar el hook **dentro de la
View** correspondiente (que ya es `"use client"`), no convertir la página en cliente. El
inventario lista las páginas porque son el punto de entrada de la revisión, pero el cambio
real vive en `ChannelsView`, `ChannelDetailView` y `ConnectChannelView`.

#### Detalle de la fase

**Traducciones obligatorias**, porque el usuario no es técnico y porque estos valores son
literalmente enums de Meta:

- `quality_rating` con valores `GREEN`, `YELLOW`, `RED` y `UNKNOWN` se muestra como **Alta**,
  **Media**, **Baja** y **Sin datos**, con un tooltip que explica que la calidad baja la
  causan los bloqueos y reportes de los propios clientes. Sin esa explicación, el tenant no
  tiene ninguna acción posible ante un indicador rojo.
- El tier de mensajería se muestra como **"1.000 personas nuevas al día"**, nunca como
  `TIER_1K`.
- La ventana de 24 h es **por conversación, no por canal**. Se muestra como una explicación
  fija ("puedes responder gratis durante 24 h desde el último mensaje del cliente") y **no
  como una métrica**. Si el backend expone después un agregado real, se añade; mientras tanto
  **no se falsea un número**, que es la tentación obvia y el peor error posible en una
  pantalla de salud.
- **Renovar conexión** relanza el mismo Embedded Signup contra el canal existente. No es un
  formulario de token. Es el dividendo del diseño idempotente del backend: su §4.4 dice
  literalmente que la reconexión "no hace falta endpoint nuevo", porque el use case detecta el
  canal existente por `phone_number_id`, rota la credencial y vuelve a suscribir.
- **Desconectar** con confirmación destructiva y aviso de qué se pierde (deja de recibir
  mensajes; el historial se conserva), separado visualmente de **Eliminar canal**. **Este
  botón solo se implementa si la petición 5 de §4.3 se resuelve a favor.** Si el backend no
  ofrece una desconexión suave, el botón no existe: la UI no promete semánticas que el
  backend no tiene.

**Realtime fuera del workspace.** `useChannelsRealtime()` se monta hoy **solo** en el layout
del workspace (verificado: única invocación en `workspace/layout.tsx:16`). Las vistas de
`/settings/channels` están en otro subárbol de rutas, así que sin este cambio su estado no se
actualizaría en vivo y el QR del camino QR no llegaría nunca. Es seguro montarlo en más
sitios: `useSocket` lleva contador de referencias
(`src/core/realtime/use-socket.ts:15-58`), así que N consumidores producen 1 conexión, y el
mecanismo **ya está ejercitado hoy con dos consumidores** del mismo namespace (el hook del
workspace y `use-dashboard-realtime.ts:17`).

**Renderizado defensivo hasta que el contrato exista.** Mientras la petición 3 de §4.3 no esté
resuelta, `ChannelHealthCard` debe renderizar cada campo como "Sin datos" cuando llegue
`null` o `undefined`, sin romper y sin dejar huecos. Es lo que permite empezar F4 antes de que
B6 esté mergeado, aunque no permite cerrarla.

#### Contrato con el backend

**Entregado por: B6** (salud del token, `account_update` y reconexión) **más el acuerdo de la
petición 3 de §4.3**, que hoy **no está en el plan del backend**.

**F4 no se mergea hasta que B6 esté mergeado y la petición 3 esté resuelta e implementada.**
Esta es la dependencia más frágil del plan y hay que decirlo con claridad: a día de hoy, el
plan del backend **no compromete** ningún campo de salud en el `ChannelDto` que consume el
tenant.

Lo que F4 necesita, campo por campo, con su estado real:

| Campo | Dónde lo necesita F4 | Estado en el plan del backend |
|---|---|---|
| `waba_id` | Encabezado técnico del detalle | **Ya existe** en `ChannelDto` hoy |
| `display_phone_number`, `verified_name`, `token_last4`, `credentials_configured` | Tarjeta de salud | **Ya existen** hoy |
| `quality_rating` | Indicador Alta/Media/Baja | Se guarda en `config.health` (B3) y se expone **solo** en `GET /platform/channels/health` (B7, super-admin). **Falta exponerlo al tenant** |
| `connection_method` | Distinguir un canal conectado por popup de uno pegado a mano | Columna nueva en B3. **Exposición no declarada** |
| `last_health_check_at` | "Comprobado hace X" | Columna nueva en B3. **Exposición no declarada** |
| `token_expires_at` | Aviso previo al vencimiento | `ChannelCredential.expires_at`, que B6 empieza a poblar. **Exposición no declarada** |
| `onboarding.status` | Avisos de `awaiting_registration` y `awaiting_payment_method` | Se guarda en `config.onboarding` (B3) y se devuelve en la respuesta de `POST .../embedded-signup` (B4). **No declarado en `GET /channels/:id`** |
| `messaging_limit_tier` | "1.000 personas nuevas al día" | **No aparece en ninguna parte del plan del backend.** Si no llega, el dato no se muestra |
| `name_status` | Estado del nombre verificado | **No aparece.** Si no llega, no se muestra |
| `platform_type` | Diagnóstico de por qué hizo falta registrar el número | Se captura en el paso 6 del use case, pero **no se declara persistido ni expuesto** |

**Realtime**: F4 se apoya en `channel.status_changed`, que **ya existe** en
`ChannelsServerEvents` (`src/core/realtime/events.ts:411`). **No se asume ningún evento
nuevo**, porque el plan del backend no declara ninguno (petición 6 de §4.3). La notificación
de desconexión llega por la campanita, vía `notification.created` del namespace `/inbox`, que
es lo que B6 realmente implementa con su `NotificationWriterSubscriber`.

**Reconexión**: no consume ningún endpoint nuevo. Reutiliza
`POST /channels/meta/embedded-signup` con el mismo `phone_number_id`, exactamente como
describe el §4.4 del plan del backend.

#### Criterio de cierre

Comandos: los mismos cinco de F2 y F3.

Comportamiento observable:

- La tarjeta de salud se ve **idéntica** en la página de detalle y en el sheet del workspace,
  porque es el mismo componente. Cualquier divergencia visible significa que la duplicación
  sigue viva.
- Ningún valor crudo de Meta llega a la pantalla: buscar `GREEN`, `YELLOW`, `RED`, `TIER_`,
  `awaiting_` en el diff de los strings renderizados no debe dar resultados.
- Un campo ausente o nulo se pinta como "Sin datos", no como hueco ni como `undefined`.
- **No aparece ningún número inventado** en el bloque de la ventana de 24 h: es texto
  explicativo fijo.
- Cambiar el estado de un canal en el backend se refleja en `/settings/channels` **sin
  recargar**, gracias al realtime montado en las vistas nuevas.
- Abrir simultáneamente `/workspace` y `/settings/channels` produce **una sola** conexión al
  namespace `/channels` (comprobable en la pestaña de red del navegador). Es la verificación
  del contador de referencias.
- "Renovar conexión" reabre el popup y, al terminar, el canal vuelve a `connected` **con el
  mismo `id`**, sin crear un canal duplicado. Es la comprobación de la idempotencia del
  backend desde el lado del cliente.
- Los tres tonos de calidad pasan contraste AA en light y dark. El rojo usa el token
  `destructive`, **nunca el coral de marca**: es el último punto del checklist de
  `DESIGN-SYSTEM §11` y está además señalado en §2.1 como deuda conocida
  (`--color-destructive` apunta hoy a `--axi-brand-2`), así que hay que comprobarlo a ojo, no
  darlo por hecho.
- Checklist de `DESIGN-SYSTEM §11` corrido sobre las dos superficies.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| **El riesgo principal: el contrato de salud no existe.** F4 se implementa contra campos que nadie se comprometió a servir | Petición 3 de §4.3, a resolver **antes** de abrir el PR. Mientras tanto, renderizado defensivo con "Sin datos". Si la petición se rechaza, F4 se reduce drásticamente y hay que replanificarla, no improvisarla |
| Se inventa un número para la ventana de 24 h porque "queda vacío" | Prohibición explícita. En la revisión: cualquier número en ese bloque que no venga de un campo del DTO es un hallazgo |
| Se implementa "Desconectar" sin endpoint detrás y el botón no hace nada útil | Depende de la petición 5 de §4.3. Si no se resuelve, el botón **no se implementa** |
| Se asume un evento WebSocket de salud que nadie emite y la tarjeta nunca se actualiza | El plan se apoya solo en `channel.status_changed`, que existe hoy, más un refetch al montar |
| Montar el realtime en tres vistas más multiplica las conexiones | Contador de referencias verificado en `use-socket.ts`; ya funciona hoy con dos consumidores. Verificación explícita en el criterio de cierre |
| Convertir las páginas delgadas en componentes de cliente para montar el hook | El hook se monta en las Views, que ya son `"use client"`. Una directiva `"use client"` nueva en un `page.tsx` es un hallazgo de revisión |
| El rojo de calidad baja sale coral en lugar de `destructive` | `DESIGN-SYSTEM §2.1` documenta que `--color-destructive` apunta hoy a `--axi-brand-2`; hay que verificarlo visualmente, no confiar en el token |

#### Qué NO entra en F4

No entra Instagram ni Messenger (F5). No entra ningún panel de plataforma ni consumo de
`GET /platform/channels/health`, que es super-admin y pertenece al módulo `platform`, no a
este. No entra la sincronización de plantillas HSM: el B8 del backend la implementa, pero su
UI **no está planificada en ningún sitio** y es un módulo aparte (véase §9). No entra el
enlace del sidebar (F5).

---

### F5 — Instagram y Messenger sin rediseño

#### Objetivo y por qué

Demostrar que D3 se cumplió. Si el registry está bien diseñado, habilitar Instagram consiste
en cambiar un valor de un descriptor y darle su `config_id`. Si hace falta más, el diseño de
F1 falló y esta fase es donde se descubre.

**Criterio de éxito, medible**: el diff de habilitar Instagram cabe en un archivo de dominio
del frontend y una variable de configuración del backend.

#### Inventario de archivos

**Archivos nuevos**: ninguno, si el diseño funcionó. La aparición de un archivo nuevo en esta
fase es en sí misma información: significa que el registry no capturó alguna variabilidad.

**Archivos modificados**:

| Ruta | Cambio |
|---|---|
| `src/modules/channels/domain/channel-providers.ts` | Cambiar `availability` a `"available"` en los descriptores de Instagram y Messenger; añadir su `metaProduct` y sus prerrequisitos propios |
| `src/modules/channels/infrastructure/services/meta-signup.adapter.ts` | Aceptar el producto en `getMetaSignupConfig`, **si** la petición 4 de §4.3 se resuelve por parámetro de query |
| `src/modules/workspace/ui/sidebar/components/channel-section/ChannelSection.tsx` | Añadir el enlace "Administrar canales" hacia `/settings/channels` |
| `src/core/api/schema.d.ts` | Regenerado tras B9 |

**Prerrequisitos propios de cada proveedor**, que es la única sustancia nueva de la fase:
Instagram exige una cuenta profesional vinculada a una página de Facebook; Messenger exige ser
administrador de la página. Van como datos en el registry, no como ramas en la UI.

**Lo que no cambia**: el wizard, la máquina de estados, el botón, la tarjeta de salud y las
rutas.

#### Contrato con el backend

**Entregado por: B9** (adaptadores y routers de webhook de Instagram y Messenger) **más la
petición 4 de §4.3** (parametrización del endpoint de configuración por producto).

**F5 no se mergea hasta que B9 esté mergeado.** El motivo no es cosmético: sin el adaptador de
`ChannelProviderPort` para esos kinds, el registry del backend no los soporta
(`supports(kind)` produce un skip tipado), así que el canal se crearía y **no podría enviar ni
recibir un solo mensaje**. Habilitar el botón antes que B9 sería entregar una conexión que no
conecta nada, que es peor que la pastilla "próximamente" que hay hoy.

Endpoints: los mismos tres de B4, sin ninguno nuevo. La única diferencia de contrato es cuál
`config_id` devuelve la configuración:

- Opción A (petición 4): `GET /channels/meta/embedded-signup/config?product=instagram`.
- Opción B (preferida): la respuesta devuelve el mapa completo de `config_id` por producto y el
  frontend elige. Ahorra un round-trip cada vez que el usuario cambia de proveedor en el paso 1
  del wizard, que en un wizard de cuatro pasos es un ida y vuelta perfectamente evitable.

Nota de alcance heredada del backend: Instagram y Messenger **no tienen plantillas HSM**. Fuera
de la ventana de 24 h dependen de las etiquetas de mensaje y de la feature "Human Agent" de
Meta. El copy del checklist de esos dos proveedores debe reflejarlo, porque es una limitación
del producto, no un detalle de implementación.

#### Criterio de cierre

Comandos: los mismos cinco.

Comportamiento observable:

- Los descriptores de Instagram y Messenger aparecen como seleccionables en el paso 1, ya sin
  `aria-disabled`.
- Elegir Instagram abre el popup con el `config_id` de Instagram, no con el de WhatsApp.
- El checklist del paso 2 muestra **los prerrequisitos de Instagram**, no los de WhatsApp. Es
  la comprobación de que el registry gobierna de verdad y no hay un `if` escondido.
- Un canal de Instagram conectado aparece en la lista con su icono y su color de marca, con la
  misma tarjeta de salud (los campos que no apliquen se muestran como "Sin datos").
- El sidebar del workspace tiene el enlace "Administrar canales" hacia `/settings/channels`.
- **El diff del PR, excluyendo `schema.d.ts` regenerado, cabe en cuatro archivos.** Si son más,
  hay que explicar por qué en la descripción del PR: es la métrica que valida D3.

#### Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| El registry no capturó alguna variabilidad y F5 acaba siendo un rediseño | Se descubre aquí y se anota como fallo de diseño de F1, no se disimula ampliando el alcance del PR. La métrica del diff lo hace visible |
| Se habilitan los proveedores antes de que B9 exista y el cliente conecta un canal mudo | Bloqueo explícito en §4.2. El daño de habilitar antes de tiempo es mayor que el de esperar |
| El copy de Instagram promete lo mismo que WhatsApp y el cliente descubre que no hay plantillas | El checklist de esos proveedores lo declara explícitamente, igual que el ítem 5 del checklist de WhatsApp declara lo del método de pago |
| El endpoint de configuración devuelve un `config_id` genérico y el popup abre contra el producto equivocado | La petición 4 de §4.3 se resuelve **antes** de empezar la fase. El fallo es silencioso: el popup abre y falla al final, con el usuario delante |

#### Qué NO entra en F5

No entra ninguna funcionalidad específica de Instagram (historias, menciones, respuestas a
publicaciones), que son capacidades de producto distintas de la mensajería directa. No entran
plantillas HSM. No entra ninguna vista nueva. No entra ningún cambio en la máquina de estados
ni en el cargador del SDK: si hiciera falta uno, es señal de que F2 no generalizó bien y hay
que discutirlo antes de codificar.

---

## 6. Accesibilidad y estados de carga (transversal)

Contra `docs/design/DESIGN-SYSTEM.md`, cuyas secciones se verificaron una a una:

- **Jerarquía de carga (§9.1)**: cada ruta privada nueva lleva `loading.tsx` con skeleton
  estructural, porque la forma de destino es conocida. **No** se usa `BrandLoader` (que es para
  estructuras impredecibles) ni un "Cargando…" suelto (prohibido explícitamente). Anchos
  deterministas: `Math.random()` está prohibido por nombre en esa sección porque rompe la
  hidratación SSR. El spinner inline se reserva para el botón durante `preparing` y
  `exchanging`, que es exactamente el tercer nivel de la jerarquía ("estados conectando de un
  canal" aparece literalmente como ejemplo).
- **Regiones vivas**: la máquina de estados de F2/F3 es asíncrona y no tiene foco propio, así
  que necesita un contenedor con `role="status"` y `aria-live="polite"`, y `role="alert"` con
  `aria-live="assertive"` para `error` y `cancelled`. Sin esto, un lector de pantalla no se
  entera de que el popup terminó, y el usuario se queda esperando indefinidamente ante una
  pantalla que ya cambió.
- **El foco vuelve al botón** al cerrarse el popup, en cada transición terminal. Es la única
  forma de que quien navega por teclado no quede perdido en el vacío que deja una ventana que
  se cerró sola.
- **Checklist del paso 2**: `<fieldset>` con `<legend>`, casillas `<input type="checkbox">`
  reales (§2.3: no hay primitivo `Checkbox` en el repositorio y no hace falta), y el botón
  deshabilitado con `aria-describedby` que explica por qué.
- **Iconos de canal**: color oficial del proveedor **solo en el icono**, nunca en superficies
  (`§7`, que además autoriza `react-icons` precisamente para logos de terceros). Los
  decorativos van `aria-hidden`.
- **Contraste AA en light y dark** para los tres tonos de calidad. El rojo usa `destructive` y
  **nunca** el coral de marca.
- **`prefers-reduced-motion`** vía los presets de `src/core/styles/motion.ts` (`spring.soft`
  para sheets y modales, `spring.snappy` para elementos pequeños, `fade.fast` para cambios de
  estado). Nunca duraciones ni curvas ad hoc.
- **Objetivos táctiles ≥40px en móvil** (`§10`).
- El checklist de `§11` se corre entero antes de mergear cada PR que toque UI, es decir F1, F3,
  F4 y F5 (F2 no renderiza nada).

---

## 7. Verificación: comandos y su trampa

Los comandos los ejecuta el usuario. Este plan no arranca servidores de desarrollo ni mata
procesos suyos.

| Comando | Qué comprueba | Nota |
|---|---|---|
| `npm run lint` | ESLint (`next lint`) | Existe |
| `npx tsc --noEmit` | Tipos | **No hay script `typecheck`** en `axi-client`, a diferencia del backend |
| `npx jest --testPathIgnorePatterns "/node_modules/" "/.next/"` | Suite unitaria | **Obligatorio dentro del worktree** |
| `npm test` | Suite unitaria | **Dentro de este worktree descubre CERO tests y sale con éxito.** Solo es fiable desde el repositorio padre |
| `npm run build` | Build de producción con la verja de ESLint activa | Es la verja real del proyecto |
| `npm run api:types` | Regenera `src/core/api/schema.d.ts` desde `../axi-server/openapi/openapi.json` | Nunca se edita el schema a mano |
| `npm run api:types:check` | Verifica que el schema commiteado coincide con el `openapi.json` | Es la prueba objetiva de que el bloqueo con el PR del backend está resuelto |

**Sobre la trampa de `npm test`.** `jest.config.cjs` declara
`testPathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/', '/.next/']`. La intención
era que el repositorio **padre** no ejecutase las suites duplicadas de los worktrees, que
resolverían `@/*` contra el `src` equivocado. El efecto colateral es que, ejecutado **desde
dentro** de un worktree, el mismo patrón excluye la totalidad de sus tests, porque su ruta
absoluta contiene `/.claude/worktrees/`. Comprobado en este worktree: `npx jest --listTests`
devuelve cero archivos y código de salida 0; con el patrón sobreescrito devuelve 83.

Es un fallo silencioso de la peor clase: no da error, da éxito. Corregirlo (por ejemplo
anclando el patrón al `rootDir`) está **fuera del alcance de este plan**, pero merece su propia
tarea y aquí queda documentado para que ningún PR de esta rama se dé por verificado con un
`npm test` vacío.

**Sobre el `openapi.json` del backend.** El worktree del backend está en
`/home/davela/dev/axi/axi-server/.claude/worktrees/feat-meta-channels`, mientras que
`api:types` apunta a `../axi-server/openapi/openapi.json`, es decir al **repositorio padre**.
Para probar F2 contra la rama `feat/meta-channels` antes de que se fusione, hay que apuntar
temporalmente al worktree del backend o fusionar primero. Es un detalle operativo que
conviene tener presente para no pasar media hora preguntándose por qué `api:types` no ve los
DTOs nuevos.

---

## 8. Riesgos transversales

Los riesgos específicos de cada fase están en su sección. Aquí quedan los que cruzan fases.

| Riesgo | Mitigación |
|---|---|
| **Divergencia entre los dos planes.** El plan del frontend asume campos y endpoints que el del backend no promete | Las seis peticiones de §4.3 son el punto de sincronización. Ninguna fase bloqueada por una petición abierta debe empezarse a codificar |
| **El App Review de Meta se retrasa y la feature queda en el aire** | F1 es mergeable sin backend y sin Meta: arregla el 404 y entrega la página de canales. Es el seguro contra el retraso |
| **Alguien "limpia" el `ChannelForm` por considerarlo legacy** | Es el fallback manual de F3 y el escape hatch de soporte que el plan del backend preserva explícitamente. Está anotado en el inventario de F1 como "archivo que NO se elimina y por qué" |
| **Los PRs se mergean fuera de orden** | La tabla de §4.2 es normativa. En particular, F5 antes de B9 entrega una conexión que no conecta nada |
| **La suite se da por verde con un `npm test` que no ejecutó nada** | §7. El criterio de cierre de cada fase nombra el comando correcto |
| **El copy se llena de jerga porque quien lo escribe entiende la jerga** | La regla "cero jerga" es verificable buscando términos concretos en el diff. Todo el vocabulario de Meta vive en un solo acordeón, "Detalles técnicos" |
| **Se promete en la UI algo que el backend no hace** (desconexión suave, métrica de ventana de 24 h, evento en vivo de salud) | Tres prohibiciones explícitas en F4, cada una con su petición correspondiente en §4.3 |

---

## 9. Incertidumbres declaradas

Lo que sigue **no se afirma**, porque no se pudo verificar contra el repositorio. Se declara
para que la auditoría sepa dónde el plan está apoyado en supuestos.

1. **La forma exacta del `message` de Embedded Signup v4** (`WA_EMBEDDED_SIGNUP` con
   `FINISH`/`CANCEL`/`ERROR` y `sessionInfoVersion: "3"`) procede de la documentación de Meta,
   no de este repositorio ni del backend. El repositorio no tiene ni una línea de SDK de
   Facebook con la que contrastarlo. Si Meta cambió el shape, se descubrirá en la primera
   prueba real, y la máquina de estados debe tolerarlo (evento desconocido se ignora, nunca
   lanza).
2. **La lista blanca exacta de `origin`** de los popups de Meta no está verificada aquí. Debe
   fijarse contra la documentación vigente en el momento de implementar F2 y escribirse como
   constante con comentario que cite la fuente.
3. **Los nombres de los DTOs en `Schemas[...]`** son una propuesta (petición 1 de §4.3), no un
   hecho. El `openapi.json` del backend no contiene hoy ningún endpoint `channels/meta`
   (verificado con búsqueda directa).
4. **El cuerpo exacto de `POST /channels/meta/embedded-signup`** está parcialmente inferido. La
   tabla de F2 marca campo por campo qué está confirmado y qué no; los inferidos podrían no
   llamarse así.
5. **Si `GET /channels/:id` devolverá el bloque `onboarding`** no está declarado en el plan del
   backend. F4 lo necesita y lo pide; hasta que se conceda, es un supuesto.
6. **La UI de plantillas HSM no está planificada en ningún documento.** El B8 del backend
   sincroniza `channel_message_template` y valida los `quick_actions` degradando, pero no hay
   ninguna fase de frontend, ni en este plan ni en otro, que exponga las plantillas al tenant.
   Es un hueco conocido, no un olvido de este documento: merece su propio plan.
7. **El comportamiento de los redirects de `next.config.ts` en navegación blanda** no se probó
   en este entorno. Next aplica los redirects de configuración también en transiciones del
   router del cliente, pero F1 reapunta igualmente los dos `router.push` del sidebar, así que
   el plan no depende de ese comportamiento.
8. **Ninguna de las cifras de latencia de Meta** (los 30 s del `code`, los 15 s del timeout del
   SDK, los 8 s de espera del `sessionInfo`, los 3 min del watchdog) se midió aquí. Las tres
   últimas son decisiones de diseño de este plan y son ajustables; la primera viene de la
   documentación de Meta y del plan del backend.
9. **No existe `docs/modules/channels.md`.** Los módulos documentados son analytics, catalog,
   crm, dashboard, forms, inbox, notifications, orders, platform-qa, platform y public-site.
   Cuando la feature esté completa, el slice `channels` merecerá su documento de módulo; este
   plan no lo crea porque no es su alcance.
