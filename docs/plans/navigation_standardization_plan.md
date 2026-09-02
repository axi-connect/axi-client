# Plan — Nav público de conversión + estandarización de pestañas del panel

> Aprobado el 2026-08-24. Worktree `feat/navigation-standardization`.
> Dos frentes independientes, dos PRs. Reglas: `docs/architecture.md`,
> `docs/design/DESIGN.md`, `docs/design/DESIGN-SYSTEM.md`.

## Contexto

Dos problemas distintos, un mismo síntoma: **la navegación de axi no está a la altura del producto**.

**Nav público.** El header (`SiteHeader.tsx`) quedó saneado en F2 del GTM (rutas reales, a11y, `glass-overlay`), pero es un menú de dos desplegables de 320px con cinco enlaces de texto. El producto tiene once áreas de capacidad, cuatro canales, tres pilotos reales con 185 productos y un diferenciador de adopción que nadie más tiene (conectar el número actual y vender el mismo día) — y nada de eso se ve en el menú. Además el modelo era **alta asistida, sin auto-registro** *(superado en 2026-09 por el registro autoservicio `/comenzar`, ver `onboarding_self_service_plan.md`)*: el único acto de conversión era agendar la demo o escribir por WhatsApp, así que cada superficie del nav tenía que empujar ahí. Hoy tres de los cinco ítems del nav llevan a un andamio (`PageOutline`, marcado como provisional) y "Precios" es un ancla dentro de una landing de doce secciones.

**Pestañas del panel.** Hay **tres lenguajes visuales distintos** para la misma idea, con 23 copias del mismo código:

| Familia | Aspecto | Copias |
|---|---|---|
| A — navs de sección por ruta | subrayado `border-b-2` + `text-brand` | 7 |
| B — `Tabs` de Radix | rectángulo `bg-muted` gris | 5 archivos (6 instancias) |
| C — segmentados ad-hoc | pill coral sólido (4 variantes de padding/tamaño) | 11 |

Y arrastran dos defectos reales: la familia C declara `role="tab"` **sin `tabpanel`** (miente al lector de pantalla: son filtros, no pestañas) y ninguna tiene navegación por flechas ni indicador animado. El resultado se lee como tres productos pegados, no como uno.

**Resultado esperado:** un nav público que explica el producto y desemboca en la demo, y **un solo lenguaje de pestaña** en todo el panel — la pastilla de la referencia, con semántica correcta por familia y una sola implementación.

---

## Decisiones cerradas

| # | Decisión | Fuente |
|---|---|---|
| D1 | Mega-menú de Radix `navigation-menu` en el nav público, **+ 3 páginas nuevas** de conversión: `/precios`, `/casos`, `/integraciones` | usuario |
| D2 | Se unifican **las tres familias** de pestañas con el diseño pastilla | usuario |
| D3 | Etiquetas **híbridas responsive**: `>=md` todas visibles con pastilla animada; `<md` solo la activa. Prop `labels="auto \| always \| active"`, `auto` por defecto | usuario |
| D4 | **Activo = `bg-accent` + `text-accent-foreground` + icono `text-brand`**, no coral sólido. Razón dura: `#e65759` con texto blanco da ~3.1:1 y **no pasa AA** (el pill sólido actual ya lo incumple a `text-xs`); `--color-accent` es coral al 14% sobre el fondo y `--color-accent-foreground` es el `foreground` pleno. Además es exactamente el tratamiento activo del sidebar (DESIGN-SYSTEM §9.2) ⇒ un solo lenguaje de navegación en todo el producto | equipo |
| D5 | **Semántica por familia, aspecto único**: A = `<nav>` + `Link` + `aria-current` (es navegación, no pestañas); B = Radix `Tabs` (role tab/tabpanel, flechas gratis); C = `role="radiogroup"` + `aria-checked` con roving tabindex (arregla el `role="tab"` huérfano de hoy) | equipo |
| D6 | **Revierte la decisión de F2** de `public-gtm-plan.md` ("no instalar `navigation-menu` para no cambiar el markup aprobado"). Se instala, y se conserva íntegro lo que F2 ganó: apertura por hover **y** click/teclado, `Escape`, `glass-overlay`, CTA sensible a la sesión con `splash.start()`, badge "Pronto", `useBodyScrollLock` | equipo |
| D7 | Un solo worktree, **dos PRs** (uno por frente): son independientes y el frente B toca 23 archivos | equipo |

### Lo que NO se acepta del componente de referencia

