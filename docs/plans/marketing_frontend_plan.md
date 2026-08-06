# Plan de implementación — Módulo Marketing (frontend)

> **Plan vivo de ejecución por fases (F0–F6).** Registra las decisiones aprobadas, las desviaciones
> reales del contrato encontradas contra `openapi.json` y el código del backend, y el estado de cada
> fase. El contrato y la anatomía del slice viven en `docs/modules/marketing.md`.
>
> Flujo acordado: **cada fase se aprueba antes de codificarse y cierra con su propio PR**; al
> terminar una fase se reporta y se espera. Estándar de diseño: legible y premium, glass solo en
> superficies flotantes (DESIGN-SYSTEM §5.2), radios generosos, `tabular-nums` en toda cifra.
>
> Backend: `axi-server`, rama `feat/marketing` (8 PRs, último `26b01aa`). Plan del macroproyecto en
> `axi-server/docs/plans/marketing_module_plan.md`; base de conocimiento en
> `axi-server/docs/marketing_frontend_kb.md`.

---

## 1. Estado de fases

| Fase | Contenido | Estado | Hijo de sidebar |
|---|---|---|---|
| F0 | Mockup HTML navegable de alta fidelidad (Artifact privado) | ✅ Aprobado | — |
| F1 | Fundaciones transversales + piezas compartidas + **Resumen `/marketing`** | ✅ Código completo | — (la raíz ya está sembrada) |
| F2 | Promociones y cupones + `catalog/public.ts` + `VariantPicker` | ✅ Código completo | `Promociones` ✅ |
| F3 | Recuperación de ventas (reglas + métricas) | ✅ Código completo | `Recuperación` ✅ |
| F4 | Configuración: ajustes, plantillas, plantillas de Meta y bajas | ✅ Código completo | `Configuración` ✅ |
| F5 | Campañas: lista + wizard de 4 pasos | ✅ Código completo | `Campañas` ✅ |
| F6 | Detalle de campaña en vivo (embudo, destinatarios, ciclo de vida) | ⬜ Pendiente | — |

Orden justificado: F2 antes que F3 porque el editor de reglas **selecciona una promoción**; F4 antes
que F5 porque el wizard **selecciona una plantilla o una HSM aprobada**; F6 depende de F5. F1 va
primero porque `/marketing` ya está sembrado en el sidebar del backend y hoy daría 404.

## 2. Decisiones aprobadas (2026-08-06)

1. **Hijos en el sidebar** (toca el backend): se editan `UI_MODULE_TREE` y su spec en el worktree
   `feat/marketing`. Sin barra de sub-navegación propia (patrón `settings/*`, no `CrmNav`).
2. **Tipos generados desde el worktree del backend**, no desde `main`:
   `npx openapi-typescript ../axi-server/.claude/worktrees/feat-marketing/openapi/openapi.json -o src/core/api/schema.d.ts`.
   Verificado que el spec de `feat/marketing` es **superconjunto estricto** del de `main` (0 paths y
   0 schemas perdidos), así que al mergear el backend `api:types:check` queda verde.
3. **Acento secundario del módulo: ámbar.** El violeta queda EXCLUSIVO del `AiBadge` (✦IA). Nunca
   los dos acentos en la misma vista (DESIGN §3.1). El coral solo es acción; destructivo es rojo.
4. **Audiencia: segmento CRM + constructor ad-hoc completo** (las 11 claves del DSL), extrayendo el
   builder que ya existe en el CRM en vez de duplicarlo (F5).
5. **El nodo `marketing` conserva su página** (`path: '/marketing'` = Resumen) y gana 4 hijos: es el
   patrón exacto de `crm` en el seeder. Evita una fila "Resumen" redundante.
6. **Cada fase siembra su propio hijo de sidebar**: ningún ítem del menú apunta nunca a un 404.
7. **Vistas documentales bajo `(private)/(content)/marketing/*`, sin `data-app-view`**: son listas,
   formularios y paneles; crecen y scrollea el panel. Cero riesgo del post-mortem del doble scroll.
8. `page.tsx` de 4–8 líneas delegando en una `*View` del slice (patrón nuevo del repo).
9. El embudo se dibuja con divs + framer-motion, no con Recharts: cinco barras no justifican cargar
   una librería de charts en la ruta.

## 3. Desviaciones del contrato real (verificadas contra `openapi.json` y el código del backend)

1. **`channel.template_status_changed` NO EXISTE.** La KB §7 lo anuncia, pero no está en
   `REALTIME_EVENTS` del backend ni lo emite nadie. → la pantalla de HSM (F4) **no refresca por WS**:
   sincronización manual + refetch. Los eventos reales son los **seis** `marketing.*`.
