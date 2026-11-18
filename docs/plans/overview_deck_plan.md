# Plan — `axi-connect.co/overview`: la presentación comercial de Axi

> **Estado:** propuesta 2026-11-17 · rama `feat/overview-deck` · gate por fase con aprobación explícita.
> **Fuentes:** `docs/design/DESIGN.md`, `docs/design/DESIGN-SYSTEM.md`, `docs/architecture.md` §6/§8,
> `axi-video/01-conocimiento/guias/subtitulos.md`, `axi-video/01-conocimiento/marca/*`,
> P-034 «Una oportunidad» (recorrido de la UI real a los 0:11), `docs/business/knowledge-base.md`,
> `docs/business/metodo-comercial/06-demo-guion-base.md`.

## 1. Objetivo

Una presentación pública, gráfica y con muy poco texto que cualquier vendedor usa igual:

- **Por teléfono:** se comparte el enlace y el cliente la pasa con el dedo.
- **En pantalla:** se pasa con ← →, a pantalla completa.

Muestra qué es Axi, qué problema resuelve, cómo se ve por dentro (con la UI real, con cámara y
zoom) y cómo se integra. Además estandariza el pitch, porque cada lámina lleva lo que dice el
vendedor.

## 2. Decisiones tomadas (2026-11-17, no reabrir)

| # | Decisión |
|---|---|
| D1 | **Ruta `/overview`** en axi-client, de primer nivel (ni `(public)` ni `(private)`, como `/comenzar`), pública en `PUBLIC_PATHS`. El dueño pidió un nombre corporativo en inglés; si prefiere otro, el cambio es un renombre |
| D2 | **Integraciones:** se muestran Shopify, **SIESA ERP y pagos como disponibles** (decisión del dueño). ⚠️ Hoy la KB §13.4 dice «No hay ERP ni contabilidad» y que los pagos de los clientes del negocio solo van por Shopify. El dueño asume el riesgo de que un cliente lo pida en la sesión de configuración; hay que actualizar la KB cuando la integración exista |
| D3 | **Logos de terceros solo en dos láminas:** canales e integraciones, en monocromo. En el resto, ninguno |
| D4 | **Precio en vivo:** la lámina de planes se alimenta del `pricing-catalog.loader.ts` de la landing (`GET /public/pricing`), con revalidación diaria. Nunca queda un precio viejo en un enlace compartido |

## 3. Arquitectura: cero carga sobre Axi

- **Página estática** (`force-static` + `revalidate: 86400`). Sin sesión, sin `/api/proxy`, sin
  WebSocket y sin datos de tenants. La única llamada al servidor es la del precio, una vez al día
  en el servidor de Next, nunca desde el navegador.
- **Una sola isla cliente**, `OverviewDeck`. Navega con teclado (← → Espacio Inicio Fin, F para
  pantalla completa, G para el índice), deslizando en el celular y con zonas de toque. La URL
  lleva el hash `#7`, así se puede compartir una lámina exacta. Sin GSAP ni Lenis: CSS y unos
  pocos KB de TypeScript.
- **Medios livianos y diferidos:**
  - cada recorrido es un MP4 H.264 (+ WebM VP9), sin audio, en bucle, a 30 fps y de 1–2 MB, con un póster WebP;
  - se cargan solo la lámina actual y la siguiente (`preload="none"` en el resto);
  - nombres con hash y `Cache-Control: immutable`.
  - Si el tráfico crece, la carpeta se mueve a nginx o MinIO sin tocar el código: la URL base es una constante.
- **`prefers-reduced-motion`:** los clips quedan en su póster y los subtítulos aparecen sin desenfoque.
- **SEO:** indexable, con su propia imagen OG. Es contenido público de marca, no un proceso.

## 4. Lenguaje visual

- **Fondo claro fijo**, como los videos de Axi («el fondo siempre claro»). Es un medio
  audiovisual, no una vista del panel: la excepción a «light y dark» se documenta en DESIGN-SYSTEM.
- **Texto = subtítulos «dos tamaños»:**
  - Inter Tight, con una entrada en 500 y la clave en 800 a −0,06 em, en minúsculas y con puntuación real;
  - el coral solo en la palabra más fuerte;
  - la clave entra desenfocada y se enfoca en 0,16 s, el grupo se acerca 1 → 1,025, y al salir queda un fantasma de 0,2 s;
  - una idea por lámina y, como máximo, una línea de apoyo en Poppins.
- **Nexa** solo en cifras (precio) y en la portada.
- **Recorridos de UI estilo P-034:**
  - la app real llega inclinada en 3D, la cámara entra a la zona clave (×2), con motion blur por acumulación;
  - cada recorrido se renderiza en dos encuadres, **16:9** (pantalla) y **4:5** (celular), para que en el teléfono la UI se lea, no se encoja.
- **La UI es siempre real:** capturas de Playwright del tenant ficticio «Norte Studio» o la bandeja copiada del código de axi-client (como P-034). Nunca tarjetas recreadas.
- Isotipo oficial plano. Sin emojis. Sin «CRM», «plataforma» ni «chatbot» en los titulares.

## 5. Guion (borrador para la Fase 0)

El orden sigue el método: dolor → promesa → prueba → control → cómo empezamos → cierre.
La columna «Vendedor» es la nota que solo se ve en el modo presentador.