- **`GridCard` con `Math.random()`** para el patrón de rejilla → rompe la hidratación SSR (prohibido en DESIGN-SYSTEM §9.1). Se sustituye por un patrón **determinista derivado del índice**.
- **`GridCard` con hex crudos** (`#F35066`, `#9071F9`, `#5182FC`) en el `conic-gradient` → viola el mandamiento 2 ("ningún hex fuera de `globals.css`"). Se reemplaza por el **gradiente tricolor de marca** (`--axi-brand` → `--axi-amber` → `--axi-violet`).
- **`BottomNavBar` con estado interno** (`useState` + `navItems` hardcodeados) → inservible como primitivo. Se reescribe **controlado** (`value`/`onValueChange`).
- **Animar `width`/`marginLeft`** de la etiqueta contradice "solo `transform`/`opacity`" (§6). Se acepta como **escape documentado** — misma excepción que el despliegue del sidebar: <=8 ítems — y se **anula con `useReducedMotion`**. La pastilla activa va con `layoutId` (transform puro).
- `framer-motion`, `lucide-react`, `accordion`, `sheet`, `tabs` **ya están instalados**. Lo único nuevo: `@radix-ui/react-navigation-menu`. `tw-animate-css` **no** se instala.

---

## Fase 0 — Mockups para aprobación (gate)

Dos Artifacts privados HTML navegables de alta fidelidad:

1. **`nav-publico.html`** — header en reposo y con scroll (`glass`), los tres mega-menús abiertos, el menú móvil, light y dark.
2. **`tabs-panel.html`** — el primitivo en sus tres semánticas y sus tres modos de etiqueta, con la pastilla animada, contadores, punto de "cambios sin guardar", desbordamiento con scroll, light y dark, y un antes/después de las tres familias.

**No se escribe código de producción hasta que los mockups estén aprobados.**

---

## Frente A — Nav público de conversión

### A1 · Arquitectura de información

```
α axi connect   Producto ▾   Soluciones ▾   Integraciones ▾   Precios   Casos
                                        ☀◐☾ · Iniciar sesión · [ Agenda tu demo → ]
```

`Marketplace` sale de la barra (no convierte, no existe aún) y pasa a la columna derecha de "Producto" con su badge **Pronto**.

**Producto ▾** — *lo que ya hace, no roadmap*

| Tarjeta (grid 3+2, `GridCard` de marca) | Destino |
|---|---|
| Agente vendedor · *Cotiza y cierra dentro del chat* | `/productos#agente` |
| Inbox y handoff · *Tu equipo entra sin fricción* | `/productos#inbox` |
| CRM, leads y contactos · *El pipeline se llena solo* | `/productos#crm` |
| Catálogo y agenda · *Stock real, citas reales* | `/productos#catalogo` |
| Medición en pesos · *Cuánto vendió cada conversación* | `/productos#medicion` |

Columna derecha: `Cómo funciona` → `/#como-funciona` · `Preguntas frecuentes` → `/#preguntas` · `Marketplace` **[Pronto]** → `/marketplace` · `Ver todo el producto` → `/productos`.
Barra inferior del panel: «7 días de prueba con el producto completo» + `[Agenda tu demo]` + `Escríbenos por WhatsApp` (vía `salesWhatsAppUrl()`, arquitectura §13.1 — jamás un `wa.me` a mano).

**Soluciones ▾** — cuatro tarjetas → `/soluciones#califica · #cierra · #retiene · #agenda`.
Columna derecha **«Por industria»** (mata la objeción "mi negocio es distinto", la más cara del embudo): Retail y moda · Comida y restaurantes · Servicios con agenda · Educación y formación · Alto ticket → anclas de `/casos`.

**Integraciones ▾** — Canales: WhatsApp Cloud API · **WhatsApp Web, «conecta tu número actual y vende hoy»** · Instagram Direct · Messenger.
Columna derecha: Shopify · Medios de pago (Nequi · Daviplata · Bancolombia) · Voz del agente · `Ver todas` → `/integraciones`.

**Por qué estas tres páginas y no otras.** Cubren los tres huecos donde hoy se pierde la conversión: el precio (nadie compra sin verlo, y hoy es un ancla en una landing de doce secciones), la prueba social (tres pilotos reales con cifras reales, contra "esto no sirve para mi negocio") y la compatibilidad ("¿funciona con mi WhatsApp actual?, ¿con mi Shopify?"). No se propone blog ni recursos: sin equipo de contenido una sección vacía resta solvencia, y ya existe la regla de que un enlace sin destino real es peor que no tenerlo.

### A2 · Páginas nuevas

Se construyen sobre lo que ya existe (`SectionHeading`, `Reveal`, `PricingPlans`, `VolumeEstimator`, `LogoMarquee`, `TiltCard`) — **no** sobre `PageOutline`, que está marcado para borrarse.

