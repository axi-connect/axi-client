# Módulo Orders — Panel de pedidos en tiempo real (F11)

> **Doc del módulo.** Parte A: contrato del backend (REST + WS) que consume este slice.
> Parte B: decisiones de implementación frontend, arquitectura y diseño (adaptación del mockup
> de referencia a la identidad Axi). Documentos rectores: `docs/architecture.md`,
> `docs/design/DESIGN.md`, `docs/design/DESIGN-SYSTEM.md` y, del backend,
> `axi-server/docs/orders_panel_implementation.md` + `integracion_frontend.md` §7.3.

---

## Parte A — Contrato del backend

### A.1 REST (`/api/v1`, tipos generados en `core/api/schema.d.ts`)

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET | `/orders` | `orders:read` | Listado paginado. Filtros: `status`, `contact_id`, `conversation_id`, `created_by_type`, `created_from/to`, **`search`** (n° de pedido o nombre del cliente), `sort_by` (`created_at\|updated_at\|order_number\|total_cents`), `sort_dir`, `page`, `page_size` |
| GET | `/orders/stats?period=today\|7d\|30d` | `orders:read` | `counts_by_status` (estado del tablero, SIN período) + KPIs (`orders_today`, `sales_cents`, `average_ticket_cents`, `pending_verification`, `currency`) — cortes en el timezone del tenant |
| GET | `/orders/:id` | `orders:read` | `OrderDto` completo: `contact { id, full_name }`, `items[]` (snapshot de precios), `payments[]`, timestamps de transición |
| GET | `/orders/:id/events` | `orders:read` | Timeline asc: `created, status_changed, payment_reported, payment_verified, payment_rejected, updated, customer_notified, customer_notification_skipped` + `actor_name` resuelto |
| GET | `/orders/:id/payments/:payment_id/attachment` | `orders:read` | `{ url, expires_in_seconds }` — URL presignada del comprobante (TTL 5 min; re-pedir al expirar) |
| POST | `/orders` | `orders:manage` | Crear pedido manual (`items[{variant_id, quantity}]`) |
| PATCH | `/orders/:id` | `orders:manage` | Editar items/notas/descuento — SOLO `draft\|pending` (`orders/not_editable`) |
| POST | `/orders/:id/confirm` | `orders:manage` | → `confirmed` (descuenta stock; 409 `orders/insufficient_stock`). Body opcional `{ notify_customer }` |
| POST | `/orders/:id/cancel` | `orders:manage` | → `cancelled` (repone stock si estaba confirmado). Body `{ reason?, notify_customer }` |
| POST | `/orders/:id/fulfill` | `orders:manage` | `paid` → `fulfilled`. Body opcional `{ notify_customer }` |
| POST | `/orders/:id/payments` | `orders:manage` | Registrar pago manual `{ payment_method_id?, amount_cents?, reference?, notes? }` → `payment_reported` |
| PATCH | `/orders/:id/payments/:payment_id` | `orders:manage` | `{ action: verify\|reject, notes?, notify_customer }`. verify → `paid`; reject → vuelve a `confirmed\|pending` |
| GET/PUT | `/orders/notification-settings` | `orders:manage` | Plantillas del aviso WhatsApp por transición (`confirmed, paid, fulfilled, cancelled, payment_rejected`), variables `{{contact_name}} {{order_number}} {{total}} {{status}}`. Opt-in por plantilla |
| GET | `/usage/conversations/:conversation_id` | `conversations:read` | Metering IA de la conversación de origen: `{ ai_requests, tokens_input, tokens_output, cost_usd }` |
| GET | `/payment-methods` | `payment_methods:read` | Medios de pago del tenant (select de "Registrar pago") |

**Máquina de estados** (espejo en `domain/order-state.ts`; el backend SIEMPRE revalida):
`draft → pending → confirmed → payment_reported → paid → fulfilled`, `cancelled` desde cualquier no-terminal,
`payment_reported` alcanzable desde `pending` o `confirmed`, y el reject devuelve al estado anterior.

**Notificación al cliente**: `notify_customer` (default `true`) es la intención del operador; el envío real
exige plantilla **habilitada** en settings. Fuera de la ventana 24 h de Meta o canal caído → el backend
lo omite y lo registra en el timeline (`customer_notification_skipped`) — el operador lo VE y puede
escribir a mano. El pedido manual sin conversación usa la identidad de canal más reciente del contacto.

### A.2 WebSocket (namespace `/inbox`, room `company_{id}` automático)

Payload base común (SIN items/payments — re-fetch `GET /orders/:id` para el detalle):
`{ company_id, order_id, order_number, conversation_id, contact_id, status, total_cents, currency, created_by_type }`

| Evento | Cuándo | Extra |
|---|---|---|
| `order.created` | sale de draft (IA u operador) | — |
| `order.status_changed` | confirm/cancel/fulfill/verify/reject | `previous_status`, `notification_key?`, `notify_customer?` |
| `order.payment_reported` | comprobante/reporte de pago | `payment_id` |
| `order.updated` | edición en draft\|pending (operador o carrito IA) | — |

