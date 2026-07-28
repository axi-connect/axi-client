# Sitio público — landing, marketplace y auth (`(public)/*`)

> **Documento de la parte pública de axi-client**: todo lo accesible sin sesión de tenant.
> A diferencia del resto de docs de esta carpeta, no documenta un slice de `src/modules/`
> — la parte pública no tiene módulo propio: vive en `src/app/(public)/` con componentes
> de presentación en `src/shared/components/layout/site/`.
>
> Estado: **base construida** (landing con 3 secciones, marketplace hero, login/logout
> completos). Pendiente el objetivo mayor: **landing profesional orientada a conversión**
> (planes/precios, captura de leads, FAQ/dudas de producto) — ver §5 Gap analysis.

---

## 1. Rutas públicas y protección

| Ruta | Archivo | Estado |
|---|---|---|
| `/` (landing) | `src/app/(public)/page.tsx` | Real: `SiteHero` + `SiteFramework` + `SiteInboxShowcase` (`SiteLogoCloud` existe pero está comentado) |
| `/marketplace` | `src/app/(public)/marketplace/page.tsx` | Real: monta `marketplace-hero.tsx` |
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
├── SiteHeader.tsx        # nav con dropdowns, theme toggle, CTA login/dashboard según status de sesión
├── SiteFooter.tsx        # columnas de enlaces (mayoría aspiracionales, ver §5) + redes (href="#")
├── hero/SiteHero.tsx     # hero animado (framer-motion)
├── sections/
│   ├── SiteFramework.tsx      # sección de propuesta de valor
│   ├── SiteInboxShowcase.tsx  # demo visual del inbox
│   └── SiteLogoCloud.tsx      # existe, NO montada (comentada en page.tsx)
└── components/
    ├── particles.tsx     # efecto de fondo
    └── spotlight.tsx     # efecto de foco
```

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

## 5. Gap analysis (insumo de la futura landing de conversión)

Enlaces del `SiteHeader`/`SiteFooter` que apuntan a páginas **inexistentes** (hoy dan 404):

- Header/nav: `/products`, `/solutions`, `/precios`, `/recursos`, `/blog`, `/casos`, `/ayuda`, `/contacto`; menú móvil: `/login`, `/signup` (además rutas equivocadas: las reales son `/auth/login` y no hay signup).
- Footer: `/soluciones`, `/precios`, `/about`, `/contacto`, `/blog`, `/casos`, `/ayuda`, `/legal`, `/seguridad`; redes sociales con `href="#"`.

Funcionalidad ausente para el objetivo de conversión:

- **Precios/planes**: no hay página ni fuente de datos pública (los planes existen en la consola platform, backend `axi-server`).
- **Captura de leads**: no hay formulario de contacto/demo ni endpoint (habría que definirlo en `axi-server` y exponerlo, probablemente sin auth).
- **FAQ / dudas de producto**: nada.
- **Recuperación de contraseña**: `docs/architecture.md` §Rutas promete `/auth/forgot-password` y `/auth/reset-password` pero no existen.
- `SiteLogoCloud` (prueba social) construida pero desactivada.
