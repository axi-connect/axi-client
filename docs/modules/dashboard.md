# Módulo dashboard — panel de inicio del tenant

> Vista `/dashboard`: primera pantalla tras el login. Responde de un vistazo las
> preguntas de negocio del dueño/operador con estética premium (iOS): banner de
> marca, KPIs, gráficos y paneles de estado. Sin saturar, sin doble scroll.

## A. Preguntas y fuentes de datos

El dashboard **no tiene endpoint agregado propio**: compone stats de varios
slices y pide **solo lo que el rol permite** (RBAC natural, sin 403). Las
llamadas van en paralelo (`Promise.all`) en `dashboard.store#load()`.

| Sección (card) | Pregunta | Endpoint | Permiso |
|---|---|---|---|
| SalesTiles | ¿Cómo van mis ventas? | `GET /orders/stats?period=` | `orders:read` |
| AttentionPanel | ¿Qué requiere mi atención? | `GET /inbox/counts` | `conversations:read` |
| ConversationsFlowCard | Flujo de conversaciones | `GET /inbox/stats?period=` † | `conversations:read` |
| NewCustomersCard | Clientes nuevos (CRM) | `GET /contacts/stats?period=` † | `contacts:read` |
| TopProductsCard | Top productos | `GET /orders/top-products?period=&limit=` † | `orders:read` |
| SystemHealthPanel | ¿Está todo funcionando? | `GET /channels` + `ai_paused` | `channels:read` (+ `usage:read`) |
| UsagePanel | ¿Cuánto plan he consumido? | `GET /usage/summary?period=billing_cycle` | `usage:read` |

† Endpoints **nuevos** creados en axi-server para este módulo (los demás ya
existían). Cortes de fecha en el timezone del tenant (luxon); series agrupadas
en JS desde filas tenant-scoped (sin raw SQL). El `ai_resolved_pct` es
heurístico (por `assigned_user_id`) — afinar con `ConversationEvent` si hace
falta más precisión.

## B. Estructura del slice

```
src/modules/dashboard/
├── domain/           dashboard.ts (DTOs + labels + períodos), health.ts (nivel de sistema)
├── infrastructure/
│   ├── services/     dashboard-service.adapter.ts (1 fn por fuente)
│   ├── stores/       dashboard.store.ts (Zustand: período + secciones + reducers WS)
│   └── realtime/     use-dashboard-realtime.ts (re-fetch selectivo con debounce)
└── ui/               DashboardView.tsx, DashboardSkeleton.tsx, components/ (+ charts/)
```

- `page.tsx` → `<DashboardView />`; `loading.tsx` → `<DashboardSkeleton />`
  (skeleton estructural). La vista vive en el grupo `(content)`: hereda el
  centrado `max-w-7xl` y la superficie degradada; **no** añade contenedores con
  scroll/alto propios (scroll único del panel privado).

## C. Estado y tiempo real

- **Store** (`dashboard.store.ts`): cada sección es `{ status, data, error }`.
  `load(perms)` dispara en paralelo solo las permitidas; `setPeriod(p, perms)`
  recarga las secciones dependientes del período.
- **Realtime** (`use-dashboard-realtime.ts`, `useSocket`): re-fetch **selectivo
  con debounce** — `order.*` → ventas + top productos; `conversation.*` →
  atención + flujo; `usage.updated` → consumo; `usage.alert` → marca métrica;
  `channel.status_changed` (ns `/channels`) → actualiza el canal **en sitio**
  sin recargar. Clientes nuevos: solo por período.

## D. Diseño

- **Banner** (`DashboardBanner`): identidad de la empresa protagonista (logo vía
  `Avatar` con `isotype_url`, fallback `BrandMark`; nombre en Nexa) + isotipo
  Axi como sello + `PeriodSelector`. Fondo `.bg-brand-gradient-tri` a baja
  opacidad (único momento hero permitido, DESIGN §3.2). Línea de estado derivada
  de métricas ya cargadas.
- **Charts** (`charts/`): Recharts cargado con `next/dynamic({ ssr:false })`
  (code-split, fuera del bundle inicial). Colores desde la paleta de dataviz
  como `var(--color-*)` (`chart-theme.ts`) — light/dark automático, sin hex.
  Altura fija (`ResponsiveContainer`) → sin scroll anidado. Animación off bajo
  `prefers-reduced-motion`.
- Cards de datos **sólidas** (nunca glass); `tabular-nums` en métricas; empty
  states amables por card para tenants sin datos.

## E. Verificación

- Backend: `npm run typecheck`, `npm run lint`, `npm run openapi:generate`;
  curl de `/inbox/stats`, `/contacts/stats`, `/orders/top-products` con token
  demo (`owner@axi.dev`).
- Frontend: `npx tsc --noEmit`, `npm run lint`, `npm test` (store: carga
  condicional por permiso + reducers WS), `npm run build`.
