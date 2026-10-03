# Plan · /productos: «Escríbele. Mira cómo vende.»

> Rediseño de `/productos` con el design system y el lenguaje cinematográfico de la home, orientado a **enseñar el producto y convertir**.
>
> **Aprobado por la dueña el 2026-10-03** («me gusta mucho esta dirección»).
>
> - **Lienzo:** https://claude.ai/artifact/A4qh2eE3uGBVTZvPhybUfn (versión 9).
> - **Revisión de honestidad:** cinematic-landing-page, contra `qa/evidencia/productos-ref/INVENTARIO.md`.
> - **Rama:** `feat/productos-juego`, que sale de `origin/main` e05cea0a.

---

## 1. Decisiones aprobadas

| # | Decisión |
|---|---|
| D1 | **Menos texto.** Cada escena tiene un titular en Nexa (tramo grueso + tramo fino), como mucho una línea de apoyo y un objeto. Nada de tarjetas de párrafo. |
| D2 | **El probador en vivo se queda y se vuelve un juego.** El visitante hace de cliente: hay 6 jugadas y 7 habilidades por descubrir. Cada habilidad se enciende con su frase, que es la lista de «qué hace cada cosa». «Háblale» suena con los audios reales. |
| D3 | **Honestidad.** El juego tiene guion: no se llama «en vivo» ni se dice «responde de verdad». Se dice «Juega a ser tu cliente. Así responde Axi.». Las cifras de los paneles llevan «Datos de ejemplo» junto al título. |
| D4 | **Estética de la home:** escenario oscuro con la luz tricolor, isla de cristal, carril de progreso, botones coral en píldora y modo claro por tokens, sin duplicar el diseño. |
| D5 | **El video del fundador y CTO** (el que hoy abre `/productos`, `HERO_VIDEO`) pasa a ir **justo antes del cierre**. |
| D6 | **Una sola conversión:** «Prueba 7 días gratis» lleva a `/comenzar?plan=free_trial&origen=productos`. Como secundarios quedan «Ver precios» y «Habla con nuestro agente». |
| D7 | **Navegación funcional.** Cada entrada del menú y del footer que apunta a `/productos` cae en su pieza exacta: hace scroll y abre la pestaña o resalta la jugada. Un test lo vigila (§6). |

## 2. La página, de arriba abajo

| # | Escena | Ancla | Qué es |
|---|---|---|---|
| 1 | Apertura | `#inicio` | «Escríbele. / Mira cómo vende.» y «Juega a ser tu cliente. Así responde Axi.». CTA «Jugar ahora» (lleva a `#agente`) y «Prueba 7 días gratis». El teléfono asoma desde el sol del hero, con las 7 esferas por descubrir. |
| 2 | Juega a ser tu cliente | `#agente` | El juego (§3). La escena queda fija mientras se juega. |
| 3 | Pieza por pieza | `#piezas` | El panel recreado con sus textos reales y 7 pestañas (§4). |
| 4 | El video | `#video` | «Quien lo construye / te lo cuenta.» El marco crece al entrar; el video arranca en silencio y lleva el botón «Escuchar el mensaje». |
| 5 | Cierre | `#empezar` | La ruta de 7 días (RouteLine: Día 1 Conectas WhatsApp · Día 2 Subes tu catálogo · Día 3 Vende de verdad · Día 7 Decides). Un solo CTA con el microcopy «Sin tarjeta. Pagas cuando decidas seguir.». |

Las anclas de hoy siguen vivas como alias, para no romper enlaces ya publicados ni campañas: `#agente`, `#inbox`, `#crm`, `#catalogo` y `#reconocimiento`. Ver §5.

## 3. El juego (`#agente`)

**Piezas.**
- **Izquierda:** las 7 habilidades.
  - Bloqueadas se ven como «· · · / Por descubrir».
  - Descubiertas se encienden con su color y su frase.
  - El carril tricolor crece con el progreso.
- **Centro:** el teléfono de Óptica Vértice, el negocio ficticio que ya usa la copia actual.
- **Derecha:** «Tú eres el cliente», con 6 jugadas en una rejilla de 2×3.
- **Arriba:** la isla, con «Juega a ser tu cliente · N de 7» y su anillo. Al descubrir una habilidad se despliega «Descubriste: …», como el aviso de pago de la home.

| Jugada | Lo que pasa | Habilidad | Frase |
|---|---|---|---|
| Mándale una foto | Foto de un reel → «Son las Aviador Ámbar. Nos quedan 4.» + la tarjeta del producto | Reconoce fotos | Encuentra el producto en tu catálogo |
| Háblale | Suena la nota del cliente (`cliente-gafas.mp3`) y responde con la del agente (`agente-aviador.mp3`) | Habla y escucha | Responde en voz por WhatsApp |
| Pídele un 30 % | «Eso no lo tengo autorizado. Con el cupón PRIMERAVEZ te quedan en $170.100.» | Cuida tu margen | Solo los descuentos que autorizas |
| Cómpralas | Pedido #1042 por $170.100, medios de pago y comprobante → «Pago reportado · lo verifica tu equipo» | Pedido y pago en el chat | Comprobante que verifica tu equipo |
| Pide una cita | «El martes 3 tengo 10:00 a. m. o 4:00 p. m. Te lo recuerdo antes.» | Agenda citas | Sobre tu horario, y le recuerda |
| Pide una persona | «Laura entró a la conversación» + mensaje de Laura | Llama a tu equipo | Una persona entra cuando hace falta |
| (sola, a las 3 jugadas) | Solo el aviso de la isla, nunca dentro del chat | Anota en tu CRM | Sin que nadie digite nada |

