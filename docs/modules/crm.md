# Módulo CRM — Gestión comercial (contactos · pipeline · tareas · segmentos)

> **Doc del módulo (base de conocimiento para el agente ejecutor).** Parte A: contrato del
> backend (REST + WS) que consume este slice — YA implementado y estable en `axi-server`
> (fases C0–C11). Parte B: plan de implementación frontend por fases (F0–F7), con archivos
> y QA por fase.
>
> **Estado (2026-07-28): NO IMPLEMENTADO en el cliente** — no existe `src/modules/crm` ni
> ruta `/crm`. Este documento es autocontenido: no se necesita contexto previo.
>
> Documentos rectores: `docs/architecture.md` (§3.2 anatomía de slice, §3.3 dependencias,
> §5 naming, §6 enrutamiento/overlays, §16 checklist), `docs/design/DESIGN.md` §3.1,
> `docs/design/DESIGN-SYSTEM.md` (§4.2 contenedor, §11 checklist light/dark),
> `docs/design/LOADING.md` y, del backend, `axi-server/docs/plans/crm_implementation.md`
> (decisiones D0–D21) + `axi-server/docs/rules/architecture.md` §6.2 crm_.
>
> Concepto de producto: **modelo unificado estilo HubSpot** — NO hay entidad "lead". Un
> lead es un contacto con `lifecycle_stage=lead`; lo comercial (score, owner, deals,
> actividades) vive en el CRM. La "vista de leads" = listado de contactos filtrado por
> etapa + score. La IA del inbox ya crea deals/notas/tareas sola (tools `open_deal`,
> `log_crm_activity`, `schedule_follow_up`): el CRM debe reflejarlos en vivo.

---

## Parte A — Contrato del backend

### A.1 REST (`/api/v1`, tipos generados en `core/api/schema.d.ts`)

El spec ya incluye todo el CRM: **regenerar tipos con `npm run api:types` es el paso 0**.
Propiedades wire en `snake_case`. Listas offset `{ data, meta: {total, page, page_size} }`
(default 25, máx 100); el timeline usa cursor. Dinero SIEMPRE en `*_cents` + `currency`
(formatear con `formatMoney` de `core/lib/format.ts`, locale es-CO).

**Contacts (ampliado por el CRM)**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET | `/contacts` | `contacts:read` | Filtros: `q`, `lifecycle_stage`, `source`, `city`, `tag_id`, `min_score`, `owner_user_id`, `created_after/before`, `sort=created_at\|score` |
| POST | `/contacts` | `contacts:manage` | Alta manual (`source: manual`). Duplicado → 409 `contacts/duplicate_identity` (sin id en el body: resolver con `GET /contacts?q=<phone\|email>`) |
| GET | `/contacts/stats` | `contacts:read` | Ya consumido por dashboard (`ContactStatsDto`) |
| GET | `/contacts/duplicates` | `contacts:read` | Pares sugeridos `{contact_a_id, contact_b_id, a_name, b_name, reason: email_exact\|similar_name, confidence 0-1}` (máx 50, determinista — sin IA) |
| GET/PATCH | `/contacts/:id` | read / manage | `UpdateContactDto` permite `lifecycle_stage` y `custom_fields` |
| DELETE | `/contacts/:id` | `contacts:manage` | Soft delete (conversaciones/pedidos sobreviven) |
| POST | `/contacts/:id/merge` | `contacts:manage` | Body `{source_contact_id}`. `:id` = ganador; el perdedor desaparece (todo reasignado). **Irreversible**. 422 `contacts/merge_self` |

**Pipelines y etapas**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET | `/crm/pipelines` | `crm:read` | Lista con `stages[]` ordenadas. **El primer GET del tenant crea el pipeline default** (Nuevo 10% · Contactado 25% · Propuesta 50% · Negociación 75%) — el board nunca está vacío de columnas |
| POST | `/crm/pipelines` | `crm:manage` | `{name, position?, stages?[{name, probability_pct, color?}]}`; 409 `crm/pipeline_name_taken` |
| GET/PATCH/DELETE | `/crm/pipelines/:id` | read / manage | PATCH admite `is_default: true` (mueve el default). DELETE con deals open → 409 `crm/pipeline_in_use`; reintentar con `?move_to_pipeline_id=` |
| POST | `/crm/pipelines/:id/stages` | `crm:manage` | Etapa nueva al final. Campos: `name, probability_pct (0-100), color? (#RRGGBB), rotting_days? (1-365)` |
| PUT | `/crm/pipelines/:id/stages/reorder` | `crm:manage` | `{stage_ids: [...]}` — lista COMPLETA; 422 `crm/stage_reorder_mismatch` |
| PATCH/DELETE | `/crm/pipelines/:id/stages/:stage_id` | `crm:manage` | DELETE con deals → 409 `crm/stage_in_use` (+ `?move_to_stage_id=`); última etapa → 409 `crm/stage_last_protected` |
| GET | `/crm/pipelines/:id/board` | `crm:read` | Kanban: `{pipeline_id, pipeline_name, columns[{stage{...rotting_days}, total_count, total_value_cents, deals[≤25]}]}`. "Cargar más" de una columna = `GET /crm/deals?stage_id=&page=` |

