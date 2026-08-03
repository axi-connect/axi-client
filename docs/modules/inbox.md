# Módulo Inbox — Atención humana en vivo (F5, F9, F12) + rail de contexto

> **Doc del módulo.** Parte A: contrato del backend (REST + WS) que consume este slice.
> Parte B: implementación frontend, arquitectura y decisiones. Parte C: el rail de contexto de
> la conversación (Contacto · Adjuntos · Historial) y su punto de extensión.
> Documentos rectores: `docs/architecture.md`, `docs/design/DESIGN.md`,
> `docs/design/DESIGN-SYSTEM.md` y, del backend, `axi-server/docs/books/inbox_humano.md`
> (documento canónico del inbox) + `plans/integracion_frontend.md` §6.8–6.9 y §7.
>
> **Ojo con la nomenclatura:** no existe `src/modules/conversations/`. Todo — conversación,
> mensajes, timeline, handoff, adjuntos — vive en `src/modules/inbox/`. `modules/workspace/`
> solo aporta el sidebar de canales.

---

## Parte A — Contrato del backend

### A.1 REST (`/api/v1`, tipos generados en `core/api/schema.d.ts`)

| Método | Path | Uso en el slice | Permiso |
|---|---|---|---|
| GET | `/inbox/conversations` | Lista de la columna izquierda. Filtros `status`, `mode`, `assigned=me\|unassigned`, `channel_id`, `priority`, `page`, `page_size` | `conversations:read` |
| GET | `/inbox/counts` | Badges de tabs y del sidebar → `{queued, mine, ai, all_open, unread_total}` | `conversations:read` |
| GET | `/conversations/{id}` | Conversación seleccionada | `conversations:read` |
| GET | `/conversations/{id}/messages` | Hilo por **cursor** (`cursor` uuid + `limit` ≤100, orden **desc**). Único filtro disponible | `conversations:read` |
| POST | `/conversations/{id}/messages` | **202** — fallback REST del envío cuando el socket está caído | `conversations:reply` |
| POST | `/conversations/{id}/uploads` | Multipart (`file`, `voice_note`) → `upload_id` para `{type:'media'}` | `conversations:reply` |
| GET | `.../messages/{mid}/attachments/{aid}/url` | URL firmada, **TTL 300 s** | `conversations:read` |
| GET | `/inbox/conversations/{id}/events` | Timeline de handoff — **declarado en el adapter pero sin UI** (ver C.6) | `conversations:read` |

**No existe endpoint de adjuntos** (ni por conversación ni por contacto), ni filtros
`content_type`/`has_attachments` en `/messages`. Consecuencia de diseño en C.3.

Los 5 endpoints REST de handoff (`claim`, `takeover`, `return-to-ai`, `close`, `mark-read`) están
en el adapter pero **no se invocan**: las acciones del inbox van siempre por WS (§10 de
`architecture.md`). Es un fallback teórico — con el socket caído fallan con
`client/socket_disconnected`.

### A.2 WebSocket (namespace `/inbox`)

JWT en `handshake.auth.token`; rooms `company_{id}` y `user_{id}` automáticos, `conversation_{id}`
por comando. Contrato tipado en `core/realtime/events.ts`.

**Escuchados por `use-inbox-socket.ts`:**

| Grupo | Eventos |
|---|---|
| Conversación | `conversation.created`, `.message_received`, `.message_created` (F9.1, vista completa del mensaje), `.message_updated` (F12, transcripción), `.message_sent`, `.message_status` (solo `failed`), `.typing` |
| Handoff | `.escalated`, `.claimed`, `.taken_over`, `.returned_to_ai`, `.status_changed`, `.sla_breached` |
| Contexto del contacto (rail) | `contact.lifecycle_changed`, `contact.merged`, `crm.activity_created`, `crm.task_completed`, los 6 `crm.deal_*`, `order.created`, `order.status_changed`, `order.payment_reported` |
| Suspensión | `company.suspended` (F15) |

**Comandos (ack tipado):** `inbox.join_conversation`, `leave_conversation`, `claim`, `takeover`,
`return_to_ai`, `close`, `send_message`, `mark_read`, `typing`. Errores sintéticos del cliente:
`client/socket_disconnected`, `client/ack_timeout`. Un ack `conversations/handoff_conflict`
auto-corrige con `refreshSelected()` + `fetchConversations()`.

