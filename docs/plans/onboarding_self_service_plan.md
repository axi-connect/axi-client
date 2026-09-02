# Plan — Paquetes + Módulos en precios y onboarding autoservicio (frontend)

> **Estado (2026-09-01):** plan aprobado por el dueño. **F0-A (mockup de precios) aprobado en su v3**; **F0-B (mockup de `/comenzar` + `/onboarding`) publicado y en gate de aprobación**. Ninguna fase de código ha empezado.
>
> Mockups (Artifacts privados): precios → https://claude.ai/code/artifact/47a257c5-171c-48b3-8a3c-8c286f262ba4 · onboarding → https://claude.ai/code/artifact/7655655c-3083-4d7d-b805-165727992f8c
>
> Contrato backend en `axi-server/docs/plans/onboarding_self_service_backend_plan.md` (mismo origen). El backend fusiona ANTES que el cliente regenere `schema.d.ts` (`api:types:check`).
>
> Reglas del repo que aplican: `docs/architecture.md` (§3 slices, §6 routing, §7 BFF, §13 páginas públicas), `docs/design/DESIGN.md` y `DESIGN-SYSTEM.md`. Un PR por fase con gate explícito del dueño.

## 1. Contexto

Axi Connect vende hoy tres planes en la landing (`#planes` y `/precios`) cuyo único acto de conversión es agendar demo o escribir por WhatsApp. **El repo documenta «alta asistida, sin auto-registro»** (`docs/modules/public-site.md:76`, cabecera de `precios/page.tsx`, `navigation_standardization_plan.md:11`); el alta de empresas ocurre solo desde la consola super admin (`POST /platform/tenants`).

El dueño quiere convertir clientes sin humanos en el camino:

1. **Precios**: los 3 planes pasan a llamarse **Paquetes** (heredan funciones + límites altos). Debajo, una grid premium con **glass + cometa** de **Módulos**: planes pequeños de una sola capacidad para empresas que ya operan con otra herramienta y les falta esa función. Comunicación por unidades entendibles (minutos/llamadas, leads, conversaciones, citas), nunca tokens.
2. **Onboarding autoservicio**: clic en un Paquete o Módulo → registro paso a paso con barra de progreso: empresa → cuenta → (permisos automáticos según la oferta) → nicho → horarios → catálogo con **subida de archivo (Excel/CSV/PDF/imagen) analizado por IA** que crea el catálogo y pregunta lo que falte → agentes desde **plantillas por nicho** personalizables → conectar WhatsApp.

Esto **invierte una decisión documentada**; el plan la actualiza en docs y copy de forma atómica (§7 F2).

## 2. Decisiones cerradas con el dueño (2026-09-01, no re-litigar)

| # | Decisión | Elección |
|---|---|---|
| D1 | Conversión | **Trial 7 días sin tarjeta para todo** (paquetes y módulos). Pago después desde `/billing`. Sin checkout en el onboarding. |
| D2 | Nombre | Planes grandes = **Paquetes**; planes pequeños = **Módulos** («Módulo de Llamadas»). |
| D3 | Módulos v1 | **Llamadas con IA**, **Captación de leads**, **CRM con IA**, **Agenda y reservas**. |
| D4 | Combinación | **Solo módulos sueltos, nunca con un paquete.** Una empresa tiene 1 paquete XOR 1..N módulos. |
| D5 | Precios/unidades | Propuestos por mí desde el costo, **A VALIDAR** en el mockup (§4). |
| D6 | WhatsApp | Último paso del onboarding, **opcional**. |
| D7 | Recorrido | Free Trial, SBS y Módulos → `/comenzar` (público) → auto-login → `/onboarding` (privado). **Enterprise sigue en «Hablemos» → `/contacto`**. |
| D8 | Nichos v1 | Restaurantes · Retail y moda · Hoteles y turismo · Salud, belleza y citas · **+4 propuestos**: Inmobiliarias · Educación y cursos · Servicios profesionales · Distribuidores B2B (§4.4). |

Decisiones técnicas tomadas por mí (justificadas en el cuerpo, revisables en el gate de F0):

