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
- **No hay auto-registro**: el alta de empresas es por la consola platform (modelo SaaS multi-tenant); el login dice "¿No tienes cuenta? Contáctanos".
- Empresa suspendida (F15) → `CompanySuspendedScreen`, nunca al login.

## 4. Convenciones aplicables a nuevas páginas públicas

- Fuente de verdad: `docs/architecture.md` (código en inglés, docs/comentarios en español; RSC por defecto, `"use client"` solo con interactividad).
- Design system: shadcn/ui new-york (`src/shared/components/ui/`) + Tailwind v4 CSS-first — tokens semánticos de `src/app/globals.css` (`bg-background`, `text-brand`…), nunca hex sueltos; light/dark obligatorio; iconos lucide.
- Fuentes: **Nexa** (headings) + **Poppins** (cuerpo). framer-motion con tipos ambient (no importar tipos del paquete).
- Formularios → reutilizar `DynamicForm` (`src/shared/components/features/dynamic-form/`); datos → `http` (`src/core/services/http.ts`) vía BFF `/api/proxy`; backend en `../axi-server`.

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
- **F5–F9**: `/soluciones` y `/productos` definitivas, comparativa y barra CTA móvil en la
  home, marketplace con badge "Pronto", y SEO (`robots.ts`, `sitemap.ts`, JSON-LD) + QA.
  Cada una con su propio plan.
- **Revisión legal** de `/legal/terminos` y `/legal/privacidad`.
- **Datos de negocio pendientes**: Kodecol (URL, claim, logo, redes) en
  `kodecol.content.ts`; correo comercial en `CONTACT` (`landing.content.ts`); redes de Axi
  en `SITE_SOCIALS` (vacío a propósito: iconos con `href="#"` son peor que ninguno).
- **Recuperación de contraseña**: `docs/architecture.md` §6 promete
  `/auth/forgot-password` y `/auth/reset-password` y no existen.
- **Deuda de la home** (intacta por decisión): formulario sobre glass encima de canvas
  WebGL, `blur-2xl` de 640px en el hero (riesgo de LCP), h1 a 24px en móvil, y prueba
  social publicando el badge "CIFRA PENDIENTE" con 2 de 3 logos vacíos. Listado completo
  en el plan §F9.