**Hueco conocido: no existe `contact.updated`.** Editar la ficha o que la IA capture la dirección
con `save_contact_data` no emite nada. Ver C.4.

---

## Parte B — Implementación frontend

### B.1 Estructura del slice

```
src/modules/inbox/
├── domain/inbox.ts                     # alias de Schemas + UiMessage + tabs + labels ES +
│                                       #   parsers de payload + predicados de adjunto
├── infrastructure/
│   ├── services/inbox-service.adapter.ts
│   ├── stores/inbox.store.ts           # lista, counts, messagesById por cursor, optimista,
│   │                                   #   reducers WS, contextVersion
│   ├── realtime/{use-inbox-socket.ts, use-send-message.ts}
│   └── hooks/{use-attachment-url, use-upload-queue, use-voice-recorder}.ts
└── ui/
    ├── InboxView.tsx                   # 3 superficies + ContextSurface bajo Suspense
    └── components/
        ├── InboxList.tsx  ConversationPanel.tsx  MessageBubble.tsx
        ├── header/                     # Parte D (absorbió el antiguo HandoffActions.tsx)
        ├── composer/                   # Composer, AttachmentPicker/Tray, QuickActionsMenu,
        │                               #   VoiceRecorderBar
        ├── media/                      # MediaAttachment + burbujas por tipo + lightbox + estados
        └── context-rail/               # Parte C
```

### B.2 Decisiones clave (heredadas, vigentes)

- **Acciones por WS, no REST** (§10). `202`/ack = *aceptado, no confirmado*: la confirmación llega
  por evento.
- **Optimista con reconciliación por ack**: `local-{ts}-{rand}` → `reconcileSent` con dedupe cruzado
  (si `message_created` llegó antes del ack, se elimina el optimista en vez de duplicar).
- **`fetchMessages` invierte el orden** del backend (desc → asc para pintar).
- **`resolvePendingMedia`**: la descarga del adjunto entrante corre en un job aparte del backend,
  así que se reintenta `[800,1500,3000,5000,8000] ms` antes de caer a "no disponible".
- **Vista full-bleed** fuera del route group `(content)`; paneles **sólidos, nunca glass**
  (DESIGN-SYSTEM §5.2).
- **Los nombres de adjunto se sanean siempre con `attachmentDisplayName`** (`domain/inbox.ts`).
  WhatsApp entrega como `filename` el JSON de media en **base64url** (400+ chars, sin extensión):
  mostrarlo tal cual ensanchaba el visor de imagen hasta `92vw` y no informaba de nada. El helper
  devuelve el nombre real cuando existe y compone uno legible en caso contrario (`Foto.jpg`,
  `Nota de voz.ogg`, `Documento.pdf`). Lo usan el lightbox, `DocumentCard`, las burbujas de
  imagen/vídeo y el panel de adjuntos.

### B.3 Deuda abierta del slice

- `bumpConversation` y `onHandoffEvent` re-consultan lista + counts en **cada** mensaje, sin
  debounce: con tráfico alto son N peticiones/segundo.
- `appendMessage` no reordena por `created_at` (dedupe solo por `id`).
- `useUploadQueue.clear()` no revoca los object URLs → fuga por sesión.
- La lista solo pide **página 1** (25): no hay paginación ni scroll infinito (el hilo sí pagina).
- El `error` del store no se renderiza en `InboxList`.
- Fallback REST de handoff muerto (A.1).

---

## Parte C — Rail de contexto de la conversación

### C.1 Qué es

Columna de **48px de solo iconos** a la derecha del chat que abre un panel de **340px** con el
contexto del contacto, sin salir de la conversación. Referencia visual: el rail de respond.io.

```
┌──────────┬─────────────────┬──────────────────────────────┬────┐
│ CANALES  │ CONVERSACIONES  │  chat                        │ ▮  │
│  256 lg+ │     288 md+     │  flex-1 min-w-0              │ 48 │
└──────────┴─────────────────┴──────────────────────────────┴────┘
                                        panel 340 ─┘  (xl+ inline)
```

Items actuales: **Contacto** (`contacts:read`), **Adjuntos** (`conversations:read`),
**Historial** (`crm:read`).