**Deals**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET | `/crm/deals` | `crm:read` | Filtros `pipeline_id, stage_id, status, owner_user_id, contact_id, q`; `sort=stage_entered_at\|value_cents\|expected_close_date`. `DealDto` incluye `contact{id, full_name, phone, avatar_url}` y `stage{id, name, color, probability_pct}` |
| GET | `/crm/deals/stats` | `crm:read` | `period=today\|7d\|30d\|90d` (+ `pipeline_id?`): `open_count, open_value_cents, weighted_forecast_cents, won_count, won_value_cents, lost_count, win_rate_pct, avg_cycle_days, currency` |
| POST | `/crm/deals` | `crm:read` | `{contact_id, title, pipeline_id?, stage_id?, value_cents?, expected_close_date?, owner_user_id?, conversation_id?, notes?}`. 409 `crm/deal_already_open` si la conversación ya tiene deal open |
| GET/PATCH/DELETE | `/crm/deals/:id` | read / read (DELETE: manage) | PATCH: `title, value_cents, expected_close_date, owner_user_id, notes` |
| POST | `/crm/deals/:id/move` | `crm:read` | `{stage_id}` (misma pipeline). Resetea el reloj de estancamiento |
| POST | `/crm/deals/:id/win` | `crm:read` | `{value_cents?}` (ajuste final). Promueve el contacto a `customer` (server-side) |
| POST | `/crm/deals/:id/lose` | `crm:read` | `{reason?}` |
| POST | `/crm/deals/:id/reopen` | `crm:read` | won/lost → open. Transición ilegal → 409 `crm/invalid_deal_transition` |
| GET | `/crm/deals/:id/events` | `crm:read` | Timeline asc, sin paginar: `{type, actor_type, actor_user_id, actor_name, payload, created_at}` |

**Máquina de estados** (espejo en `domain/deal-state.ts`; el backend SIEMPRE revalida):
`open ─win→ won`, `open ─lose→ lost`, `won|lost ─reopen→ open`. Won/lost son **status**,
NO etapas: el kanban solo muestra deals `open`; won/lost viven en la tabla/filtros y stats.
El drag del kanban SOLO cambia `stage_id` vía `move` — win/lose van por menú ⋮/detalle.

**Actividades y tareas**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET/POST | `/crm/activities` | `crm:read` | Filtros `contact_id, deal_id, kind`. POST: `{contact_id, kind: note\|call\|meeting\|task, title?, body?, deal_id?, occurred_at?}` + solo task: `due_at` (obligatorio), `assigned_user_id?` |
| PATCH/DELETE | `/crm/activities/:id` | read / manage | El `kind` no se edita |
| GET | `/crm/tasks` | `crm:read` | `assignee=me\|unassigned\|{user_id}`, `status=open\|completed\|cancelled`, `due=overdue\|today\|week`; orden `due_at asc` |
| GET | `/crm/tasks/stats` | `crm:read` | Del solicitante: `{open, overdue, due_today, unassigned}` |
| POST | `/crm/tasks/:id/complete\|reopen\|cancel` | `crm:read` | Idempotentes. Sobre una nota → 409 `crm/not_a_task` |

**Contacto 360**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET | `/crm/contacts/:contact_id/timeline` | `crm:read` | `sources=activities,deals,orders,conversations,appointments` (CSV), `cursor`, `limit≤50`. Respuesta `{data[{id, source, type, occurred_at, title, payload}], next_cursor}` — cursor opaco `{iso}_{id}`, orden desc |
| GET/PATCH | `/crm/contacts/:contact_id/profile` | read / **manage** | `{score (0-100, read-only), score_signals (breakdown), owner_user_id, last_activity_at}`. PATCH: `{owner_user_id}`. Get lazy: siempre hay profile |
| GET/PUT | `/crm/contacts/:contact_id/tags` | `crm:read` | PUT `{tag_ids[]}` = replace-set |

Señales del score (pesos default, cap 100 — mostrar el breakdown tal cual):
`engaged_conversation` 30 · `sales_intent` 20 · `has_order` 20 · `open_deal` 20 · `appointment` 15.

**Tags y segmentos**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| GET/POST | `/crm/tags` | read / manage | Tag: `{name ≤40, color? #RRGGBB, contact_count}`; 409 `crm/tag_name_taken` |
| PATCH/DELETE | `/crm/tags/:id` | `crm:manage` | Hard delete (limpia joins) |
| GET/POST | `/crm/segments` | read / manage | Segmento: `{name, description?, filters}`; 409 `crm/segment_name_taken` |
| GET/PATCH/DELETE | `/crm/segments/:id` | read / manage | |
| GET | `/crm/segments/:id/contacts` | `crm:read` | Ejecuta el DSL, paginado |