2. **`/marketing/automations`, `/promotions` y `/templates` NO paginan ni buscan** (cero query
   params): devuelven la colección completa. Filtrado, orden y búsqueda **en cliente**;
   `usePaginatedList` NO aplica ahí. Sí paginan `campaigns`, `recipients`, `opt-outs` y `redemptions`.
3. **La lista de campañas no trae stats.** Cada funnel cuesta un `GET :id/stats`. Prohibido el
   fan-out sobre la lista: el Resumen solo pide las que están en vuelo, con tope de 5, y **avisa**
   cuántas dejó fuera.
4. **`preview-audience` es un POST sobre una campaña que ya existe** → el wizard (F5) tiene que
   crear el borrador al salir del paso 1. No es un formulario en memoria.
5. **`sample_opted_out` es una MUESTRA** (cap 1000 server-side): se presenta como estimación, nunca
   como cifra exacta.
6. **`PATCH` de campaña solo en `draft|scheduled`** (409 `campaign_not_editable`); `DELETE` solo en
   `draft`. Las acciones se derivan de predicados puros, no de un `try/catch`.
7. **No hay endpoint de variantes planas** del catálogo: `gift_variant_id` exige un picker de 2
   pasos (`GET /catalog/products?q=` → `GET /catalog/products/:id`).
8. **`AutomationDto.conditions` llega como `object` sin tipar** → tipo local + `parseConditions`
   defensivo que degrada a `{}` igual que el backend, en vez de lanzar.
9. **`AutomationDto.promotion` viaja embebida** `{id,name,kind}` pero se crea/edita con `promotion_id`.
10. **El conjunto de `skip_reason` es mayor que el de la KB §5.1**: es la unión de
    `RouteUnavailableReason` + `NotifySkipReason` + los propios del dispatch. Mapeados los 21; un
    motivo desconocido se muestra **crudo**, nunca traducido a la fuerza.
11. **`completed` ≠ entregado**: se etiqueta **"Procesada"**, nunca "Completada".
12. **El DTO de promoción no expone los cupones vencidos**: solo `coupons_issued` y
    `redemptions_recorded`. No existe "cupones vigentes" — se etiqueta "sin canjear".
13. ~~**`PromotionDto` no traía el nombre de la variante de regalo**~~ — **RESUELTO en el
    backend (2026-08-06)**: `PromotionDto.gift_variant` embebe ahora `{name, sku, product_name}`.
    Era la única alternativa razonable: no hay endpoint de variante suelta y resolverlo en el
    cliente costaba recorrer el catálogo producto a producto. El frontend lo consume con
    `giftVariantLabel()` y la promoción de regalo ya se etiqueta con su nombre real.
14. **No hay agregado de ingresos por período.** `attributed_revenue_cents` es por regla y de todo el
    histórico. → el KPI se llama **"Recuperado por tus reglas"**, no "Recuperado · 30 días" como
    proponía el mockup: no se puede acotar a 30 días sin inventar el dato.

## 4. Piezas existentes reutilizadas (no reinventadas)

| Pieza | Ruta |
|---|---|
| `DataTable` + `usePaginatedList` + `buildListParams` | `shared/components/features/data-table/`, `shared/api/` |
| `DynamicForm` + `createInputField`/`createCustomField` | `shared/components/features/dynamic-form/` |
| `DetailSheet`, `MultiSelect`, `FieldList`, `Timeline`/`AiBadge`, `OptionsInput` | `shared/components/features/` |
| `TableSkeleton` / `FormSkeleton` | `shared/components/features/loading/` |
| `formatMoney`, `parseMoneyToCents`, `relativeTime`, `formatShortDate`, `toCsv` | `core/lib/` |
| `errorMessage`, `applyServerValidation`, `HttpError.is()` | `core/lib/error-messages.ts`, `core/api/problem.ts` |
| `useSocket` / `useSocketEvent` | `core/realtime/` |
| `useAuth().hasPermission` | `shared/auth/auth.hooks.ts` |
| `useAlert().showAlert/showModal` | `core/providers/alert-provider.tsx` |
| DSL de audiencia (`SegmentFilters`, `compactSegmentFilters`, builder) | `modules/crm/` — se extrae y publica en F5 |

### Piezas promovidas a `shared/` en F1 (de-duplicación real, cero churn)

Cuatro piezas estaban atrapadas en un slice y marketing no podía importarlas (frontera §3.3.5). Se
movieron a `shared/` y **el archivo original quedó como re-export de una línea**, así que sus 22
consumidores no se tocaron:

