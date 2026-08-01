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
        ├── InboxList.tsx  ConversationPanel.tsx  HandoffActions.tsx  MessageBubble.tsx
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

### C.7 Verificación

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
