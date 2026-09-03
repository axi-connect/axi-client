# Sitio público — landing, marketplace y auth (`(public)/*`)

> **Documento de la parte pública de axi-client**: todo lo accesible sin sesión de tenant.
> A diferencia del resto de docs de esta carpeta, no documenta un slice de `src/modules/`
> — la parte pública no tiene módulo propio: vive en `src/app/(public)/` con componentes
> de presentación en `src/shared/components/layout/site/`.
>
> Estado (agosto 2026): **landing de conversión completa** (12 secciones §1–§11 en
> `src/modules/landing/`, copy en `landing.content.ts`) y **capa GTM en construcción
> por fases**: F1–F4 hechas (cimientos de rutas, navbar, footer, `/contacto` + legales).
> Pendientes F5–F9, cada una con su propio plan — ver `docs/plans/public-gtm-plan.md`.

---

## 1. Rutas públicas y protección

| Ruta | Archivo | Estado |
|---|---|---|
| `/` (landing) | `src/app/(public)/page.tsx` | Real: 12 secciones de `src/modules/landing/ui/sections/` (§1–§11 de `landing-copy.md`) |
| `/productos` | `src/app/(public)/productos/page.tsx` | **Andamio** (`PageOutline`) con las 5 anclas reales; contenido definitivo = F6 |
| `/soluciones` | `src/app/(public)/soluciones/page.tsx` | **Andamio** (`PageOutline`) con las 4 anclas reales; contenido definitivo = F5 |
| `/contacto` | `src/app/(public)/contacto/page.tsx` | Real: reutiliza `DemoLeadForm` + WhatsApp del agente + datos de empresa |
| `/legal/terminos` · `/legal/privacidad` | `src/app/(public)/legal/*/page.tsx` | Real (`LegalDocument`). ⚠️ **pendiente revisión legal** |
| `/marketplace` | `src/app/(public)/marketplace/page.tsx` | Real: monta `marketplace-hero.tsx`. Badge "Pronto" y CTAs = F8 |

**Redirects** (`next.config.ts`, todos 308): `/precios`→`/#planes`, `/demo`→`/contacto`,
`/products`→`/productos`, `/solutions`→`/soluciones`, `/login`→`/auth/login`,
`/signup`→`/contacto`, `/legal`→`/legal/terminos`.

**404 de marca**: `src/app/not-found.tsx`. Ojo con su alcance real: solo se ve en rutas
bajo un prefijo de `PUBLIC_PATHS` (p. ej. `/legal/xyz`). Un path desconocido de primer
nivel lo intercepta antes el middleware y va al login — es el diseño fail-closed de §8
de `architecture.md`, no un bug de esta capa.
| `/auth/login` | `src/app/(public)/auth/login/{page,form,schema}` | Completo: RHF+Zod, errores RFC 7807 (credenciales, empresa ambigua→NIT, suspendida, 429), redirect a `?next` o `/dashboard` |
| `/auth/logout` | `src/app/(public)/auth/logout/page.tsx` | Fallback de navegación dura; el flujo normal es el modal interceptado `src/app/@modal/(.)auth/logout/page.tsx` |

Protección en dos capas:

1. **Edge**: `src/middleware.ts` solo comprueba **presencia** de cookies (`accessToken`/`refreshToken`); si faltan ambas y la ruta no es pública → `/auth/login?next=<pathname>`. La lista `PUBLIC_PATHS` + `isPublicPath()` viven en `src/core/config/routes.ts`.
2. **Cliente**: `src/core/providers/auth-provider.tsx` hidrata contra `GET /api/auth/session`; `redirectToLogin()` NO redirige en paths públicos, por eso la landing se ve sin sesión.

Nota: `/platform` figura en `PUBLIC_PATHS` pero **no es parte del sitio público** — es la consola super-admin con auth propia en `sessionStorage` (`PlatformGuard`); ver [`platform.md`](./platform.md).

## 2. Shell de marketing

`src/app/(public)/layout.tsx` = contenedor de scroll + `SiteHeader` + `SiteFooter`.
El login usa un layout centrado propio (`src/app/(public)/auth/layout.tsx`) dentro del mismo grupo.

