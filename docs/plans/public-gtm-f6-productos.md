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
3. **Video del hero por Cloudinary progresivo** (`vc_h264`/`vc_vp9` + `q_auto`,
   pseudo-streaming por HTTP range). El asset **aún no existe**: el `public_id`
   (`productos-hero`) vive en `productos.content.ts` y el hero degrada al
   `BrandGradientCanvas` de marca mientras el video no cargue — la página nunca
   se ve rota. Autoplay siempre **muted** (bloqueo de navegador); botón glass
   «Activar sonido».
4. **Hero envolvente**: el video manda — texto mínimo abajo a la izquierda,
   overlay ligero, barra de stats delgada (feedback del mockup v1→v2).
5. **Isotipo, no estampilla**: el emblema del pin-reveal es `BrandMark` (las
   tres cintas entran trenzándose — `.animate-ribbon-weave`, nuevo en
   `globals.css`), nunca rota, se desvanece al expandirse el círculo.
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
8. **Pendiente declarado por el dueño**: revisar el efecto del pin-reveal
   («parallax») tras verlo en la página real; posible ajuste de coreografía.

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
| `src/modules/landing/ui/sections/productos/*` | 8 secciones (Hero, AgentReveal, Carousel, Inbox, CrmBento, Catalogo, Medicion, FinalCta) |
| `src/core/styles/motion.ts` | preset `scrollReveal` (coreografía del pin) |
| `src/app/globals.css` | `.animate-ribbon-weave` + keyframes `ribbon-in` |

## Reglas duras aplicadas

- Sticky/pin: sección `h-[280vh]` + hijo `sticky top-0 h-svh overflow-hidden`;
  ningún wrapper intermedio con `overflow-hidden`; raíz de página `w-full`.
- Islas oscuras con `dark theme-dark-island` (hero, reveal, carrusel, CTA).
- Cero hex nuevos; `prefers-reduced-motion` degrada cada pieza a su estado
  final estático (el pin colapsa a `h-auto`, sin viewport muertos).
- Solo `transform`/`opacity` + `clip-path` (excepción documentada en
  `motion.ts`: corre en compositor con `will-change`).
- LCP del hero = poster/canvas, no el video (`preload="metadata"`).

## Verificación

`npm run build` y lint acotado en el worktree (node_modules PROPIO, nunca
symlink ni `npx`); visual: light/dark, reduced-motion, 390px, las 5 anclas
desde el mega-menú, sonido, pausa del video fuera de viewport.

## Bloqueantes de merge

- Subir el video real a Cloudinary como `productos-hero` (o cambiar el id en
  `productos.content.ts`).
- Autorización de push (el push a main despliega).