Además llegan `notification.created` in-app para pedidos IA y pagos reportados (usuarios con `orders:manage`).

---

## Parte B — Implementación frontend

### B.1 Diseño (adaptación del mockup de referencia)

El mockup rector (dashboard food-delivery dark) se tradujo a la identidad Axi **vía tokens**
(funciona en light y dark; el rojo del mockup lo asume el **coral** de marca):

| Elemento del mockup | Traducción Axi |
|---|---|
| Panel "Cart" derecho persistente | **Rail de detalle** inline en desktop (slot `@sheet` en el layout flex), overlay con scrim en móvil. Ítems con thumbnail (Avatar square), **separador punteado estilo ticket** con muescas, bloque Subtotal/Descuento/TOTAL y **CTA pill de ancho completo** ("Confirmar pedido") |
| Segmentado Delivery/Dine In/Takeaway | Conmutador pill **⊞ Tablero / ☰ Tabla** (activo en coral, preferencia en `localStorage`) |
| Subtítulos en acento ("20+ New dishes…") | Subtítulo coral vivo bajo el H1 ("18 pedidos nuevos hoy") |
| Badges "Completed"/"Pending" | Pills rellenos con tokens funcionales: pending `info`, confirmed `accent/primary`, payment_reported `warning`, paid `success`, fulfilled `muted`, cancelled `destructive` |
| Avatares en Order Reports | `Avatar` con fallback de inicial en tabla, tarjetas y rail |
| Radios generosos, capas | `rounded-2xl` en cards/tiles/columnas; columnas `bg-secondary/50` con cards `bg-background` encima |
| Acento IA | Violeta (`accent-violet`) + Sparkles — único acento secundario de la vista (DESIGN §3.1) |

Glass SOLO en superficies flotantes (toasts, diálogos); tablero/tabla/rail sólidos. Animaciones con
presets `motion.ts` (`spring.snappy` entrada de tarjeta + ring coral que se desvanece, `layout` para
recolocación) y todo bajo `useReducedMotion`.

### B.2 Estructura del slice

```
src/modules/orders/
├── domain/ order.ts (DTOs re-exportados de Schemas + OrderRow + mappers + formatMoney)
│           order-state.ts (ORDER_TRANSITIONS espejo, KANBAN_COLUMNS, DRAG_ACTIONS whitelist)
├── infrastructure/
│   ├── services/ orders-service.adapter.ts · order-payments-service.adapter.ts (+ listPaymentMethods)
│   │            · order-settings-service.adapter.ts
│   ├── stores/ orders.store.ts        # Zustand normalizado: ordersById + ids por columna
│   ├── realtime/ use-orders-socket.ts # useSocket("inbox") + 4 useSocketEvent → reducers
│   └── lib/ order-sound.ts            # Audio singleton, throttle 1.5 s, autoplay-safe
└── ui/ OrdersView.tsx · OrderDetailRoute.tsx
    ├── components/ OrdersHeader · OrderStatsTiles · OrderStatusBadge · OrderOriginBadge
    │               · OrdersToaster · OrdersSkeleton
    │   ├── kanban/ OrdersKanban (@dnd-kit/core) · KanbanColumn · OrderCard
    │   │           · TransitionConfirmDialog · ReportPaymentDialog
    │   └── detail/ OrderDetailRail · OrderTimeline · PaymentProofViewer · PaymentReviewDialog
    ├── forms/ OrderNotificationTemplatesForm.tsx
    └── tables/ OrdersTable.tsx        # DataTable + usePaginatedList + filtros + CSV

src/app/(private)/orders/              # FULL-BLEED (patrón workspace, h-[calc(100svh-52px)])
├── layout.tsx (children + slot @sheet en flex row) · page.tsx · loading.tsx · default.tsx
├── @sheet/ default.tsx (null) · (.)[orderId]/page.tsx   # soft nav → rail interceptado
└── [orderId]/page.tsx                                    # hard nav → OrdersView con rail inline
src/app/(private)/(content)/settings/orders/              # plantillas de notificación
```

Transversales: eventos `order.*` tipados en `core/realtime/events.ts`; códigos `orders/*` en
`core/lib/error-messages.ts`; `core/lib/csv.ts` (BOM UTF-8); deep-link `order.* → /orders/{id}`
en `notifications/domain/notification-target.ts`; API `suppressToastPrefixes` en
`notifications.store` (OrdersView suprime `order.` — un solo toast, el badge sigue contando).

### B.3 Decisiones clave

- **Kanban con `@dnd-kit/core`** (~10 kB): Pointer + Touch + Keyboard (a11y/tablets). Drag limitado a
  la **whitelist** `DRAG_ACTIONS` (`pending→confirmed` confirma, `confirmed→payment_reported` abre
  Registrar pago, `payment_reported→paid` abre el detalle para verificar, `paid→fulfilled` entrega);
  columnas inválidas se atenúan durante el drag. Retrocesos y cancelar SOLO por menú ⋮/detalle —
  el drag nunca es el único camino. Cada drop confirma en diálogo con Switch "Notificar al cliente".