| # | Decisión | Por qué |
|---|---|---|
| T1 | Contenido comercial **estático** en `landing.content.ts`; el backend solo valida el `offer_code`. `GET /public/offers` existe para migrar después. | La sección más vista del sitio no debe cargar; precios ya viven en un solo sitio con tests. |
| T2 | **Un solo plan `trial`** para toda alta; la oferta elegida se guarda en `usage_subscription.pending_offer` y **acota las capacidades visibles durante la prueba** (∪ capacidades de lo elegido). Free Trial paquete = sin acotar. | Cero planes fantasma; el que prueba «Módulo CRM» ve CRM, no todo el producto; conversión al día 7 con la oferta ya capturada. |
| T3 | Tarjeta de Módulo = **`TiltCard depth={6}` + superficie `.glass-flat` + `.brand-sheen` + resplandor tricolor de `BrandCard`**, en **grid 2×2** con «tiquete» lateral (cifra grande, precio, CTA). **Sin cometa** (revisión del dueño en F0-A v2). | Mismo efecto flotante 3D que `PlanCard`/`FoundersBar`; `.glass-flat` porque el `backdrop-filter` está prohibido dentro del tilt (public-site §4.1); cero CSS nuevo en `globals.css`. |
| T4 | Auto-login: el signup devuelve tokens → BFF nuevo `POST /api/auth/signup` setea cookies HttpOnly. | Un viaje, mismas cookies, no choca con el throttle 5/min de `/auth/login`. |
| T5 | Email: **verificar después** (banner), con gate duro para conectar canal Meta e invitar usuarios (`auth/email_not_verified`). | El trial ya limita el daño; bloquear antes de entrar mata la conversión. |
| T6 | Captcha **Turnstile** en v1 (puerto backend + widget; `noop` solo fuera de prod). | Cada alta trial le cuesta a axi (IA en `bill_to` tenant con `billing_source='trial'`). |
| T7 | Máquina de pasos = **dominio puro** (`blockerForStep` devuelve el motivo), sin `application/` (regla de escape §3.2). | Patrón `campaign-draft.ts` ya probado. |
| T8 | `/comenzar` = ruta de primer nivel con layout propio (como `/pay`), `noindex`; `/onboarding` = grupo `(onboarding)` con shell sin sidebar. | Un funnel no lleva mega-menú; el shell privado pintaría un sidebar de módulos aún sin configurar. |
| T9 | Códigos de paso en el wire en inglés (`niche, business_hours, catalog, agents, whatsapp`); etiquetas en español en UI. | Convención del repo. |

Reglas de trabajo vigentes (memoria): worktree propio antes de tocar código; plan `.md` en `docs/plans`; **F0 = mockup HTML de alta fidelidad como Artifact privado** antes de codificar; gate explícito por fase; el dueño corre suites completas y builds (nosotros `tsc` + eslint acotado + jest acotado); sin prettier en axi-client; `--ch-glow` solo por clase estática; backend fusiona ANTES que el cliente (`api:types:check`).

## 3. Inventario verificado (frontend)

### 3.1 Frontend (axi-client) — reutilizable

| Pieza | Ruta | Uso en este plan |
|---|---|---|
| Precios | `src/modules/landing/ui/content/landing.content.ts` (`PRICING` :570, `SBS_TIERS` :545, `VOLUME_ESTIMATOR` :557, `FOUNDERS` :508, `formatCop`/`founderCop` :646/:655) · `ui/components/PricingPlans.tsx` (`PlanCard` en `TiltCard depth={6}`, CTA `#demo` ×3) · `ui/sections/LandingPricing.tsx` · `/precios` reutiliza `PricingPlans` | Renombrar a Paquetes, añadir `MODULES`, CTAs por oferta |
| Tests que atan la sección | `ui/components/__tests__/PricingPlans.test.tsx` (:114 «mismo destino de conversión») · `ui/content/__tests__/pricing.test.ts` | Reescribir aserción de destino |
| JSON-LD | `ui/seo/landing-schema.ts` `pricingSchema()` | Añadir `Offer` por módulo con precio final |
| Cometa + resplandor | `shared/components/features/provider-card/ProviderCard.tsx` + `globals.css` `.channel-surface` (:293–373), `BRAND_CLASSES` cerrado | Extraer `.comet-ring`; `ProviderCard` para **elegir** (oferta, nicho, plantilla) |
| Glass | `ui/brand-card.tsx` (`surface="glass"`), `.glass`, `.glass-flat` | Superficie de `ModuleCard` |
| Glifos | `shared/components/ui/glyphs/` (10 kinds) | Rail ilustrativo de cada paso |
| Wizard precedente | `modules/platform/ui/features/tenants/wizard/` (`TenantWizard`, `company-step.config`, `owner-step.config`, `DraftBackButton`, ruteo `identities/nit_taken`) | **No importable** (auth aislado §8.1): se porta la forma sobre `http` + BFF |
| Stepper / progreso | `shared/components/ui/step-indicator.tsx`, `ui/progress.tsx` | Shell de ambos flujos |
| Máquina de pasos pura | `modules/marketing/domain/campaign-draft.ts` | Patrón de `signup-draft.ts` / `onboarding-draft.ts` |
| Horarios | `companies/public.ts` → `SchedulesEditor`, `loadMyCompanyOnce`, `invalidateMyCompanyCache` | Paso horarios tal cual |
| Agentes | `agents/ui/forms/AgentForm.tsx`, `VoiceSelector`, `CharacterGallery`, `characterStyle()`, `agents/public.ts` | Sheet de personalización (subconjunto) |
| Subida + job + revisión | `crm/ui/components/settings/ImportsManager.tsx` · `catalog` `validateImageFile`, `use-product-images-polling.ts` | Molde del paso catálogo |
| WhatsApp | `channels/ui/components/connect/ConnectChannelView.tsx`, `shared/components/prerequisites-checklist.tsx` | Refactor a `ConnectChannelFlow` embebible |
| BFF/HTTP | `core/services/http.ts` (FormData OK), `app/api/auth/login/route.ts` → `setSessionCookies` | Copiar para `/api/auth/signup` |
| Auth | `core/providers/auth-provider.tsx` (`login`, `hydrate`, `status`), `core/api/problem.ts` `API_ERROR_CODES` | `signup()`, códigos nuevos |
| Rutas/SEO | `core/config/routes.ts` `PUBLIC_PATHS`, `core/seo/routes.ts`, `core/seo/metadata.ts`, `next.config.ts:53` (`/signup`→`/contacto`) | Alta `/comenzar`, redirects |
| Analítica | `core/analytics/track.ts` (solo en `(public)/layout`) | Eventos del funnel |
| Formateador de unidades | solo `platform/ui/features/limits/limit-format.ts` (inaccesible desde tenant) | Crear `core/lib/commercial-units.ts` |