DSL de `filters` (claves EXACTAS del zod backend — el builder del frontend debe emitirlas):
`lifecycle_stage[]`, `source[]`, `tag_ids {any?: uuid[], all?: uuid[]}`, `city`, `q`,
`min_score (0-100)`, `created_after/created_before (ISO)`, `has_open_deal (bool)`,
`last_activity_before (ISO — "contactos fríos", incluye sin actividad)`. Claves extrañas → 400.

**Import / Export**

| Método | Path | Permiso | Propósito |
|---|---|---|---|
| POST | `/crm/imports` | `contacts:import` | Multipart: `file` (CSV ≤10 MB, ≤20k filas) + fields `on_duplicate=skip\|update`, `tag_ids` (uuids separados por coma), `lifecycle_stage?`. Devuelve el job (`status: pending`) — el procesamiento es async |
| GET | `/crm/imports` · `/crm/imports/:id` | `contacts:import` | Reporte: `{status, total_rows, created_count, updated_count, skipped_count, error_count, errors[≤100 {row, field?, message}]}` |
| GET | `/crm/exports/contacts` | `contacts:export` | CSV streaming (BOM UTF-8, cap 50k). Query: `segment_id` O `filters` (DSL como JSON string). **Auditado** — avisarlo en la UI |

Columnas CSV reconocidas en el import (headers, alias es/en): `nombre/name/full_name`,
`first_name`, `apellido/last_name`, `telefono/celular/phone` (normaliza a E.164, `3XXXXXXXXX`
→ `+57...`), `correo/email`, `ciudad/city`, `direccion/address`. Errores: `crm/import_missing_file`
400, `crm/import_invalid_file` 422, `crm/import_too_large` 422.

**Copiloto IA (on-demand — cada llamada consume tokens del tenant)**

| Método | Path | Permiso | Respuesta |
|---|---|---|---|
| POST | `/crm/contacts/:contact_id/ai/summary` | `crm:copilot` | `{summary, highlights[], cached}` |
| POST | `/crm/contacts/:contact_id/ai/next-best-action` | `crm:copilot` | `{action, rationale, urgency: low\|medium\|high, cached}` |
| POST | `/crm/contacts/:contact_id/ai/draft-followup` | `crm:copilot` | `{message, cached}` — borrador WhatsApp para copiar al inbox |
| POST | `/crm/pipelines/:pipeline_id/ai/summary` | `crm:copilot` | `{summary, risks[], opportunities[], cached}` |

Throttle 10/min/tenant (429 con `Retry-After`) + posible 429 `usage/limit_exceeded` (límite
de tokens del tenant). `cached: true` = respuesta de cache (TTL 10 min, no costó tokens).

### A.2 WebSocket (namespace `/inbox`, room `company_{id}` automático)

Payload base de `crm.deal_*`: `{company_id, deal_id, contact_id, pipeline_id, stage_id,
title, status, value_cents, currency, owner_user_id, conversation_id?, order_id?, source,
created_by_type}`.

| Evento | Cuándo | Extra |
|---|---|---|
| `crm.deal_created` | manual, tool IA `open_deal` o automatización order→deal | `source: manual\|ai_conversation\|automation\|import` |
| `crm.deal_updated` | PATCH / reopen | |
| `crm.deal_stage_changed` | move (kanban) | `from_stage_id` |
| `crm.deal_won` / `crm.deal_lost` | win/lose manual o auto-won (pedido pagado) | lost: `lost_reason` |
| `crm.deal_stalled` | sweep horario: deal sin moverse > rotting_days | `stalled_days` |
| `crm.activity_created` | actividad/tarea nueva (operador o IA) | payload de actividad (`kind, title, due_at, assigned_user_id...`) |
| `crm.task_completed` | complete | |
| `crm.import_completed` | fin del import CSV (éxito o fallo) | contadores del reporte |
| `contact.lifecycle_changed` | promoción prospect→lead→customer | ya tipado en `core/realtime/events.ts` |
| `contact.merged` | merge de duplicados | `{contact_id, merged_contact_id}` — quitar al perdedor de listados |

`crm.deal_*` llegan también al room `conversation_{id}` si el deal nació de una conversación.
**`crm.task_due` NO viaja por WS** — llega solo como `notification.created` (campanita).
Tipos nuevos de `notification.created`: `crm.deal_created`, `crm.deal_won`, `crm.deal_stalled`,
`crm.task_assigned`, `crm.task_due`, `crm.import_completed`.

### A.3 Permisos y navegación

