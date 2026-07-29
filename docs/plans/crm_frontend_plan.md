# Plan de implementación — Módulo CRM (frontend)

> **Plan vivo de ejecución por fases (F0–F7).** Complementa a `docs/modules/crm.md`
> (contrato + plan original): este documento registra las decisiones aprobadas, las
> desviaciones reales del contrato encontradas contra `openapi.json`, el estado de cada
> fase y **los mockups de cada vista para aprobación previa**.
>
> Flujo acordado: antes de codificar cada fase se aprueba su mockup aquí; cada fase
> cierra con un PR propio. Estándar de diseño: **legible y premium, inspirado en
> iOS/Apple** — glass solo en superficies flotantes (DESIGN-SYSTEM §5.2), radios
> generosos, springs de `motion.ts`, jerarquía tipográfica nítida, `tabular-nums`.

---

## 1. Estado de fases

| Fase | Contenido | Estado | PR |
|---|---|---|---|
| F0 | Transversales (schema, icono, alias, eventos WS, errores, deep-links) | ✅ Hecha | `feat/crm-f0-transversales` |
| F1 | Contactos: lista + filtros + CRUD modal | ✅ Hecha | `feat/crm-f1-contacts` (apilado sobre F0) |
| F2 | Contacto 360 + duplicados/merge | 🔒 **Gate: aprobar mockups §5.2** | — |
| F3 | Pipeline kanban + deals + rail | 🔒 Gate: mockups §5.3 | — |
| F4 | Tareas | 🔒 Gate: mockup §5.4 | — |
| F5 | Configuración (pipelines/tags/segmentos) | 🔒 Gate: mockups §5.5 | — |
| F6 | Import / Export CSV | 🔒 Gate: mockup §5.6 | — |
| F7 | Copiloto IA | 🔒 Gate: mockup §5.2 (panel ✦) | — |

## 2. Decisiones aprobadas (2026-07-29)

1. **Alcance completo F0–F7**, un PR por fase.
2. **Sidebar**: alias — `NAV_PATH_ALIASES["/contacts"] = "/crm/contacts"`; ambos ítems
   (`crm` y `contacts`) visibles; sin cambios de backend.
3. **Deal estancado**: derivado en cliente — `isStalled(stage_entered_at, rotting_days)`
   en `domain/deal-state.ts` (el DTO no expone `stalled_notified_at`); el evento WS
   `crm.deal_stalled` solo refuerza en vivo.
4. **Acento secundario del CRM: violeta** (✦IA, Copiloto, dataviz). Estancados/vencidos
   usan `warning`/`destructive` semánticos. El coral es acción; nunca ámbar en el CRM.

## 3. Desviaciones del contrato real (verificadas contra `openapi.json` y el código del backend)

1. El `schema.d.ts` commiteado no traía los paths CRM → **`npm run api:types` fue el paso 0** (hecho en F0).
2. **No existe `POST /crm/tasks` ni `PATCH /crm/tasks/:id`**: las tareas se crean/editan
   por `/crm/activities` (`kind: task`, `due_at` obligatorio). `/crm/tasks` es bandeja de
   solo lectura (devuelve la forma de activities). Sí existen `complete|reopen|cancel`.
3. **`DealDto` no expone `stalled_notified_at`** → decisión 2.3. El `stage` embebido del
   deal no trae `rotting_days` (el del board sí): en vista tabla el ⚠ se cruza con el
   `PipelineDto` en memoria o se omite.
4. Los `deals[]` del board son un objeto inline (sin `$ref`): se normalizan a un único
   `DealDTO` de dominio en el mapper.
5. **`POST/PATCH /crm/tags` devuelven la lista completa** de tags, no el tag.
6. `DealDto.contact` embebido = `{id, full_name, phone, avatar_url}` — sin email.
7. **Export CSV** = streaming (blob/link directo, nunca JSON). **Import** = multipart
   `FormData` vía `http`.
8. El board no pagina por columna en su endpoint (tope ~25): "Cargar más" usa
   `GET /crm/deals?stage_id=&page=`.
9. `GET /crm/deals` no tiene filtro `stalled` → sin filtro "estancados" en la tabla v1.
10. **El listado `GET /contacts` NO devuelve `score` ni `tags` por fila** (solo filtra y
    ordena por ellos): la tabla de contactos no tiene esas columnas; el score vive en el
    360. *(Aplicado en F1.)*
