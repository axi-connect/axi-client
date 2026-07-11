# Módulo Notificaciones — guía de integración y plan de implementación (frontend)

> **Documento de integración del feature de notificaciones in-app.** Redactado a partir del código real del backend (`axi-server/src/modules/notifications/`, julio 2026) y del estado actual de `axi-client`. Es la guía de referencia para implementar la campana de notificaciones en tiempo real en el panel privado.
>
> **Estado del backend:** completo y publicado (REST + WebSocket + persistencia). **Estado del frontend:** sin consumidor — los tipos wire ya están generados (`src/core/api/schema.d.ts`) y el evento WS ya está tipado (`src/core/realtime/events.ts`), pero no existe módulo `notifications/`, ni campana, ni toasts. Todo lo de la Parte B está por construir.
>
> **Decisiones de UX confirmadas (no re-discutir):** marcar leída individual al clic (con navegación al destino) + botón "Marcar todas"; toast apilable + sonido al llegar una notificación en vivo; solo panel de campana (sin página dedicada); mute persistido en `localStorage`. Sonido: `public/audio/notification-sound.mp3` (ya en el repo).

---

# Parte A — Guía de integración (contratos del backend)

## 1. Qué es el feature

Notificaciones **in-app persistidas por usuario** ("la campanita"). El backend las crea por *fan-out* cuando ocurren eventos de dominio relevantes: inserta una fila `notification_message` **por cada usuario destinatario** (elegido por permiso RBAC dentro del tenant) y emite un push WebSocket a ese usuario. El frontend las lista/marca por REST y recibe las nuevas por WS.

Modelo wire (fila): `{ id, type, title, body, data, read_at, created_at }`.

- `type` es **string libre, sin enum** (nombre del evento origen).
- `data` es el payload completo del evento de dominio (útil para deep-links).
- `read_at: null` = no leída.

### Tipos que el backend genera HOY

| `type` | Disparador | Destinatarios (permiso) | `data` relevante |
|---|---|---|---|
| `conversation.queued` | Conversación escalada a cola humana | `conversations:claim` / `conversations:*` | `conversation_id` |
| `conversation.sla_breached` | SLA de cola vencido | `conversations:claim` / `*` | `conversation_id` |
| `order.created` | Pedido creado **por el agente IA** | `orders:manage` / `orders:*` | `order_id`, `number` |
| `order.payment_reported` | Comprobante de pago recibido | `orders:manage` / `*` | `order_id`, `number` |

> ⚠️ La doc del backend menciona `usage.threshold` y `channel.disconnected` como ejemplos, pero **ningún writer los produce hoy**. El frontend debe tratar cualquier `type` desconocido como renderizable (title/body genéricos) y sin destino de navegación.

## 2. Contrato REST (bajo `/api/v1`, autenticado)

Tipos generados en `src/core/api/schema.d.ts` (`Schemas["NotificationsListDto"]`). **Solo requieren sesión válida — sin permiso RBAC extra**: cada usuario ve y gestiona únicamente lo suyo (scoping por `user_id` del token).

| Método/Path | Nota |
|---|---|
| `GET /notifications` | Query `{ unread_only?, page=1, page_size=25 (1..100) }`. ⚠️ **`unread_only` viaja como STRING `"true"`/`"false"`** (así lo valida el backend y lo tipa el OpenAPI). Paginación **offset**, orden fijo `created_at desc`. |
| `POST /notifications/:id/read` | 204 sin body. Idempotente. **404 tipado `notifications/not_found`** si no existe o no es del usuario → tratar como éxito. |
| `POST /notifications/read-all` | 204 sin body. Marca todas las no leídas del usuario. |