- **Store normalizado + optimista**: mover tarjeta = mover un id; `transition()` aplica el movimiento
  optimista y hace **rollback** completo si el backend rechaza (p.ej. `orders/insufficient_stock`).
  Reducers WS con dedupe por id; `order.created` inserta Row `partial` (highlight ring coral + toast +
  sonido) y se hidrata con `refreshOrder`. Reconexión → `fetchBoard()` (eventos perdidos).
- **La tabla NO se re-pagina sola**: chip «N cambios nuevos · Actualizar» alimentado por
  `realtimeVersion` — el operador decide cuándo refrescar.
- **Detalle navegable**: slot paralelo + ruta interceptada (regla §6 de architecture) — URL
  compartible, back cierra. El rail escucha `orders:detail:refresh` (CustomEvent del store) para
  refrescarse en vivo. Costo IA vía `GET /usage/conversations/:id` (best-effort: sin permiso se oculta).
- **Permisos**: `orders:manage` habilita drag/menús/acciones; con solo `orders:read` el tablero es
  de lectura. El sidebar ya emite `/orders` desde el backend (icono `shopping-cart` mapeado).
- **Preferencias de dispositivo** en localStorage: `axi:orders:view`, `axi:orders:sound`
  (hidratadas post-mount, patrón `MUTE_STORAGE_KEY`).

### B.4 Mockups de referencia (aprobados)

```
┌─ Kanban ─────────────────────────────────────────────────────────────────────┐
│  Pedidos                     [Período ▾]  🔊  ( ⊞ Tablero | ☰ Tabla )        │
│  «18 pedidos nuevos hoy» (coral)                                             │
│  [PEDIDOS HOY 18] [VENTAS 7D $4.850.000] [TICKET $269.400] [POR VERIFICAR 3⚠]│
│  PENDIENTE(4)  CONFIRMADO(6)  PAGO REPORT.(3)  PAGADO(2)  ENTREGADO(12)      │
│  ┌─#0142 ⋮─┐   ┌─#0139 ⋮─┐    ┌─#0136 📎⋮─┐    …          …                  │
│  │◉ Ana G. │   │◉ Luis P.│    │◉ Marta R. │                                  │
│  │$ 320.000│   │$ 145.000│    │$ 89.900   │   drop → Dialog: [✓] Notificar   │
│  │✦IA · 5m │   │👤 · 1 h │    │✦IA · 12m  │   al cliente [Confirmar pedido]  │
│  └─────────┘   └─────────┘    └───────────┘                                  │
│  Toast glass: «Nuevo pedido #0143 · Tomado por el agente IA» [Ver pedido] 🔔 │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Rail de detalle (/orders/[id], estilo "Cart") ──────────────┐
│ #0136  ● Pago reportado   ◉ Marta Ríos · ✦IA · hace 1 h   ✕ │
│ ARTÍCULOS: 2× Camiseta oversize · Negra/M …    $ 70.000     │
│ ✂ ─ ─ ─ ─ ─ ─ ─ ─ (ticket) ─ ─ ─ ─ ─ ─ ─ ─ ✂               │
│ Subtotal $89.900 · TOTAL **$ 89.900 COP**                   │
│ PAGOS: Bancolombia $89.900 · Ref 99120034 · ⚠ Reportado     │
│   [imagen comprobante 🔍]  [Verificar] [Rechazar…]          │
│ ACTIVIDAD: ● Pago reportado · ● Confirmado por Isabel P. …  │
│ DETALLES: ✦IA · [Abrir conversación ↗] · Costo IA US$0.0412 │
│ [———— Confirmar pedido (pill coral, ancho completo) ————]   │
│ [ Cancelar pedido (ghost destructive) ]                     │
└──────────────────────────────────────────────────────────────┘
```

### B.5 Verificación

- `npx tsc --noEmit` ✔ · `npm run lint` (0 errores en archivos del slice) ✔ ·
  `npx jest` ✔ (máquina de estados, reducers del store: dedupe/move/rollback/hidratación,
  notification-target) · `npm run build` ✔ (rutas `/orders`, `/orders/(.)[orderId]`,
  `/orders/[orderId]`, `/settings/orders`).
- Flujo real (backend dev + seed): pedido IA por WhatsApp → tarjeta entra animada con toast+sonido →
  drag a Confirmado con notificación → el contacto recibe el WhatsApp → reporte de pago con
  comprobante → verificar desde el rail → `paid` → timeline completo y KPIs al día.
- Revisión light/dark de tablero, tabla, rail y settings antes de mergear (checklist DESIGN-SYSTEM §11).

### B.6 Pendientes post-v1 (documentados, no bloqueantes)

- Badge contador en el ítem "Pedidos" del sidebar (requiere punto de extensión `SidebarNavItem.badge`
  inyectado desde el layout privado — `shared/` no puede importar de `modules/`).
- Formulario de creación manual de pedidos (`POST /orders` existe; falta UI con picker de variantes).
- Plantillas HSM para notificar fuera de la ventana 24 h (costura backend documentada).