## 4. Modelo comercial (A VALIDAR por el dueño en el mockup F0-A)

### 4.1 Ofertas y capacidades

Dos niveles: **plan comercial** (`usage_plan`, lo que se vende, `kind = package|module`) y **capacidad** (unidad técnica que gatea sidebar, endpoints y jobs; catálogo en código).

| Plan (`code` / `public_slug`) | kind | Capacidades |
|---|---|---|
| `trial` / `free_trial` | package | todas, cuotas 25 % de SBS (acotadas por `pending_offer`, T2) |
| `sbs` / `sbs` · `enterprise` | package | todas |
| `calls` / `calls` | module | `core`, `calls` |
| `leads` / `leads` | module | `core`, `marketing`, `leads`, `cmo` |
| `crm` / `crm` | module | `core`, `crm`, `crm_ai`, `analytics` |
| `scheduling` / `scheduling` | module | `core`, `scheduling`, `sales` (servicios agendables viven en el catálogo) |

`core` (siempre): dashboard, inbox, contactos, canales, ajustes de empresa, usuarios/roles/auditoría, uso, facturación, agentes IA, voz, acciones rápidas, formularios. Capacidades gateables: `sales` (catálogo, pedidos, medios de pago, integraciones), `crm`, `crm_ai` (copiloto, tareas), `scheduling`, `marketing`, `leads` (prospecting), `cmo`, `analytics`, `calls`.

### 4.2 Unidades comerciales y conversiones

| Unidad visible | Métrica | Conversión | Nota |
|---|---|---|---|
| conversaciones | `ai_tokens_output` / ciclo | 1 conversación ≈ 1.500 tokens de salida (≈ 30k entrada) | Añade a todos los planes un límite por ciclo `no-cost / degrade` (hoy solo hay diario) |
| minutos ≈ llamadas | `call_seconds` / ciclo | 60 s por minuto; 1 llamada ≈ 3 min | Plan `calls` sembrado `is_active=false` hasta fusionar el módulo de llamadas |
| leads / verificados | `lead_discoveries` / `lead_enrichments` | 1:1 | |
| citas | — | **ilimitadas en v1** (sin métrica); opcional `appointments_booked` solo informativo | |
| acciones del copiloto | `ai_requests` con `purpose='crm_copilot'` | no se separa en v1 | |

El backend devuelve la copia calculada (`quantity_display`, `unit_label`, `approx_display`) en `GET /public/offers` y `GET /me/entitlements`; la landing la lleva estática en `MODULES[].allowance` y un helper compartido la formatea. **El frontend nunca divide tokens.**

### 4.3 Cuotas y precios propuestos (TODO A VALIDAR)

Fórmula: `precio = ceil(costo_cuota_USD × 4.200 × 1,6 + fee plataforma) → redondeo a x9.900`; cap de costo del módulo = 2,5 × costo de la cuota (mantiene B1).

| Plan | Cuota visible | Costo cuota | Cap `block` | Precio COP/mes |
|---|---|---|---|---|
| Módulo Llamadas con IA | **200 minutos ≈ 60 llamadas** + 100 conversaciones | ~22 USD | 60 | **$189.900** |
| Módulo Captación de leads | **500 leads + 150 verificados** + campañas + 200 conversaciones | ~18 USD | 50 | **$149.900** |
| Módulo CRM con IA | **500 conversaciones** + copiloto + 2.000 contactos | ~10 USD | 25 | **$129.900** |
| Módulo Agenda y reservas | **300 conversaciones**, citas ilimitadas, recordatorios, voz 30k car. | ~12 USD | 30 | **$89.900** |
| SBS | tramos actuales (300 / 3.000 conversaciones) | — | 50 | $250.000 / $850.000 (sin cambio) |

Sin descuento fundador en módulos (A VALIDAR). En la landing, mientras `priceStatus: "draft"`, el JSON-LD **omite** la `Offer` (test que lo blinda).

### 4.4 Nichos v1 (D8) y por qué los 4 nuevos

