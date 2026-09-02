# Módulo Onboarding — registro autoservicio y configuración guiada

> **Doc del módulo (base de conocimiento para el agente ejecutor).** Parte A: contrato del backend
> que consume este slice. Parte B: anatomía y decisiones del frontend. Parte C: lo que aún es
> contrato a mano y lo que falta.
>
> **Estado (2026-09-02): F1–F6 implementadas** en la rama `feat/onboarding-self-service`, sin
> fusionar. Plan vivo: `docs/plans/onboarding_self_service_plan.md` (frontend) y
> `axi-server/docs/plans/onboarding_self_service_backend_plan.md` (contrato B0–B5). Mockups
> aprobados: precios <https://claude.ai/code/artifact/47a257c5-171c-48b3-8a3c-8c286f262ba4> ·
> funnel <https://claude.ai/code/artifact/7655655c-3083-4d7d-b805-165727992f8c>.
>
> **Qué es este módulo:** la puerta de entrada autoservicio de Axi Connect. Desde un Paquete o un
> Módulo de la sección de precios, la empresa crea su cuenta en tres pasos (`/comenzar`), entra con
> la sesión ya abierta y configura su negocio con guía (`/onboarding`): tipo de negocio, horario,
> catálogo leído por IA desde un archivo, agente desde plantilla y WhatsApp. Todo empieza con 7 días
> de prueba sin tarjeta.
>
> ⚠️ **Invierte una decisión anterior.** Hasta agosto de 2026 el alta era asistida («sin
> auto-registro», `docs/modules/public-site.md` §3 antiguo). Hoy el alta manual sigue existiendo solo
> en la consola `/platform` (wizard de tenants) y **Enterprise sigue siendo asistido** (exige base de
> datos dedicada; el backend rechaza crearlo por autoservicio).

---

## Parte A — Contrato del backend

Los endpoints de esta tabla los define el plan backend (B1–B4). **Ninguno está aún en `main` de
axi-server**: los tipos del frontend son espejos a mano marcados `// CONTRACT` (Parte C). Todas las
rutas van relativas a `/api/v1` y pasan por el BFF salvo las públicas.

| Método | Ruta | Fase | Quién la llama en el cliente |
|---|---|---|---|
| POST | `/public/onboarding/signups` | B2 | `app/api/auth/signup/route.ts` (BFF) — siembra las cookies con `tokens` |
| POST | `/public/onboarding/resend-verification` | B2 | `onboarding-service.adapter#resendVerificationEmail` (`authenticate: false`) |
| GET/PUT | `/onboarding/progress` | B3 | `onboarding.store` (`load`, `update`, `markDone`, `skip`, `dismissBanner`) |
| POST | `/onboarding/complete` | B3 | `onboarding.store#complete` (idempotente) |
| GET | `/onboarding/niches/:code/agent-templates` | B3 | `agent-templates-service.adapter#listAgentTemplates` |
| POST | `/onboarding/agents/from-template` | B3 | `agent-templates-service.adapter#createAgentFromTemplate` → `AiAgentDto` |
| POST | `/catalog/imports` (multipart) | B4 | `catalog-import-service.adapter#createCatalogImport` |
| GET | `/catalog/imports/:id` | B4 | `use-catalog-import-job` (sondeo) |
| PUT/DELETE | `/catalog/imports/:id/items/:item_id` | B4 | `patchCatalogImportItem` (solo lo que cambió) |
| POST | `/catalog/imports/:id/commit` · `/cancel` | B4 | `commitCatalogImport` con `{ create_categories: true, on_duplicate: "skip" }` |
| GET | `/me/entitlements` | B1 | `onboarding-service.adapter#getMyEntitlements` (pantalla «Listo») |