**Respuesta del listado** (única fuente del conteo — no existe endpoint dedicado de unread-count):

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "type": "conversation.queued",
      "title": "Conversación en cola de atención",
      "body": "Un cliente espera a un operador humano.",   // string | null
      "data": { "conversation_id": "…", "company_id": "…" }, // unknown | null
      "read_at": null,                                       // ISO string | null
      "created_at": "2026-07-11T15:04:05.000Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "page_size": 25 },
  "unread_count": 7   // no leídas del usuario, INDEPENDIENTE del filtro → badge
}
```

## 3. Contrato WebSocket

Namespace **`/inbox`** (el mismo del workspace; ya soportado por `core/realtime/`).

- **Handshake:** JWT en `handshake.auth.token` — ya lo resuelve `socket-manager.ts` vía `GET /api/auth/token` (rotación y backoff incluidos). Nada que hacer.
- **Rooms:** al conectar, el backend une el socket automáticamente a `company_{company_id}` y **`user_{sub}`**. El evento de notificación llega por el room de usuario (solo al destinatario).
- **Evento:** `notification.created` — ya tipado como `NotificationCreatedEvent` en `src/core/realtime/events.ts`:

```ts
{ id, type, title, body, data, created_at }   // SIN read_at: recién creada = no leída
```

- ⚠️ **No existe comando WS para marcar notificaciones leídas.** `inbox.mark_read` marca *la conversación*, no la campanita. Marcar leídas es exclusivamente por REST (§2).
- **Garantía de orden:** el backend **persiste la fila antes de emitir el WS** → un `GET /notifications` posterior al evento siempre la incluye (base del dedupe por `id` en el frontend).

## 4. Vacíos conocidos del backend (informativo)

- No hay `DELETE /notifications/:id` ni "borrar todas".
- No hay endpoint dedicado de conteo (usar `unread_count` del list).
- No hay preferencias de notificación (opt-in/out por tipo) ni severidades.
- No hay TTL/retención: las filas crecen indefinidamente.
- `type` sin enum → riesgo de drift doc↔código; el mapper de navegación del frontend debe ser tolerante (fallback `null`).

---

# Parte B — Plan de implementación (frontend)

## 5. Estructura del slice

Slice nuevo `src/modules/notifications/` (patrón `channels`: `domain/ + infrastructure/ + ui/`, sin `application/` — CRUD ligero, regla de escape de architecture §3.2).

```
src/modules/notifications/
├── domain/
│   ├── notification.ts              # NotificationDTO = Schemas["NotificationsListDto"]["data"][number];
│   │                                #   ListNotificationsParams; fromRealtimeEvent(evt) → { ...evt, read_at: null }
│   └── notification-target.ts       # mapper extensible type+data → ruta destino (§8)
├── infrastructure/
│   ├── services/
│   │   └── notifications-service.adapter.ts   # listNotifications / markNotificationRead / markAllNotificationsRead
│   ├── stores/
│   │   └── notifications.store.ts             # Zustand (§6)
│   ├── hooks/
│   │   └── use-notifications-realtime.ts      # useSocket("inbox") + useSocketEvent + refresh() al reconectar (§7)
│   └── lib/
│       └── notification-sound.ts              # HTMLAudioElement singleton, throttle 1 s, autoplay-safe (§7)
└── ui/components/
    ├── NotificationBell.tsx          # trigger + badge + monta realtime + bootstrap + <NotificationToaster/>
    ├── NotificationPanel.tsx         # contenido del Popover: tabs, lista con scroll infinito, acciones
    ├── NotificationItem.tsx          # fila individual
    └── NotificationToaster.tsx       # stack de toasts en portal (§9)
```

**Archivos compartidos:**
- **Crear** `src/core/lib/relative-time.ts` — `relativeTime(iso: string): string` con `Intl.RelativeTimeFormat("es", { numeric: "auto" })` (segundos→minutos→horas→días→semanas; fecha corta si >30 días). No existe util de tiempo relativo hoy (el inbox usa `toLocaleTimeString` ad-hoc).
- **Modificar** `src/shared/components/layout/private-header.tsx` — reemplazar `<ThemeToggle className="ml-auto" />` por:

```tsx
<div className="ml-auto flex items-center gap-1">
  <NotificationBell />
  <ThemeToggle />
</div>
```

### Adapter REST (contrato)

```ts
// unread_only se serializa a STRING "true"/"false" (§2)
listNotifications(params: ListNotificationsParams): Promise<NotificationsListDTO>  // http.get("/notifications", …)
markNotificationRead(id: string): Promise<void>       // http.post(`/notifications/${id}/read`)  → 204
markAllNotificationsRead(): Promise<void>             // http.post("/notifications/read-all")     → 204
```

## 6. Store (`notifications.store.ts`)

**Decisión clave: dos listas separadas por tab** (`all` / `unread`), cada una con paginación server-side propia (`unread_only`). Filtrar "No leídas" client-side sobre la lista paginada de "Todas" sería incorrecto (una no leída en la página 5 no aparecería). `PAGE_SIZE = 20`.

```ts
type TabState = { items: NotificationDTO[]; page: number; hasMore: boolean;
                  loading: boolean; error: string | null; initialized: boolean };