**Reglas.**
- Las notas de la demo (el 30 % bloqueado, el CRM) **nunca** van dentro del chat del cliente: solo en la isla.
- Al llegar a 7 de 7, la columna derecha pasa a «7 de 7. / Ahora, con tu catálogo.», con el CTA y «Jugar otra vez».
- Cada habilidad declara las herramientas reales que la respaldan (`AGENT_TOOLS`). El test de contenido actual (`productos.test.ts`) lo verifica, como hoy con los beats.

**Accesibilidad.**
- Las jugadas son `<button>` reales y una jugada usada queda `disabled`.
- La isla tiene `aria-live="polite"` y el chat `role="log"`.
- Las notas de voz muestran su transcripción.
- El audio solo suena tras un clic.
- Con `prefers-reduced-motion`, sin animación de escritura (la respuesta aparece directa).
- **Sin JS:** las 7 habilidades descubiertas y la conversación completa, en su fotograma final.

**Móvil.**
- Arriba la isla y una fila de 7 puntos de progreso.
- En el centro, el chat a pantalla completa.
- Abajo, las jugadas en un carrusel horizontal de chips, encima del safe-area.

## 4. Pieza por pieza (`#piezas`)

Un marco del panel (1080×520 en escritorio) con un dock de pestañas abajo. El titular cambia con la pieza. Los textos del panel son los reales (INVENTARIO §1).

| Pestaña | Ancla | Titular | Contenido |
|---|---|---|---|
| Bandeja | `#inbox` | Todo tu chat. / Una sola bandeja. | Píldoras «Axi atiende» y «En cola · 2 min»; la isla «Axi te la pasó · 14 min · Atender»; «Devolver a Axi» y «Marcar como resuelta». **Sin logos de Instagram ni Messenger como canales probados.** |
| Agente | `#configura` | Lo configuras. / No lo programas. | Tonos Cercano / Formal / Directo; «Vende y toma pedidos» y «Gestiona la agenda»; «Lo que siempre hace»; «Pasa a una persona si lo pide o si falla 2 veces». |
| Catálogo | `#catalogo` | Tu catálogo, / entendido. | Variantes con SKU y stock, y la búsqueda que tolera errores. **No** se promete el cierre de pedidos con variantes. |
| CRM | `#crm` | Cada conversación, / una oportunidad. | Pipeline con «La abrió Axi» en la tarjeta. Datos de ejemplo. |
| Llamadas | `#llamadas` | Cuando hay que llamar, / llama. | «Axi llamó a Andrés M. · 2:14» (saliente), etapas y «Lo que Axi anota». Datos de ejemplo. |
| Cobros | `#cobros` | Te deben. / Axi te dice a quién primero. | «Te deben» y «Vencido», con la isla «Escribe primero a». Datos de ejemplo. **Nunca «factura»**: son documentos. |
| Medición | `#medicion` | Ventas en pesos. / No mensajes. | Ventas pagadas, calidad y «Cierre no intentado / Ignoró el inventario». Datos de ejemplo. |

- **Comportamiento.** En escritorio la escena queda fija y las pestañas avanzan solas con el scroll; un clic toma el control. En móvil son pestañas deslizables, sin fijar.
- **SEO y sin JS.** Las 7 piezas llegan en el HTML (cada una con su `id`), así que el buscador las lee y sin JS se ven apiladas.

## 5. Navegación: enlaces y anclas

### 5.1 Cómo se resuelve una ancla

`ProductosHashRouter` es una isla diminuta. Al cargar y en cada `hashchange`:
- si el hash es una pestaña, hace scroll a `#piezas` y abre esa pestaña;
- si es `#reconocimiento`, hace scroll a `#agente` y resalta la jugada «Mándale una foto»;
- en cualquier otro caso, deja el scroll nativo.

El scroll va contra `[data-app-scroll]`, como en la home (`scroll-margin-top` para la isla).

### 5.2 Cambios en `site-nav.content.ts`

| Entrada | Hoy | Nuevo |
|---|---|---|
| Agente vendedor | `/productos#agente` | `/productos#agente` (el juego) |
| Cobros y documentos | `/productos` (sin ancla) | `/productos#cobros` |
| Catálogo y pedidos | `/productos#catalogo` | igual; la descripción pasa a «Variantes con SKU y stock real.» |
| Reconocimiento por foto | `/productos#reconocimiento` | igual (resalta la jugada de la foto) |
| Axel, tu director comercial | `/productos` (Axel no está ahí) | `/#axel` |
| Medición en pesos | `/#medir` | `/productos#medicion` |
| Inbox compartido | `/productos#inbox` | igual; la descripción pasa a «Tu equipo y Axi en una sola bandeja.» (IG y Messenger dependen de Meta) |
| Llamadas con voz natural | `/integraciones#voz` | `/productos#llamadas` |
| Agenda y citas | `/soluciones#agenda` | igual (existe) |