### C.2 Estructura y punto de extensión

```
ui/components/context-rail/
├── ContextRail.tsx          # <aside> de iconos + tooltips side="left"
├── ContextPanel.tsx         # chrome: cabecera + cierre + inline/overlay + motion
├── registry.tsx             # CONTEXT_PANELS  ← EL punto de extensión
├── use-context-panel.ts     # estado en ?panel=
└── panels/{ContactPanel,AttachmentsPanel,HistoryPanel,AttachmentThumb}.tsx
```

**Añadir un item del rail = una entrada en `CONTEXT_PANELS` + un componente en `panels/`.** No se
toca el rail, ni el chrome, ni la URL, ni el layout.

```ts
export interface ContextPanelProps {
  conversation: ConversationDTO
  contactId: string
  contextVersion: number      // se incrementa con los eventos WS del contacto
}

export interface ContextPanelDef {
  id: string                  // valor de ?panel= — es URL pública, no cambiarlo a la ligera
  label: string               // tooltip del rail + título del panel
  icon: LucideIcon
  permission?: string         // sin él el item no se pinta
  Panel: React.ComponentType<ContextPanelProps>
}
```

Contrato del panel: renderiza su propio cuerpo scrolleable
(`min-h-0 flex-1 overflow-y-auto p-4 sidebar-scroll`) y, si procede, un footer; la cabecera la pone
`ContextPanel`. Los iconos se importan directo de `lucide-react` — el diccionario de
`core/lib/icons.ts` está cerrado a propósito al nav que emite el backend.

### C.3 Decisiones

| Decisión | Razón |
|---|---|
| **Estado en `?panel=<id>`** | Compartible, el back cierra, se recuerda al recargar. `push` al abrir desde cerrado (para que el back cierre) y `replace` al alternar entre items (alternar 5 pestañas no debe dejar 5 entradas de historial). Un `?panel=` desconocido se ignora en vez de romper. |
| **`xl+` inline / `<xl` overlay / `<md` pantalla completa** | A 1024px no caben cuatro columnas: 256+288+48+340 dejarían ~90px de chat. Patrón de `OrderDetailRail.tsx:132`. |
| **Sin `SidebarProvider` propio** | Cada instancia monta su listener de ⌘B y ya hay tres providers anidados en esta ruta; además su rama desktop es `fixed h-svh` contra el viewport y `hidden lg:block`. |
| **Sin `DetailSheet`** | Es siempre overlay modal con focus-trap y `fixed`: no sirve para un panel persistente. |
| **Acceso en móvil por la cabecera del chat** | En `<md` no hay ancho para el rail, así que el avatar + nombre son un `<Link href="?panel=contact">` (href solo con query: se resuelve contra la URL actual, sin hooks ni Suspense). |
| **`ConversationPanel` lleva `min-w-0`** | Sin él el timeline fuerza overflow horizontal al aparecer hermanos. |
| **`ContextSurface` va bajo `<Suspense>`** | Lee `useSearchParams`; el rail no es crítico para el chat, así que su fallback es `null`. |

### C.4 Datos de cada panel

**Contacto** — `useContactContext` (de `@/modules/crm/public`) hace fan-out con
`Promise.allSettled` a `/contacts/{id}` + `/crm/contacts/{id}/profile` + `/crm/contacts/{id}/tags`,
porque **el backend no tiene endpoint agregado** y `contacts:read` y `crm:read` son permisos
distintos: un 403 en profile/tags **degrada** (se ocultan score, etiquetas y responsable) en vez de
vaciar el panel. El nombre del responsable exige `GET /users` (el DTO solo trae el uuid), cacheado a
nivel de módulo. Solo lectura: la edición vive en el 360 (`/crm/contacts/{id}`).

> **Sobre `address` y `city`:** los escribe la tool `save_contact_data` de la IA. `address` es texto
> libre que puede contener literalmente `"recoge en local"` y suele traer barrio y ciudad embutidos;
> `city` está casi siempre `null`. Nunca se tratan como dato estructurado, y los campos vacíos se
> omiten (`FieldList` los oculta por defecto).