| Permiso | Habilita | Roles seed |
|---|---|---|
| `crm:read` | Ver todo el CRM + operar deals/tareas propias + PUT tags de contacto | owner, admin, supervisor, operator |
| `crm:manage` | Config (pipelines/etapas/tags/segmentos), DELETE, reasignar owner/ajenos | owner, admin, supervisor |
| `crm:copilot` | Endpoints `ai/*` (queman tokens) | owner, admin, supervisor, operator |
| `contacts:import` / `contacts:export` | Import CSV / Export CSV | owner, admin (export tb. supervisor) |

`GET /me/navigation` ya emite el ítem `{code: 'crm', name: 'CRM', path: '/crm', icon:
'target', required_permission_code: 'crm:read'}`. El cliente hoy NO lo pinta: falta mapear
el icono y el path (F0). El ítem `contacts` (path `/contacts`) sigue existiendo en el
backend → se resuelve con alias a `/crm/contacts`.

---

## Parte B — Plan de implementación (F0–F7)

### B.1 Diseño y navegación

Sección **full-bleed `/crm`** (patrón workspace/orders: `h-[calc(100svh-52px)]`) con
**sub-navegación propia** (patrón `CatalogNav` — `src/modules/catalog/ui/components/CatalogNav.tsx`):

`Contactos · Pipeline · Tareas · Configuración`

- Acentos/tonos según `DESIGN §3.1`; glass SOLO en superficies flotantes; presets de
  `core/styles/motion.ts` (jamás curvas ad-hoc) y todo bajo `useReducedMotion`.
- Toda ruta nueva lleva `loading.tsx` (jerarquía de `docs/design/LOADING.md`:
  `TableSkeleton` para listas, `FormSkeleton` para forms).
- Colores de etapa (`stage.color`) y de tag: pintar como acento de borde/badge, nunca como
  fondo saturado (checklist light/dark `DESIGN-SYSTEM §11`).

### B.2 Estructura objetivo del slice

```
src/modules/crm/
├── domain/
│   ├── contact.ts          # ContactDTO/Row + mapContactToRow + CONTACT_SOURCE_LABELS
│   ├── deal.ts             # DealDTO/Row + mappers + formatMoney reuse
│   ├── deal-state.ts       # DEAL_TRANSITIONS, canTransition(), isTerminal(),
│   │                       #   KANBAN: columnas = stages dinámicas (no enum fijo)
│   ├── activity.ts         # ActivityDTO/Row + ACTIVITY_KIND_LABELS/TASK_STATUS_LABELS
│   ├── segment.ts          # SegmentFilters (espejo del DSL zod) + builders
│   └── enums.ts            # labels ES centralizados (reusar CONTACT_STAGE_LABELS
│                           #   de modules/dashboard/domain/dashboard.ts — mover aquí
│                           #   y re-exportar, NO duplicar)
├── infrastructure/
│   ├── services/           # un adapter por recurso, singleton `http` (§7.1):
│   │   ├── contacts-service.adapter.ts    # + duplicates + merge + profile + tags
│   │   ├── pipelines-service.adapter.ts   # + board + stages + reorder
│   │   ├── deals-service.adapter.ts       # + move/win/lose/reopen + stats + events
│   │   ├── activities-service.adapter.ts  # + tasks + complete/reopen/cancel
│   │   ├── segments-service.adapter.ts    # + tags CRUD + segment contacts
│   │   ├── imports-service.adapter.ts     # multipart FormData + polling
│   │   └── copilot-service.adapter.ts
│   ├── stores/
│   │   ├── board.store.ts  # Zustand normalizado: dealsById + columns{stage_id→{ids,
│   │   │                   #   total, total_value_cents}}, moveId(), transition()
│   │   │                   #   optimista con ROLLBACK, reducers WS, highlightId,
│   │   │                   #   realtimeVersion — ESPEJO de orders.store.ts
│   │   └── tasks.store.ts  # bandeja + stats + reducers WS
│   └── realtime/
│       └── use-crm-socket.ts   # useSocket('/inbox') + useSocketEvent por evento crm.*
└── ui/
    ├── CrmNav.tsx              # sub-nav (patrón CatalogNav)
    ├── components/
    │   ├── kanban/             # PipelineBoard, StageColumn, DealCard,
    │   │   │                   #   WinLoseDialog, StalledBadge (⚠ si stalled)
    │   ├── contact-detail/     # Contact360, ScorePanel (ScoreRing + breakdown),
    │   │   │                   #   ContactTimeline, TagsEditor, MergeDialog,
    │   │   │                   #   CopilotPanel (F7)
    │   ├── DealDetailRail.tsx  # patrón OrderDetailRail
    │   └── DealStatsTiles.tsx  # patrón OrderStatsTiles (forecast, win rate)
    ├── tables/                 # config/ + .actions.tsx (contactos, deals, tareas,
    │                           #   imports, duplicados)
    └── forms/                  # config/ (contact, deal, activity/task, tag, segment,
                                #   pipeline/stage) — RHF + zod + DynamicForm

src/app/(private)/crm/
├── layout.tsx                  # client, full-bleed + CrmNav + slot {sheet}
├── @sheet/default.tsx
├── page.tsx                    # redirect a /crm/pipeline
├── contacts/
│   ├── page.tsx                # lista (DataTable + usePaginatedList)
│   ├── loading.tsx
│   ├── duplicates/page.tsx     # F2
│   └── [contactId]/page.tsx    # 360 (página-hub, patrón catalog/products/[id])
├── pipeline/
│   ├── page.tsx                # board kanban
│   ├── @sheet/(.)deal/[dealId]/page.tsx   # rail interceptado (patrón orders)
│   └── deal/[dealId]/page.tsx  # hard nav
├── tasks/page.tsx
└── settings/
    ├── pipelines/page.tsx      # editor etapas (reorder dnd)
    ├── tags/page.tsx
    ├── segments/page.tsx       # builder DSL + preview
    └── imports/page.tsx        # wizard + historial
```

