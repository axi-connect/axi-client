# F8 · Reconocimiento de producto en la capa pública

> Fase 8 del plan GTM (`public-gtm-plan.md`). Rama: **`feat/product-recognition`** del cliente
> (misma rama que la F7 del panel; orden del dueño, sin worktree nuevo). Sale en el **mismo
> despliegue** que la función. Mockup: `docs/design/mockups/landing-reconocimiento.html`.

---

## 1. Contexto

El reconocimiento de producto está construido y certificado (servidor `744f6ca`, cliente
`c813347`): cuando un cliente manda **una foto, una captura de pantalla o una publicación de
Instagram compartida**, el agente reconoce qué producto del catálogo es y lo cotiza; con duda
propone hasta tres opciones con foto; sin coincidencias pide la referencia. Se vende como cuota
incluida por paquete (trial 30 · Esencial 200 · Crecimiento 600 · Escala 1.500) con excedente de
100 por COP 9.900.

La landing **no lo cuenta**. Peor: su copy sigue diciendo lo contrario — el paso 02 de «Cómo
funciona» y el caso de retail hablan de fotos que el agente *envía*, y `#catalogo` presume de
entender «hodie» pero no una foto. El muro de `/productos` ya tiene el mensaje exacto sin
resolver: *«Vi las tenis del reel, ¿en cuánto salen?»* (`CHAT_WALL` w3).

### Lo que dice el mercado (verificado 2026-09-08)

| Competidor | Fotos del cliente | Evidencia |
|---|---|---|
| tbit.app | Solo las **envía** («Catálogo en vivo: envía fotos, videos») | `docs/scraping/tbit.app/01-landing.md:35`; su lista de fuentes del agente no tiene imagen |
| Dapta | No; su único «imagen» es generación para marketing | `docs/scraping/dapta.ai/05-workflow-automation.md:28` |
| Keybe / Biky | No; «IA emocional» de tono e intención | `docs/scraping/tbit.app/05-keybe-biky.md` |
| respond.io | «Procesa imágenes» para **enrutar intención**; nunca las une al catálogo | `docs/scraping/respond.io/03-ai-agents.md:21,33,80` |
| Meta Business Agent | No lo menciona ni en lo que hace ni en lo que no | `market-study-2026-09.md:399-405`, blog oficial de WhatsApp |
| **Lu de Magalu** (Brasil) | **Sí**: «mandar la foto de un zapato y buscarlo en el surtido». Desarrollo propio de un gigante | Exame, Canaltech 2025 |

Conclusión: en el segmento de axi es **espacio sin reclamar**. El único precedente es un gigante
del retail con equipo propio. Y cae en el nicho n.º 1 del estudio (retail y moda: Savage, 385
fotos). Los seis diferenciadores de `knowledge-base.md` §18.3 no tocan la visión: este sería el
séptimo.

### Decisiones cerradas con el dueño (2026-09-08)

| # | Decisión |
|---|---|
| D1 | Se publica **con el despliegue de la función**, misma rama `feat/product-recognition` del cliente. |
| D2 | Home: **sección propia** + tejerlo en lo existente (paso 02, FAQ, muro). |
| D3 | La escena pineada `#agente` **gana el paso de la foto** al inicio. |
| D4 | Nombre público: **«Reconocimiento de producto»**, igual que panel y factura. |

---

## 2. Estrategia de mensaje

**La idea en una frase:** *Le mandan una foto. Él sabe cuál es.*

**Qué se dice** (todo verificable en el producto):
- Reconoce fotos, capturas de pantalla y publicaciones de Instagram compartidas.
- Cotiza con el precio del sistema; con duda muestra **hasta tres opciones con foto** y deja elegir;
  sin coincidencias pide la referencia. Nunca inventa.
- Distingue un comprobante de pago de un producto (no busca en la foto de un pago).
- Incluido en cada plan, con la cifra **del catálogo** (`commercial_units`), nunca escrita a mano.
- Funciona con las fotos del catálogo del negocio: cuantas más fotos por variante, mejor.
- Se **activa desde Ajustes** (viene apagado, como la voz) y el índice se construye solo.

**Qué NO se dice:**
- «Único», «nadie lo tiene», «el primero en Colombia»: no verificable (respond.io procesa
  imágenes). Se dice **«lo que hasta hoy solo tenían los gigantes del retail»**.
- Porcentajes de acierto: no hay medición aún. Cuando exista, entra por `landing-copy.md`.
- Enlaces de Instagram pegados como texto: fuera de la v1 (D4 del plan de reconocimiento).
- Que el cliente *vea* el análisis: el cliente recibe la respuesta; los candidatos y la
  similitud los ve **el equipo** en el inbox. La landing separa las dos vistas a propósito.

