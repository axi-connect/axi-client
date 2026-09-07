# Módulo `companies` — Mi empresa

> Slice canónico CRUD del panel (`architecture.md` §3.2). Desde 2026-09 la pantalla **Mi empresa** (`/settings/company`) tiene tres pestañas por sub-ruta y la empresa vive en un store reactivo. Plan y decisiones: `axi-server/docs/plans/company_settings_extension_plan.md`.

## Rutas

| Ruta | Pestaña | Backend |
|---|---|---|
| `/settings/company` | General (exacta) | `GET/PATCH /companies/me`, `PUT /companies/me/schedules` |
| `/settings/company/sucursales` | Sucursales | `GET/POST/PATCH/DELETE /companies/me/branches`, `PUT …/:id/schedules`, `GET /geo/search` |
| `/settings/company/pagos` | Medios de pago (solo con capacidad `sales`) | `/payment-methods` (slice `payments`, por su `public.ts`) |

`layout.tsx` monta `CompanySettingsHeader` + `CompanySettingsNav` (`NavTabs`, patrón de la Configuración del CRM). El ítem del sidebar «Métodos de pago» (grupo Ventas, `/settings/sales`) resuelve por `NAV_PATH_ALIASES` a la pestaña de pagos; mientras se está en ella el rastro activo del sidebar es ese ítem, no «Empresa».

## Estado

- `infrastructure/stores/my-company.store.ts` + `useMyCompany()`: `GET /companies/me` una sola vez (single-flight) y reactivo. Guardar General hace `refresh()` y repinta `CompanyIdentity` (sidebar) y `DashboardBanner`. `company-cache.ts` (`loadMyCompanyOnce`/`invalidateMyCompanyCache`) se conserva por compatibilidad delegando en el store.
- Sucursales y medios de pago: estado local de cada pestaña (nadie más los lee en vivo, sin WS).

## Reglas de la pestaña General

- Tarjetas de contenido **sólidas** (`bg-card`); el glass queda para el `DetailSheet`.
- `activity_description` máx. 500 (lo exige el backend). Zona horaria como `Select` sobre `TIMEZONES` de `shared/data/countries.ts` (una sola derivación, compartida con /platform).
- El horario general es el que heredan las sucursales sin horario propio.

## Sucursales

- Formulario en `DetailSheet` + `DynamicForm` (`ui/forms/config/branch.config.tsx`). `BranchLocationField` (`useWatch`) monta `LocationSearch` + `MapPreview` de `shared/components/features/location`; el buscador llama a `searchPlaces` (`shared/api/geo-service.adapter.ts` → `/geo/search`, core, sin capacidad de plan). Un 429 del carril de OpenStreetMap se ve como «sin sugerencias».
- La primera sede nace principal; solo hay una principal (el backend lo garantiza con índice). `use_company_hours` es solo UI: apagado ⇒ `PUT :id/schedules` con las filas; encendido ⇒ `[]` (heredar).
- Vacío con `company.address` ⇒ «Crear sede principal desde la dirección de la empresa».
- El agente: 0 sedes ⇒ dirección general; 1 ⇒ inline en el prompt; ≥2 ⇒ tool `get_branches`; con `share_location` envía el pin (`content_type='location'`), que el inbox ya pinta con `LocationBubble`.

## Tests

`domain/__tests__/schedules`, `infrastructure/stores/__tests__/my-company.store`, `ui/components/settings/__tests__/CompanySettingsNav`, `ui/forms/config/__tests__/{company,branch}.config`, `ui/components/branches/__tests__/BranchesTab`.