```
src/shared/components/layout/site/
├── site-nav.content.ts   # FUENTE ÚNICA de navbar y footer (+ socials, CTA, sesión)
├── kodecol.content.ts    # datos de la casa de desarrollo (pendientes de negocio)
├── SiteHeader.tsx        # nav accesible por teclado, theme toggle, CTA según sesión
├── SiteFooter.tsx        # 3 columnas podadas + KodecolBanner + legal
├── KodecolBanner.tsx     # banda "Fundado y soportado por" (acento violeta)
├── SocialIcon.tsx        # logos de redes (react-icons, excepción de DESIGN-SYSTEM §7)
└── legacy/ hero/ sections/ components/    # NO enrutado — plantilla de /productos (F6)
```

**Regla del navbar/footer:** ningún `href` entra en `site-nav.content.ts` sin página o
ancla real, Y sin estar en `PUBLIC_PATHS`. Un enlace a ruta inexistente no da 404 para
un anónimo: el middleware lo manda al login, que se lee como muro de acceso.

El árbol `legacy/ hero/ sections/ components/` **no se borra a propósito**: es la
plantilla visual (fondo estrellado de `particles.tsx`, carrusel de `SiteFramework`) de la
futura `/productos`, y contiene las 3 únicas capturas reales del producto que existen.
Concentra los 5 warnings de lint y la única animación sin `prefers-reduced-motion` de la
capa pública — se sanea en F6.

El hero del marketplace vive aparte: `src/shared/components/layout/marketplace-hero.tsx`.

## 3. Flujo de auth público

- Tokens en **cookies HttpOnly** (`accessToken` 15 min, `refreshToken` 7 d); el browser nunca ve el JWT. BFF en `src/app/api/auth/*` + proxy autenticado `src/app/api/proxy/[...path]/route.ts`.
- No autenticado en ruta privada → middleware → `/auth/login?next=...`. Tras login: splash → `next` o `/dashboard`.
- **Alta autoservicio en `/comenzar`** (desde 2026-09, `docs/plans/onboarding_self_service_plan.md`): tres pasos (oferta → empresa → cuenta) y `POST /api/auth/signup`, que siembra las mismas cookies que el login con los tokens que devuelve el backend y manda a `/onboarding`. Enterprise sigue siendo asistido (`/contacto`). El login dice "¿No tienes cuenta? Crea tu cuenta". La consola `/platform` conserva su alta manual. El correo de verificación lleva a `/verificar-correo?token=` (pública, `noindex`), que confirma la cuenta y devuelve al onboarding.
- Empresa suspendida (F15) → `CompanySuspendedScreen`, nunca al login.

## 4. Convenciones aplicables a nuevas páginas públicas

- Fuente de verdad: `docs/architecture.md` (código en inglés, docs/comentarios en español; RSC por defecto, `"use client"` solo con interactividad).
- Design system: shadcn/ui new-york (`src/shared/components/ui/`) + Tailwind v4 CSS-first — tokens semánticos de `src/app/globals.css` (`bg-background`, `text-brand`…), nunca hex sueltos; light/dark obligatorio; iconos lucide.
- Fuentes: **Nexa** (headings) + **Poppins** (cuerpo). framer-motion con tipos ambient (no importar tipos del paquete).
- Formularios → reutilizar `DynamicForm` (`src/shared/components/features/dynamic-form/`); datos → `http` (`src/core/services/http.ts`) vía BFF `/api/proxy`; backend en `../axi-server`.
- **SEO (obligatorio, ver `docs/plans/seo-plan.md`)**: alta en `PUBLIC_PATHS`
  (`core/config/routes.ts`) **y** en `INDEXABLE_ROUTES` (`core/seo/routes.ts`, de donde sale
  el sitemap entero); `export const metadata = pageMetadata({ title, description, path })`
  (`core/seo/metadata.ts`), que compone canonical, Open Graph y Twitter Card de una vez; y un
  `<h1>` único — con `SectionHeading`, `as="h1"` en la primera cabecera, porque su default es
  `h2` (en la home el `h1` lo pone `LandingHero`).
