# SEO, semántica, analítica y link previews

> **Estado: implementado (agosto de 2026).** Ejecuta y amplía la F9 de
> `public-gtm-plan.md`. Este documento es la referencia de cómo funciona el SEO
> del sitio y, sobre todo, de **por qué** está montado así.

## El problema que resolvió

El sitio tenía copy de marketing trabajado y nueve páginas con `description`
propia, y aun así era invisible para Google e incompartible en redes. Cinco
fallos, todos **silenciosos** — ninguno producía un error en ningún sitio:

1. **`metadataBase` resolvía a `http://localhost:3001` en producción.**
   `src/app/layout.tsx` leía `process.env.NEXT_PUBLIC_APP_URL`, y esa variable no
   estaba declarada en el `Dockerfile` ni en el workflow: el fallback ganaba
   siempre. Todos los `canonical` y todas las URLs de Open Graph del sitio
   apuntaban a localhost.
2. **El middleware devolvía 307 al login en las rutas de metadata.** Su matcher
   solo exime `_next|api|favicon.ico|assets|fonts|images`, e `isPublicPath` es
   fail-closed. `/opengraph-image.png`, `/icon.svg` y `/apple-icon.png` no
   estaban en `PUBLIC_PATHS`: **la imagen de enlace existía en el repositorio y
   ningún scraper podía descargarla.**
3. **No había `robots.txt` ni `sitemap.xml`**, y habrían caído en el mismo muro.
4. **Cero datos estructurados y cero analítica.**
5. **Cinco de nueve páginas de marketing sin `<h1>`** y **ninguna con `<main>`**.

## Decisiones que no conviene revertir

**El dominio tiene un único punto de definición y el build revienta sin él.**
`SITE_URL` en `core/config/env.ts` lanza si `NEXT_PUBLIC_APP_URL` falta o no
parsea (docs/architecture.md §13.2), igual que `SALES_WHATSAPP`. No se degrada a
un valor por defecto **a propósito**: una `NEXT_PUBLIC_*` ausente se hornea como
`undefined` en el bundle, y el resultado es un sitio en producción declarando que
su contenido canónico vive en otra parte, sin ninguna señal. Ya pasó.

**Las rutas de metadata van en `PUBLIC_PATHS`, no en el matcher del middleware.**
Es el patrón que exige el comentario de cabecera de `core/config/routes.ts`, y
tocar el matcher es tocar la superficie de autenticación. Si mañana se añade
`manifest.webmanifest` o un HTML de verificación, va a la misma lista.

**El sitemap se deriva de `INDEXABLE_ROUTES` (`core/seo/routes.ts`), que es
distinto de `PUBLIC_PATHS`.** Responden a preguntas distintas: `PUBLIC_PATHS`
dice qué deja pasar el middleware (e incluye `/api`, `/_next`, los estáticos y
`/auth`); `INDEXABLE_ROUTES` dice qué debe conocer Google. Mezclarlas metería el
login y los assets en el sitemap. **Las rutas que redirigen (los 308 de
`next.config.ts`) no se listan**: una URL que redirige no es canónica.

**El Open Graph se declara explícitamente, no por convención de archivo.** Next
sirve `app/opengraph-image.png` y añade el `og:image` solo mientras nadie
sobreescriba `openGraph`; en cuanto una página declara el suyo (que es lo que
hace falta para tener previews distintos por URL), la imagen heredada desaparece
y el `og:image` deja de emitirse. Por eso `OG_IMAGE` vive en `core/seo/site.ts` y
lo inyecta `pageMetadata()`.

**La analítica se monta en `app/(public)/layout.tsx`, nunca en el layout raíz.**
El raíz envuelve también `(private)` y `/platform`: montarla ahí enviaría a
Google y a Meta rutas como `/workspace/inbox/<id>` o `/crm/contacts/<id>`, que
son datos de las conversaciones de los clientes de cada tenant. **La frontera de
`PublicAnalytics` es la frontera de privacidad**, y la prueba de humo es abrir el
panel autenticado y comprobar que `window.gtag` y `window.fbq` no existen.