**Transversales tocados**: `core/lib/icons.ts` (+`target`), `core/config/routes.ts`
(alias), `core/realtime/events.ts` (tipos `crm.*`), `core/lib/error-messages.ts`
(diccionario `crm/*` + `contacts/duplicate_identity|merge_self`),
`modules/notifications/domain/notification-target.ts` (deep-links de tipos `crm.*`).

**Reutilizar (NO reimplementar)**: `DataTable` (`shared/components/features/data-table`),
`usePaginatedList` (`shared/api/use-paginated-list.ts`), `DynamicForm`, `DetailSheet`,
`MultiSelect`, `Modal`/`AlertProvider`, `BasicPagination`, `toCsv/downloadCsv`
(`core/lib/csv.ts` — para el export usar el endpoint del backend, no CSV local),
`relative-time.ts`, `formatMoney`. El kanban de orders
(`modules/orders/ui/components/kanban/*` + `orders.store.ts`) es la **referencia de
implementación** (@dnd-kit ya instalado): copiar el enfoque, no importar cross-slice.
Timeline visual: patrón `OrderTimeline.tsx` (ol + línea + badges tonales + `visualFor()`).

### B.3 Decisiones clave

- **Kanban con columnas dinámicas**: a diferencia de orders (7 estados fijos), las columnas
  son las `stages` del pipeline seleccionado. `DRAG_ACTIONS` no aplica: cualquier columna →
  cualquier columna es válido (`POST :id/move`); win/lose SOLO por menú ⋮/dialog (nunca
  columnas fantasma "Ganado/Perdido" — son status, ver A.1).
- **Store normalizado + optimista con rollback** (espejo `orders.store.ts` §B.3 de
  orders.md): mover tarjeta = mover un id entre columnas + ajustar `total_value_cents`;
  si `move` falla (409) se revierte y se muestra `errorMessage(err)`.
- **Realtime**: reducers WS con dedupe por id; eventos de otros usuarios/IA → chip
  "N nuevos" (patrón `realtimeVersion`); `highlightId` 2.5 s al aterrizar un deal nuevo.
  Los `crm.deal_*` sin el deal completo → re-fetch puntual de `GET /crm/deals/:id`.
- **El detalle 360 es página-hub** (patrón `catalog/products/[id]`): secciones
  independientes (datos, score, tags, timeline, deals abiertos, copiloto), breadcrumb de
  vuelta. El detalle de DEAL sí es rail interceptado (uso rápido desde el board).
- **Timeline con cursor**: botón "Cargar más" que pasa `next_cursor`; filtro de fuentes
  como chips toggle (`sources=`).
- **Permisos como UX** (`hasPermission` de `useAuth` — el backend valida siempre):
  `crm:manage` gatea Configuración completa, DELETE y reasignar owner; `crm:copilot`
  gatea el panel IA; `contacts:import|export` gatean sus botones.
- **Merge**: diálogo comparativo lado a lado (ganador ← perdedor) con aviso IRREVERSIBLE
  + `Modal` de confirmación con nombre tipeado. Tras 204/200, invalidar listas y navegar
  al ganador.
- **Copiloto**: cada botón muestra costo implícito ("usa IA"); respuesta con badge
  `cached` y botón Regenerar (deshabilitado si `cached: false` reciente); 429 → toast con
  `Retry-After`; el draft-followup con copy-to-clipboard.
- **Preferencias**: `axi:crm:view` (`board|table`), `axi:crm:pipeline` (último pipeline),
  en localStorage hidratadas post-mount (patrón orders).
- **CustomEvents** `crm:contact:edit:open`, `crm:deal:detail:refresh`, `crm:*:success`
  (convención `familia:acción:estado`) para tabla↔modal.
- **Errores SIEMPRE por `code`** (`HttpError.is()`), nunca por texto.

### B.4 Fases (un PR por fase)