**Wire del alta** (`SignupPayload`, `shared/auth/auth.types.ts`): `offer.kind` es `"package"` |
`"module"` y `offer.codes` lleva `public_slug` — paquetes `free_trial` | `sbs`, módulos `calls` |
`leads` | `crm` | `scheduling`. `company.city` es **obligatoria**. `accepted_terms: true`,
`captcha_token` (Turnstile; vacío sin `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) y `website` (honeypot,
siempre vacío).

**Códigos RFC 7807 que el cliente discrimina** (`core/api/problem.ts`, mensajes en
`core/lib/error-messages.ts`): `identities/nit_taken`, `onboarding/nit_invalid` → vuelven al paso
Empresa con el error en NIT; `onboarding/email_in_use`, `onboarding/email_disposable` → error en el
campo correo; `onboarding/captcha_failed`, `onboarding/offer_invalid`,
`onboarding/offer_not_self_service`, `onboarding/signup_rate_limited` (429 + `Retry-After`) → aviso
sobre el botón. Los errores del BFF llegan como `LoginError` (no `HttpError`): se traducen con
`messageForCode(code)`.

**Códigos de paso (wire):** `niche` · `business_hours` · `catalog` · `agents` · `whatsapp`. Estados
`pending` | `done` | `skipped` (omitido también cierra). `steps.catalog.data.import_id` permite
reanudar una revisión; `steps.agents.data.agent_ids` y `steps.whatsapp.data.channel_id` quedan para
el resumen y para plataforma.

---

## Parte B — Anatomía del frontend

### B.1 Rutas

| Ruta | Dónde | Auth | Por qué así |
|---|---|---|---|
| `/comenzar` | `src/app/comenzar/` (primer nivel, como `/pay`) | pública (`PUBLIC_PATHS`), `noindex` | Un funnel no lleva mega-menú ni shell de panel. Monta `PublicAnalytics` a propósito: es la superficie de conversión y no hay datos de tenants. La cabecera lleva el mismo `BrandLockup` que el header público: la marca no cambia al cruzar desde la landing |
| `/onboarding` | `src/app/(onboarding)/onboarding/` | privada (middleware) pero **fuera de `(private)`** | El shell privado pintaría un sidebar de módulos aún sin configurar. `AppReadySignal` cierra el splash que abrió `/comenzar` |
| `POST /api/auth/signup` | `src/app/api/auth/signup/route.ts` | BFF | Un solo viaje: el backend devuelve `AuthTokensDto`, el BFF siembra las mismas cookies HttpOnly que el login y el browser nunca ve el token |

Redirects (`next.config.ts`): `/signup` y `/registro` → `/comenzar`. SEO: `/comenzar` y
`/onboarding` en `DISALLOWED_PREFIXES`, fuera de `INDEXABLE_ROUTES`.

### B.2 Slice `src/modules/onboarding/`

```
public.ts                        OnboardingResumeBanner, ONBOARDING_STEPS, tipos
domain/                          TypeScript puro, con tests exhaustivos
  signup-draft.ts                oferta Paquete XOR Módulos, parseOfferQuery, bloqueos, toSignupPayload
  onboarding-progress.ts         pasos wire, firstOpenStep, canJumpTo, resolveEntryStep, progressPercent
  niches.ts                      catálogo CERRADO de nichos (8 + «Otro»)
  catalog-import.ts              tipos B4, validateImportFile, importPollInterval, confidenceTone, patchesFor
  agent-templates.ts             tipos B3, tonos, defaultAgentName, toCreateDTO/quickCreateDTO
  entitlements.ts                tipos B1, trialEndsLabel, offerLabel
infrastructure/
  services/                      onboarding · catalog-import · agent-templates (adapters `http`)
  stores/onboarding.store.ts     Zustand: progreso compartido entre /onboarding y el banner del dashboard
  hooks/use-catalog-import-job.ts sondeo 2 s → 5 s → «tarda más» a los 3 min
  storage/signup-draft.storage.ts sessionStorage sin la contraseña
ui/
  signup/                        SignupFunnelView, OfferStep, CompanyStep, AccountStep, SignupSummaryRail,
                                 PasswordField, TurnstileWidget, config/*.config.tsx
  onboarding/                    OnboardingView, OnboardingShell, StepFrame, OnboardingSkeleton,
                                 steps/{Niche,BusinessHours,CatalogImport,AgentTemplates,WhatsApp,Done}Step
  catalog-import/                ImportDropzone, ImportJobProgress, ExtractedProductsReview
  agents/                        TemplateCard, TemplateCustomizeSheet
  components/                    OnboardingResumeBanner
```

Sin `application/`: la lógica real (máquinas de pasos, reglas del import) es pura y vive en
`domain/`, sin segundo adapter que justifique puertos (regla de escape §3.2 de la arquitectura;
mismo patrón que `marketing/domain/campaign-draft.ts`).

### B.3 Decisiones que no se revierten

1. **Paquete XOR Módulos por tipo** (`OfferSelection`). Cambiar de pestaña descarta lo otro; el
   estado mixto es imposible. Con dos o más módulos, la UI dice que SBS sale mejor (`packageBeatsModules`).
2. **La URL manda sobre el borrador**: `?plan=` / `?modulo=` preseleccionan y entran directo a
   Empresa; `?plan=enterprise` redirige a `/contacto`. Los CTA de precios se construyen desde
   `plan.cta.href` / `module.cta.href` del content de la landing, nunca a mano.
3. **El borrador del registro nunca guarda la contraseña.** Recargar en el paso 3 vuelve al paso 3
   con la cuenta vacía.
4. **El progreso es del servidor.** El store es su eco; cada paso persiste su cierre ANTES de avanzar
   y el banner del dashboard lee el mismo store. Sin progreso, el banner no pinta nada.
5. **Orden con información**: adelante solo al primer paso abierto; atrás siempre. `?step=`
   inalcanzable cae al primero abierto (`resolveEntryStep`).
6. **La IA nunca inventa un precio.** Un item sin `price_cents` no se crea: se completa o se excluye.
   El commit es del usuario y solo viajan los PATCH que difieren del servidor (`patchesFor`).
7. **El wizard de canales es uno.** `ConnectChannelFlow` (slice `channels`, publicado por su barrel)
   se monta en `/settings/channels/connect` con cromo de página y embebido en el paso WhatsApp. El
   `code` de Meta vive 30 s: el estado del flujo sigue siendo efímero.
8. **Correo sin verificar bloquea Meta, no el onboarding.** `MeDto.email_verified === false` muestra
   el requisito con reenvío; `undefined` (contrato aún sin desplegar) no bloquea.
9. **Los nichos son contenido, no datos**: catálogo cerrado en `domain/niches.ts`. El backend solo
   hace falta para las plantillas de agente.
10. **Unidades comerciales, nunca tokens.** La landing formatea con `core/lib/commercial-units`; los
    entitlements llegan ya formateados por el backend y aquí no se divide nada.
11. **`FOUNDERS.claimed`, `MODULES[].listCop` y `priceStatus`** son valores manuales del content de la
    landing; `priceStatus: "draft"` mantiene el precio visible pero fuera del JSON-LD.

### B.4 Piezas compartidas que nacieron o crecieron aquí

`core/lib/commercial-units.ts` · `shared/components/ui/brand-lockup.tsx` (`BrandLockup`, nació al
unificar la marca de `/comenzar` con la landing) · `shared/data/countries.ts` (promovido desde `platform`) ·
`DraftBackButton` en `shared/components/features/dynamic-form` · `ProviderCard.selectionRole`
(`radio` | `checkbox`) · `shared/components/ui/beams-background.tsx` · `messageForCode()` en
`core/lib/error-messages.ts` · `AuthProvider.signup()` · barrels `landing/public.ts` y
`onboarding/public.ts`; `channels/public.ts` += `ConnectChannelFlow`; `agents/public.ts` +=
`listCharacters`, `characterStyle`, `characterHasVoice`, `CharacterDTO`, `AiAgentDTO`.

### B.5 Analítica

Solo en la capa pública: `signup_start_click` (delegado en `core/analytics/outbound.ts` sobre
`href^="/comenzar"`, con `offer_codes` de la query), `signup_step_view` y `signup_completed`
(`sign_up` en GA4 / `CompleteRegistration` en Meta). El progreso de `/onboarding` lo registra el
backend; el frontend no envía analítica desde rutas privadas.

### B.6 Tests

Dominio con cobertura exhaustiva (`signup-draft`, `onboarding-progress`, `catalog-import`,
`agent-templates`, `entitlements`, `commercial-units`) y una suite por vista/paso con los adapters
mockeados (`SignupFunnelView`, `OnboardingView`, `CatalogImportStep`, `AgentTemplatesStep`,
`WhatsAppStep`, `DoneStep`, `OnboardingResumeBanner`, `ConnectChannelFlow`). Gotchas que ya
costaron tiempo:

- El mock de `useRouter` debe devolver **el mismo objeto**; uno nuevo por render dispara los efectos
  que lo tienen como dependencia y jest se cuelga sin error.
- Con `mockResolvedValueOnce` usar `jest.resetAllMocks()` en `beforeEach`: `clearAllMocks` no vacía
  la cola y el valor sobrante se cuela en el test siguiente.
- Los botones de los pasos están deshabilitados hasta que llegan sus datos: esperar
  `findByRole(...)` antes de pulsar.
- `DetailSheet` se dobla con un `div role="dialog"` que renderiza `children` + `renderFooter()`.
- Un campo custom de `DynamicForm` necesita `htmlFor` + `id` para que `getByLabelText` lo encuentre.

---

## Parte C — Lo que aún es contrato a mano y lo que falta

- **Tipos `// CONTRACT`** (a sustituir por `Schemas[...]` cuando B1–B4 estén en `main` y se corra
  `npm run api:types`): `domain/onboarding-progress.ts`, `domain/catalog-import.ts`,
  `domain/agent-templates.ts`, `domain/entitlements.ts`, `SignupPayload` en `shared/auth/auth.types.ts`,
  y la lectura tolerante de `MeDto.email_verified` en `OnboardingShell` y `WhatsAppStep`.
- **`api:types:check` desde un worktree falla por la ruta relativa al spec** (`../axi-server/...`);
  correr desde el checkout principal o con `npx openapi-typescript <ruta absoluta>`.
- **Fuera de v1** (decisión): preview de chat del agente, varias empresas por usuario, conversión
  autoservicio desde `/billing` (B5), PDF escaneado, métrica `appointments_booked`, voz y palabras de
  traspaso en el sheet de plantilla (el `CreateAgentFromTemplateDto` no los admite; viven en Agentes).
- **Pendiente del dueño**: `next build`, suite completa, `seed:rbac`/`seed:offers` en el backend,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en producción, reindexar el grafo tras fusionar.
