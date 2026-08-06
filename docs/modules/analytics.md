# Módulo analytics — analíticas del tenant

> Vista `/analytics`: cómo venden y qué tan bien atienden los agentes IA del
> negocio. Tres planos que la UI **jamás mezcla**: funnel determinista (ventas
> exactas → tab Conversión), LLM-judge (juicio de calidad de una IA supervisora
> → tab Calidad, con disclaimer permanente) y alertas de anomalía (transversal
> → tab Alertas + banner). Plan rector: `axi-server/docs/plans/analytics_tenant_frontend_plan.md`.

## A. Preguntas y fuentes de datos

Backend F13 (`/analytics/*`). Permisos: `analytics:read` (lecturas) y
`analytics:manage` (evaluar, calibrar, ack). RBAC natural: sin `read` no se
pide nada (la ruta ni aparece en el sidebar); las acciones solo se renderizan
con `manage`. Errores RFC 7807 por `code`; el 404 de evaluación de una
conversación es **estado** ("sin evaluar"), no error.

| Sección | Pregunta | Endpoint | Cuándo |
|---|---|---|---|
| KPIs + embudo + serie + desglose agente | ¿Cuánto vendo? | `GET /analytics/funnel?period&group_by=agent` | mount tab Conversión |
| Desglose canal/intención | ¿Quién convierte mejor? | mismo endpoint, `group_by=` | clic tab interno (lazy) |
| Score global + tabla agentes | ¿Qué tan bien atienden? | `GET /analytics/agent-performance?period` | mount tab Calidad |
| Top issues | ¿Qué corregir primero? | `GET /analytics/issues/top?period` | mount tab Calidad |
| Evaluaciones | ¿Dónde falló? | `GET /analytics/evaluations?...` (usePaginatedList) | tab Calidad + filtros |
| Detalle evaluación | ¿Qué pasó en ESTA conversación? | `GET /analytics/conversations/:id/evaluation` | abrir Sheet |
| Judge agreement | ¿Confío en el evaluador? | `GET /analytics/judge-agreement` | mount tab Calidad |
| Badge/banner alertas | ¿Algo falla YA? | `GET /analytics/alerts?status=triggered` | mount de la sección |
| Lista de alertas | — | `GET /analytics/alerts?status=` | tab Alertas / cambiar chip |

Acciones (`analytics:manage`): `POST /analytics/conversations/:id/evaluate`
(202, resultado por WS) · `PATCH /analytics/evaluations/:id/review` (204,
calibración) · `POST /analytics/alerts/:id/ack` (204).

## B. Estructura del slice

```
src/modules/analytics/
├── domain/           analytics.ts (DTOs de Schemas + períodos/tabs), labels.ts (copy es-CO + scoreBand)
├── infrastructure/
│   ├── services/     analytics-service.adapter.ts (1 fn por endpoint F13)
│   ├── stores/       analytics.store.ts (Zustand: período + secciones lazy por tab + reducers WS)
│   └── realtime/     use-analytics-realtime.ts (AV3: analytics.alert + evaluation_completed)
└── ui/               AnalyticsView.tsx (tabs sync URL), AnalyticsPageSkeleton, AnalyticsSkeletons,
                      components/ {AlertsBanner, AnalyticsPeriodSelector,
                                   conversion/*, quality/* (AV2+), alerts/* (AV4),
                                   charts/ {FunnelBars, ScoreRing, BarStacked, SubScoreBars}}
```

- `page.tsx` → `<AnalyticsView />` bajo `<Suspense>` (usa `useSearchParams`);
  `loading.tsx` → `<AnalyticsPageSkeleton />`. Vive en el grupo `(content)`.
- URL como estado: `/analytics?tab=conversion|calidad|alertas&period=7d|30d|90d`
  (defaults `conversion`, `30d`). Deep-links de Calidad: `?issue=` y `?eval=`.

## C. Estado y tiempo real

- **Store** (`analytics.store.ts`): cada sección es `Section<T> =
  { status, data, error }`. Carga **lazy por tab con cache** (volver no
  re-fetchea); `setPeriod` re-fetchea SOLO lo ya pedido; en refetch se
  conservan los datos viejos (shimmer `opacity-60`, nunca skeleton). El
  desglose "¿Quién convierte mejor?" cachea por dimensión (agente se siembra
  del fetch del funnel; canal/intención lazy).
- **Voz (§10.5 F5)**: quinta sección del tab Conversión (`VoiceCard`), con
  ámbito de **CICLO de facturación** — `setPeriod` NO la re-fetchea a
  propósito. `getVoiceUsage()` compone `/usage/summary` (cuota + ventana) con
  `/usage/history?metric=tts_characters&granularity=day` acotada al ciclo
  (serie, costo de la voz y notas reales por `event_count`); el mapper puro es
  `voiceUsageFromSources` (domain, testeado). La tabla "Calidad por agente"
  añade la columna secundaria "Notas voz" (`voice_replies`, entregadas en el
  tooltip; `—` = agente sin voz).
- **Semáforo fijo** (`labels.ts#scoreBand`): ≥80 `success` · 50–79 `warning` ·
  <50 `destructive`; `hallucination_severity=major` → destructive SIEMPRE.
- **Realtime** (AV3/AV4, ns `/inbox`): `analytics.alert` → badge inmediato +
  floating-alert + re-fetch de lista si está `ready`; `analytics.evaluation_completed`
  → re-fetch de Calidad + actualización del Sheet abierto. El tab Conversión NO
  escucha WS (agregado del período).

## D. Diseño

- Header persistente: título + subtítulo + `AnalyticsPeriodSelector` propio
  (7/30/90 días — el del dashboard usa otra escala) + `AlertsBanner` (glass,
  única superficie flotante) + tabs con badge de alertas.
- **FunnelBars** (`charts/`): embudo CUSTOM con divs (no Recharts): % de
  conversión entre etapas client-side, rama paralela de citas, fugas con
  cross-link a Calidad; barras animadas en cascada 80 ms (`spring.soft`,
  gateado por `useReducedMotion`). Serie temporal con `AreaTrend` del dashboard
  (brand + violet); charts con `next/dynamic({ ssr:false })`.
- Se reutiliza del dashboard: `MetricTile`/`DashboardCard`/`CardEmpty`,
  `AreaTrend`, `chart-theme.ts`. Cards de datos **sólidas**; `tabular-nums`
  en todo número; `formatMoney(cents, currency)` es-CO.
- Estados por card: skeleton forma-fiel solo primera carga; error con
  `errorMessage(err)` + Reintentar (no tumba el tab); empty con copy es-CO.

## E. Verificación

- `npm run api:types` (DTOs F13 ya en el spec) → `npx tsc --noEmit` →
  `npm run lint` → `npx jest src/modules/analytics` → `npm run build`.
- Tests del store: carga lazy con cache, reintento tras error, re-fetch
  selectivo por período, reducers de alertas.
- Flujo real (backend :3000, front :3001): `owner@axi.dev` → `/analytics` en
  el sidebar (icono `chart-line`, ya en `NAV_ICONS`); con `operator` la
  sección no aparece y el deep-link muestra el estado sin acceso. Evaluación
  en vivo: `POST /analytics/conversations/:id/evaluate` y observar el WS.
