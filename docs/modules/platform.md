# Módulo Platform — consola super admin de axi (`/platform/*`)

> **Documento del slice `src/modules/platform/`.** Panel interno de administración de la plataforma (empleados de axi): tenants, planes, DB dedicadas, pricing IA, auditoría y salud de agentes cross-tenant. Spec rector: `axi-server/docs/plans/frontend_platform_plan.md`; la excepción de arquitectura está sancionada en `docs/architecture.md` §8.1.
>
> Estado: **FE1 (fundaciones), FE2 (tenants), FE3 (planes y límites) y FE4 (DB dedicada + migración) implementadas**. FE5–FE7 pendientes.

---

## 1. Qué lo hace distinto del panel de tenant

| Aspecto | Panel tenant | Panel platform |
|---|---|---|
| Auth | Cookies HttpOnly + BFF (`/api/auth/*`, `/api/proxy`) | **Token en `sessionStorage`** (`axi.platform.*`) + espejo en memoria; sin refresh (TTL ~15 min → `ReLoginModal` superpuesto, nunca redirect) |
| Autorización | RBAC (`permissions[]`) | **Binaria** (`PlatformGuard`); si estás dentro, ves todo |
| Datos | `HttpClient` + `usePaginatedList` + Zustand | **TanStack Query** (QueryClient dedicado) + **openapi-fetch** (`platformClient`) directo al backend con Bearer |
| Realtime | Socket.IO `/inbox`, `/channels` | **No hay WS** → REST + polling condicional (FE4/FE6) |
| Rutas | `(private)` + middleware edge | `src/app/platform/` está en `PUBLIC_PATHS` (el guard real es client-side; la barrera de seguridad es el backend) |

## 2. Anatomía del slice

```
src/modules/platform/
├── domain/            # auth (claves storage, evento), navigation (nav estático),
│                      #   tenant / plan (tipos derivados de Schemas), catalogs (países/industrias),
│                      #   limits (invariantes validateLimits + catálogos METRICS/PERIODS/ACTIONS),
│                      #   database (máquina de estados, checklist, precondiciones, parseo defensivo),
│                      #   polling (intervalos PUROS: 3s→15s provisión, 5s migración, pausa re-login)
├── infrastructure/
│   ├── api/           # platform-client (openapi-fetch + Bearer + HttpError + evento 401),
│   │   │              #   query-client (staleTime 30s, sin retry 4xx), query-keys (factories)
│   │   └── hooks/     # use-tenants, use-plans, use-tenant-plan,
│   │                  #   use-tenant-database (404→null; poll condicional),
│   │                  #   use-tenant-migrations (poll 5s sobre la más reciente)
│   ├── auth/          # token-storage (sessionStorage+memoria), platform-auth.context (timers T−2min/T−0)
│   └── hooks/         # use-session-countdown
└── ui/
    ├── providers/     # PlatformProviders (QueryClientProvider + PlatformAuthProvider)
    ├── components/    # PlatformGuard/Shell/Sidebar/Header, ReLoginModal, SessionBanner,
    │                  #   SessionCountdownChip, ProblemAlert, StatusBadge, EmptyState,
    │                  #   ConfirmTyped, RelativeDate, StepIndicator (ex-WizardStepper)
    ├── hooks/         # use-copy (portapapeles con feedback — único punto del patrón)
    ├── lib/           # sort-rows (orden client-side genérico de tablas)
    ├── forms/         # PlatformLoginForm
    └── features/
        ├── limits/    # LimitsEditor (COMPARTIDO planes↔tenant) + limit-format (valor por unidad)
        ├── plans/     # PlansView + PlanFormSheet (DetailSheet) + PlanOptionCard (compartida
        │              #   con el wizard) + tabla/acciones
        └── tenants/   # lista (view+config+filter+row actions), wizard/ (4 pasos),
                       #   detail/ (header, tabs, resumen, usuarios, TenantPlanView, ChangePlanDialog,
                       #     database/ → TenantDatabaseView, DatabaseConnectionSheet,
                       #     ValidationChecklist, MigrationSection)
```