type NotificationsStore = {
  tabs: Record<"all" | "unread", TabState>;
  unreadCount: number;
  muted: boolean;              // false en SSR; hydrateMute() post-mount
  toasts: NotificationDTO[];   // cola FIFO, cap 4

  hydrateMute(): void; toggleMute(): void;
  fetchPage(tab, page): Promise<void>;
  loadMore(tab): Promise<void>;            // guard: loading || !hasMore
  refresh(): Promise<void>;                // página 1 de tabs inicializadas
  onNotificationCreated(evt): void;        // desde el hook realtime
  markRead(id): Promise<void>; markAllRead(): Promise<void>;
  dismissToast(id): void;
};
```

Reglas de implementación:

- **`unreadCount` es autoritativo desde REST** (`unread_count` viene en cada respuesta del list); entre fetches se ajusta localmente: +1 por WS (con dedupe), −1 por `markRead`, 0 por `markAllRead`.
- **`fetchPage`**: `page === 1` reemplaza `items`; `page > 1` concatena **con dedupe por `id`** (un evento WS entre páginas desplaza el offset y puede repetir filas). `hasMore = page * meta.page_size < meta.total`. Errores con `errorMessage(err, "No se pudieron cargar las notificaciones")`.
- **`onNotificationCreated`**: si el `id` ya existe en `tabs.all.items` → no-op (cubre replay de reconexión y race con el fetch). Si es nueva: `fromRealtimeEvent(evt)` → unshift en ambas tabs (la `unread` solo si `initialized`), `unreadCount + 1`, push a `toasts` (FIFO, descarta la más vieja si excede el cap).
- **`markRead` optimista**: snapshot → `read_at = now` en `all`, remover de `unread`, `unreadCount − 1`, quitar toast → `await` REST. En catch: **404 = éxito idempotente (no rollback)**; otros errores restauran el snapshot. `markAllRead` igual (todas leídas, `unread` vacía, contador 0).
- **Mute**: `hydrateMute()` lee `localStorage` (key `axi:notifications:muted`) **solo en `useEffect`** — nunca en render (mismatch SSR). `try/catch` por modo privado.

## 7. Realtime + sonido

`use-notifications-realtime.ts` (patrón de `use-channels-realtime.ts`):

- `const { socket, connected } = useSocket("inbox")` + `useSocketEvent(socket, "notification.created", handler)`. El handler llama `useNotificationsStore.getState().onNotificationCreated(payload)` y, si la notificación era nueva, `playNotificationSound(muted)`.
- **Reconexión**: en el flanco de reconexión (guard con ref para saltar el primer connect) → `refresh()` re-sincroniza `unread_count` y página 1 (eventos perdidos durante la caída).
- **Convivencia con `useInboxSocket` es segura**: `useSocket` ref-cuenta consumidores por namespace y comparte el socket `/inbox`. Efecto lateral positivo: el socket queda vivo en todo el panel privado.

`notification-sound.ts`: singleton `HTMLAudioElement` sobre `/audio/notification-sound.mp3`, throttle 1 s entre reproducciones (ráfagas), `audio.play().catch(() => {})` — la política de autoplay del navegador rechaza antes del primer gesto del usuario: degradación silenciosa, sin logs ni permisos.

## 8. Navegación por tipo (`notification-target.ts`)

Mapa extensible con match exacto primero y por familia (prefijo) después:

| Patrón | Destino |
|---|---|
| `conversation.*` con `data.conversation_id` | `/workspace/inbox/{conversation_id}` |
| `order.*` | `null` — **no existe vista de pedidos hoy**; el clic solo marca leída |
| desconocido / sin data | `null` |

`notificationTarget(type, data): string | null`. Cuando exista la vista de pedidos, se agrega una entrada sin tocar consumidores.

## 9. UI (siguiendo DESIGN-SYSTEM)

**`NotificationBell`** (`"use client"`, vive en `PrivateHeader` → montado en el 100% del panel privado, incluido workspace):
- Monta `useNotificationsRealtime()` y en `useEffect`: `hydrateMute()` + `fetchPage("all", 1)` (bootstrap: badge real sin abrir el panel). Si el header dejara de ser global, mover el hook a un bridge en `(private)/layout.tsx`.
- `Popover` + `Button variant="ghost" size="icon"` con `Bell` (lucide) y `aria-label` con el conteo. Badge coral (`bg-primary text-primary-foreground`, pill, `absolute -top-0.5 -right-0.5`), cap `99+`, oculto si 0. Micro-animación al incrementar: `motion.span key={unreadCount}` scale 0.6→1 con `spring.snappy` (off con `useReducedMotion`).
- Renderiza `<NotificationToaster />` como hermano — todo el módulo se integra tocando solo el header.
- Al abrir el panel: `refresh()` de la tab activa si ya estaba inicializada.

**`NotificationPanel`** (`PopoverContent align="end" sideOffset={8}`, `w-[min(92vw,400px)] p-0 rounded-xl glass` — superficie flotante → glass permitido):
- Header: "Notificaciones" + (`ml-auto`) toggle mute (`Volume2`/`VolumeX` + tooltip "Silenciar sonido") + "Marcar todas" (`ghost sm`, disabled si `unreadCount === 0`). `Separator`.
- `Tabs` Todas / No leídas — la tab `unread` hace `fetchPage("unread", 1)` lazy la primera vez.
- Lista: contenedor `max-h-[min(60vh,480px)] overflow-y-auto` con **scroll infinito por `IntersectionObserver`** (sentinel al final, `root` = el contenedor; los guards del store evitan dobles llamadas).
- Estados obligatorios: carga inicial → 3–4 filas `Skeleton`; vacío → icono (`BellOff`/`Inbox`) + frase ("Estás al día"); error → mensaje + reintentar; cola de página → skeleton pequeño.
- **Móvil**: el `w-[min(92vw,400px)]` + collision-handling de Radix basta; **no usar sheet** (bifurcación sin beneficio).

**`NotificationItem`**: `<button>` a ancho completo (accesible, no div clickeable). Dot coral 8 px si no leída | título `text-sm font-medium` (leída → `font-normal`, sin dot) + body `text-xs text-muted-foreground line-clamp-2` | `relativeTime(created_at)` con `title` = fecha absoluta. Clic: `markRead(id)` + `router.push` si hay target + cerrar popover. Hover `bg-muted/50`.

**`NotificationToaster`** — componente propio del slice, **NO extender `FloatingAlert`** (es single-instance, sin stack ni pausa-on-hover; retrofitearlo arriesga a los consumidores de `AlertProvider`):
- `createPortal(document.body)` con guard `mounted`. Contenedor `fixed top-[60px] right-4 z-[9999] flex flex-col gap-2 w-[min(92vw,22rem)] pointer-events-none`.
- Renderiza `toasts` del store (máx 4). `AnimatePresence mode="popLayout"`: entrada `{opacity:0, x:24}→{opacity:1, x:0}` con `spring.snappy`, salida `fade.fast`; con `useReducedMotion` solo opacity.
- Card: `glass rounded-xl pointer-events-auto`, título + body `line-clamp-2`, botón cerrar (X, `stopPropagation`). Auto-dismiss 6 s con timer pausable on hover (re-armar completo al salir). Clic: `markRead` fire-and-forget + navegar si hay target + `dismissToast`. `whileTap={press}`; cursor pointer solo si hay destino.

Checklist DESIGN-SYSTEM aplicable: cero hex (tokens semánticos), light+dark, radios de marca, lucide, presets de `core/styles/motion.ts`, `prefers-reduced-motion`, `aria-label` en icon-buttons, contraste AA.

## 10. Fases de implementación

| Fase | Entregable | Verificación |
|---|---|---|
| 1 | `domain/` + `core/lib/relative-time.ts` | compila; unit tests del target mapper y relative-time |
| 2 | `notifications-service.adapter.ts` | curl al BFF `/api/proxy/notifications?unread_only=false` con sesión |
| 3 | `notifications.store.ts` | unit tests: dedupe, optimista/rollback, 404-idempotente, hasMore |
| 4 | hook realtime + sonido | evento real → store actualiza; throttle y mute funcionan |
| 5 | Bell + Panel + Item + header | badge real, tabs, scroll infinito, marcar leída/todas, empty/skeleton |
| 6 | Toaster | evento en vivo → toast apilado + sonido + clic navega |
| 7 | Pulido | reduced-motion, a11y, móvil, light/dark |

**Verificación end-to-end** (con backend corriendo): la forma más directa de generar una notificación real es **escalar una conversación a la cola** (produce `conversation.queued`) con un usuario que tenga `conversations:claim`; alternativa: dejar vencer el SLA. Verificar: badge +1 en vivo, toast + sonido, clic navega a `/workspace/inbox/{id}`, marcar leída baja el badge, "Marcar todas" lo pone a 0, recarga conserva estado desde REST, mute persiste. Cierre: `npm run lint`, `npm run build`, `npm test`.

## 11. Riesgos y edge cases (cubiertos en el diseño)

1. **Reconexión de socket** → `refresh()` en el flanco de reconexión re-sincroniza badge y lista.
2. **Duplicados** → dedupe por `id` en el handler WS y en la concatenación de `loadMore`.
3. **Race fetch vs WS** → el backend persiste antes de emitir; replace de página 1 nunca pierde datos.
4. **`markRead` 404** → éxito idempotente, sin rollback.
5. **Autoplay policy** → `play().catch()` silencioso; funciona tras el primer gesto de la sesión.
6. **SSR/hidratación del mute** → `localStorage` solo en `useEffect`.
7. **Ráfagas** → throttle 1 s en sonido + cap 4 toasts (el badge sí refleja todo).
8. **`type` desconocido** → item/toast renderizable con title/body; target `null` (clic solo marca leída).