| # | Lámina | Entrada → **clave** | Visual | Vendedor (resumen) |
|---|---|---|---|---|
| 0 | Portada | vende en cada → **conversación.** | Isotipo y, si viene, «Preparado para {Empresa}» (`?para=`) | Presentarte y presentar el objetivo de la llamada |
| 1 | Gancho | anoche te escribieron → **¿quién respondió?** | Bandeja de las 9:47 p. m. con pines «Sin responder» | «¿Qué pasa hoy con un mensaje de las 9 p. m.?» |
| 2 | Diagnóstico | ¿qué te está → **pasando?** | 6 fichas que se marcan con el cliente | Marcar lo que diga. Las láminas que responden a eso quedan señaladas en el índice |
| 3 | El problema | el canal donde entra el dinero → **es el peor atendido.** | Tres fracturas: tarde, disperso, olvidado | Repetir sus palabras |
| 4 | Qué es Axi | axi es tu → **mejor vendedor.** | Las tres cintas: vender y cobrar · crecer · atender | Una frase; no explicar tecnología |
| 5 | Responde | responde → **en segundos,** | Clip: bandeja → hilo | Dejarlo mirar |
| 6 | Vende | cotiza con → **tus precios.** | Clip: Laura → resumen → pedido #1042 | «Así cierra una venta sin ti» |
| 7 | Control | no inventa → **nada.** | Clip: reglas del agente, zoom a «Lo que nunca hace» | La prueba del descuento del 30 % |
| 8 | Tu equipo | tú tienes → **el control.** | Clip: «Intervenir» y devolución con nota | El pago lo confirma una persona (o Shopify) |
| 9 | Un solo lugar | redes, WhatsApp y tienda → **una sola bandeja.** | Logos (D3) que convergen en la bandeja | Pedidos dispersos |
| 10 | Clientes en orden | adiós al → **excel.** | Clip: contactos y pipeline | CRM a mano |
| 11 | Seguimiento | el seguimiento → **se hace solo.** | Clip: tareas del agente | Cotizaciones frías |
| 12 | Integraciones | se conecta con → **lo que ya usas.** | Shopify · SIESA · pagos (D2/D3); clip de Shopify | «¿Qué sistema usas hoy?» |
| 13 | Llamadas | también contesta → **el teléfono.** | Clip: llamada de Laura | — |
| 14 | Recupera | recupera las ventas → **que se iban.** | Clip: recuperación + campaña | — |
| 15 | Sale a buscar | busca clientes → **por ti.** | Clip: piloto | Solo con permiso |
| 16 | La meta | sabes si → **llegas.** | Clip: panel con la meta del mes | Progreso, no vanidad |
| 17 | Cómo empezamos | lo dejamos → **funcionando.** | 1 h juntos → 7 días gratis → día 5 revisamos | Guion literal de 06 §4 |
| 18 | Planes | — | Planes y cupos de fundador en vivo (D4) | Ancla: Crecimiento |
| 19 | Cierre | ¿qué día lo dejamos → **funcionando?** | CTA: WhatsApp + «Prueba 7 días gratis» | «¿Jueves o viernes?» |

**Personalización sin backend:** `?para=Empresa` (texto plano saneado) y el diagnóstico se
guardan en la URL. El vendedor puede mandar el enlace ya marcado después de la llamada.

## 6. Fases

| Fase | Entregable | Gate |
|---|---|---|
| **F0** | Maqueta HTML navegable de todas las láminas, en 390 y 1440, con capturas reales y la cámara aproximada en CSS. Artifact privado + `docs/design/mockups/overview-deck.html` | OK del dueño al guion y al diseño |
| **F1** | Storyboard de los recorridos (cuadros reales) → capturas que faltan (contactos/pipeline, pedidos, catálogo, Shopify) con `axi-video/04-herramientas/capturas-app` | OK al storyboard |
| **F2** | Producción en axi-video `03-producciones/2026-11-overview-recorridos/`: los clips 16:9 y 4:5, un render pesado a la vez, con revisión en el Studio | OK a cada clip |
| **F3** ✅ | Código en axi-client: ruta, isla, láminas, medios, precio, OG, `PUBLIC_PATHS`, sitemap. Verja: tsc + eslint acotado + pruebas de la isla. El build lo corre el dueño | Revisión del PR |
| **F4** | Verificación visual (390 → 1440, datos largos en `?para=`, teclado, deslizar, reducido) y deploy | OK y publicación |

## 7. Riesgos

- **D2:** prometer SIESA y pagos que hoy no están en producción.
- **Peso:** 15 clips × 2 encuadres ≈ 30–45 MB en total, pero cada visitante descarga solo lo que ve, unos 2–4 MB por lámina vista.
- **Capturas:** el de la campaña tiene el fallo de BigInt documentado en el LEEME de las capturas.

## 8. Estado (18-nov-2026)

- **F0–F2 cerradas.** Maqueta aprobada; 12 recorridos × 2 formatos renderizados en `axi-video/03-producciones/2026-11-overview-recorridos/web/` (celular v2: el teléfono completo como objeto, aprobado por el dueño).
- **F3:** `src/app/overview/` + `src/modules/overview/` (dominio con pruebas). Los clips se suben a Cloudinary con `axi-video/03-producciones/2026-11-overview-recorridos/herramientas/subir-cloudinary.sh` (solo los MP4; el WebM y el póster salen por URL). Mientras no estén subidos, `OVERVIEW_MEDIA_BASE` sirve los de la producción en local.
- **Desviaciones de la maqueta:** ninguna en el guion; en celular el clip va sin marco (el teléfono ya está dentro) con los bordes fundidos con el fondo.