Rutas en `src/app/platform/`: `(public)/login` y `(admin)/` (guard+shell) con `tenants/{page,new,[tenantId]/{page,users,plan,database,audit}}`, `plans`, `pricing`, `audit`, `analytics`.

## 3. Decisiones clave (resumen del spec)

- **D1/D2** — Sin refresh: banner T−2 min + `ReLoginModal` bloqueante en T−0/401; el borrador de formularios sobrevive (overlay, no unmount). Token en `sessionStorage` (no persiste entre cierres del navegador).
- **D5** — Ningún listado tiene paginación server → tablas 100 % client-side sobre el **`DataTable` compartido** (que en modo cliente solo pagina): buscar/facetar/ordenar lo hace el contenedor con helpers puros (`tenants-filter.ts`, `sort-rows.ts`). Virtualización: diferida hasta ~200+ filas.
- **D9** — Mutaciones 204/202 sin body → `invalidateQueries` del recurso; **nunca** optimistic updates.
- **D10** — `ConfirmTyped` (escribir el nombre) para suspender tenant y migrate-data (FE4); confirm simple para lo demás.
- **D12** — Enterprise deshabilitado en el alta (tooltip explicativo) — previene el 409 `tenant_db/not_active` por diseño.
- **Sin GET by id de tenant** — el detalle deriva de la caché de la lista (`useTenantQuery` = misma query key + `select`).
- **Credenciales del owner** — el wizard las deja en `sessionStorage` (`axi.platform.pending_credentials`); el banner del detalle las muestra UNA vez y las borra.

## 4. Reutilización (mandato del proyecto)

Del design system: `DataTable`, `DynamicForm` (+builders), `Select/Dialog/Modal/Tooltip/Badge/Button/Input/Skeleton`, `TableSkeleton`, `BrandLoader`, `BrandMark`, `ThemeToggle`, primitivos de sidebar (`sidebar/core.tsx`). De core: `parseHttpError`/`HttpError`, `errorMessage()`, `relativeTime()`, `formatShortDate()`, `useAlert()`. Lo nuevo del slice existe solo donde no había equivalente (StatusBadge semáforo, ConfirmTyped, ProblemAlert…) y se comparte hacia las fases siguientes.

## 5. Identidad visual

Coral = acción (CTAs, paso activo, tab activa) · **violeta = acento de la consola** (badge "Plataforma", pasos completados, fallbacks) · semáforos verde/ámbar/rojo = escala **semántica** independiente de la marca (`StatusBadge`) · rojo destructivo ≠ coral (suspender). Tablas/forms sólidos; glass solo en shell y overlays. `tabular-nums` + `font-mono` en NIT/IDs/conteos.

## 6. Estado por fases

| Fase | Estado |
|---|---|
| FE1 Fundaciones (auth/shell/cliente API) | ✅ |
| FE2 Tenants (lista, wizard, detalle Resumen/Usuarios) | ✅ |
| FE3 Planes y Plan & Límites (`LimitsEditor`) | ✅ |
| FE4 DB dedicada + migración (polling 3s/5s) | ✅ |
| FE5 Pricing + Auditoría (`JsonDiff`) | ⬜ |
| FE6 Analytics + Dashboard (`DegradedBanner`, badge alertas) | ⬜ |
| FE7 Endurecimiento (a11y, E2E) | ⬜ |

## 7. Tests

`__tests__/` junto al código: `token-storage`, middleware de `platform-client` (Bearer/401/HttpError), `use-session-countdown` (fake timers), hooks de tenants (derivación por id + invalidación), `tenants-filter` (búsqueda/facets/orden), `ConfirmTyped` (habilitación por match exacto) y `TenantWizard` (borrador al volver atrás, `nit_taken` → paso 1, alta exitosa → credenciales + redirect).