- **Analítica**: no hay que instrumentar los CTA. `core/analytics/outbound.ts` captura por
  delegación cualquier enlace `wa.me` o ancla `#demo` que se añada.

### 4.1 Mantenimiento del Programa Fundadores (§9 Planes)

La sección de precios lleva dos valores **manuales** en
`modules/landing/ui/content/landing.content.ts` (`FOUNDERS`), sin backend detrás:

- **`claimed`** — cupos ya tomados; súbelo al cerrar cada venta. El contador y la barra de
  la franja salen de ahí, y al llegar a `slots` la franja pasa a «Cupos agotados» y las
  tarjetas vuelven al precio de lista.
- **`deadline`** — fecha de cierre en ISO. Al pasar, la oferta se cierra sola (fallo
  seguro ante un olvido): desaparece el descuento y quedan los precios de lista. Para
  renovar el ciclo, fecha nueva y `claimed` reiniciado.

Los precios con descuento **no se escriben a mano**: salen de `founderCop()` sobre
`SBS_TIERS[].listCop` y `FOUNDERS.discount`, así que el tachado y el precio final no
pueden contradecirse.

`FOUNDERS.deadline` alimenta además el **split-flap** de la franja (`FlipCountdown`).
Todo lo que depende del reloj se calcula tras montar, nunca en render: la home se
prerenderiza estática, así que en render quedaría congelado en la fecha del deploy —
antes de hidratar las fichas muestran guiones con su tamaño final, sin salto de layout.
Las keyframes del doblez viven en `globals.css` (`animate-flip-top` / `animate-flip-bottom`)
y están anuladas en el bloque de `prefers-reduced-motion`: la cuenta sigue corriendo, solo
desaparece el giro.

La tarjeta es una **isla oscura** (`.dark` + `.theme-dark-island` + `.bg-founders-slab`):
se mantiene oscura en ambos temas a propósito. `.theme-dark-island` existe porque
`@theme inline` sustituye los tokens de capa 2 en `:root`, así que al anidar `.dark` solo
se re-resuelve la capa 1 — las clases CSS crudas que leen `--color-*` necesitan que se
re-declaren.

**No metas `backdrop-filter` dentro de esta tarjeta.** Lleva tilt, y bajo un transform 3D
el filtro captura otro backdrop (la superficie se desatura) y recalcularlo por frame hunde
el frame rate: el reloj se ve congelado mientras haya hover. Por eso las fichas usan
`.glass-flat` —mismo aspecto, sin filtro— y hay un test que lo protege.

### 4.2 Módulos (§9b Planes)

Debajo de los Paquetes, `ModulePlans` vende cuatro Módulos de una sola capacidad
(`MODULES` en `landing.content.ts`). Reglas de mantenimiento:

- **`priceStatus`** decide qué se publica: la tarjeta siempre pinta `listCop`, pero el JSON-LD
  (`pricingSchema`) solo declara los módulos en `final`. Pasar un precio de `draft` a `final` es
  la decisión comercial, no un cambio de UI. Hay test que lo blinda.
- **La cuota se escribe en unidades comerciales** (`allowance`, formateada por
  `core/lib/commercial-units`): minutos, leads, conversaciones. Nunca tokens.
- **`offer_code`** es la clave que validará el backend en el alta autoservicio (F2); no se
  renombra sin coordinar con `axi-server/docs/plans/onboarding_self_service_backend_plan.md`.
- Las tarjetas llevan tilt, así que la superficie es `.glass-flat` (misma razón que §4.1). El
  fondo de la banda es `BeamsBackground` (`shared/ui`), canvas que lee los tokens de marca: la
  única animación en bucle sancionada fuera del CMO, por ser superficie de marketing.

### 4.3 Registro autoservicio (`/comenzar`)

Ruta de primer nivel (ni `(public)` ni `(private)`, como `/pay`), `noindex`, en `PUBLIC_PATHS` y en
`DISALLOWED_PREFIXES`. Vive en el slice `modules/onboarding` (`ui/signup/*`) y su máquina de pasos
es dominio puro (`domain/signup-draft.ts`, con test). Reglas:

