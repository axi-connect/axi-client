# Plan de implementación — Módulo Calidad (frontend, `/platform/quality`)

> **Plan vivo de ejecución por fases (F1–F5).** Complementa a
> `axi-server/docs/plans/quality_frontend_plan.md` (contrato de integración del
> backend): este documento registra las decisiones aprobadas, la distribución de
> vistas (mockups aprobados) y el estado de cada fase. Convenciones de la consola
> platform: `architecture.md` §8.1, `docs/modules/platform.md` y decisiones D1–D14
> de `axi-server/docs/plans/frontend_platform_plan.md`.
>
> Flujo acordado: antes de codificar cada fase se aprueba su alcance aquí; cada
> fase cierra con un PR propio. Estándar de diseño: **legible y premium** —
> glass solo en superficies flotantes (DESIGN-SYSTEM §5.2), radios generosos,
> jerarquía tipográfica nítida, `tabular-nums` en métricas, semáforos de
> `thresholds.ts` (nunca el coral para error).

---

## 1. Estado de fases

| Fase | Contenido | Estado | PR |
|---|---|---|---|
| F1 | Fundaciones: dominio quality, polling, query keys, StatusBadge, errores, `TenantSelect` | ✅ Código completo (lint + 420 tests verdes) | pendiente |
| F2 | Escenarios + Suites (catálogo CRUD + editor de criterios) | ✅ Código completo (lint + tsc + 443 tests; E2E crear/archivar y visual light/dark contra backend local) | pendiente |
| F3 | Ejecuciones: lista + wizard de creación | ✅ Código completo (lint + tsc + 457 tests; E2E: estrés mock 2×2 lanzado desde el wizard, completado y purgado; visual light/dark) | pendiente |
| F4 | Detalle de ejecución + detalle de case en vivo | ✅ Código completo (lint + tsc + 463 tests; E2E: detalle en vivo hasta Completada, case con transcript, purga con ConfirmTyped → purging → purged) | pendiente |
| F5 | Depurador de conversaciones | ✅ Código completo (lint + tsc + 471 tests; E2E: descarga real del .md con nombre del Content-Disposition; visual light/dark) — MÓDULO CERRADO | pendiente |

## 2. Decisiones aprobadas

1. **Agentes del wizard**: no existe endpoint platform de agentes por tenant →
   `GET /platform/analytics/agents-health?days=1` filtrado en cliente
   (`company_id` + `agent_status === 'active'`). Gap documentado; mejora futura:
   `GET /platform/tenants/{id}/agents` en el backend.
2. **Navegación por segmentos de ruta** (D11): `/platform/quality` → redirect a
   `/runs`; sub-rutas `runs`, `runs/[runId]`, `runs/[runId]/cases/[caseId]`,
   `scenarios`, `suites`, `debugger`. Tabs por ruta estilo `TenantTabs`.
3. **Naming UI**: la sección de runs se llama **"Ejecuciones"** (nunca
   "Corridas"); singular "ejecución". Rutas técnicas en inglés (`/runs`).
4. **Detalle de case**: ruta propia de dos columnas (transcript chat 60 % |
   veredicto 40 %; apila en `<lg`).
5. **5 fases = 5 PRs.**

## 3. Piezas existentes que se reutilizan (no reinventar)

| Pieza | Ruta |
|---|---|
| Cliente API + Bearer + parseHttpError | `src/modules/platform/infrastructure/api/platform-client.ts` |
| Query keys / QueryClient | `.../api/query-keys.ts`, `query-client.ts` |
| Polling puro + pausa por relogin | `src/modules/platform/domain/polling.ts` (patrón `databasePollInterval`) |
| StatusBadge / EmptyState / ProblemAlert / ConfirmTyped / StepIndicator | `src/modules/platform/ui/components/` |
| Wizard precedente | `ui/features/tenants/wizard/{TenantWizard,WizardStepper,steps/*}` |
| Semáforos score/latencia | `domain/thresholds.ts` (`scoreTone`, `latencyTone`, `alertProgressPct`) + `features/analytics/MetricCell.tsx` |
| DataTable (server-mode con `pagination.total`; filas PLANAS), DetailSheet, DynamicForm, MultiSelect, TableSkeleton | `src/shared/components/features/` |
| Errores ES por code | `src/core/lib/error-messages.ts` (se añade el bloque `quality/*`) |
| Hook de agentes | `infrastructure/api/hooks/use-analytics.ts` → `agents-health` |