11. **`CreateContactDto` no acepta `lifecycle_stage`** (nace `prospect`); la etapa solo se
    edita vía PATCH. *(Aplicado en F1: el select de etapa solo aparece en edición.)*
12. La referencia de crm.md a "D0–D21" del backend está rota (solo existen
    D2,D4,D7,D10–D14,D16,D17 en `axi-server/docs/plans/crm_implementation.md`).

**Invariantes del backend que la UI respeta**: won/lost son *status*, no etapas (el kanban
solo pinta deals `open`); `value_cents` jamás lo fija la IA (edición humana explícita);
un solo deal abierto por conversación (409); el primer `GET /crm/pipelines` materializa el
pipeline default; duplicados solo por `email_exact` + `similar_name`.

## 4. Arquitectura del slice (referencias que se espejan)

- **Kanban + store optimista**: `modules/orders` (`OrdersKanban`, `orders.store.ts` —
  normalizado, `moveId()`, rollback, `realtimeVersion`, `highlightId`, prefs localStorage).
- **Rail interceptado**: `orders/@sheet/(.)[orderId]` + `OrderDetailRoute {closeBehavior}`.
- **Sub-nav**: `CatalogNav`. **Página-hub**: `catalog/products/[id]`.
- **Modal por ruta interceptada**: `settings/quick-actions/@form/(.)create|(.)update`.
- **Timeline visual**: `OrderTimeline` (`visualFor()` + tonos). **Stats**: `OrderStatsTiles`.
- Reutilizados: `DataTable`, `DynamicForm`, `DetailSheet`, `MultiSelect`,
  `usePaginatedList`, `Modal`/`useAlert`, `formatMoney`, `toCsv/downloadCsv`,
  `relativeTime`, `CONTACT_STAGE_LABELS` (ahora canónico en `crm/domain/enums.ts`).

Estructura (crm.md §B.2, ajustada):

```
src/modules/crm/
├── domain/            contact.ts · enums.ts · segment.ts        (F1 ✅)
│                      deal.ts · deal-state.ts · activity.ts     (F3/F4)
├── infrastructure/
│   ├── services/      contacts ✅ · segments (mín.) ✅ · pipelines · deals ·
│   │                  activities · imports · copilot
│   ├── stores/        board.store.ts (F3) · tasks.store.ts (F4)
│   └── realtime/      use-crm-socket.ts (F3)
└── ui/                CrmNav ✅ · components/ · tables/ · forms/

src/app/(private)/crm/
├── layout.tsx ✅ (full-bleed h-[calc(100svh-52px)] + CrmNav; slot @sheet en F3)
├── page.tsx ✅ (redirect → contacts; → pipeline desde F3)
├── contacts/ ✅ (page + loading + @form/(.)create|(.)update/[id])
├── contacts/[contactId]/ + contacts/duplicates/   (F2)
├── pipeline/ (+ @sheet/(.)deal/[dealId])          (F3)
├── tasks/                                          (F4)
└── settings/{pipelines,tags,segments,imports}/    (F5/F6)
```

## 5. Mockups por fase (gate de aprobación)

Convenciones visuales de toda la sección: coral solo en acciones; violeta solo ✦IA;
`stage.color`/color de tag como acento de borde/badge (nunca fondo saturado); glass solo
en modales/popovers/rail; skeletons por ruta; light/dark por tokens.

### 5.1 F1 — `/crm/contacts` (✅ implementado)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ CRM    Contactos                                                                         │ ← CrmNav (pipeline/tareas/config aparecen con su fase)
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ Contactos                                                            [+ Nuevo contacto] │ ← H2 + contador tabular · CTA coral pill
│ 1.240 contactos                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────────────────┐     │
│ │ [🔍 Buscar…(debounce)]  [Etapa ▾] [Fuente ▾] [⚙ Más filtros] [Limpiar]           │     │ ← Más filtros (popover): ciudad, tag, score ≥, orden
│ │  Ciudad: Bogotá ✕ · Score ≥ 50 ✕                                                 │     │ ← chips removibles de los filtros del popover
│ │ Contacto ↕            Etapa       Ciudad    Fuente        Creado    ⋮            │     │
│ │ ◉ Carlos Comprador    [Cliente]   Bogotá    WhatsApp      12 jul    ⋮            │     │ ← fila 2 líneas: nombre + tel/email caption
│ │   +57 300 999 8877                                                               │     │ ← etapa: badge tonal (cliente=success, lead=info)
│ └──────────────────────────────────────────────────────────────────────────────────┘     │
│  ⋮ = Editar / Eliminar(rojo) · crear/editar = modal interceptado @form                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