- **La URL preselecciona la oferta** (`?plan=free_trial|sbs`, `?modulo=calls,crm`) y gana sobre el
  borrador guardado; `?plan=enterprise` redirige a `/contacto`. Los CTA de precios se construyen
  desde `plan.cta.href` / `module.cta.href` del content — nunca a mano.
- **Paquete XOR Módulos** por tipo (`OfferSelection`): cambiar de pestaña descarta lo otro.
- **La ciudad es obligatoria**; el país autollenan zona horaria (catálogo `shared/data/countries`).
- El borrador se guarda en `sessionStorage` **sin la contraseña**.
- Errores por `code`: `identities/nit_taken` y `onboarding/nit_invalid` vuelven a Empresa con el
  error en NIT; `onboarding/email_in_use` y `email_disposable` marcan el correo; el resto se muestra
  sobre el botón. Mensajes en `core/lib/error-messages.ts`.
- Captcha: `TurnstileWidget` solo con `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; sin ella el backend valida con
  su verificador `noop` (prohibido en producción).
- Analítica: `signup_start_click` (delegado en `outbound.ts` sobre `href^="/comenzar"`),
  `signup_step_view` y `signup_completed` (`sign_up` / `CompleteRegistration`).

## 5. Estado de la capa GTM y brechas abiertas

Plan maestro y fases: **`docs/plans/public-gtm-plan.md`**.

**Cerrado (F1–F4):** los 15 enlaces rotos del navbar/footer, el 404 de `/precios`, los CTA
móviles que apuntaban a `/login`/`/signup`, los dropdowns inaccesibles por teclado y
táctil, el scroll horizontal de la landing (`w-screen`→`w-full`), el hover invisible del
botón primario, `lang="en"`→`"es"`, las animaciones ausentes de Radix
(`tw-animate-css`), el isotipo servido desde Cloudinary, y las páginas `/contacto` y
`/legal/*`.

**Abierto:**

- **Captura de leads**: `createDemoLead` (`modules/landing/infrastructure/services/`) sigue
  siendo un `setTimeout` — **ningún lead se persiste**. La conversión real es el WhatsApp
  que abre el submit. Contrato del endpoint pendiente en el plan §Requerimiento para
  axi-server; cuando exista, el cambio es una línea en ese adapter.
- **F5–F8**: `/soluciones` y `/productos` definitivas, comparativa y barra CTA móvil en la
  home, y marketplace con badge "Pronto". Cada una con su propio plan.
  **F9 (SEO) está cerrada** — ver `docs/plans/seo-plan.md`. Nota: `/productos` y
  `/soluciones` ya se indexan aunque sigan siendo andamios, así que rellenarlas dejó de ser
  solo cosmética: hoy son contenido fino publicado.
- **Revisión legal** de `/legal/terminos` y `/legal/privacidad`.
- **Datos de negocio pendientes**: Kodecol (URL, claim, logo, redes) en
  `kodecol.content.ts`; correo comercial en `CONTACT` (`landing.content.ts`); redes de Axi
  en `SITE_SOCIALS` (vacío a propósito: iconos con `href="#"` son peor que ninguno).
  Consecuencia añadida: el `Organization` del JSON-LD **omite `sameAs`** mientras siga vacío,
  porque declarar los perfiles de Kodecol como si fueran de axi sería falso.
- **Recuperación de contraseña**: `docs/architecture.md` §6 promete
  `/auth/forgot-password` y `/auth/reset-password` y no existen.
- **Deuda de la home** (intacta por decisión): formulario sobre glass encima de canvas
  WebGL, `blur-2xl` de 640px en el hero (riesgo de LCP), h1 a 24px en móvil, y prueba
  social publicando el badge "CIFRA PENDIENTE" con 2 de 3 logos vacíos. Listado completo
  en el plan §F9. De esa lista **ya no cuenta la tipografía**: Nexa pasó de TTF a WOFF2
  (287 KB → 102 KB) y Poppins bajó de cinco pesos a cuatro.