**Adjuntos** — **derivado del store**, cero peticiones extra: los mensajes de `messagesById` ya
traen sus `attachments`. Se filtra con `isAttachmentMessage` (incluye optimistas con solo
`local_previews` y media entrante con `media_pending`; excluye `location`) y se agrupa por día.
"Cargar más" llama a `fetchOlderMessages`, así que **paginar los adjuntos también enriquece el
chat**. Cubre solo el tramo cargado del hilo y **el pie del panel lo dice explícitamente** — sin
ese aviso el panel aparentaría cubrir todo el historial.

**Historial** — `ContactTimelineFeed` (de `@/modules/crm/public`) sobre
`GET /crm/contacts/{id}/timeline`: cursor opaco `{iso}_{id}`, `limit≤50`, chips toggle de las 5
fuentes. Los labels **no se construyen aquí**: el backend entrega `title` (entidad) y `subtitle`
(novedad) ya en español con estructura uniforme para toda fuente. Badge ✦IA cuando
`payload.created_by_type ?? payload.actor_type === "ai_agent"`.

**Refresco en vivo.** Como no hay `contact.updated`, el refresco lo disparan los eventos que sí
traen `contact_id` → `inbox.store#bumpContactContext(contactId)` incrementa
`contextVersion[contactId]`, que los paneles reciben como prop y usan para re-consultar. Adjuntos no
necesita nada: `conversation.message_created` ya inserta en el store y el panel es un selector.

### C.5 Piezas compartidas que introdujo este rail

Para no crear la cuarta copia de patrones existentes (`architecture.md` §12):

- **`shared/components/features/timeline/`** — `Timeline` + `TimelineSkeleton` + `AiBadge`. Única
  implementación del patrón; la consumen el 360 del contacto, la actividad del pedido y este rail.
- **`shared/components/features/field-list/`** — `FieldList` (`<dl>` etiqueta→valor, oculta vacíos).
- **`shared/components/ui/relative-date.tsx`** — promovido desde `modules/platform`.
- **`modules/crm/public.ts`** — superficie pública del slice CRM (`architecture.md` §3.3 regla 5).
  El inbox importa **solo** de ahí, nunca por ruta profunda.

### C.6 Pendientes (no bloqueantes)

- **Peticiones al backend:** evento `contact.updated` en `/inbox`, y un endpoint de adjuntos
  (`GET /conversations/{id}/attachments`) que evitaría paginar el hilo completo.
- Adjuntos de **todas** las conversaciones del contacto (requiere el endpoint anterior; el contrato
  del panel ya está preparado).
- Edición inline del contacto, etiquetas y responsable desde el inbox.
- UI del timeline de handoff (`GET /inbox/conversations/{id}/events`): tipado y con adapter, sin
  vista.
- Items futuros del rail (Pedidos, Oportunidades, Copiloto IA, Notas): el registry ya los admite.
- **Verificación visual pendiente**: el recorrido en navegador (light/dark, los tres breakpoints,
  foco con Tab, RBAC sin `crm:read`) no se ha ejecutado por falta de backend disponible.

### C.7 Verificación (rail)

```bash
npm run lint && npm test && npm run build
```

Suites propias del rail: `shared/components/features/{timeline,field-list}/__tests__`,
`modules/crm/ui/components/contact-detail/__tests__/ContactTimelineFeed.test.tsx`,
`modules/inbox/domain/__tests__/inbox.domain.test.ts` (predicados de adjunto),
`modules/inbox/ui/components/context-rail/panels/__tests__/AttachmentsPanel.test.tsx`.

Recorrido manual: abrir una conversación → los 3 iconos con tooltip a la izquierda → contrastar cada
panel → `?panel=history` en pestaña nueva → back cierra → 1400px / 1100px / 600px → light y dark →
rol sin `crm:read` (desaparece Historial y el panel Contacto pierde score/etiquetas/responsable).

---

## Parte D — Cabecera del chat

### D.1 Qué es

Una **única fila de 56px** (`h-14` + borde = 57px) que reúne identidad, contexto del contacto y
acciones. Antes eran dos filas que sumaban ~105px: identidad arriba y los botones de handoff en una
fila propia que reservaba 32px para uno o dos botones.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉  Cristian Velásquez  [Cliente][IA] 78 [VIP][+2]   👤 Isabel ▾ [Cerrar] ⋯  │
│    +57 300 123 4567 · WhatsApp Principal · esperando hace 12 min             │
└──────────────────────────────────────────────────────────────────────────────┘
   └── <Link ?panel=contact> ──┘ └─ chips, fuera del link ─┘  └── controles ──┘