**Regla de acento:** coral en la vista, **violeta solo en los marcadores de IA** (icono
`scan-search`, chip «Reconocido», barra de similitud), exactamente como el mockup aprobado del panel.

**Regla de objeto:** cada sección de `/productos` tiene un objeto físico distinto. El del
reconocimiento es nuevo y solo suyo: **la foto del cliente que se convierte en cotización**, con
la tarjeta de candidatos «tras bambalinas».

---

## 3. Dónde vive (superficies)

| Superficie | Qué entra | Archivo(s) |
|---|---|---|
| **Home `/`** | Sección nueva `#reconocimiento` («Mándale la foto») entre `LandingHowItWorks` y `LandingAiGuardrails`; paso 02 reescrito; FAQ nueva (entra sola al `FAQPage` JSON-LD) | `landing.content.ts`, `sections/LandingRecognition.tsx`, `app/(public)/page.tsx` |
| **`/productos`** | Paso de foto en `#agente`; 7.ª capacidad del carrusel (kicker derivado de `CAPABILITIES.length`); sección nueva `#reconocimiento` entre `#catalogo` y el muro; `w4` del muro alude a la foto; `metadata.description` | `productos.content.ts`, `mockups/DeviceChat.tsx`, `ProductosAgentReveal.tsx` (icono), `sections/productos/ProductosReconocimiento.tsx`, `productos/page.tsx` |
| **`/precios`** | Línea de cuota **desde el catálogo** en cada paquete («200 reconocimientos de producto al mes»); FAQ de precios; corregir «Diez métricas» | `domain/public-catalog.ts`, `infrastructure/pricing-catalog.loader.ts`, `core/lib/commercial-units.ts`, `components/PricingPlans.tsx`, `precios/page.tsx` |
| **`/integraciones`** | Tarjeta `#reconocimiento` en `EXTRAS`, `status: "listo"` hasta el primer cliente real, luego `"probado"` | `integraciones/page.tsx` |
| **`/casos`** | Retail y moda: una frase de la foto | `casos/page.tsx` |
| **Nav** | Tarjeta en el panel «Producto» → `/productos#reconocimiento`; footer | `site-nav.content.ts` |
| **Analítica** | `reconocimiento` → nueva `CtaLocation` `"recognition"` | `core/analytics/track.ts`, `outbound.ts` |

---

## 4. Diseño de las piezas

### 4.1 Home — sección «El escáner» (`#reconocimiento`, isla oscura)

Decisión del dueño (2026-09-08): la primera propuesta (dos tarjetas unidas por un haz) se rechazó
por genérica; la sección **es una animación** y va como **isla oscura**, la primera de la home
(`dark theme-dark-island`, como `/productos`).

- **Kicker** «Reconocimiento de producto» (violeta, icono `scan-search`) · **Título** «Le mandan una
  foto. Él sabe cuál es.» · **Intro** «…la compara con las fotos de tu catálogo, da con la referencia
  exacta y la cotiza con tu precio. Lo que hasta hoy solo tenían los gigantes del retail, en tu
  WhatsApp.»
- **Objeto: «El escáner»** (`components/RecognitionScanner.tsx`, cliente). Tres columnas: la captura
  del reel (compartido de Instagram, foto `gafas-aviador-ambar.jpg`), el catálogo (retícula 3×3 de
  fichas; la coincidencia lleva la foto real) y la respuesta del agente (burbuja WhatsApp con
  `ChatBubble kind="product"`). Línea de tiempo de 9 s en bucle:
  1. entra la captura;
  2. una **línea de luz violeta** recorre la foto de arriba abajo y, a su paso, la imagen se
     descompone en una **nube de puntos con los colores reales de la foto** (muestreo de la imagen en
     un canvas fuera de pantalla);
  3. los puntos vuelan en curva hasta la ficha correcta del catálogo; el resto de fichas se atenúa;
  4. la ficha se enciende (anillo violeta), la barra «Similitud» sube a 0,93 y aparece el chip
     «Reconocido · Aviador Ámbar»;
  5. la respuesta cae en la burbuja con la tarjeta de producto y el precio; pausa; vuelve a empezar.