| code | Nombre | Justificación | Preset de catálogo |
|---|---|---|---|
| `restaurants` | Restaurantes y comida | domicilios por WhatsApp; conocimiento en Joao's | Entradas/Platos/Bebidas/Postres; tipo «Plato» |
| `retail_fashion` | Retail y moda | variantes talla/color; Savage | tipo «Prenda» (talla, color) |
| `hotels_tourism` | Hoteles y turismo | reservas + upsell; habitaciones como servicios `requires_booking` | «Habitación», «Tour» |
| `health_beauty` | Salud, belleza y citas | agenda intensiva; TBI; recordatorios bajan no-show | «Servicio» (duración) |
| `real_estate` | Inmobiliarias | alto ticket, lead ads de Meta, visitas agendadas (leads + agenda) | «Inmueble» (área, habitaciones, operación) |
| `education` | Educación y cursos | matrículas por WhatsApp, leads estacionales | «Curso» (modalidad, horario) |
| `professional_services` | Servicios profesionales | contadores, abogados, talleres: agenda + cotización + CRM | «Servicio profesional» |
| `b2b_distribution` | Distribuidores B2B | pedidos recurrentes, listas de precios en xlsx (el import brilla) | «Producto mayorista» (unidad, mínimo) |

Plantillas de agente: 2–3 por nicho (`{niche}_ventas`, `{niche}_reservas|soporte`, `{niche}_captacion` en inmobiliaria/educación), portadas desde los scripts de provisión existentes.

---

## 5. Frontend — diseño

### 5.1 Sección de precios (Paquetes + Módulos)

**Datos** (`landing.content.ts`):
- `PRICING.kicker = "Paquetes"`; título/intro/microcopy ajustados (ya no «todos incluyen el producto completo» sin matiz: los Módulos no).
- `plan.cta` pasa a `{ label, href }`: `free_trial` → `/comenzar?plan=free_trial`, `sbs` → `/comenzar?plan=sbs`, `enterprise` → `/contacto`.
- Nuevo `MODULES` (4 entradas): `id`, `offer_code`, `name`, `tagline`, `icon` (lucide, mapa cerrado), `glyph` (GlassGlyph kind para el rail), `allowance: { quantity, unit, equivalent? }`, `listCop`, `priceStatus: "draft"|"final"`, `priceUnit`, `bullets[3]`, `cta: { label: "Prueba 7 días gratis", href: "/comenzar?modulo=<id>" }`, `ctaMicrocopy`. `MODULES_SECTION` (kicker «Módulos», título «¿Ya operas con otra herramienta? Contrata solo lo que te falta», nota de exclusividad).
- `offerByCode(code)` y tipos `OfferCode`, `ModuleOffer`.
- **Nuevo `src/modules/landing/public.ts`** (primer consumidor externo: `onboarding`).

**Helper compartido** `src/core/lib/commercial-units.ts`: `CommercialUnit = "conversations"|"minutes"|"calls"|"leads"|"verified_leads"|"contacts"|"appointments"|"copilot_actions"`, `formatQuantity(n, unit)` (plural es-CO), `formatAllowance({quantity, unit, equivalent?})` → «200 minutos ≈ 60 llamadas». Lo consumen landing, onboarding y (después) billing.

**Componentes**:
- `ModulePlans.tsx` (isla mínima, solo `track` al clic): `SectionHeading` + grid `sm:grid-cols-2 xl:grid-cols-4` de `ModuleCard` en `Reveal` + nota «Los módulos se contratan sueltos; si necesitas varias capacidades, un Paquete sale mejor».
- `ModuleCard.tsx`: `TiltCard depth={6} className="rounded-[20px]"` → `article.glass-flat rounded-[20px] border p-8 grid md:grid-cols-[1.45fr_0.85fr]` con `.brand-sheen` + resplandor tricolor (misma anatomía que `BrandCard`, sin `backdrop-filter`). Columna izquierda: placa de icono lucide `text-brand` (52 px), eyebrow «Módulo», nombre Nexa, tagline, 3 bullets `Check`. Columna derecha, el **tiquete**: label «Incluye cada mes», cifra `font-mono` 44 px + etiqueta, equivalencia muted, `<hr>` punteado, precio `formatCop` + «COP/mes», `Button variant="outline" asChild <Link>` y microcopy. `data-testid="module-<id>"`. Grid `md:grid-cols-2`.
- `globals.css`: **sin cambios** (se reutilizan `.glass-flat`, `.brand-sheen` y los tokens).
- **`shared/components/ui/beams-background.tsx`** (nuevo, F1): fondo de haces inclinados en `<canvas>` detrás de la banda de Módulos, **adaptado** del componente que pasó el dueño: (a) colores leídos de los tokens `--axi-brand/--axi-amber/--axi-violet` vía `getComputedStyle` (nada de `hsl(190–260)` ni `bg-neutral-950`), (b) tamaño de la sección con `ResizeObserver` (no `min-h-screen`), (c) sin texto de demo ni `motion.div`; `framer-motion` ya existe, **no se instala `motion`**, (d) `prefers-reduced-motion` → un frame estático, `IntersectionObserver` pausa el rAF fuera de pantalla, `dpr` capado a 2, (e) `globalCompositeOperation` `lighter` en dark y `multiply` en light, (f) velo `linear-gradient` a `--background` en los bordes para fundir con la página. Excepción sancionada a «nada se anima en bucle»: es superficie de marketing (DESIGN §6), no de trabajo.
- `PlanCard`: `<Link href={plan.cta.href}>` + `track("signup_start_click", { offer_codes, location: "pricing" })`.
- `pricingSchema()`: una `Offer` por módulo con `priceStatus === "final"`.
- `/precios`: cabecera y FAQ («¿Puedo registrarme solo?» → sí, en `/comenzar`; nueva FAQ «¿Qué es un módulo?»); la FAQ solo cambia cuando `/comenzar` exista (F2).