```

**La altura es fija:** no cambia entre modos, ni cuando falta el permiso de handoff, ni cuando el
contacto no tiene etapa ni etiquetas. Lo que varía es qué controles se pintan.

### D.2 Estructura

```
ui/components/header/
├── ConversationHeader.tsx    # la fila
├── ConversationChips.tsx     # etapa, modo, estado, prioridad, score, etiquetas
├── HeaderOverflowMenu.tsx    # Popover de acciones secundarias
└── use-handoff-actions.tsx   # descriptores de acción + los dos modales
```

`use-handoff-actions` **sustituye al antiguo componente `HandoffActions.tsx`** (eliminado). El diseño
necesita una acción inline y el resto en el menú; mantener el componente habría obligado a duplicar
el estado de los dos modales o a abrir dos menús `⋯`. El hook devuelve descriptores y la cabecera
decide dónde va cada uno:

```ts
{ primary: HandoffActionDescriptor | null, secondary: HandoffActionDescriptor[],
  dialogs: React.ReactNode, busy: boolean }
```

Mapa de acciones (idéntico al de antes, con distinto reparto visual):

| `mode` | Destacada (inline) | En el `⋯` |
|---|---|---|
| `human_queued` | **Atender** (`claim`) | — |
| `ai_active` | **Intervenir** (`takeover`) | — |
| `human_active` | **Cerrar** (modal `resolved` + razón) | **Devolver a la IA** (modal con nota) |

> Cambio de énfasis respecto a la versión anterior: en `human_active` los dos botones tenían el mismo
> peso (`outline`). Ahora Cerrar es la destacada por ser el final natural del trabajo del operador, y
> Devolver a la IA pasa al menú.

Sin `conversations:claim` o con `status !== "open"` no hay ninguna transición legal: no se pinta
acción alguna, y la fila **no se descuadra** por ello.

### D.3 Selector de responsable

`ContactOwnerSelect` (de `@/modules/crm/public`) asigna el **responsable comercial del contacto**
vía `PATCH /crm/contacts/{id}/profile`. Es un atributo del **contacto**, no de la conversación:
persiste entre conversaciones, y el encabezado del popover lo dice explícitamente.

**No asigna la conversación a otro operador: eso no existe en el backend** (§D.6). "Quién atiende
ahora" lo comunican el badge de modo y el botón de acción.

Detalles: trigger `h-8` con avatar 20px (el nombre aparece desde `lg`; por debajo queda solo el
avatar, con el responsable en el `aria-label`); popover de ancho fijo `w-64` — heredar el ancho del
trigger daría una lista inservible; lista cargada **al abrir**, no al montar; búsqueda por nombre
**y correo**; cambio optimista con rollback y alerta si el PATCH falla; sin `crm:manage` queda
`disabled` mostrando el responsable actual, no desaparece.

### D.4 Presupuesto de chips

`DESIGN.md` §8 exige que la jerarquía la haga la tipografía y que no compitan dos acentos. Con seis
señales posibles en 56px, las reglas son:

| Señal | Cuándo | Forma | Visible desde |
|---|---|---|---|
| Etapa del contacto | si hay contacto | badge con `CONTACT_STAGE_BADGE_CLASSES` | siempre |
| Modo (IA · En cola · Humano) | siempre | badge `secondary` | `md` |
| Estado | solo `status !== "open"` | badge `outline` | `md` |
| Prioridad | **solo** `high`/`urgent` | badge `warning`/`destructive` | `lg` |
| Score del embudo | si hay profile | **texto** `tabular-nums` + tooltip | `lg` |
| Etiquetas | máx. 2 + `+N`, tooltip con todas | badge `outline` **gris** | `xl` |
| Espera | si el contacto espera respuesta | **texto** en la línea secundaria | siempre |

Las etiquetas van en gris aunque el tenant les asigne color: seis colores distintos junto a etapa y
prioridad rompen la regla de un solo acento. El color se conserva en el panel Contacto del rail.

Lo que no cabe **se oculta por ancho**; el juego completo está en el rail a un clic. El menú `⋯`
contiene **solo acciones** (las secundarias de handoff + copiar teléfono + ver ficha completa) — un
chip informativo dentro de un menú de acciones desorienta.

### D.5 Datos: un solo fetch compartido

La etapa, el score, las etiquetas y el responsable exigen las tres llamadas de `useContactContext`
(§C.4), que el panel Contacto del rail **también** necesita. Para no pedirlas dos veces:

`inbox/infrastructure/stores/contact-context.context.tsx`
```tsx
<ContactContextProvider contactId version>   // monta useContactContext 1× en InboxView
useConversationContact(): ContactContext      // lo consumen la cabecera y el rail
```

`InboxView` suscribe **primitivos** (`contactId`, `contextVersion`) al store, no el objeto
`selected`, para no re-renderizar la vista completa en cada actualización de la conversación.

Al cambiar el responsable, la cabecera llama a `bumpContactContext(contactId)` para invalidar el
contexto compartido: cabecera y rail ven el nuevo valor sin recargar.

Derivaciones puras en `domain/inbox.ts` (con tests): `isAwaitingReply`, `waitingSince` — devuelve el
ISO crudo porque `domain/` no importa utilidades de `core/lib` (§3.3 regla 1) — y
`isNotablePriority`.

### D.6 Lo que el backend NO permite (peticiones abiertas)

Verificado sobre `openapi.json` y los controllers/gateway:

| Acción | Estado |
|---|---|
| **Asignar/reasignar la conversación a otro usuario** | **No existe.** `claim`/`takeover` no aceptan body (`inbox.controller.ts:87,98`) y el dueño sale del token (`conversation_mode.ts:74,85`). El permiso `conversations:manage` —*"Reasignar conversaciones ajenas y cambiar prioridad"*, `security.seeder.ts:31-34`— está sembrado y **sin un solo consumidor en el código**. |
| **Soltar a la cola** sin devolver a la IA | No existe. `escalate` produce ese estado pero no está expuesto (solo el pipeline y la tool IA). Un operador no puede liberar una conversación que tomó por error. |
| **Cambiar prioridad** | No existe. Solo escribe el sweep de SLA (`normal → high`). `priority_changed` es **enum sin productor**. |
| **Snooze** | No existe, y **no hay columna** `snoozed_until` en el schema: `status='snoozed'` es inalcanzable. Requiere migración. |
| **Reabrir** cerradas | No existe; la máquina de estados es terminal (`409 invalid_transition`). `reopened` es enum sin productor. |
| **Nota interna** en el timeline del inbox | Solo como efecto colateral de `return_to_ai`, y esa nota la lee la IA (`for_ai_history: true`): no es privada. |
| **`assigned_user` hidratado** en `ConversationDto` | Llega solo el uuid; hay que cruzar con `GET /users`. |

Fuera de alcance por decisión de producto, todos construibles con datos ya disponibles: aviso de la
**ventana de 24 h** de WhatsApp (derivable de `last_inbound_at`; hoy el operador descubre que venció
al enviar y recibir `channels/outside_service_window`), icono del proveedor del canal, y costo IA de
la conversación (`GET /usage/conversations/{id}`).

### D.7 Verificación (cabecera)

Suites: `inbox/domain/__tests__/inbox.domain.test.ts` (derivaciones),
`inbox/ui/components/header/__tests__/use-handoff-actions.test.tsx`,
`crm/ui/components/contact-detail/__tests__/ContactOwnerSelect.test.tsx`.

> `jest.setup.ts` incorpora polyfills de `ResizeObserver`, `DOMRect` y los métodos de puntero que
> jsdom no implementa: sin ellos **cualquier** test que abra un primitivo de Radix con posicionado
> (Popover, Select, Tooltip) falla con `ResizeObserver is not defined`.

Manual: los tres modos; medir que la altura sigue siendo 57px al alternar de modo y sin
`conversations:claim`; buscar por nombre y por correo en el selector, asignar, quitar y forzar un
fallo para ver el rollback; contacto sin etapa ni etiquetas (sin huecos); conversación `urgent`;
anchos 1400/1100/800/600; light y dark; recorrido con Tab comprobando que el `<Link>` de identidad no
atrapa los controles de la derecha.