**F0 — Transversales (desbloquea todo)**
- `npm run api:types` (el spec del backend ya trae el CRM) + `npm run api:types:check`.
- `src/core/lib/icons.ts`: importar `Target` de lucide y añadir `target: Target`.
- `src/core/config/routes.ts`: quitar `"/contacts"` de `UNIMPLEMENTED_NAV_PATHS`; añadir
  `NAV_PATH_ALIASES["/contacts"] = "/crm/contacts"` (el ítem `contacts` del sidebar
  backend apunta al CRM; el ítem `crm` resuelve directo).
- `src/core/realtime/events.ts`: tipar los 10 eventos `crm.*`/`contact.merged` en
  `InboxServerEvents`.
- `src/core/lib/error-messages.ts`: diccionario ES para `crm/*` (los 15 códigos de A.1)
  y `contacts/duplicate_identity`, `contacts/merge_self`.
- `src/modules/notifications/domain/notification-target.ts`: deep-links — `crm.deal_*` →
  `/crm/pipeline/deal/{deal_id}`, `crm.task_*` → `/crm/tasks`, `crm.import_completed` →
  `/crm/settings/imports`.
- **Archivos**: los 5 anteriores. **QA**: sidebar muestra "CRM" con icono; `npx tsc --noEmit`.

**F1 — Contactos (lista + CRUD)**
- `/crm/contacts`: `DataTable` + `usePaginatedList` (searchField `q`), filtros
  (lifecycle_stage, tag, min_score slider, source, city) + `sort=score`, columnas con
  Avatar + badge de etapa (labels de `CONTACT_STAGE_LABELS`) + score + tags.
- Crear/editar: modal por ruta interceptada `@form/(.)create` (patrón
  `settings/quick-actions`), `DynamicForm` con config `contact.config.tsx`
  (`applyServerValidation` para el 409 de duplicado, ofreciendo link al existente).
- Delete con `Modal` de confirmación.
- **Archivos**: `modules/crm/domain/contact.ts`, `infrastructure/services/contacts-service.adapter.ts`,
  `ui/tables/config/contacts.config.tsx` + `.actions.tsx`, `ui/forms/config/contact.config.tsx`,
  `app/(private)/crm/{layout,page}.tsx`, `contacts/page.tsx` + `@form/*` + `loading.tsx`,
  `ui/CrmNav.tsx`.
- **QA**: crear → aparece; duplicar phone → error inline con link; filtros combinados;
  eliminar → desaparece; `/contacts` (sidebar viejo) aterriza en `/crm/contacts`.

**F2 — Contacto 360 + duplicados/merge**
- `/crm/contacts/[id]`: hub con — datos (edición inline por sección), `ScorePanel`
  (score 0-100 + chips de señales activas desde `score_signals` con sus pesos), owner
  (select de users, PATCH profile, gate `crm:manage`), `TagsEditor` (`MultiSelect` +
  PUT replace-set), identidades de canal (read-only con icono por canal), deals del
  contacto (`GET /crm/deals?contact_id=`), `ContactTimeline` (fuentes toggle + cursor
  "Cargar más", visual patrón `OrderTimeline`), botón "Nueva actividad/tarea".
- `/crm/contacts/duplicates`: tabla de pares con confidence + razón; acción "Fusionar" →
  `MergeDialog` comparativo.
- **Archivos**: `ui/components/contact-detail/*`, `contacts/[contactId]/page.tsx`,
  `contacts/duplicates/page.tsx`, ampliación del adapter.
- **QA**: score refleja señales tras crear deal; merge reasigna todo y el perdedor da 404;
  timeline pagina sin duplicados; `contact.merged` WS quita al perdedor de la lista.

**F3 — Pipeline (kanban + deals)**
- `/crm/pipeline`: selector de pipeline (persistido), `DealStatsTiles` (forecast ponderado,
  win rate, open value — period selector), board dnd-kit (Pointer distance 6 + Touch
  delay 180 + Keyboard; `DragOverlay` rotado 2°), columnas con header
  `nombre · count · $valor` y badge ⚠ en deals con `stalled_notified_at`/evento stalled,
  "Cargar más" por columna, conmutador ⊞/☰ (tabla con `DataTable` + filtros status).
- `DealDetailRail` (interceptado): datos + contacto (link al 360) + timeline
  (`/deals/:id/events` con `visualFor` por tipo) + acciones win/lose/reopen (dialogs) +
  PATCH inline de valor/fecha/owner + link a la conversación de origen si existe.
- `use-crm-socket.ts` + `board.store.ts` (reducers para los 6 `crm.deal_*`).
- **Archivos**: `domain/deal.ts`, `deal-state.ts` (+ test unit patrón
  `orders/domain/__tests__/order-state.test.ts`), `stores/board.store.ts` (+ test),
  `ui/components/kanban/*`, `DealDetailRail.tsx`, `pipeline/**`, adapter deals/pipelines.
- **QA**: drag mueve y el 409 revierte; win desde ⋮ actualiza stats y el contacto pasa a
  customer; deal creado por la IA en el inbox aparece en vivo con chip; teclado mueve
  tarjetas (a11y).