**Tests**: `PricingPlans.test` («cada paquete lleva a su destino declarado», «Enterprise sigue en /contacto»), `pricing.test` (offer_code únicos, href por módulo, `offerByCode`), nuevo `ModulePlans.test` (4 tarjetas, allowance formateada, sin `backdrop-filter` dentro de un TiltCard), `commercial-units.test`, `landing-schema.test` (omite módulos en `draft`).

### 5.2 `/comenzar` (público, pre-auth)

Rutas: `src/app/comenzar/{layout,page,loading}.tsx` (layout mínimo tipo `/pay`: root layout + `PublicAnalytics` + `noindexMetadata`); alta en `PUBLIC_PATHS`; `next.config.ts`: `/signup` y `/registro` → `/comenzar`.

Shell: `BrandLogo`, `StepIndicator` (3 pasos: Oferta · Empresa · Cuenta), «¿Ya tienes cuenta? Inicia sesión»; grid `lg:grid-cols-[1fr_360px]` con `SignupSummaryRail` (oferta, «7 días gratis · sin tarjeta · después $X/mes», `GlassGlyph` de la oferta). Sesión activa → aviso «Ya tienes sesión en X» con «Ir a mi panel» (no redirige a ciegas).

| Paso | UI | Validación / errores |
|---|---|---|
| **Oferta** | `parseOfferQuery(searchParams)` preselecciona (`?plan=free_trial\|sbs`, `?modulo=calls,leads`; `?plan=enterprise` → `redirect("/contacto")`). Segmented «Paquete \| Módulos». Paquetes: 2 `ProviderCard` radio; Módulos: 4 `ProviderCard selectionRole="checkbox"` con allowance como `metrics`. Nota de exclusividad. | `blockerForSignupStep`: «Elige un paquete o al menos un módulo». Cambiar de modo limpia el otro (estado inválido imposible). |
| **Empresa** | `DynamicForm` + `company-step.config.tsx` portado del wizard de platform sobre `shared/data/countries.ts` (promovido desde `platform/domain/catalogs.ts`): `name`, `nit` (normalizado; DV Colombia en backend), `country_code` (Select, default CO; `currency`/`timezone` ocultos autollenados), `city?`. Sin industria (la fija el nicho). | `identities/nit_taken` → vuelve aquí con error inline (patrón `TenantWizard`); `onboarding/nit_invalid` inline. |
| **Cuenta** | `account-step.config.tsx`: `name`, `email`, `password` (≥10, indicador de fortaleza, sin confirmar), `accept_terms` (links legales), widget Turnstile si `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; honeypot oculto. | `onboarding/email_in_use` inline + «Inicia sesión»; `onboarding/email_disposable`; `onboarding/captcha_failed`; 429 con `retryAfterSeconds`; `validation/failed` → `applyServerValidation`. |

Éxito: `signup()` (AuthProvider) → `POST /api/auth/signup` (BFF nuevo, copia de `login/route.ts` → `setSessionCookies`) → `hydrate()` → `track("signup_completed")` → `splash.start()` → `router.replace("/onboarding")`. Fallback documentado: si el backend no devolviera tokens, `login({email,password})`.

Persistencia: `sessionStorage` `axi.signup.draft.v1` con `{offer, company, step}`; **la contraseña solo en memoria**.

### 5.3 `/onboarding` (privado)

Rutas: `src/app/(onboarding)/onboarding/{layout,page,loading}.tsx` (sin sidebar ni `PrivateHeader`; monta `AppReadySignal` para cerrar el splash; `noindex`; `/onboarding/` en `DISALLOWED_PREFIXES`). Protegido por middleware (no está en `PUBLIC_PATHS`).

Shell `OnboardingShell`: `bg-brand-ambient` + gradiente completo suave en el hero (autorizado para onboarding, DESIGN §3.2), `BrandMark`, «Configura {company.name}», `Progress` con indicador coral→violeta y `aria-valuetext="Paso 2 de 6"`, `StepIndicator` en `md+`, «Guardar y salir al panel» siempre visible. `StepFrame`: h2 con foco al cambiar de paso, descripción, rail derecho con `GlassGlyph tier="md"` + «Para qué sirve». Transiciones `fade.fast` con `useReducedMotion`. Los pasos se adaptan a la oferta: copy y plantillas priorizan la capacidad elegida (p. ej. módulo Llamadas destaca la plantilla de voz).

| Paso (wire) | UI / reutilización | Persistencia | Skip | Bloqueo |
|---|---|---|---|---|
| `niche` | 8 `ProviderCard` radio (icono lucide, glyph `metrics`) | `PUT /onboarding/progress {niche_code}` (backend fija `company.niche_code`/`industry`) | No (hay «Otro») | «Elige el tipo de negocio» |
| `business_hours` | `SchedulesEditor` de `companies/public` + TZ de `loadMyCompanyOnce()`; glyph `time` | `onSaved` → done | «Mantener Lun–Sáb 9–18» | — |
| `catalog` | `CatalogImportStep` (§5.4); glyph `catalog`; «Cargarlo a mano después» | job en backend; done al commit (auto por evento) | Sí | «Revisa los productos marcados» (solo para commit) |
| `agents` | `AgentTemplatesStep` (§5.5); glyph `ai` | done con ≥1 agente | «Crear el recomendado tal cual» (1 clic) | «Crea al menos un agente» |
| `whatsapp` | `ConnectChannelFlow` (refactor de `ConnectChannelView` con `onConnected/onExit/hideStepper`, export en `channels/public.ts`); si `email_verified=false` → `PrerequisitesChecklist` con «Revisa tu correo» + reenviar | done al conectar | «Conectar después» | — |
| `done` (solo UI) | `FieldList` resumen + entitlements («Tu prueba incluye 200 minutos…» con `formatAllowance`) + «Ir a mi panel» | `POST /onboarding/complete` → `invalidateMyCompanyCache()` → `/dashboard` | — | — |

Guards: al montar `GET /onboarding/progress`; `completed_at` → `/dashboard`; `?step=` solo si `canJumpTo`. **Dashboard**: `OnboardingResumeBanner` (export de `onboarding/public.ts`, autosuficiente) al inicio de `DashboardView`: «Te faltan N pasos» + «Continuar»; «Ocultar» persiste `banner_dismissed_at`. Nunca bloquea. Banner de email sin verificar reutiliza el mismo componente con variante.

Estados: `loading.tsx` con `FormSkeleton`; error de progreso → `StatusAlert` con reintento y «Ir al panel»; `PUT` fallido → toast `errorMessage(err)` sin perder el draft local. A11y: `<section aria-label="Paso 3 de 6: Catálogo">`, `role="status"` en progreso del job, `role="alert"` en bloqueos, radiogroups con `aria-checked`.

### 5.4 Paso catálogo — subida con IA

`ImportDropzone` (un archivo; xlsx/csv/pdf/png/jpg/webp ≤ 10 MB; `validateImportFile` pura) → `POST /catalog/imports` multipart (`http.post(FormData)`) → `ImportJobProgress` (`Progress` + «Leyendo 3 páginas…»; polling `importPollInterval(elapsed)` 2 s → 5 s tras 60 s, presupuesto 180 s → «tarda más de lo normal: seguir esperando / cargar a mano»; WS `catalog.import_progress|completed` si está, la fila es la verdad) → `ExtractedProductsReview`: `useFieldArray` (patrón `VariantRowsEditor`), columnas Incluir · Nombre · Precio (`PriceInput`) · Categoría · Tipo · Estado (`confidenceTone`: ≥0,8 ok, 0,5–0,8 revisar, sin dato = falta); filtro «Todos | Falta información (n) | Listos»; precio nulo → «La IA no encontró el precio: escríbelo o excluye el producto»; celdas de baja confianza con borde ámbar y tooltip «Leído como “…”». Acciones «Excluir incompletos», «Crear N productos» → `PUT items/:id` por fila editada + `POST …/commit` → resumen «Creamos 42 productos, 3 excluidos» + link a `/catalog/products`. Fallo → `EmptyState glyph="noresults"` con «Probar otro archivo». `GET /onboarding/progress` devuelve `steps.catalog.data.import_id` para reanudar la revisión tras cerrar la pestaña.

Tipos en `onboarding/domain/catalog-import.ts` espejo de `CatalogImportDto`/`CatalogImportItemDto` (ver contrato backend §2.3), marcados `// CONTRACT` hasta F7.