- **Reglas**: Canvas 2D solo para los puntos (`transform`/`opacity` en el DOM para lo demás); PRNG
  con semilla, jamás `Math.random()`; se pausa fuera de viewport (`IntersectionObserver`, como
  `BrandGradientCanvas`); con `prefers-reduced-motion` no hay canvas y se pinta el **estado final**;
  colores desde tokens resueltos en runtime (cero hex); las fotos viven en `public/images/landing/`.
- **Tres fuentes** (`BrandCard surface="solid"` en oscuro) y **tres hechos** bajo el objeto, como en
  el mockup. Sin CTA propio.
- **Paso 02 reescrito**: «…aunque el cliente escriba “hodie” **o mande la foto de lo que vio en un
  reel**, envía las fotos reales, responde con el precio de tu sistema. No improvisa: consulta.»
- **FAQ nueva** (`FAQ.items`): «¿Qué pasa si el cliente manda una foto en vez de escribir?» → los
  tres desenlaces y «la cantidad incluida en cada plan está en Precios» (sin cifra).

### 4.2 `/productos` — paso de foto en `#agente`

Realidad de WhatsApp: el cliente comparte la captura del reel **y** manda la nota de voz. Los MP3
no cambian; la historia gana coherencia («vi en el reel unas gafas…» ahora tiene la imagen
delante).

- **Mensaje nuevo `d0`** (índice 0): `{ from: "customer", kind: "photo", text: "¿Estas las
  tienen?", photo: { imageSrc: "/images/landing/gafas-aviador-ambar.jpg", imageAlt, sourceLabel:
  "Reel · Óptica Vértice" } }` — burbuja de **compartido de Instagram** (cabecera pequeña con
  origen + imagen 4:3 + caption).
- **Beat**: el beat `catalogo` (en la tarjeta de producto, ahora índice 3) pasa a ser
  **`reconoce`**, icono `photo` (`ScanSearch`): título «Reconoce la foto y responde con tu
  catálogo real», body «Compara la captura con las fotos de tu catálogo, da con la referencia
  exacta y manda stock, precio y foto real. No promete lo que no hay.», `tools:
  ["catalog_lookup", "send_product_images"]` (los que respaldan la respuesta; el reconocimiento
  es política, no tool — comentario como el de `voz`). Siguen **8 beats**; el riel no cambia.
  Los `atMessage` de todos los beats suben en 1.
- `DemoMessage` gana la variante `photo` y `DemoBeat["icon"]` gana `"photo"`;
  `BEAT_ICONS.photo = ScanSearch`. `DeviceChat` gana `Photo()` con `CARD` y tipografía
  `clamp(...cqw...)`, cero px fijos (decisión F6).
- El test `productos.test.ts` exige: tools reales, `atMessage` válido, turno del agente, orden
  estricto sin repetidos. El beat nuevo cumple las cuatro.

### 4.3 `/productos` — sección `#reconocimiento`

- Posición: tras `#catalogo` (su prerrequisito: «sin índice no hay nada que reconocer») y
  antes del muro.
- **Layout**: fila `lg:grid-cols-[5fr_7fr]`, texto a la izquierda (`SectionHeading` + tres
  desenlaces con icono en cuadro `size-10 rounded-xl`), objeto a la derecha.
- **Objeto**: el teléfono (`DeviceChat` reducido, estático) con la burbuja de foto y la respuesta
  del agente con tarjeta; **solapada** abajo a la derecha, la tarjeta «Lo que ve tu equipo»: el
  chip real del inbox (`ProductRecognitionChip` en su forma de landing) con la descripción de la
  visión, los tres candidatos, barra de similitud violeta y confianza. Lema de la tarjeta: «Al
  cliente, la respuesta. A tu equipo, el porqué.»
- **Tres desenlaces** (features): Seguro → «Cotiza directo con tu precio» · Con duda → «Hasta tres
  opciones con foto; el cliente elige» · Sin coincidencias → «Describe lo que vio y pide la
  referencia. No inventa.»
- **Franja de fuentes** (tres píldoras): Foto directa · Captura de pantalla · Publicación
  compartida (Instagram).
- **Hechos** bajo la franja: «Se activa desde Ajustes → Reconocimiento de producto» · «Usa las
  fotos de tu catálogo; el índice se construye solo al guardar» · «Un comprobante de pago no se
  confunde con un producto».
- Carrusel: 7.ª `CapabilityItem` `{ id: "reconocimiento", tag: "IA que ve", title:
  "Reconocimiento de producto", description: "Le mandan una foto; cotiza la referencia exacta.",
  href: "#reconocimiento" }`; `CAPABILITIES_SECTION.kicker` se deriva de `CAPABILITIES.length`
  («Un producto, siete capacidades»).
