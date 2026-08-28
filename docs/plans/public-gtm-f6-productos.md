# F6 — `/productos`: página de producto cinematográfica

> Cierra la F6 de `public-gtm-plan.md`. El diseño fue aprobado sobre mockup HTML
> navegable (Artifact privado, 2026-08-27, v2 «hero-inmersivo-isotipo»). Este
> documento registra las decisiones de implementación; el inventario de
> contenido viene del plan F6 original.

## Decisiones cerradas con el dueño

1. **Se reemplaza el andamio `PageOutline`** de `/productos` manteniendo las 5
   anclas ya enlazadas por mega-menú y footer: `#agente #inbox #crm #catalogo
   #medicion` (con `scroll-mt-24`). `PageOutline` se conserva: `/soluciones`
   sigue siendo su consumidor.
2. **Todo con framer-motion 12** — sin GSAP, sin Lenis, sin hls.js. Cero
   dependencias nuevas. Los componentes de referencia (hero-scroll-video-pin-
   reveal de GSAP y CircularCarousel) se replican con `useScroll`/`useTransform`
   sobre el contenedor `[data-app-scroll]` (hook `use-scroll-container`).
3. **Video del hero por Cloudinary progresivo** (`vc_h264` + `q_90`,
   pseudo-streaming por HTTP range). Autoplay CON sonido primero y fallback
   muted; el `BrandGradientCanvas` debajo es el respaldo si el asset falla.
4. **Hero de cine, con DOS másteres**. Ver la sección propia más abajo.
5. **Entrada del panel = «Lift & Scale»** (opción A del comparador de
   coreografías, elegida por el dueño en la 3ª revisión sobre el círculo
   expansivo + isotipo, que se retiró): el panel sube desde abajo creciendo
   (translateY 16%→0, scale 0.74→1, opacity 0.25→1, easeOut) — estilo página
   de producto de Apple, solo transform/opacity (sin excepción de clip-path).
   El titular cinético y las pills se conservan tal cual.
6. **18 herramientas, no 16**: la cifra del plan F6 estaba desactualizada. Los
   nombres de las pills son los archivos reales de
   `axi-server/src/modules/ai_agents/application/tools/*.tool.ts` (18).
7. **Acento de vista coral**; violeta solo en los marcadores de IA
   (convención transversal: el badge de IA es violeta).
7b. **La sección `#medicion` se RETIRÓ de esta página** (2ª revisión del
   dueño: duplicaba la §6 de la home). En su lugar va el muro 3D de
   conversaciones (`ProductosConversaciones`: marquee vertical CSS en
   perspectiva, negocios ficticios de retail/comida/moda). Las entradas del
   mega-menú y del carrusel apuntan ahora a `/#medicion` (la §6 de la home,
   `LandingMetrics`). `ProductosMedicion.tsx` se eliminó.
8. **`#agente` es una DEMO EN VIVO, no una lista de capacidades** (rediseño
   aprobado sobre mockup Artifact tras una auditoría UX/UI; ver más abajo).
   Sustituye al pin-reveal original de titular centrado + captura + muro de 18
   chips en monoespaciada.

## Archivos

| Ruta | Qué es |
|---|---|
| `src/app/(public)/productos/page.tsx` | RSC: metadata + JsonLd + composición de 8 secciones |
| `src/modules/landing/ui/content/productos.content.ts` | Copy completo, capturas Cloudinary cosechadas del legacy, URLs de video, 18 tools |
| `src/modules/landing/ui/components/HeroVideo.tsx` | client — autoplay muted + unmute + pausa por IO + save-data/reduced |
| `src/modules/landing/ui/components/KineticWords.tsx` | client — titular palabra a palabra por MotionValues |
| `src/modules/landing/ui/components/CircularCarousel.tsx` | client — carrusel elíptico 3D, autoplay, teclado, reduced→grid |
| `src/modules/landing/ui/components/mockups/BrowserFrame.tsx` | RSC — pestaña de navegador premium |
| `src/modules/landing/ui/components/mockups/TabletFrame.tsx` | client — tablet con rotateY scroll-driven (patrón LaptopMockup) |
| `src/modules/landing/ui/components/mockups/DeviceChat.tsx` | client — el dispositivo de `#agente`: chat que cambia de forma (teléfono ↔ tablet) |
| `src/modules/landing/ui/sections/productos/*` | 8 secciones (Hero, AgentReveal, Carousel, Inbox, CrmBento, Catalogo, Conversaciones, FinalCta) |
| `src/core/styles/motion.ts` | preset `scrollReveal` (coreografía del pin) |
| `src/app/globals.css` | `msg-in` + `typing-bob` (entrada de burbuja y «escribiendo») |
| `public/images/landing/gafas-aviador-ambar.jpg` | foto de catálogo de la demo |

## `#agente` — la demo en vivo

Auditoría UX/UI que motivó el rediseño (los chips se solapaban con la imagen y
la escena «no tenía nivel de producto premium»):

- El solape era el síntoma: el contenedor del panel era `flex-1 min-h-0` pero
  su hijo llevaba `min-h-[200px]`, así que al apretarse el presupuesto el hijo
  ganaba y se salía de su caja. **La escena estaba sobre-suscrita**: titular +
  sub + panel + 5 filas de chips en un solo `h-svh`.
- El fallo de fondo era otro: el titular prometía «se configura, no se
  programa» y debajo se mostraban 18 identificadores `snake_case` con ✓ verdes
  — vocabulario de desarrollador y tres acentos en una vista.

Diseño resultante: un chat incrustado en un dispositivo donde **cada paso de
scroll trae un mensaje y cada mensaje demuestra una capacidad**, con el foco de
capacidad nombrándola a la izquierda y un riel de 7 segmentos.