### 5.5 Paso agentes — plantillas por nicho

`GET /onboarding/niches/:code/agent-templates` → grid de `TemplateCard` (`ProviderCard`: badge «Recomendado» en una, `chips` = skills, `body` = descripción, `selected` elevado). Clic → `TemplateCustomizeSheet` (`DetailSheet size="md"`): nombre (default `defaultAgentName(template, company)`), tono (Segmented `cercano|formal|directo`), personalidad (Select de personajes con `characterStyle()`; `agents/public.ts` += `listCharacters`, `characterStyle`), «Datos clave que debe saber» (textarea → `extra_instructions`), voz (Switch si el personaje tiene voz), palabras de traspaso (chips). **No** se exponen provider/model/temperature (los fija la plantilla). «Crear agente» → `POST /onboarding/agents/from-template` → lista de creados (`getTenantAgents` + `clearTenantAgentsCache`). Preview chat: fuera de v1 (hueco en el mockup).

### 5.6 Slice `src/modules/onboarding/`

```
public.ts                        OnboardingResumeBanner, useOnboardingProgress, tipos
domain/
  offers.ts                      OfferSelection = {kind:"package";code} | {kind:"modules";codes[]}, isMixAllowed(), offerCodesOf()
  signup-draft.ts                SIGNUP_STEPS, SignupDraft, EMPTY_SIGNUP_DRAFT, blockerForSignupStep(), toSignupDTO(), parseOfferQuery()
  onboarding-draft.ts            ONBOARDING_STEPS (wire), StepStatus, SKIPPABLE_STEPS, firstOpenStep(), canJumpTo(), progressPercent(), blockerForStep()
  niches.ts · agent-templates.ts · catalog-import.ts · progress.ts · entitlements.ts   (tipos espejo + helpers puros)
infrastructure/
  services/signup-service.adapter.ts        fetch("/api/auth/signup") — única excepción a `http` (mismo motivo que login)
  services/onboarding-service.adapter.ts    progress, complete, niches, templates, from-template, /me/entitlements
  services/catalog-import-service.adapter.ts create(FormData), get, patchItem, commit
  stores/onboarding.store.ts                Zustand: progress, step, drafts, load(), markDone(), skip()
  hooks/use-catalog-import-job.ts           polling + WS opcional
  storage/signup-draft.storage.ts           sessionStorage sin password
ui/
  signup/   SignupFunnelView, OfferStep, CompanyStep, AccountStep, SignupSummaryRail, config/*.config.tsx
  onboarding/ OnboardingView, OnboardingShell, StepFrame, steps/{Niche,BusinessHours,CatalogImport,AgentTemplates,WhatsApp,Done}Step
  catalog-import/ ImportDropzone, ImportJobProgress, ExtractedProductsReview
  agents/   TemplateCard, TemplateCustomizeSheet
  components/ OnboardingResumeBanner
```