- **Footer:** «Productos» ya apunta a `/productos`; se añade «Juega a ser tu cliente» → `/productos#agente`.
- **CTA de la cabecera fuera de la home:** hoy es `SITE_NAV_CTA` = «Agenda tu demo» → `/contacto`. Se propone «Prueba 7 días gratis» → `/comenzar?plan=free_trial`, igual que la home (D6). El cambio es solo en el contenido; `SiteHeader.tsx` no se toca porque es de 2-cinematic. **Pendiente del OK de la dueña.**
- **Enlaces internos:** cada CTA de la página lleva `origen=productos` para medir qué página convierte.
- **SEO:** `pageMetadata` con la descripción nueva (sin «pasarela» ni promesas caídas), `breadcrumbSchema`, la tarjeta OG de `/productos` (`og-cards.ts`) con el titular nuevo y `sitemap` sin cambios.

## 6. Arquitectura y archivos

- **La página es RSC.** Islas cliente: `ProductosGame`, `ProductosPieces`, `ProductosVideo` (reutiliza `HeroVideo` con `preload="none"` hasta ser visible) y `ProductosHashRouter`.
- **Sin GSAP ni Lenis.** Las escenas fijas se hacen con sticky + IntersectionObserver. GSAP está cercado en la carpeta de la película y debe seguir así.
- **Estilos.** `productos.css`, importado solo por la página. Consume los tokens de `globals.css`, con colores fijos solo como mezclas de `--foreground` / `--background`, como el claro de la home.
- **Contenido.** `productos.content.ts` se reescribe: habilidades, jugadas, guiones, pestañas, anclas y video. Ningún texto queda dentro de los componentes. El contenido también corrige las dos promesas falsas de hoy: «contra la pasarela» y «el CRM llega al panel».
- **Lo que se borra:** `ProductosHero`, `AgentReveal`, `Carousel`, `Inbox`, `CrmBento`, `Catalogo`, `Reconocimiento`, `Conversaciones` y `FinalCta`, además de lo que deje de usarse: `CircularCarousel` y `DeviceChat` solo si nadie más los importa. Antes, un tag `productos-v1-archive`.
- **Audios y fotos:** se quedan en `/assets/audio/*.mp3` y `/images/landing/*` (rutas que el middleware deja pasar).

## 7. Calidad, rendimiento y QA

| Qué | Cómo |
|---|---|
| Tests (jest) | Contenido honesto: cada habilidad tiene herramientas reales y no hay palabras vetadas («pasarela», «factura», «en vivo», «garantizado»). El juego: cada jugada desbloquea su habilidad, el CRM llega a las 3 y «Jugar otra vez» limpia. Las pestañas: el hash abre la pestaña. **Anclas:** `productos-anchors.test.tsx`, como `home-anchors.test.tsx`: todo `href` a `/productos#x` del nav, del footer y del contenido existe en la página renderizada. |
| Falsificar | Cada test nuevo se rompe a propósito una vez y se cita la línea que cayó (feedback de la dueña). |
| Presupuesto JS | `npm run budget`: `/productos` no supera su línea base actual (se mide antes de tocar nada) y el común no sube. |
| Playwright | `qa/qa-productos.mjs` a 390×844, 1366×657 y 1440×900, en oscuro y en claro: los 7 de 7 del juego, el audio no rompe sin interacción, las 7 anclas abren su pestaña, no hay scroll horizontal y nada queda tapado por la isla. Evidencia en `qa/evidencia/productos/`. |
| Lighthouse | Solo con el OK de axi-2e. Metas: LCP < 2,5 s, CLS < 0,1 y móvil ≥ 90. |
| Builds | Una a la vez, con turno. Nunca integración y `next build` a la vez (9,9 GB de RAM). |

## 8. Fases

| Fase | Entrega | Quién |
|---|---|---|
| F0 | Worktree, plan, línea base de presupuesto y tag de archivo | constructor 1 |
| F1 | Contenido nuevo, esqueleto RSC con las 5 escenas y sus anclas, `ProductosHashRouter`, nav y footer | constructor 1 |
| F2 | El juego (escritorio y móvil, audio, isla, accesibilidad) | constructor 1 |
| F3 | Pieza por pieza (7 pantallas recreadas, dock, avance con el scroll) | cinematic-landing-page, en paralelo; archivos propios (`pieces/*`) |
| F4 | Apertura, video, cierre y modo claro | constructor 1 |
| F5 | Borrado de lo viejo, tests, presupuesto, QA Playwright, revisión de honestidad | constructor 1 + 2-cinematic-film-landing-page (rendimiento, fluidez, completitud) + cinematic-landing-page (honestidad) |
| F6 | Revisión visual de la dueña en local, ajustes, merge y despliegue (solo con su OK) | — |

Commits con rutas explícitas y Co-Authored-By. Sin push hasta el OK de la dueña.