*Desviaciones aplicadas: sin columnas Score/Tags (§3.10), etapa solo en edición (§3.11),
score como select ≥25/50/75 (no existe primitivo slider).*

### 5.2 F2 — Contacto 360 + duplicados/merge  🔒 PENDIENTE DE APROBACIÓN

```
┌─ /crm/contacts/[id] — 360 (página-hub, scroll propio) ───────────────────────────────────┐
│ ← Contactos                                                                              │
│ ◉ Carlos Comprador  [Cliente]        Owner: [Laura ▾]              [✎ Editar]  [⋮]      │ ← avatar 48px · owner select gate crm:manage
│ +57 300 999 8877 · carlos@acme.co · Bogotá                                               │ ← ⋮: Fusionar duplicado · Eliminar (rojo)
│ WhatsApp ✓ hace 2 h · Instagram —                                                        │ ← identidades de canal read-only + last_seen relativo
│ ┌─ Score ────────────────────┐  ┌─ 🏷 Etiquetas ──────────────────────────────────────┐ │
│ │  ◔ 85/100  (anillo)        │  │ [vip ✕][mayorista ✕][+ añadir]                      │ │ ← MultiSelect + PUT replace-set (gate crm:read)
│ │ ✓ conversación activa  +30 │  ├─ Oportunidades (2) ─────────────────────────────────┤ │
│ │ ✓ intención de venta   +20 │  │ Plan anual x2 sedes · Propuesta · $350.000 · Abierto│ │ ← GET /crm/deals?contact_id= (link al rail desde F3)
│ │ ✓ pedido               +20 │  │ [+ Nueva oportunidad]  [+ Nueva actividad]          │ │
│ │ ✓ deal abierto         +20 │  └─────────────────────────────────────────────────────┘ │
│ │ ○ cita                 +15 │   (el panel Copiloto ✦ ocupa este hueco desde F7)        │ ← señales desde score_signals con sus pesos
│ └────────────────────────────┘                                                          │   (✓ activa = color, ○ inactiva = muted)
│ ─ Timeline ─  [actividades ✓][deals ✓][pedidos ✓][conversaciones ✓][citas ✓]            │ ← chips toggle → sources= (CSV)
│  ● hoy 10:12   [tarea ✦IA]  Llamar para confirmar cotización — vence mañana             │ ← ✦IA violeta si actor ai_agent
│  ● ayer        [deal]       "Plan anual" pasó a Propuesta                               │ ← ol + línea vertical + badge tonal por fuente
│  ● 12 jul      [pedido]     #14 pagado · $ 320.000                                      │   (patrón OrderTimeline)
│                                                           [Cargar más]                  │ ← cursor next_cursor (límite 50)
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌─ /crm/contacts/duplicates ───────────────────────────────┐  ┌─ MergeDialog (glass-overlay) ──────────────┐
│ ← Contactos      Posibles duplicados (máx 50)            │  │ Fusionar contactos                    ✕    │
│ Contacto A         Contacto B        Motivo    Confianza │  │  CONSERVAR          ←   DESAPARECE         │
│ Carlos Comprador   C. Comprador SAS  nombre    ████░ 82% │  │  ◉ Carlos Comprador ←  ◉ C. Comprador SAS  │
│                                      similar   [Fusionar]│  │  tel · email · ciudad lado a lado,         │
│ Ana Gómez          Ana Gomez         email     █████ 100%│  │  diferencias resaltadas       [⇄ invertir] │
│                                      exacto    [Fusionar]│  │ ⚠ IRREVERSIBLE: conversaciones, pedidos,   │
│ (vacío: "Sin duplicados aparentes 🎉")                   │  │  deals y tags del perdedor se reasignan.   │
└──────────────────────────────────────────────────────────┘  │ Escribe el nombre del perdedor: [________] │
   El botón [Duplicados N] aparece en /crm/contacts (F2)      │            [Cancelar] [Fusionar 🔴]        │
                                                              └────────────────────────────────────────────┘
   Tras fusionar: navegar al 360 del ganador · WS contact.merged quita al perdedor de listados
```