Cambios transversales: `PUBLIC_PATHS` += `/comenzar`; `core/seo/routes.ts` `DISALLOWED_PREFIXES` += `/onboarding/`; `next.config.ts` redirects; `API_ERROR_CODES` + `error-messages.ts` con los códigos del contrato backend; `AuthProvider.signup()`; `app/api/auth/signup/route.ts`; `track.ts` eventos `signup_start_click`, `signup_step_view`, `signup_completed` (+ `CtaLocation` `modules|signup`); `ProviderCard.selectionRole?: "radio"|"checkbox"`; `shared/data/countries.ts`; `login/page.tsx` «¿No tienes cuenta? Crea tu cuenta» → `/comenzar`; `TrialCountdownBanner` CTA → `/billing`; `MeDto.email_verified` en `AuthUser`.

---

## 7. Fases frontend (un PR por fase, gate explícito, worktree `feat/onboarding-self-service` en axi-client)

| Fase | Contenido | Depende de | Verificación |
|---|---|---|---|
| **F0-A** | Mockup HTML alta fidelidad **precios**: home `#planes` + `/precios` con Paquetes renombrados y grid de Módulos (glass + cometa), light/dark, móvil, precios A VALIDAR. Artifact privado. Fuentes embebidas como data URI desde `.next/static/media`. | — | **Aprobación visual y de cifras del dueño.** |
| **F0-B** | Mockup HTML **onboarding**: `/comenzar` ×3 pasos, `/onboarding` ×6 pasos (incl. revisión del import y sheet de plantilla), banner del dashboard, estados vacío/error/«tarda más». Artifact privado. Además: planes `.md` commiteados en ambos repos (PR doc-first). | F0-A | **Aprobación visual.** |
| **F1** | Precios: `commercial-units.ts` + test, `MODULES`, `ModulePlans`/`ModuleCard` (TiltCard + glass-flat, grid 2×2), `BeamsBackground` en shared/ui, `FOUNDERS.claimed = 3`, renombre a Paquetes, JSON-LD con `priceStatus`, `landing/public.ts`. **Los CTA de paquetes siguen en `#demo`/`/contacto`** hasta F2 (sin enlaces muertos). | F0-A | tests §5.1; `tsc`; eslint acotado; test «sin backdrop-filter dentro de TiltCard» |
| **F2** | `/comenzar` completo + `api/auth/signup` + `AuthProvider.signup` + `PUBLIC_PATHS` + redirects + **flip atómico** de CTAs, FAQ `/precios`, login «Crea tu cuenta», `public-site.md` y `navigation_standardization_plan.md` (fin de «alta asistida») + analytics + `shared/data/countries.ts` + `ProviderCard.selectionRole` + Turnstile opcional. Adapter mockeado hasta que B2 mergee. | B2 | `signup-draft.test` (blockers, XOR, `parseOfferQuery`), `SignupFunnelView.test` (preselección, `nit_taken` → paso 2, `email_in_use` inline, 429), test de la ruta BFF (cookies) |
| **F3** | `(onboarding)` shell + `onboarding-draft.ts` + store + progreso + pasos **niche** y **business_hours** + `OnboardingResumeBanner` + `loading.tsx` + banner de email sin verificar. | B3 | `onboarding-draft.test` (`firstOpenStep`, `canJumpTo`, percent, skip), `OnboardingView.test` (redirect si completado; `?step` inválido), banner test |
| **F4** | Paso **catalog** (dropzone, job, revisión, commit, reanudación por `import_id`). | B4 | `catalog-import.test` (`validateImportFile`, `confidenceTone`, `reviewBlockers`, `toCommitDTO`, `importPollInterval`), `ExtractedProductsReview.test` |
| **F5** | Paso **agents** (plantillas + sheet) + `agents/public.ts` ampliado. | B3 | `agent-templates.test`, `AgentTemplatesStep.test` (recomendado preseleccionado; «tal cual» crea sin sheet) |
| **F6** | Paso **whatsapp** (refactor `ConnectChannelFlow` + `channels/public.ts`), **done** con entitlements, `POST /onboarding/complete`, `TrialCountdownBanner` → `/billing`. | B1 | tests del refactor de channels (ruta `/settings/channels/connect` intacta), `DoneStep.test` |
| **F7** | `docs/modules/onboarding.md`, `public-site.md` §Módulos, `architecture.md` §6 (grupos de ruta nuevos) y §3.3 (barrels `landing`, `onboarding`, `channels` ampliado, `agents` ampliado), `npm run api:types` + `api:types:check`, sustituir DTO manuales por `Schemas[...]`, reindexar grafo. | backend en main | suite completa (la corre el dueño) |