**Gotchas de contrato verificados contra `schema.d.ts` y el backend:**
`is_system`/`include_raw` viajan como string `"true"/"false"` ·
`success_criteria`/`checks`/`metrics`/`params`/`timings` llegan como `unknown` →
tipos locales + parseo defensivo · `cases[]` del run llega completo sin paginar
(≤200; sin virtualización) · el `.md` del debugger se descarga con `fetch`
manual + Bearer + `URL.createObjectURL` (openapi-fetch no sirve para blobs) ·
`concurrency`: el DTO acepta 1–16 pero el server clampa a 8 (hint en el form) ·
StatusBadge ya tiene `cancelled` (doble l); quality usa `canceled` (una l) —
variante nueva, no reutilizar · las listas de Calidad paginan en server
(excepción a D5): DataTable en modo `total` + filtros en la query key +
`keepPreviousData`.

## 4. Mockups aprobados

### 4.1 Shell de la sección (todas las vistas)

```
┌─ PlatformShell ────────────────────────────────────────────────────────────┐
│  Calidad                                              [ + Nueva ejecución ] │  ← h1 text-3xl + CTA coral
│  QA simulado, pruebas de estrés y diagnóstico forense                       │  ← subtítulo muted
│  ─ Ejecuciones ── Escenarios ── Suites ── Depurador ────────────────────────│  ← tabs por ruta (border-b-2,
│                                                                             │     activa = border-primary)
│  [contenido de la sub-ruta]                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 `/quality/runs` — Ejecuciones (default)

```
│ [Tenant ▾ Todos] [Tipo ▾ Todos] [Estado ▾ Todos]                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ Tipo   Tenant          Agente        Alcance        Estado      Resultado││
│ │ ─────────────────────────────────────────────────────────────────────────││
│ │ QA     Joao's Burguer  Sofía (gpt4o) basic_smoke ×7 ⟳ En curso  3✓ 1✗ /7 ││ ← fila → detalle (F4)
│ │ Estrés Café Andino     Max (mock)    20 conv × 3    ✓ Completada 92 pts  ││    ⟳ = transient spin
│ │ QA     Joao's Burguer  Sofía         3 escenarios   ⊘ Cancelada  —       ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│  ‹ 1 2 3 ›   (server-side, page_size 25, keepPreviousData)                  │
```

### 4.3 `/quality/runs/new` — Wizard "Nueva ejecución" (StepIndicator, `mx-auto max-w-3xl`)

```
  ● Objetivo ─── ○ Configuración ─── ○ Revisión        ← coral actual / violeta hecho

  Paso 1 · Objetivo
  ┌────────────────────────────────────────────┐
  │ Tenant     [ Joao's Burguer          ▾ ]   │  ← TenantSelect (suspendidos deshabilitados)
  │ Agente     [ Sofía — gpt-4o · activo ▾ ]   │  ← agents-health filtrado; vacío → EmptyState
  └────────────────────────────────────────────┘

  Paso 2 · Configuración          [ QA ] [ Estrés ]   ← toggle kind
  ── QA ──────────────────────────────────────────     ── Estrés ────────────────────────────────
  (•) Por suite      [ basic_smoke (7) ▾ ]             Modo IA   (•) Mock $0   ( ) Real ⚠ costo
  ( ) Por escenarios [ MultiSelect… 1–50 ]              Conversaciones [20]  Turnos/conv [3]
  Concurrencia [4]  (el servidor limita a 8)            Latencia mock (ms) [800]  Cap USD [5]
                                                        Ocupación estimada: 48 s / 3600 s
                                                        [▓░░░░░░░░░]  ← alertProgressPct; >3600 bloquea
  ⚠ El modo mock no emite tool_calls: mide el pipeline, no las tools. Usa Real para probar tools.

  Paso 3 · Revisión → resumen + estimaciones → [ Crear ejecución ]  (202 → detalle)
  Errores de submit: run_already_active → alerta con link a la ejecución activa ·
  tenant_not_eligible → mensaje por details.reason · spend_cap_exceeded → cifras + CTA "usar mock"
```

### 4.4 `/quality/runs/[id]` — Detalle en vivo (polling 3 s mientras `pending|running|purging`)

```
│ ← Ejecuciones                                                               │
│ QA · Joao's Burguer   ⟳ En curso        [ Cancelar ] [ Purgar datos ]       │ ← acciones según estado
│ Agente: Sofía · gpt-4o · openai_compatible   Suite: basic_smoke             │   Purgar → ConfirmTyped
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐          │
│ │ Casos    │ │ Aprobados│ │ Fallidos │ │ Score juez│ │ Gasto     │          │ ← StatTiles
│ │   3/7    │ │    3 ✓   │ │   1 ✗    │ │  78.5     │ │ $0.042 US │          │   (gasto de plataforma)
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘          │
│ Métricas (al finalizar): p50 4.1s · p95 9.8s · 19.5 turnos/min · 2m10s      │ ← latencyTone; stress:
│                                                                             │   + queue_depth_samples
│ Casos                                   [Estado ▾] [Escenario ▾]            │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ buyer_multi_product   ✓ Aprobado   80 pts   4/4 checks              →    ││
│ │ asks_human            ⟳ En curso   —        —                            ││
│ │ spam_burst            ✗ Fallido    45 pts   2/4 checks  [Instrumento]    ││ ← FailureReasonBadge:
│ │ off_topic             ⊘ Bloqueado  —        run_canceled                 ││   instrumento/infra ≠
│ └──────────────────────────────────────────────────────────────────────────┘│   fallo del agente
│ ⚠ banner si purged: "Datos sintéticos eliminados · retención automática 14d"│
```

### 4.5 `/quality/runs/[id]/cases/[caseId]` — Detalle de case (60/40; apila `<lg`)

```
│ ← buyer_multi_product · Objetivo: "comprar 5 productos distintos…"          │
│ ┌─ Transcript ────────────────────────┐ ┌─ Veredicto ───────────────────────┐
│ │ ● Quiero 5 hamburguesas    12:00:01 │ │ ✗ Fallido · Juez: 45/100          │
│ │   (cliente simulado, izq)           │ │ ── Checks ─────────────────────── │
│ │        ¡Claro! ¿De cuáles? ○ 12:00:05│ │ ✓ order_created (5 unidades)     │
│ │   (agente, der, burbuja accent)     │ │ ✗ max_reply_ms  p100 9.8s > 5s   │
│ │ ● Las clásicas…                     │ │ ⚠ invalid_criteria → "escenario   │
│ │   [system/user → estilo neutro]     │ │    roto, no es fallo del agente"  │
│ │                                     │ │ ── Juez ───────────────────────── │
│ │ (crece en vivo si el case corre;    │ │ accuracy 60 · tools 40 · tone 80  │
│ │  purged → EmptyState explicativo)   │ │ Issues: [high] no confirmó pago…  │
│ │                                     │ │ ── Timings ────────────────────── │
│ │                                     │ │ t1 4.1s · t2 9.8s · t3 3.2s      │
│ └─────────────────────────────────────┘ └───────────────────────────────────┘
```

### 4.6 `/quality/scenarios` — Catálogo + editor de criterios (DetailSheet)

```
│ [Estado ▾ Activos] [Origen ▾ Todos|Sistema|Propios] [🔍 buscar…]  [+ Nuevo]  │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ Código                Nombre               Criterios  Tags      Origen   ││
│ │ buyer_multi_product   Comprador multi…     3          ventas   ⚙Sistema ││ ← is_system: solo
│ │ discount_probe        Caza-descuentos      2          ventas   ⚙Sistema ││   Ver + Clonar
│ │ mi_escenario          Mi variante          4          —         Propio   ││ ← Ver/Editar/Clonar/Archivar
│ └──────────────────────────────────────────────────────────────────────────┘│

  ScenarioFormSheet (DetailSheet lg) — DynamicForm:
  code · name · description · persona (textarea) · goal (textarea) · max_turns · tags
  ── Criterios de éxito (1–20) ─────────────────────── [ + Añadir criterio ]
  ┌ [Pedido creado ▾]  mín. unidades [5]  productos [chips…]            ✕ ┐
  ┌ [Respuesta contiene ▾]  patrón [/gracias/i]  (regex, máx 120)       ✕ ┐
  ⚠ errores cruzados inline: escalated+not_escalated, order_created+not, regex inválida
```

### 4.7 `/quality/suites` — Catálogo + composición

```
  Tabla igual patrón (code, nombre, nº escenarios, estado).
  SuiteScenariosSheet: buscador de escenarios activos → lista ordenada:
  ┌ 1 ↑↓  buyer_multi_product          ✕ ┐   ← orden = position (PUT reemplazo total,
  ┌ 2 ↑↓  asks_human                   ✕ ┐      1–50 sin duplicados)
  ⚠ los archivados no se ejecutan (cases_total puede ser < scenarios_count)
```

### 4.8 `/quality/debugger` — Depurador forense (master-detail)

```
│ ⓘ Todo acceso a conversaciones queda auditado.                              │
│ [Tenant ▾ Joao's Burguer]   [🔍 nombre, email o teléfono…]                  │
│ ┌─ Contactos (máx 25) ─────────────┐ ┌─ Conversaciones del contacto ───────┐│
│ │ Ana Pérez  ·  +57300…   [Simulada]│ │ ● abierta · ai_active · hace 2 h    ││
│ │ ana@mail.com · lead              │ │   "Quiero 5 hamburguesas…"          ││
│ │ ──────────────────────────────── │ │   [Simulada]  [⬇ Descargar reporte] ││
│ │ Juan Gómez · +57311…             │ │ ● cerrada · resolved · ayer         ││
│ └──────────────────────────────────┘ └─────────────────────────────────────┘│

  ReportDownloadDialog (obligatorio antes de descargar):
  ⚠ Este diagnóstico contiene datos personales del cliente y propiedad
    intelectual del tenant (system prompt completo). El acceso queda auditado.
  Formato (•) Markdown ( ) JSON   [ ] Incluir apéndice crudo   [ Descargar ]
```

---

## 5. Fases (un PR por fase)

### F1 — Fundaciones (sin UI visible; refactor neutro de Audit)

**Nuevos:**
- `src/modules/platform/domain/quality.ts` — `SuccessCriterion` (unión por
  `kind` + variante `unknown` forward-compat), `parseSuccessCriteria()`
  defensivo, `CRITERION_KINDS` (metadata para editor y chips),
  `criterionLabel()`, `validateCriteriaSet()` (reglas cruzadas del server:
  vacío, `escalated`+`not_escalated`, `order_created`+`order_not_created`,
  regex 1–120 compilable, heurística anti-ReDoS), constantes de límites.
- `src/modules/platform/domain/quality-runs.ts` — `RunStatus`/`CaseStatus`,
  `isRunActive/isRunCancelable/isRunPurgeable/isCaseSettled`,
  `parseFailureReason()` (prefijos `sim_client_failed:`/`infrastructure_failed:`
  + `run_canceled`/`company_suspended`/`ai_paused` → categorías con tono),
  `RunMetrics`/`CheckResult` locales, `isInvalidCriteriaCheck()`,
  `STRESS_BUDGET_S = 3600`, `estimateStressOccupancySeconds()` (clamp latencia
  a 800 ms), `describeTenantNotEligible(details)`,
  `describeSpendCapExceeded(details)` (lectura defensiva de `details`).
- `src/modules/platform/ui/components/TenantSelect.tsx` — extraído del Select
  inline de `AuditView` (`useTenantsQuery`, props `allowAll`/`disableSuspended`).
- Tests: `domain/__tests__/quality.test.ts`, `quality-runs.test.ts`.

**Modificados:**
- `domain/polling.ts` — `RUN_POLL_MS = 3_000` + `runPollInterval({status,
  reloginOpen})` (+ casos en `polling.test.ts`).
- `infrastructure/api/query-keys.ts` — subárbol completo
  `platformKeys.quality.{scenarios,suites,runs,debug}` (filtros en la key).
- `ui/components/StatusBadge.tsx` — `running`, `queued` (transient), `purging`
  (transient), `purged`, `passed`, `blocked`, `timeout`, `archived`,
  `canceled` (una l — coexiste con `cancelled`).
- `core/lib/error-messages.ts` — bloque `quality/*` (mapa plano; los mensajes
  enriquecidos con `details` los componen los helpers de dominio en la UI).
- `ui/features/audit/AuditView.tsx` — usa `TenantSelect` (idéntico comportamiento).

**Aceptación:** `npm test` verde; Audit sin regresión; cero cambios de navegación.

### F2 — Escenarios + Suites (aparece la nav "Calidad")

**Infra:** `infrastructure/api/hooks/use-quality-scenarios.ts`
(`useScenariosQuery` — `is_system` boolean→string, `keepPreviousData` —,
`useScenarioQuery`, `useCreateScenario`, `useUpdateScenario`,
`useArchiveScenario`, `useCloneScenario`; invalidan
`quality.scenarios.all`) y `use-quality-suites.ts` (ídem +
`useSetSuiteScenarios` PUT reemplazo total). Tests de hooks (patrón
`use-tenants.test.tsx`).

**UI** (`ui/features/quality/`): `QualityTabs.tsx` (tabs por ruta);
`scenarios/` → `ScenariosView`, `scenarios-table.config.tsx` (filas planas),
`ScenarioFormSheet` (crear/editar/ver; `is_system` fuerza ver; 409 de `code` →
`form.setError`), `scenario-form.config.ts` (Zod + `validateCriteriaSet` en
`superRefine`), `CriteriaEditor` (custom field: select de kind + campos
condicionales), `CriteriaList` (chips solo-lectura, reutilizado en F4),
`ScenarioRowActions`, `CloneScenarioDialog`; `suites/` → `SuitesView`,
`suites-table.config.tsx`, `SuiteFormSheet` + config, `SuiteRowActions`,
`SuiteScenariosSheet` (orden con ↑↓, 1–50 sin duplicados, aviso de archivados).
Tests de `CriteriaEditor`, `ScenarioFormSheet`, `SuiteScenariosSheet`.

**Rutas:** `src/app/platform/(admin)/quality/{layout.tsx, page.tsx (redirect
temporal a /scenarios), scenarios/{page,loading}, suites/{page,loading}}`.

**Modificados:** `domain/navigation.ts` (entrada Calidad, icono
`flask-conical`), `PlatformSidebar.tsx` (`NAV_ICONS`), `PlatformHeader.tsx`
(`LABELS`: quality/scenarios/suites).

**Aceptación:** CRUD escenarios con editor de criterios que replica reglas del
server; system solo Ver/Clonar; clonado OK; CRUD suites + composición PUT;
paginación server sin parpadeo.

**Notas de implementación (post-F2):**
- La búsqueda usa la barra del propio `DataTable` (debounce 350 ms) como única
  búsqueda — el backend busca por código Y nombre sin importar el campo
  elegido; columnas no-texto llevan `searchable: false`. Con filtros que dan
  0 resultados la tabla queda montada (mensaje `empty`) para no desmontar el
  input a mitad de escritura; el `EmptyState` se reserva para el catálogo
  realmente vacío.
- Tras clonar, el clon se abre en edición vía `useScenarioQuery(id)` (no
  depende de la página actual); tras crear una suite se abre directo su
  composición.
- Los criterios `unknown` (criteria_version vieja/kind nuevo) se muestran en
  ámbar y se EXCLUYEN del DTO al guardar (el editor lo advierte en la fila).

### F3 — Ejecuciones: lista + wizard

**Infra:** `use-quality-runs.ts` (F3: `useRunsQuery` con filtros +
`keepPreviousData`, `useCreateRun` 202, `useCancelRun` 204) + tests (mapeo de
`run_already_active`/`tenant_not_eligible`/`spend_cap_exceeded` conservando
`details`). Agentes: reutiliza el hook de `agents-health` con `days=1`
filtrado en cliente (gap documentado en docblock).

**UI:** `runs/` → `RunsView` (filtros TenantSelect/kind/status, CTA "Nueva
ejecución"; filas SIN link hasta F4), `runs-table.config.tsx` (filas planas:
tipo, tenant, agente, alcance, StatusBadge, resultado, score con `MetricCell`,
spend), `RunRowActions` (Cancelar si `isRunCancelable`); `runs/wizard/` →
`RunWizard` (estilo TenantWizard; al 202 → toast + push a lista, F4 lo cambia
al detalle; mapeo de los 3 errores de negocio con helpers de dominio y CTA
"usar mock" si `no_pricing`), `steps/TargetStep`, `steps/ConfigStep` +
`run-config.schema.ts` (Zod `superRefine`: XOR suite/escenarios en QA,
requeridos de estrés, presupuesto ≤3600 s con barra en vivo; hint clamp
concurrencia 8; hint "mock no emite tool_calls"; advertencia modo real =
horario valle + costo), `steps/ReviewStep`. Tests del schema y del wizard.

**Rutas:** `quality/runs/{page,loading}`, `quality/runs/new/{page,loading}`.
`quality/page.tsx` → redirect pasa a `/runs`. `QualityTabs` añade
"Ejecuciones" (primera). `PlatformHeader` LABELS `runs`.

**Aceptación:** crear QA y estrés de punta a punta; validaciones cliente =
servidor; estimación de ocupación pre-submit; cancelar desde lista;
terminología "Ejecución" en toda la UI.

**Notas de implementación (post-F3):**
- La lista usa tabla de PRIMITIVOS (`RunsTable`, patrón `AgentsHealthTable`)
  + `BasicPagination`: el endpoint no tiene búsqueda ni orden y el `DataTable`
  pintaría una barra de búsqueda muerta. Orden del backend (`created_at desc`)
  respetado.
- `useRunsQuery` se auto-refresca cada 3 s mientras alguna ejecución de la
  página siga viva (pending/running/purging) — la lista "respira" sin F4.
- La validación del wizard es un validador PURO (`validateRunConfig`) en vez
  de zod: mismas reglas espejo, testeable sin RHF.
- Breadcrumb: el segmento `new` es ambiguo → `NEW_BY_PARENT` en
  `PlatformHeader` ("Nuevo tenant" bajo tenants, "Nueva ejecución" bajo runs).

### F4 — Detalle de ejecución + case en vivo

**Infra:** extender `use-quality-runs.ts`: `useRunQuery(id)` con
`refetchInterval` → `runPollInterval({status, reloginOpen})` (patrón
`use-tenant-database`), `usePurgeRun` (202), `useRunCaseQuery(runId, caseId)`
(poll mientras el case no esté settled; NO pollear el run entero desde la
vista de case). Tests de polling (terminal → false, relogin → pausa).

**UI:** `runs/detail/` → `RunDetailView` (header + acciones Cancelar/Purgar
con `ConfirmTyped` + banner purged/retención 14 d), `RunSummaryCards`
(StatTiles), `RunMetricsPanel` (null-safe "—"; `latencyTone`;
`queue_depth_samples` solo stress), `RunCasesTable` +
`cases-table.config.tsx` (DataTable modo CLIENTE, ≤200 filas sin virtualizar,
filtros client-side status/escenario), `FailureReasonBadge` (categorías
instrumento/infra/cancelado ≠ fallo del agente); `runs/detail/case/` →
`CaseDetailView` (60/40, apila `<lg`, purged → EmptyState), `TranscriptPanel`
(burbujas por direction/sender_type; body null → omitido), `ChecksPanel`
(✓/✗ + `invalid_criteria` en warning "escenario roto"), `EvaluationPanel`
(sub-scores con `scoreTone`, issues por severidad), `TimingsPanel`. Tests:
purged, invalid_criteria, evaluation null, aplanado.

**Rutas:** `quality/runs/[runId]/{page,loading}`,
`quality/runs/[runId]/cases/[caseId]/{page,loading}`. Activar link de fila en
`RunsView`; wizard hace push al detalle. LABELS `cases`.

**Aceptación:** detalle vivo cada ~3 s con stop en terminal y pausa con
ReLoginModal; cancelar/purgar con 409 mapeados y purging→purged reflejado;
case crece en vivo; stress (scenario null) y purged no rompen.

**Notas de implementación (post-F4):**
- La tabla de cases SÍ usa `DataTable` (modo cliente): los cases llegan
  completos y su búsqueda local por escenario es útil — a diferencia de la
  lista de runs (server, sin search).
- Case purgado: la sección de transcript no se renderiza (el EmptyState
  "Datos purgados" lo explica); checks/scores/timings agregados se conservan.
- `queue_depth_samples` (solo estrés) se expone colapsado en crudo
  (`<details>` + JSON) — es material de diagnóstico, no dashboard.
- Los UUID de runId/caseId caen en la rama `UUID_LIKE` del breadcrumb (id
  corto); no se resuelve nombre — el header de la vista ya da el contexto.
- Verificación E2E pendiente de una ejecución QA REAL (usa el agente y el
  juez con LLM de verdad → costo): los paneles de checks/juez quedan
  cubiertos por unit tests y render defensivo.

### F5 — Depurador de conversaciones

**Infra:** `use-quality-debug.ts` (`useDebugContactsQuery(companyId, search)`
con `enabled`, `useDebugConversationsQuery` — respuestas `{data}` cap 25 sin
meta) y `infrastructure/api/quality-report.ts` —
`downloadConversationReport()` con `fetch` manual + `getPlatformToken()` +
blob + `URL.createObjectURL`; `!ok` → `parseHttpError`; helper puro exportado
`parseContentDispositionFilename()` (+ tests, mock de `createObjectURL` en
jsdom).

**UI:** `debugger/` → `DebuggerView` (TenantSelect → búsqueda debounced →
master-detail; aviso permanente de auditoría; nota "máx 25, refina la
búsqueda"), `ContactsList` (badge "Simulada"), `ConversationsList` (preview,
estado, badge, botón descarga), `ReportDownloadDialog` (advertencia PII/IP
OBLIGATORIA + formato md/json + `include_raw` + loading). Tests del flujo
encadenado y del diálogo.

**Rutas:** `quality/debugger/{page,loading}`. `QualityTabs` añade
"Depurador". LABELS `debugger`.

**Aceptación:** flujo tenant → contacto → conversación → descarga md/json
(nombre desde Content-Disposition o fallback); advertencia siempre previa;
token vencido → error legible.

---

## 6. Verificación (por fase y final)

1. `npm run lint` limpio en lo tocado; `npm test` verde (tests de
   dominio/hooks/componentes junto al código).
2. `npm run api:types:check` sin drift.
3. Verificación visual en WSL: light + dark por vista; estados
   cargando/vacío/error de cada vista.
4. E2E manual contra backend local: el seed trae 7 escenarios system + suite
   `basic_smoke` → clonar escenario, crear suite, lanzar QA mock contra tenant
   demo (`npm run provision:all`), seguir polling, cancelar, purgar
   (ConfirmTyped), descargar reporte md de una conversación simulada.
5. Al cerrar el módulo: actualizar `docs/modules/platform.md` y checklist QA
   equivalente a `docs/modules/platform-qa.md`; reindexar `codebase-memory`.

## 7. Riesgos aceptados / gaps documentados

- **Agentes vía `agents-health`** (payload de toda la plataforma, filtro en
  cliente) hasta que exista `GET /platform/tenants/{id}/agents`.
- Heurística anti-ReDoS del cliente no idéntica a la del server → el 400/422
  mapeado es la red de seguridad.
- `cases[]` sin paginar (≤200) → sin virtualización; revisar si el backend
  sube el cap.
- Calidad pagina en server (excepción a D5) → DataTable en modo `total` +
  keys con filtros + `keepPreviousData`.