Decisiones que no revertir:

- **El negocio es una óptica ficticia** (Óptica Vértice). Tercer vertical a
  propósito: la home ya usa tecnología (`HERO_CHAT`) y moda (`STORY_CHAT`), y
  es el único caso donde catálogo y agenda conviven sin forzar la historia.
- **Los 18 tools NO se renderizan.** Cada beat declara cuáles lo respaldan y
  `content/__tests__/productos.test.ts` verifica que existan, que apunten a un
  mensaje real, que cuelguen de un turno del agente (nunca del cliente) y que
  avancen en orden.
- **El dispositivo cambia de forma por CSS, jamás por JS**: teléfono 19.5:9 por
  defecto, tablet 3:4 desde `lg`. Con 19.5:9 el ancho depende del alto, así que
  en portátiles de pantalla baja el teléfono se estrangulaba a ~190px; la
  tablet da un 60% más de ancho con el mismo presupuesto vertical. Decidirlo
  con `matchMedia` daría desajuste de hidratación y un salto al montar.
- **La interfaz interior escala con su propia pantalla** (`@container` + `cqw`
  acotado con `clamp`), no con el viewport: cero anchos fijos en las tarjetas
  (era lo que desbordaba la burbuja) y la cabecera trunca con elipsis.
- **El hilo se desplaza con `transform`, nunca `scrollTop`**: un scroller
  interno competiría con el de la página y rompería el pin.
- La entrada de burbuja va en **CSS y no en framer-motion**: durante el scroll
  de una escena pineada el hilo principal está ocupado y una animación de
  framer se congelaría a medias (DESIGN-SYSTEM §6, regla 3).
- El aro de acero es un **gradiente cónico** (los destellos caen en las
  esquinas, como en metal pulido) hecho solo con `color-mix` sobre tokens.

## Reglas duras aplicadas

- Sticky/pin: sección `h-[340vh]` + hijo `sticky top-0 h-svh overflow-hidden`;
  ningún wrapper intermedio con `overflow-hidden`; raíz de página `w-full`.
- Islas oscuras con `dark theme-dark-island` (hero, reveal, carrusel, CTA).
- Cero hex nuevos; `prefers-reduced-motion` degrada cada pieza a su estado
  final estático (el pin colapsa a `h-auto`, sin viewport muertos).
- Solo `transform`/`opacity`.
- LCP del hero = poster/canvas, no el video (`preload="metadata"`).

## Deuda conocida

`#catalogo` sigue usando `TabletFrame` (plano, sin aro ni canto) mientras
`#agente` muestra la tablet nueva: en portátil la página enseña dos tablets
distintas. Lo natural es que `#catalogo` adopte el marco de `DeviceChat` y
`TabletFrame` se retire — pendiente de decisión del dueño.

## Verificación

`npm run build` y lint acotado en el worktree (node_modules PROPIO, nunca
symlink ni `npx`); visual: light/dark, reduced-motion, 390px, las 5 anclas
desde el mega-menú, sonido, pausa del video fuera de viewport.

## El hero — encuadre de cine

El video era un fondo a sangre (`object-cover` sobre toda la sección). En un
portátil ancho y bajo la caja ronda 2,7:1, así que un 16:9 perdía **~40% de su
altura** y los rótulos del propio video subían a chocar con el navbar.

- **Escritorio (`md+`)**: marco de cine 16:9. El video no pierde un píxel y el
  titular con los CTA viven DEBAJO, sobre la isla oscura — no pueden pisar los
  rótulos del video. Marco con filo y resplandor coral, el mismo lenguaje del
  teléfono de `#agente`.
- **Móvil**: máster **vertical 9:16** propio (`axi-producto-hero-9x16_tcfaou`),
  a sangre — en un móvil esa proporción llena la pantalla sin recortar nada. El
  texto vuelve a ir superpuesto sobre el velo, que por eso es `md:hidden`.

Decisiones que no revertir:

- **Una sola pieza con variantes `md:`, no dos árboles con `hidden`**: dos
  árboles montarían dos `<video>` y el navegador descargaría el asset dos veces.
- **`w-[min(100%,177.78cqh)]` + `container-type: size` en el escenario.** Un
  `aspect-video` con `width:100%` y `max-height:100%` NO encoge: al recortar el
  alto el navegador conserva el ancho y rompe la proporción. Midiendo contra el
  alto del escenario (`177.78cqh` = alto × 16/9) el ancho es correcto mande el
  alto o mande el ancho. Y no usa `calc(100svh - alto fijo)`, que
  DESIGN-SYSTEM §4.2 prohíbe.
- **El `<video>` conserva `object-cover`**: no hace falta `object-contain`
  porque el marco ya tiene la proporción del asset en cada dispositivo.
- **El umbral de la fuente es `(min-width: 768px)`, no `(max-width: 768px)`** —
  la definición exacta de `md:`. Con el `max-width` anterior, a exactamente
  768px convivían el video vertical y el marco 16:9.
- Cada variante trae **su propio póster**: el 16:9 sobre un móvil vertical se
  vería recortado y saltaría de encuadre al arrancar.

Pesos (medidos, `q_90`): escritorio 1920×1080 a 3,11 Mbps / 34 MB; móvil
1080×1920 a 3,58 Mbps / 39 MB. Se eligió `w_1080` en móvil y no `w_720`
(1,62 Mbps / 17,7 MB) porque un móvil de 390px a 3× son 1170px reales y el
720 se vería ampliado un 63%, ablandando justo los rótulos del video. Bajarlo
es cambiar un número si el peso pesa más que la nitidez.

## Bloqueantes de merge

- Autorización de push (el push a main despliega).