Comandos por fase (en el worktree, con `node_modules` copiado con `cp -al` y `.env.local` copiado):

```
npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=2048 npx eslint src/modules/onboarding src/modules/landing src/app/comenzar "src/app/(onboarding)" src/core/analytics src/core/lib/commercial-units.ts
npx jest src/modules/onboarding src/modules/landing src/core/lib src/shared/components/features/provider-card --testPathIgnorePatterns "/node_modules/" "/.next/"
npm run api:types:check      # desde F7
```

## 8. Verificación end-to-end (con backend B1–B4 en main)

1. Landing: `#planes` muestra Paquetes + 4 Módulos en 2×2; el cursor inclina la tarjeta y mueve el reflejo; `prefers-reduced-motion` lo apaga; light/dark AA; JSON-LD sin ofertas `draft`.
2. Clic «Prueba 7 días gratis» del Módulo CRM → `/comenzar?modulo=crm` preseleccionado → empresa → cuenta → cookies seteadas → splash → `/onboarding`.
3. `/me/navigation` del tenant nuevo muestra solo `core` + CRM (+ analytics); `GET /crm/pipelines` 200; `GET /marketing/campaigns` 403 `entitlements/capability_not_granted`.
4. Onboarding: nicho → horarios guardados (`GET /companies/me/schedules`) → subir `fixtures/menu.xlsx` → revisión con precios faltantes → commit → productos en `/catalog/products` → agente desde plantilla con intenciones y playbook → WhatsApp bloqueado hasta verificar email; tras verificar, Embedded Signup → `done` → dashboard sin banner.
5. Recargar a mitad: `/onboarding` reanuda en el primer paso abierto; cerrar pestaña durante el import y volver reanuda la revisión.
6. Trial expirado: 403 `auth/trial_expired` con `CompanySuspendedScreen` existente; conversión asistida desde `/platform` con `plan_ids` de módulos suma límites.

## 9. Riesgos y pendientes

| Riesgo | Mitigación |
|---|---|
| Abuso del signup (cada trial le cuesta a axi) | Turnstile + throttles IP/email/NIT + dominios desechables + `onboarding_signup` con `ip_hash` + alerta de plataforma >20 altas/h |
| Prompt injection en archivos subidos | `<datos_catalogo>` + regla dura + sanitización por celda + schema estricto + el commit lo decide el usuario |
| `usage_subscription_item` toca billing/TTS BYOK | `plan_id` conserva semántica de primario; `PlanLookupPort` solo se extiende; actualizar fakes (`manage_tts_credential`, `generate_invoice`, `billable_usage`) |
| `runAsProvisioning` = nuevo escape de tenancy | mismo guard que `runAsSystem`, evento auditado, un consumidor (spec) |
| `call_seconds` no está en main | plan `calls` inactivo; `/public/offers` filtra; la tarjeta del módulo en la landing lleva `priceStatus:"draft"` hasta activar |
| Precios A VALIDAR publicados | `priceStatus` controla JSON-LD; el mockup F0-A es el gate de cifras |
| Flip «alta asistida» inconsistente | F2 cambia copy, FAQ, login, redirects y docs en el mismo PR |
| Refactor de `ConnectChannelView` (Meta, código de 30 s) | estado sigue efímero; tests actuales del wizard de canales |
| Drift de tipos hasta F7 | DTO manuales en un solo `domain/`, `toSignupDTO` único punto de mapeo |
| Módulo Agenda incluye `sales` | A VALIDAR si se acota a `kind=service` por UI |

Fuera de v1: preview chat del agente, múltiples empresas por usuario, conversión self-service desde `/billing` (B5), PDF escaneado, `appointments_booked`.