- Muro: `w4` → «$289.900 y hoy el envío va gratis. Son las Urban blancas: te paso las fotos.»

### 4.4 `/precios` — la cuota sale del catálogo

- `PublicCatalog` gana `planUnits: Record<slug, Allowance[]>` leído de `commercial_units`
  (hoy `unknown` en el contrato: se parsea con zod en `catalogFromApi`; lo que no valide, se
  omite). Solo se muestran las unidades que `commercial-units.ts` sabe etiquetar.
- `commercial-units.ts`: `CommercialUnit` gana `"product_recognitions"`; `LABELS` gana
  `{ one: "reconocimiento de producto", many: "reconocimientos de producto" }`.
- `PricingPlans`: bajo las bullets de cada paquete, una **línea de cuota** con icono
  `ScanSearch` y `tabular-nums`: «200 reconocimientos de producto al mes». Si el catálogo no
  trae la unidad, la línea no existe (la landing no puede prometer una cuota que billing no vende).
- `PRICING_FAQ`: «¿Qué pasa cuando se agota la cuota de reconocimientos?» → «Las fotos siguen
  llegando al inbox y el agente pide la referencia por texto. Puedes ampliar con un bloque desde
  Facturación; se reactiva sola al nuevo ciclo.» Y corregir la respuesta «Diez métricas…» para
  que no cite una cifra que el enum ya desmiente (decir «cada métrica» sin número).
- Guardián: `pricing.test.ts` sigue exigiendo cero cifras en pesos en el content; la cuota no es
  bullet, es dato del catálogo.

### 4.5 `/integraciones`, `/casos`, nav, SEO

- `EXTRAS` gana `{ id: "reconocimiento", name: "Reconocimiento de producto", icon: ScanSearch,
  status: "listo", claim: "Le mandan una foto y sabe cuál es.", body, facts: ["Fotos, capturas y
  publicaciones compartidas de Instagram", "Se activa desde Ajustes; viene apagado", "Consumo
  medido con su propia métrica: reconocimientos por ciclo"] }`. Pasa a `"probado"` cuando haya un
  cliente real usándolo.
- `/casos` retail: «…con las fotos reales de cada una. Si el cliente manda la foto de lo que vio
  en un reel, el agente reconoce la prenda y la cotiza.»
- Nav: tarjeta «Reconocimiento de producto — Le mandan una foto; cotiza la referencia» →
  `/productos#reconocimiento` (regla: ancla real + ruta en `PUBLIC_PATHS`, ya está).
- `/productos` `metadata.description` menciona «reconoce el producto de una foto».
- `docs/modules/public-site.md`: fila de la sección y de la línea de cuota (y aprovechar para
  corregir la tabla desactualizada de `/productos` y `/precios`).

---

## 5. Fases

**Estado de ejecución (2026-09-08):** F0 `573eb57` · F1+F2 `cc8bf6e` (certificadas por
`axi-80`: tsc 0, lint 0, jest 2284, build) · F3 `efdbd8a` · F4 `e23b6dd` · F5 en el commit
siguiente. Desviaciones respecto al plan: la isla de la home va entre Métricas y «Tu equipo,
en control» (guardarraíles ya es oscura); el beat `catalogo` de `#agente` se fusionó en
`reconoce` (8 beats, MP3 intactos); hallazgo L1 del auditor aplicado (un reel COMPARTIDO
llega como video y no se reconoce → «del reel, la captura», fijado por test). La función
está en producción desde el 2026-09-08 (cada tenant la estrena apagada).

| Fase | Contenido | Verja mía | Verja del auditor |
|---|---|---|---|
| **F0** | Este plan + mockup navegable (4 vistas: home, /productos, /precios, /integraciones) publicado como Artifact | — | Aprobación del dueño |
| **F1** | Contenido y tipos: `productos.content.ts` (photo, beat, sección, 7.ª capacidad, muro), `landing.content.ts` (sección home, paso 02, FAQ) | `productos.test.ts`, `landing` tests acotados | — |
| **F2** | `/productos`: `DeviceChat.Photo`, `BEAT_ICONS`, `ProductosReconocimiento`, montaje, nav | specs de la sección + lint acotado | tsc + jest completo |
| **F3** | Home: `LandingRecognition`, montaje, analítica | specs + lint acotado | — |
| **F4** | `/precios`: `planUnits`, `commercial-units`, línea de cuota, FAQs | `pricing.test.ts`, `public-catalog` tests | — |
| **F5** | `/integraciones`, `/casos`, SEO, docs | tests de páginas | tsc, lint completo, jest, `next build` |