| Ruta | Contenido | Honestidad obligatoria |
|---|---|---|
| `/precios` | `PricingPlans` + `VolumeEstimator` reutilizados, comparativa, trial de 7 días, cómo funciona el consumo medido, FAQ de precios, CTA | El alta es asistida: el CTA es demo/WhatsApp, **nunca "regístrate"** |
| `/casos` | Los tres pilotos (Joao's Burguer, 37 productos · Savage, 129 productos y 385 imágenes · TBI, 19 servicios con agenda) + bloque de 5 verticales con anclas | Cifras reales del negocio; los tres operan sobre WhatsApp Web |
| `/integraciones` | Cuatro canales + Shopify + medios de pago + voz, con el estado real de cada uno | IG y Messenger: **integrados, pendientes de aprobación de permisos de Meta**; WhatsApp Web es *best effort* |

Cada una: `metadata` + `alternates.canonical`, alta en **`PUBLIC_PATHS`** (`core/config/routes.ts` — sin eso el middleware manda al login, no da 404) y el redirect `/precios → /#planes` de `next.config.ts` **se elimina**.

### A3 · Componentes

| Archivo | Acción |
|---|---|
| `shared/components/ui/navigation-menu.tsx` | **nuevo** — componente de referencia con los tokens del proyecto: `glass-overlay` en el viewport, radios §4.1, `spring.snappy`/`fade.fast` de `motion.ts`, `LAYERS` en vez de `z-50` suelto |
| `shared/components/ui/grid-card.tsx` + `grid-pattern.tsx` | **nuevos** — patrón determinista y gradiente de marca |
| `shared/components/layout/site/site-nav.content.ts` | reescrito: `icon` y `description` por ítem, columnas del mega-menú, industrias, canales; la **regla dura** del encabezado se mantiene y se refuerza |
| `shared/components/layout/site/SiteHeader.tsx` | escritorio → `NavigationMenu`; móvil → `Sheet` + `Accordion` (ya instalados: dan focus trap y `Escape` gratis y retiran ~90 líneas de diálogo a mano). `NavDropdown`/`MobileNavItem` desaparecen |
| `shared/components/layout/site/SiteFooter.tsx` | se añaden las tres rutas nuevas a `SITE_FOOTER_COLUMNS` |
| `docs/plans/public-gtm-plan.md` | nota de reversión de la decisión de F2 (D6) |

Rendimiento: el mega-menú es **contenido estático** (datos de `site-nav.content.ts`, cero fetch); solo `SiteHeader` es `"use client"` (ya lo era). Iconos importados nominalmente de `lucide-react`; `prefetch={false}` se mantiene.

---

## Frente B — Un solo lenguaje de pestaña en el panel

### B1 · Primitivos (una implementación, tres semánticas)

**`shared/components/ui/segmented.tsx`** (nuevo) — núcleo compartido:

- `segmentedListClass()` / `segmentedItemClass()` (cva): contenedor `rounded-full border border-border bg-card p-1`, ítem `h-9 rounded-full px-3 gap-2 text-sm`, activo por D4, `focus-visible:ring-ring/50`, target >=40px en móvil.
- `<SegmentedIndicator>`: pastilla animada con `layoutId` (id único por `useId()` — dos barras en la misma página se pisarían), `spring.snappy`, anulada con `useReducedMotion`.
- `<SegmentedLabel labels="auto|always|active">`: revelado de etiqueta (escape documentado), `sr-only` cuando está oculta para que el lector de pantalla siempre lea el nombre.
- `<SegmentedControl>`: **radiogroup** controlado (`value`, `onValueChange`, `items: {value,label,icon?,count?}`), flechas ←→ con roving tabindex, desbordamiento con scroll horizontal contenido (nunca scroll del body, §4.2). Sustituye a la familia C.

**`shared/components/ui/tabs.tsx`** (modificado) — `TabsList`/`TabsTrigger` ganan `variant: "pill" | "boxed"` sobre el mismo cva; `pill` es el **default**. Las 6 instancias de Radix adoptan el aspecto sin cambiar su lógica.

**`shared/components/layout/nav-tabs.tsx`** (nuevo) — `<NavTabs items={[{href,label,icon,count?}]} label="…">`: `<nav>` + `<ul>` + `Link` + `aria-current="page"`, activo por **prefijo de segmento** (`href` o `href + "/"`, para que `/catalog/products/create` mantenga activo "Productos"), mismo aspecto pastilla. Recibe los ítems **ya filtrados por permiso** — no llama a `useAuth`, se queda presentacional y testeable.

Tests (`__tests__/` junto al componente): activo por prefijo, flechas del radiogroup, `labels="active"` deja la etiqueta accesible, reduced-motion desactiva la animación, dos barras en la misma página no comparten `layoutId`.

### B2 · Migración — familia A (7 archivos, `NavTabs`)

`catalog/ui/components/CatalogNav.tsx` · `crm/ui/CrmNav.tsx` · `crm/ui/components/settings/SettingsNav.tsx` · `scheduling/ui/SchedulingNav.tsx` · `marketing/ui/components/MarketingSettingsNav.tsx` · `platform/…/quality/QualityTabs.tsx` · `platform/…/tenants/detail/TenantTabs.tsx`.

Cada uno queda en su tabla de ítems + `<NavTabs>` (de ~55 líneas a ~20), con icono lucide asignado. `CrmNav`/`SchedulingNav` conservan su `<h1>`; el filtro por permiso se queda en el módulo.

### B3 · Migración — familia B (5 archivos)

Cambia el `variant` heredado y, donde aporta, se añade icono/contador: `analytics/ui/AnalyticsView.tsx` (**mantiene su sincronía con la URL**, `router.replace` sin `scroll`), `forms/ui/components/FlowTabs.tsx` (borra su pill a mano y su `overflow-x` manual), `notifications/…/NotificationPanel.tsx`, `platform/…/analytics/AnalyticsView.tsx` (2 instancias), `platform/…/wizard/ConfigStep.tsx`.

### B4 · Migración — familia C (12 sitios, `SegmentedControl`)

`crm/…/PipelineHeader.tsx` · `orders/…/OrdersHeader.tsx` · `scheduling/…/calendar/CalendarToolbar.tsx` · `crm/ui/TasksView.tsx` (tablist **+** chips de vencimiento) · `scheduling/ui/RemindersView.tsx` · `inbox/…/InboxList.tsx` (con contadores) · `dashboard/…/PeriodSelector.tsx` · `analytics/…/AnalyticsPeriodSelector.tsx` · `analytics/…/conversion/GroupBreakdownCard.tsx` (tamaño `sm`) · `analytics/…/alerts/AlertsTab.tsx` · `catalog/products/page.tsx` (toggle tabla/grid) · `scheduling/…/reminder.config.tsx` · `catalog/ui/forms/ProductForm.tsx` (borra su `SegmentedControl` local, duplicado del primitivo).

Los tres `SegmentedToggle` idénticos de CRM/pedidos/calendario **se borran**, no se reexportan.

**Fuera de alcance, dicho explícitamente:** los `aria-pressed` que no son pestañas — `ContextRail`, `StockAdjustPopover`, `ProviderGallery`, `RecurrenceBuilder`, `InteractiveBuilder`, `AvailabilityPanel`, `CopilotPanel`, filtros de tabla. Son toggles y elecciones de formulario.

---

## Verificación

Automática: `npm test` (suites nuevas + las existentes en verde), `npm run build` con la verja de ESLint activa (0 errores, sin `any`, sin `console.log`), typecheck de lo tocado.

Manual (comandos entregados al usuario, que compila y levanta él):

1. Nav público: los tres mega-menús con teclado (Tab/flechas/`Escape`), móvil <=375px, light y dark, header en reposo y con scroll; ningún enlace da 404 ni rebota al login **sin sesión**.
2. Panel: recorrer las 24 barras migradas comprobando activo correcto, contadores, desbordamiento sin scroll horizontal del body, y que la pastilla no salte entre instancias de la misma página.
3. `prefers-reduced-motion: reduce` — cero animación de pastilla y cero revelado de etiqueta.
4. Contraste AA en las dos superficies activas (D4), light y dark.

Cierre: reindexar el grafo (`index_repository` sobre `axi-client`), actualizar `docs/design/DESIGN-SYSTEM.md` (§9 gana la fila «pestañas y segmentados» y su tabla de semántica por familia) y `docs/plans/public-gtm-plan.md` (D6).

## Orden de ejecución

```
F0  mockups (2 Artifacts) ─── GATE de aprobación ───┐
                                                    ▼
PR1  Frente A: navigation-menu + grid-card + site-nav.content + SiteHeader
     + /precios + /casos + /integraciones + PUBLIC_PATHS + footer + GTM doc
PR2  Frente B: B1 primitivos + tests ─→ B2 (7) ─→ B3 (5) ─→ B4 (12) + DESIGN-SYSTEM
```

Cada fase cierra con su reporte y **espera aprobación explícita** antes de la siguiente.