| De | A |
|---|---|
| `modules/platform/ui/components/EmptyState.tsx` | `shared/components/features/empty-state/` (+ prop `accent` y variante `solid`/`dashed`) |
| `modules/platform/ui/features/dashboard/StatTile.tsx` | `shared/components/features/stat-tile/` (+ tonos `amber`/`success`/`destructive` y `hint`) |
| `modules/catalog/ui/components/PriceInput.tsx` | `shared/components/features/price-input/` |
| `modules/dashboard/ui/components/charts/chart-theme.ts` | `shared/components/features/charts/chart-theme.ts` (saldó de paso el import por ruta profunda que hacía `analytics`) |

Y dos piezas nuevas genuinamente reutilizables:

- **`shared/components/layout/page-header.tsx`** — el patrón estaba copiado a mano en ~12 vistas con
  tamaños y espaciados que no coincidían.
- **`shared/components/features/status-badge/`** — el semáforo de `platform` generalizado: el
  componente renderiza y **cada slice aporta su mapa** estado→tono. Los tipos viven en un `types.ts`
  sin React para que los mapas puedan declararse en un `domain/` puro.

## 5. Rendimiento (requisitos, no aspiraciones)

1. **Nada de fan-out de stats**: solo campañas en vuelo, tope 5 (`LIVE_CAMPAIGNS_CAP`), en paralelo,
   y las omitidas se anuncian en la UI.
2. **Métricas por regla solo de las ENCENDIDAS**, tope 10 (`AUTOMATION_METRICS_CAP`).
3. **Polling puro y derivado del estado**: `campaignPollInterval(status)` — `running` 15 s,
   `scheduled`/`paused`/`completed` 60 s, `draft`/`cancelled` nunca. Testeado sin montar un hook.
4. **WS dirigido**: cada evento muta el store; solo `campaign_progress` refetchea, y solo SU campaña.
5. **Sin `data-app-view`**: el shell no cambia de modo de scroll.
6. `"use client"` solo en las `*View`; las `page.tsx` son server components.
7. `extraParams` de `usePaginatedList` siempre memoizado (depende de la referencia) y reset explícito
   a página 1 al cambiar filtros: el hook no lo hace solo pese a lo que promete su JSDoc.

## 6. Verificación por fase

- `npx tsc --noEmit` · `npx eslint <lo tocado>` · `npx jest` · `npx next build`.
- `npm run api:types:check` **solo tendrá sentido tras mergear el backend a main** (decisión 2).
- Visual: se levanta un **stub del backend** (`scratchpad/stub-server.mjs`) y la app compilada, y se
  captura en claro, oscuro y ancho móvil con un guard automático de desbordamiento horizontal.
  Levantar `axi-server` desde el worktree de marketing aplicaría sus migraciones a la BD de
  desarrollo compartida: es una decisión del usuario, no del agente.

### Estado de F5

- Backend: hijo `marketing_campaigns` en el seeder, **primero** de los cuatro (el orden del array es
  el orden del menú y campañas es la cabecera del módulo).
- **`AudienceFilterBuilder` extraído del CRM**, no reimplementado: el constructor de las 11 claves
  del DSL y `describeSegmentFilters` vivían privados dentro de `SegmentsManager.tsx`. Ahora el
  componente es controlado (`{value, onChange, tags, idPrefix, disabled}`), la descripción humana es
  una función pura de `crm/domain/segment.ts`, y ambos se publican por `crm/public.ts`.
  `SegmentsManager` adelgaza ~185 líneas y sigue guardando exactamente el mismo DSL — eso es lo que
  fijan los **10 tests de regresión** que clavan la cadena de descripción carácter a carácter.
- **El wizard crea el borrador al salir del paso 1.** No es una elección de diseño: `preview-audience`
  es un POST sobre una campaña que ya existe (§ desviación 4), así que sin crearla antes no hay a
  quién preguntarle por la audiencia. El aviso del paso 1 lo dice con esas palabras.