Un solo escritor (yo) en la rama; el auditor `axi-a0` certifica al final de F2 y F5.

---

## 6. Verificación

1. `npx jest --testPathPattern "landing|productos|pricing|public-catalog"` verde; cero cifras en
   pesos en el content; beats en orden.
2. `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` y lint acotado.
3. Visual en `next dev` (WSL, ver `wsl-next-dev-verification`): las cuatro superficies en claro y
   oscuro; `prefers-reduced-motion` deja la escena pineada y el haz estáticos; la burbuja de foto
   escala con el dispositivo (tablet ≥ `lg`).
4. `/precios` contra el `GET /public/pricing` real: la línea de cuota aparece con 200/600/1.500 y
   desaparece si se retira la unidad del catálogo.
5. `next build` y contract del sitio (auditor).
6. Tras el despliegue: comprobar en producción que `#reconocimiento` de `/productos` y de `/` son
   alcanzables desde el mega-menú y que GA4 registra `whatsapp_click`/`demo_anchor_click` con
   `location: "recognition"` desde la sección de la home si algún día lleva CTA.

---

## 7. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La landing promete la cuota antes de que el catálogo la venda | La línea de cuota solo se pinta si `GET /public/pricing` trae `product_recognitions`. |
| R2 | El paso de foto rompe la coherencia de los MP3 | La foto va **antes** de la voz: «vi en el reel unas gafas…» gana la imagen delante. Los audios no cambian. |
| R3 | La sección se lee como «feature más» y se pierde | Objeto propio (foto → cotización + tras bambalinas), violeta de IA, titular de una frase. |
| R4 | Claim de exclusividad no verificable | Prohibido «único»; se dice «lo que hasta hoy solo tenían los gigantes del retail». |
| R5 | `status: "probado"` sin cliente real | Sale como `"listo"`; el dueño lo sube cuando haya un tenant con el switch encendido y uso. |

---

## Anexo A · Fotos de la escena de la home (decisión del dueño 2026-09-08)

El catálogo del escáner es **tecnología**, coherente con el negocio ficticio del hero («Tecnología,
Medellín», Apple Watch SE). Fotos de stock con licencia libre (Unsplash License), **nunca imágenes
oficiales de Apple**. Recortadas a cuadrado (480 px) con `ffmpeg`; captura del reel 4:3 con relleno
blanco; tarjeta 16:10. Los fondos blancos de estudios distintos se unifican en el código con la
ficha en gris claro fijo (`--axi-muted` claro) y la foto en `mix-blend-mode: multiply`; no hace
falta recorte de fondo. Para producción se suben a Cloudinary (como el hero) o a
`public/images/landing/recognition/`.

| Uso | Unsplash photo id | Contenido |
|---|---|---|
| Captura del reel + coincidencia + tarjeta | `photo-1693822845595-862bacc31cf9` | iPhone negro, pantalla verde, fondo blanco |
| Ficha | `photo-1571053172280-f955a42c3554` | iPhone blanco trasera, fondo claro (ip10) |
| Ficha | `photo-1555375771-14b2a63968a9` | iPhone blanco trasera con logo (ip7) |
| Ficha | `photo-1610340804490-e9d7b22aee1d` | AirPods sobre textil blanco (ap3) |
| Ficha | `photo-1624096104992-9b4fa3a279dd` | Apple Watch negro, fondo blanco (aw1) |
| Ficha | `photo-1546868871-7041f2a55e12` | Apple Watch gris espacial (aw4) |
| Ficha | `photo-1618344880247-3969cea5b81e` | iPad negro sobre mesa blanca (ipad3) |
| Ficha | `photo-1611186871348-b1ce696e52c9` | MacBook plateado abierto (mac1) |
| Ficha | `photo-1614630536369-2516d7c0a58c` | MacBook cerrado, fondo blanco (mac3) |

Copy de la escena (2026-09-08, fotos nuevas del dueño: iPhone 17 lavanda): captura «¿Este lo tienen?» ·
chip «Reconocido · iPhone 17 256 GB» · respuesta «Sí, es el iPhone 17 de 256 GB en lavanda: quedan 2,
$4.699.000. ¿Te lo aparto?» · tarjeta `IP17-256-LV · $4.699.000 · 2 disp.`. El 17 base arranca en 256 GB,
por eso la capacidad. Cifras ficticias de demo, como las del hero. Las URL llevan `?v=N`
(`RECOGNITION_IMG_VERSION`) porque `next/image` cachea cada variante por URL 31 días.