**F4 — Tareas**
- `/crm/tasks`: chips de stats (`open/overdue/due_today/unassigned`), tabs
  Mis tareas · Sin asignar · Todas, filtros due, `DataTable` con due_at relativo
  (`relative-time.ts`, rojo si overdue), acciones complete/reopen/cancel (optimistas),
  form de tarea (desde aquí, desde el 360 y desde el rail del deal — mismo
  `activity.config.tsx` con `isVisible` por kind).
- **Archivos**: `domain/activity.ts`, `stores/tasks.store.ts`, `tasks/page.tsx`,
  `ui/tables/config/tasks.config.tsx`, `ui/forms/config/activity.config.tsx`.
- **QA**: tarea vencida llega como campanita (backend sweep 5 min) y aparece en overdue;
  completar 2 veces = no-op; `crm.activity_created` de la IA refresca la bandeja.

**F5 — Configuración (pipelines · tags · segmentos)**
- `/crm/settings/pipelines`: lista + editor de etapas por pipeline — reorder con dnd
  (PUT reorder con la lista completa), edición inline (nombre, probability slider, color
  picker hex, rotting_days), añadir/borrar etapa (delete con select `move_to_stage_id`
  cuando el 409 lo exige), crear pipeline, marcar default.
- `/crm/settings/tags`: CRUD simple con contador de contactos.
- `/crm/settings/segments`: builder del DSL (selects/MultiSelect por clave, SOLO las
  claves de A.1) + preview en vivo (`GET :id/contacts` o listado local pre-guardado) +
  botón Exportar (F6).
- Todo gateado por `crm:manage`.
- **Archivos**: `settings/**`, `ui/forms/config/{pipeline,stage,tag,segment}.config.tsx`,
  `domain/segment.ts`.
- **QA**: reorder persiste tras reload; borrar etapa con deals exige destino; segmento
  "leads calientes" (lifecycle=lead + min_score 50) lista lo esperado.

**F6 — Import / Export**
- `/crm/settings/imports`: wizard — dropzone CSV (validar extensión/peso client-side) →
  opciones (`on_duplicate` radio, tags MultiSelect, lifecycle select) → POST multipart
  (FormData vía `http`) → vista del job con polling cada 2 s + `crm.import_completed` WS
  → reporte (tiles de contadores + tabla de errores por fila). Historial de imports.
- Export: botón en segmentos y en la lista de contactos (con filtros activos serializados
  al DSL) → descarga directa del endpoint (link con `Content-Disposition`); toast "esta
  exportación queda auditada".
- **Archivos**: `imports-service.adapter.ts`, `settings/imports/page.tsx`,
  `ui/components/ImportWizard.tsx`, botón export en `segments/page.tsx` y
  `contacts/page.tsx`.
- **QA**: CSV con fila mala reporta el row exacto; `on_duplicate=update` actualiza city;
  export abre CSV legible en Excel (BOM).

**F7 — Copiloto IA**
- `CopilotPanel` en el 360: tres acciones (Resumen · Siguiente acción · Borrador de
  seguimiento) con skeleton mientras genera, badge `cached`, urgencia con tono
  (low/medium/high), copy-to-clipboard del borrador.
- Board: botón "Resumen del pipeline" (modal con summary/risks/opportunities).
- Gates: `crm:copilot`; 429 → toast con countdown de `Retry-After`; `usage/limit_exceeded`
  → mensaje "límite de IA del plan alcanzado".
- **Archivos**: `copilot-service.adapter.ts`, `ui/components/contact-detail/CopilotPanel.tsx`,
  botón en `PipelineBoard`.
- **QA**: segunda llamada inmediata devuelve `cached: true` sin latencia; usuario operator
  ve el panel; usuario sin `crm:copilot` no lo ve.

### B.5 Mockups de referencia