**Los CTA se instrumentan por delegación, no con `onClick`.** Los enlaces de
WhatsApp los arma `salesWhatsAppUrl()`, que devuelve un string para el `href`
(§13.1), y varios de sus consumidores son Server Components: añadirles un
manejador los convertiría en componentes de cliente y arrastraría su árbol al
bundle. Un solo oyente en `document` (`core/analytics/outbound.ts`) cubre los
siete CTA actuales y los que vengan.

**El píxel de Meta no carga sin un sí explícito.** GA4 sí carga siempre, con
Consent Mode v2 denegado por defecto: sin cookies, conservando tendencias. Meta
no tiene equivalente, y es publicidad y remarketing — que es justo lo que la Ley
1581 de 2012 quiere que se autorice antes.

**El JSON-LD solo afirma hechos verificables.** Faltan a propósito `sameAs` (axi
no tiene perfiles propios: los del pie son de Kodecol), `aggregateRating` (no hay
reseñas) y `SearchAction` (no hay buscador). Search Console avisará de "campo
recomendado ausente"; es un aviso, y es preferible a inventar datos. Los precios
salen de `SBS_TIERS` y `founderCop()`, **los mismos** que pintan las tarjetas: un
JSON-LD que no coincide con lo visible es motivo de acción manual.

**`SectionHeading` acepta `as`, con default `h2`.** El default correcto es `h2`
porque en la home el `h1` lo pone `LandingHero`. Las cinco páginas sin hero pasan
`as="h1"` en su primera cabecera. El tamaño no cambia: es jerarquía, no estilo.

## Mapa del código

| Archivo | Papel |
|---|---|
| `core/config/env.ts` | `SITE_URL`, `siteUrl()`, `GA_MEASUREMENT_ID`, `META_PIXEL_ID`, `ANALYTICS_ENABLED` |
| `core/seo/routes.ts` | `INDEXABLE_ROUTES` + prefijos prohibidos. Fuente del sitemap |
| `core/seo/metadata.ts` | `pageMetadata()` (título, descripción, canonical, OG, Twitter) y `noindexMetadata()` |
| `core/seo/site.ts` | `OG_IMAGE`, `organizationSchema`, `webSiteSchema`, `faqSchema`, `breadcrumbSchema`, `contactPageSchema` |
| `core/seo/json-ld.tsx` | `<JsonLd>` (RSC, 0 KB de JS) y `serializeJsonLd()` |
| `modules/landing/ui/seo/landing-schema.ts` | `pricingSchema()` — vive en el slice porque lee el contenido |
| `core/analytics/` | consentimiento, `track()`, delegación de clics, `PublicAnalytics`, `ConsentBanner` |
| `app/robots.ts`, `app/sitemap.ts` | Rutas generadas |

## Al añadir una página pública nueva

1. Alta en `PUBLIC_PATHS` (`core/config/routes.ts`) — si no, 307 al login.
2. Entrada en `INDEXABLE_ROUTES` (`core/seo/routes.ts`) — de ahí sale el sitemap.
3. `export const metadata = pageMetadata({ title, description, path })`.
4. Un `<h1>` único (con `SectionHeading`, `as="h1"` en la primera cabecera).

## Pendiente

- **Search Console**: verificar el dominio (la vía limpia es la etiqueta de GA4,
  que ya está instalada; el DNS también es accesible) y enviar el sitemap.
- **Crear las Variables del repositorio** `NEXT_PUBLIC_GA_ID` y
  `NEXT_PUBLIC_META_PIXEL_ID`. Hasta que existan, la analítica no se monta —
  `ANALYTICS_ENABLED` es `false` y el sitio se despliega sin medir.
- **`sharp` no está instalado** y `images.formats` pide AVIF/WebP en un runner
  `standalone`: conviene comprobar en producción si `next/image` está optimizando
  de verdad antes de dar por bueno ese ahorro.
- **`/productos` y `/soluciones` siguen siendo andamios** (`PageOutline`) y se
  indexan por decisión de producto. Conviene rellenarlas (F5/F6 del plan GTM)
  para que el contenido fino no pese sobre la autoridad del dominio.
- **Los textos legales llevan "⚠️ REQUIERE REVISIÓN LEGAL ANTES DE PUBLICAR"** y
  ahora el banner de consentimiento enlaza a `/legal/privacidad`.
- **HSTS, `www`→apex y la CSP** viven en el proxy del VPS, fuera del repositorio.