**Detalle técnico F2**: `ui/components/contact-detail/{Contact360Header,ScorePanel,TagsEditor,ContactTimeline,MergeDialog}.tsx`,
`contacts/[contactId]/page.tsx` + `loading.tsx`, `contacts/duplicates/page.tsx`, ampliación
del adapter (profile GET/PATCH, tags GET/PUT, timeline cursor, duplicates, merge), owner
select con lista de users (adapter de users existente). QA: score refleja señales; merge
reasigna todo y el perdedor da 404; timeline pagina sin duplicados; `contact.merged` en
vivo; light/dark.

### 5.3 F3 — Pipeline (kanban + tabla + rail)  🔒

```
┌─ /crm/pipeline — Kanban (vista default de /crm desde F3) ────────────────────────────────┐
│ CRM    Contactos │ Pipeline │ …                                                         │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ [Ventas ▾]  [30 días ▾]                    [⊞ Board|☰ Tabla]  [✦ Resumen IA] [+ Deal]   │ ← pipeline persistido (axi:crm:pipeline) · ✦ gate F7
│ ┌───────────┐ ┌────────────┐ ┌─────────────┐ ┌───────────────┐                          │
│ │ Forecast  │ │ Abiertos   │ │ Ganados 30d │ │ Win rate      │                          │ ← DealStatsTiles (patrón OrderStatsTiles)
│ │ $ 4.2 M   │ │ 12 · $8.1M │ │ 5 · $ 3.4 M │ │ 62% · 6.5 d   │                          │
│ └───────────┘ └────────────┘ └─────────────┘ └───────────────┘                          │
│ ┌ Nuevo · 10% ──── 4 · $1.2M ┐ ┌ Contactado · 25% ── 3 ┐ ┌ Propuesta · 50% ── 3 ┐  ...  │ ← header col: borde superior stage.color
│ │ ┌────────────────────────┐ │ │ ┌────────────────────┐ │ │ ┌────────────────────┐ │    │
│ │ │ Plan anual x2 sedes    │ │ │ │ Pedido #14     ✦IA │ │ │ │ Combo eventos    ⚠ │ │    │ ← ✦IA violeta (source=ai_conversation)
│ │ │ ◉ Carlos C. · $350.000 │ │ │ │ ◉ Diana · $120.000 │ │ │ │ 9 días sin moverse │ │    │ ← ⚠ warning si isStalled() (derivado, §3.3)
│ │ │ hace 2 h            ⋮ │ │ │ │ ayer            ⋮ │ │ │ │ ◉ Hotel Luz     ⋮ │ │    │ ← ⋮: Ver · Ganado · Perdido · Editar
│ │ └────────────────────────┘ │ │ └────────────────────┘ │ │ └────────────────────┘ │    │
│ │ [Cargar más]               │ │                        │ │                        │    │ ← GET /crm/deals?stage_id=&page=
│ └────────────────────────────┘ └────────────────────────┘ └────────────────────────┘    │
│  drag → POST /move optimista (409 revierte + toast) · click → rail · chip "N nuevos" WS │
└──────────────────────────────────────────────────────────────────────────────────────────┘

Vista tabla (☰, preferencia axi:crm:view):  Deal · Contacto · Etapa · Valor · Cierre esp. · Estado
— won/lost SOLO aquí (badges ✓Ganado/✗Perdido) + filtros status; nunca columnas del kanban.

┌─ Rail de deal (@sheet interceptado, patrón OrderDetailRail) ─┐
│ Plan anual x2 sedes                              ● Abierto   │
│ Ventas ▸ Propuesta (50%)                                     │
│ Valor [$350.000 ✎] · Cierre [15 ago ✎] · Owner [Laura ▾]     │ ← PATCH inline (valor = edición humana, §3 invariantes)
│ Contacto ◉ Carlos C. → 360 · Origen 💬 conversación →        │
│ [✓ Ganado] [✗ Perdido]           (dialogs con confirmación)  │ ← Ganado coral · Perdido destructive
│ ─ Historial ─  ● Movido a Propuesta · ● Creado por ✦IA …     │ ← /deals/:id/events + visualFor()
│ ─ Notas ─ [textarea]                                         │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 F4 — `/crm/tasks`  🔒

```
│ Abiertas 6 · Vencidas 2 ⚠ · Para hoy 1 · Sin asignar 3          [+ Nueva tarea]         │ ← chips de /crm/tasks/stats (⚠ warning)
│ [Mis tareas]·[Sin asignar]·[Todas]      Vence: [Vencidas|Hoy|Semana|Todas]               │ ← tabs assignee= · filtro due=
│ ☐  Llamar para cotización      ◉ Carlos C.   vence hace 1 h ⚠   ✦IA    [✓] ⋮           │ ← due relativo (destructive si overdue)
│ ☐  Enviar propuesta 2 sedes    ◉ Hotel Luz   vence mañana              [✓] ⋮           │ ← [✓] complete optimista · ⋮ reabrir/cancelar/editar
│ ☑̶  E̶n̶v̶i̶a̶r̶ ̶c̶a̶t̶á̶l̶o̶g̶o̶            ◉ Diana R.    completada hoy            [↺] ⋮           │
```
*Crear/editar = form de actividad (`kind: task`) vía `/crm/activities` (§3.2) — el mismo
config se reusa desde el 360 y el rail del deal.*

### 5.5 F5 — `/crm/settings` (pipelines · tags · segmentos)  🔒  (todo gate `crm:manage`)

```
│ Configuración   Pipelines │ Tags │ Segmentos │ Imports                                  │
│ ┌ Pipelines ──────────┐ ┌ Etapas de "Ventas" ────────────────────────────────────────┐  │
│ │ ● Ventas (default)  │ │ ⠿ ▐ Nuevo         prob [10]%  color [●▾]  estanca [7]d  ✕ │  │ ← ⠿ drag reorder (PUT lista completa de stage_ids)
│ │ ○ Postventa         │ │ ⠿ ▐ Contactado    prob [25]%  color [●▾]  estanca [7]d  ✕ │  │ ← ▐ barra con stage.color
│ │ [+ Nuevo pipeline]  │ │ ⠿ ▐ Propuesta     prob [50]%  color [●▾]  estanca [10]d ✕ │  │
│ └─────────────────────┘ │ [+ Añadir etapa]                                           │  │
│                         └────────────────────────────────────────────────────────────┘  │
│  ✕ con deals → 409 crm/stage_in_use → select "Mover deals a: [▾]" y reintentar          │
│                                                                                          │
│ Tags: CRUD simple (nombre + color + contador de contactos; respuesta = lista completa)   │
│ Segmentos: builder SOLO con las claves del DSL (etapa[], fuente[], tags any/all, ciudad, │
│  q, score ≥, fechas, deal abierto, sin actividad desde) + [Vista previa (N)] + Exportar  │
```

### 5.6 F6 — Import / Export  🔒

```
│ Paso 1  ⬆ Arrastra tu CSV (≤10 MB · ≤20.000 filas)  — valida extensión/peso en cliente  │
│ Paso 2  Duplicados: (○ omitir ● actualizar) · Tags [MultiSelect] · Etapa [lead ▾]        │
│ Paso 3  ▓▓▓▓░░ procesando… (poll 2 s + WS crm.import_completed)                          │
│ Reporte 180 creados · 12 actualizados · 3 errores (tabla fila/campo/mensaje ≤100)        │
│ Historial de imports (tabla) · Export = descarga directa + toast "queda auditada"        │
```

### 5.7 F7 — Copiloto ✦ (en el 360 y el board)  🔒

Panel violeta suave en el hueco del 360 (§5.2): `[Resumen] [Siguiente acción] [Borrador
seguimiento]` con skeleton al generar, badge `cached`, urgencia tonal, copy-to-clipboard;
en el board, botón `✦ Resumen IA` (modal summary/risks/opportunities). 429 → toast con
countdown `Retry-After`; `usage/limit_exceeded` → "límite de IA del plan alcanzado".

## 6. Verificación por fase

`npx tsc --noEmit` · `npm run lint` (0 errores en lo tocado) · `npx jest` (units: `deal-state`,
`board.store`, `notification-target` ✅, mappers) · `npm run build` · revisión visual
light/dark (checklist DESIGN-SYSTEM §11; receta WSL para chromium sin sudo). Flujo real
E2E con backend seed al cerrar F3+ (crear contacto → deal → drag → win → 360 refleja
customer/score/timeline; IA del inbox abre deal en vivo). Al terminar el módulo:
actualizar `docs/modules/crm.md` con las desviaciones §3 y re-indexar codebase-memory.