- Las bajas se presentan **siempre como estimación** ("≈ 1.000 recibirán · estimado sobre una muestra
  de 1.000"): el backend las cuenta sobre una muestra de 1.000, no sobre el total.
- La lista **no pide stats**: el endpoint de listado no las trae y pedirlas por fila sería una
  petición por campaña. El embudo vive en el detalle (F6), que es donde se mira.
- Acciones por fila derivadas de **predicados puros** (`canPause/canResume/canCancel/canDelete`), no
  de un `try/catch` contra el backend: un botón que solo falla al pulsarlo es un botón que miente.
- `defaultScheduleSlot()` nació de la verificación visual: el valor por defecto al marcar "Programar"
  era hoy a las 9:00 y aparecía ya vencido, obligando a corregir un aviso nada más marcar la opción.
  Ahora es la siguiente hora en punto con dos horas de margen, y de noche salta a mañana a las 9:00.
- **26 tests nuevos** (10 de regresión del CRM, 17 de dominio del wizard, 8+7 de vista en 2 suites).
  Suite completa: **861 verdes**. Rutas: `campaigns` 9,4 kB · `campaigns/new` 7,0 kB.
- Verificación visual sobre la app compilada en claro, oscuro y ancho móvil, recorriendo los cuatro
  pasos del wizard con el stub del backend: sin errores de página ni desbordamiento horizontal.

### Estado de F4

- Backend: hijo `marketing_settings` en el seeder (último de los tres, que es su sitio en el menú).
- **`modules/channels/public.ts` nuevo**: la pantalla de HSM necesita saber qué canales cloud hay, y
  `listChannels` ya existía en ese slice. Publicarlo por su barrel es lo correcto; duplicar la
  llamada a `/channels` desde marketing habría dejado dos dueños del mismo recurso.
- Sub-navegación por **segmento de ruta** (`crm/settings` como referencia): cada pestaña tiene su
  propio fetch y su propio estado, así que merece URL propia y que el back del navegador funcione.
- Los ajustes parten SIEMPRE del GET y reenvían la sección completa (el PUT no admite parches).
  Si el GET falla **no se ofrece guardar**: escribir sobre defaults inventados pisaría la
  configuración real del tenant.
- La pantalla de HSM cuenta *cuántas sirven de verdad* y, en las que no, muestra **el motivo** en
  vez de su texto: una `utility` aprobada se ve bien y falla al lanzar la campaña.
- **31 tests nuevos** (19 de dominio, 12 de vista en 2 suites). Suite completa: **819 verdes** en
  36 s. Las cuatro rutas entre 6 y 8 kB.

### Estado de F3

- Backend: hijo `marketing_automations` en el seeder + spec (11 tests verdes).
- `domain/template.ts` es un **espejo exacto** del `template_renderer.ts` del backend (catálogo de
  variables, patrón de placeholder y normalización). Se replica y no se aproxima porque la vista
  previa tiene que enseñar EXACTAMENTE lo que recibirá el cliente, incluido cómo se cierran los
  huecos cuando una variable no tiene dato.
- Reglas agrupadas por disparador y ordenadas por prioridad: es el orden en que el backend las
  evalúa (first-match-wins), y una lista plana escondería la única relación que importa entre ellas.
- Encender exige confirmación que dice qué va a pasar; `deal_stalled` sin plantilla de Meta queda
  bloqueado ANTES del clic, no con un 422 después.
- El desglose de omitidos excluye los motivos transitorios (cooldown, cupo diario) porque no son
  contactos perdidos. Cuando TODOS los omitidos son transitorios se explica en la fila, en vez de
  decir "sin omisiones" con el contador en 3.
- **46 tests nuevos** (17 del renderizador, 18 de la config del formulario, 11 de la vista).
  Suite completa: **790 verdes**. `/marketing/automations` en 12 kB.

### Estado de F2

- Backend: hijo `marketing_promotions` en `UI_MODULE_TREE` + su spec (11 tests del seeder verdes).
  Los hijos se siembran **fase a fase**, no todos de golpe.
- `modules/catalog/public.ts` nuevo + `VariantPicker` en dos pasos (producto → variante), que es la
  única forma posible: las variantes solo llegan embebidas en el producto completo.
- Formulario con parámetro condicional por `kind`: el que no aplica se manda `null`, no basta con
  ocultarlo (el backend rechaza con 422 lo que sobre).
- **34 tests nuevos** (14 de la config del formulario, 10 de la vista, 4 del filtro de estado en el
  dominio, +6 previos). Suite completa: **744 verdes**. `next build` verde;
  `/marketing/promotions` en 16,5 kB.
- Verificado visualmente en claro, oscuro y móvil sobre la app compilada con el stub del backend.

### Estado de F1

- Dominio puro: **52 tests**. Vista: **6 tests de integración** con adapters mockeados.
- Suite completa: **716 tests verdes**. `tsc` y `eslint` limpios. `next build` verde, `/marketing`
  en 12,8 kB (146 kB First Load).
- Verificado visualmente en claro, oscuro y móvil sobre la app compilada.