```
┌─ /crm/pipeline — Kanban ─────────────────────────────────────────────────────────────┐
│ CRM   Contactos │ Pipeline │ Tareas │ Configuración          [Ventas ▾] [30d ▾] ⊞ ☰ │
│ ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐                          │
│ │Forecast  │ │Abiertos    │ │Ganados 30d│ │Win rate      │        [+ Nuevo deal]    │
│ │$ 4.2M    │ │12 · $ 8.1M │ │5 · $ 3.4M │ │62% · 6.5 días│        [✦ Resumen IA]    │
│ └──────────┘ └────────────┘ └───────────┘ └──────────────┘                          │
│ ┌ Nuevo 10% ── 4 · $1.2M ┐ ┌ Contactado 25% ─ 3 ┐ ┌ Propuesta 50% ── 3 ┐ ┌ Negoc… ┐│
│ │ ┌────────────────────┐ │ │ ┌────────────────┐ │ │ ┌────────────────┐ │ │        ││
│ │ │ Plan anual x2 sedes│ │ │ │ Pedido #14  ✦IA│ │ │ │ Combo eventos ⚠│ │ │  ···   ││
│ │ │ ◉ Carlos C. · 350k │ │ │ │ ◉ Diana · 120k │ │ │ │ 9 días quieto  │ │ │        ││
│ │ │ hace 2 h        ⋮ │ │ │ │ ayer        ⋮ │ │ │ │ ◉ Hotel Luz  ⋮ │ │ │        ││
│ │ └────────────────────┘ │ │ └────────────────┘ │ │ └────────────────┘ │ │        ││
│ │  [Cargar más]          │ │                    │ │ ⋮ → Ganado / Perdido│ │        ││
│ └────────────────────────┘ └────────────────────┘ └────────────────────┘ └────────┘│
│  drag → POST /move (optimista, 409 revierte) · click → rail de detalle              │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌─ /crm/contacts/[id] — Contacto 360 ──────────────────────────────────────────────────┐
│ ← Contactos                                                                          │
│ ◉ Carlos Comprador          [Cliente] 🏷 vip mayorista      Owner: [Laura ▾]         │
│ +57 300 999 8877 · carlos@acme.co · Bogotá · WhatsApp ✓                              │
│ ┌─ Score 85 ────────────┐ ┌─ Copiloto ✦ ──────────────────────────────────────────┐ │
│ │   ◔ 85/100            │ │ [Resumen] [Siguiente acción] [Borrador seguimiento]    │ │
│ │ ✓ conversación   +30  │ │ "Cliente recurrente; quedó pendiente cotizar el plan   │ │
│ │ ✓ intención venta+20  │ │  anual para la 2ª sede…"                    (cached)   │ │
│ │ ✓ pedido         +20  │ │ Siguiente: Llamar antes del viernes — urgencia ALTA    │ │
│ │ ✓ deal abierto   +20  │ └────────────────────────────────────────────────────────┘ │
│ └───────────────────────┘                                                            │
│ ─ Timeline ─  [actividades ✓][deals ✓][pedidos ✓][conversaciones ✓][citas ✓]        │
│  ● hoy 10:12  [tarea ✦IA] Llamar para confirmar cotización — vence mañana           │
│  ● ayer       [deal] "Plan anual" → Propuesta                                       │
│  ● 12 jul     [pedido] #14 pagado · $ 320.000                    [Cargar más]       │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌─ /crm/tasks — Bandeja ───────────────────────────────────────────────────────────────┐
│ Abiertas 6 · Vencidas 2 ⚠ · Hoy 1 · Sin asignar 3      [Mis tareas][Sin asignar][Todas]│
│ ☐ Llamar para cotización       ◉ Carlos C.   vence hace 1 h ⚠   ✦IA   [✓] ⋮         │
│ ☐ Enviar propuesta 2 sedes     ◉ Hotel Luz   vence mañana              [✓] ⋮         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### B.6 Verificación global

- Por fase: `npx tsc --noEmit` · `npm run lint` (0 errores en archivos del slice) ·
  `npx jest` (units nuevos: `deal-state`, `board.store`, mappers) · `npm run build`.
- `npm run api:types` al inicio (F0) y `npm run api:types:check` sin drift.
- Flujo real (backend dev con seed): crear contacto → abrir deal → drag por etapas →
  win → verificar en el 360 que el contacto quedó `customer`, el score subió y el
  timeline muestra todo → crear tarea vencida → esperar sweep (≤5 min) → campanita.
  Con el inbox activo: pedir a la IA un pedido → ver el deal automático aparecer en el
  board en vivo.
- Revisión light/dark de todas las vistas (checklist `DESIGN-SYSTEM §11`).
- Documentar desviaciones en este doc y re-indexar codebase-memory
  (`index_repository(repo_path=axi-client, mode='full')`).

### B.7 Riesgos y pendientes conocidos

- **Badge de tareas en el sidebar**: sin punto de extensión (`SidebarNavItem` no acepta
  badge; `shared/` no importa de `modules/`) — misma deuda que orders §B.6. Post-v1.
- **`crm.task_due` no viaja por WS**: la bandeja se actualiza al navegar o por la
  campanita; no simular tiempo real donde no lo hay.
- **Doble ítem de sidebar** (`contacts` + `crm` del backend): F0 lo resuelve con alias;
  si molesta el duplicado visual, pedir al backend retirar el ui_module `contacts`
  (decisión de producto, no del ejecutor).
- **Copiloto en producción** exige `usage_model_pricing` seedeado para
  `CRM_COPILOT_MODEL` (backend §16); en dev responde igual (metering activo).
- **Board sin orden manual de tarjetas** (`board_position` es costura backend): el orden
  es `stage_entered_at desc` — no implementar sort dentro de la columna.
- El listado de deals en tabla comparte contrato con el board: no crear un segundo store;
  la tabla lee de `GET /crm/deals` con `usePaginatedList` (patrón orders tabla/board).
