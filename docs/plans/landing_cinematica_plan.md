# Programa «Landing cinematográfica» — la home como una película

> **Estado (2026-09-30):** APROBADO por la dueña («me gusta mucho… procede»). **F0–F4 implementados** en `feat/landing-cinema` y verificados en navegador (1440 y 390 px). F5 parcial: falta Lighthouse medido, `landing-copy.md` y la revisión de la dueña en el ambiente de pruebas (§9).
>
> - Storyboard (22 fotogramas, notas de coreografía): https://claude.ai/artifact/2myumdsep5j96YpEUGDy87
> - Prototipo con scroll real (GSAP + Lenis; apertura, nicho, chat, meta, cierre): https://claude.ai/artifact/D6gTZLXqNa9zRTfZgFNMH9
> - Fuentes: `docs/design/mockups/landing-cinema/` (`storyboard.build.py`, `prototype.template.html`, `prototype.build.py`).
> - Rama: `feat/landing-cinema` (worktree `.claude/worktrees/landing-cinema`), desde `origin/main` a850347b.
> - La home actual queda archivada en el tag **`landing-v1-archive`** (a850347b, local; se sube con la primera entrega).

---

## 1. Por qué

La home actual no convierte. Diagnóstico de la dueña, en sus palabras:

1. Nadie la lee: no porque no sea interesante, sino porque no comunica bien.
2. No tiene el design system nuevo (islas, bento, tinta, la voz del progreso).
3. No comunica todo lo que tiene el producto (Cobros, Comercial, Captación, Radar, llamadas… no aparecen).
4. No es psicológicamente persuasiva.
5. Tiene problemas de rendimiento.

## 2. Decisiones (alineadas el 2026-09-30)

| # | Decisión |
|---|---|
| D1 | **Una sola conversión: «Prueba 7 días gratis» → `/comenzar`.** WhatsApp con el agente de Axi es la vía secundaria. La demo agendada sale de la home (sigue en `/contacto`). |
| D2 | **Mecánica híbrida:** scroll vertical con escenas fijadas (*pin*) que el scroll reproduce (*scrub*); algunos tramos pasan en horizontal. Una **cinta de luz** guía toda la película (ver §3). |
| D3 | **Una sola película continua**, sin índice por actos. La guía de progreso es un riel (escritorio) o una barra bajo la cabecera (móvil); no es navegación. |
| D4 | **Personalizada por nicho.** El nicho llega por `?nicho=` (campañas) o se elige en la **escena 2** («¿Quién te escribe hoy?»), no en el hero: los primeros 5 segundos son para entender qué es Axi. Una píldora flotante permite cambiarlo. El nicho viaja a `/comenzar`. |
| D5 | **Cuatro nichos en la primera entrega:** Restaurantes, **Tecnología** (en lugar de Moda: la brecha de productos con variantes sigue abierta, KB §6.4), Salud y belleza, Servicios y B2B. El resto ve un negocio de ejemplo. Ampliable por datos. |
| D6 | **Escenas de los cuatro grupos:** captar (Radar del decisor, seguimiento), vender (chat, foto, llamada, garantías, equipo), cobrar, ordenar, crecer (el mapa de la meta, Axel) y medir. |
| D7 | **Todo se dibuja como UI recreada en código** (HTML/SVG, animada por scroll). Sin video. El estilo de referencia es el del escáner de reconocimiento y el chat actuales, que la dueña aprobó. |
| D8 | **Escenario oscuro** (la película ocurre de noche): tokens oscuros de `globals.css`, luz tricolor. El cromo (header, footer) sigue respetando claro/oscuro. |
| D9 | Además de la película: **precios** (del catálogo público), **garantías de la IA** (como escena, la bóveda) y **FAQ**. **Sin prueba social** en esta entrega. |
| D10 | **Móvil:** la misma película, vertical y más corta, sin tramos horizontales. |
| D11 | **Copy:** lo propone Claude, verificado contra el producto (nada 🚧); la dueña lo aprueba en el storyboard. `axi/docs/business/landing-copy.md` se actualiza como nueva fuente. |
| D12 | **Archivo:** tag `landing-v1-archive` + se borra lo que la home deje de usar. Se conserva lo que usan `/productos`, `/precios`, `/casos`, `/integraciones` y onboarding. |
| D13 | **Librerías:** GSAP (+ ScrollTrigger) y Lenis, **solo** en la home y cargadas diferidas. |
| D14 | **Alcance: solo la home `/`.** Las demás páginas públicas se retocan después con el mismo lenguaje. |
| D15 | **Rendimiento transversal:** cada paquete se carga solo en la ruta que lo usa, para que el panel y `/platform` sigan fluidos. Dentro de este programa: línea base, presupuesto por ruta, verjas y limpieza de la capa raíz y pública. Lo interno del panel va en un programa aparte (§6.4). |
| D16 | **El Radar del decisor se muestra:** la dueña lo termina en otra sesión y se despliega antes que la landing. Su vocabulario se verifica contra esa rama antes de cerrar la escena 3. |

## 3. El concepto: la cinta de luz

El isotipo son tres cintas (coral, ámbar, violeta) que forman la α. En la película esas tres cintas **son la luz que guía el scroll**:

1. **Apertura:** la α se arma y sus cintas se desenrollan hacia abajo.
2. Cada escena se ilumina cuando la cinta llega a ella, y la cinta la atraviesa **por detrás del texto, nunca encima**.
3. **Clímax (escena 12):** la cinta aterriza y se vuelve la **carretera del mapa de la meta**. Lo que te guió por la película es el camino hacia tu meta del mes.
4. **Cierre:** las cintas vuelven y se cierran en la α.

Es premium por continuidad, no por efectos: una sola idea de marca ejecutada con precisión, tipografía Nexa grande (200 + 700 en la misma frase), superficies de cristal y tinta, y ningún tile de vanidad.

## 4. El guion (17 escenas)

Cada escena tiene una frase y una animación. Las cifras son de ejemplo y lo dicen donde haga falta.

| # | Escena | Frase | Qué se ve (y qué hace el scroll) | Estado real / límite honesto |
|---|---|---|---|---|
| 1 | Apertura | «Vende en cada conversación.» | La α se arma; burbujas de muchos clientes en profundidad; la cinta cae. CTA: prueba gratis y hablar con el agente. | — |
| 2 | ¿Quién te escribe hoy? | «¿Quién te escribe hoy?» | Cuatro fichas-mensaje; elegir reescribe la película. | Datos del nicho en código (§5.3). |
| 3 | Captar · Radar | «Encuentra a quien te va a comprar.» | Barrido de radar, un negocio se abre, las fuentes se encienden, índice 86/100, **Decisor**. | Captación viva (Google Maps, OSM, buscador web). WhatsApp solo con permiso: se muestra «Puedo contactar por: Correo · Llamada». Radar del decisor: D16. En nichos de consumo la escena muestra leads de anuncios Click-to-WhatsApp. |
| 4 | Captar · Seguimiento | «Nadie se queda esperando.» | **Tramo horizontal:** carrito → plantilla → leída → respuesta → venta recuperada. | Plantilla aprobada por Meta, solo WhatsApp; se detiene cuando responde; las reglas nacen apagadas. |
| 5 | Vender · Chat | «Responde en segundos. Con tus precios reales.» | El teléfono se fija y el scroll escribe la conversación; remata «Venta pagada». | Pago «reportado», lo verifica el equipo. Producto sin variantes. |
| 6 | Vender · Foto | «Una foto basta.» | La captura se escanea y el catálogo se ordena por similitud; match en violeta. | Reconocimiento activable por empresa. |
| 7 | Vender · Llamada | «Y cuando hay que llamar, llama.» | Aura, transcripción palabra a palabra, etapas del marco hasta «Objetivo cumplido». | Solo llamadas salientes. Nada de entrantes ni de cobranza por llamada. |
| 8 | Garantías · Bóveda | «Nunca inventa un precio.» | La petición choca con la bóveda; cuatro candados: precio, descuento, total, pago. | KB §6.3. |
| 9 | Vender · Equipo | «Cuando hace falta una persona, entra tu equipo.» | Axi atiende → En cola → Contigo; «Devolver a Axi». | Inbox real. |
| 10 | Cobrar | «Cada venta, cobrada.» | El medidor se llena por abonos, el recordatorio como conversación, la promesa pausa avisos, el recibo en PDF. | Cobros va por nicho (flag). Factura DIAN y remisión **no** existen: no se nombran. |
| 11 | Ordenar | «Todo queda en su lugar.» | «La abrió Axi» salta a Compromiso; la cita se asienta con su recordatorio. | CRM + agenda. |
| 12 | Crecer · Meta | «Tú pones la meta. Axi traza la ruta.» | **El clímax:** el mapa tipo Waze (`RouteMap`): «Vas aquí», tramo lento en ámbar, «Rutas · las prepara Axi», la llegada sube de 82 % a 91 %. «Nada se envía sin tu aprobación.» | En «aprendiendo» no hay rutas: la escena lo evita con datos de ejemplo coherentes (63 % de 30 M = 18,9 M). |
| 13 | Crecer · Axel | «Cada mañana, un plan.» | El informe se escribe y se vuelve tarjetas de propuesta. | «Nada sale sin tu aprobación.» |
| 14 | Medir | «Sabes cuánto te vendió cada conversación.» | Embudo que crece, cifras que cuentan una vez; calidad 92/100 «evaluada por una IA supervisora». | «Cifras de ejemplo». |
| 15 | Precios | «Empieza gratis. Crece a tu ritmo.» | Paquetes por tramo de conversaciones. | Cifras del catálogo público (ISR). |
| 16 | Preguntas | «Lo que nos preguntan.» | Acordeón; sigue emitiendo FAQPage. | — |
| 17 | Cierre | «Tu próxima venta ya está escribiendo.» | Las cintas vuelven a la α; CTA final. | — |

**Vocabulario prohibido en titulares** (se mantiene de `landing-copy.md`): «omnicanal», «IA-native», «CRM», «chatbot», «plataforma», «solución integral», «automatización inteligente».

## 5. Arquitectura

### 5.1 Dónde vive

```
src/modules/landing/
├── domain/
│   ├── public-catalog.ts          # (existe) precios del catálogo público
│   └── film/                      # NUEVO — TypeScript puro
│       ├── niches.ts              # NicheKey, parseNiche(url), fallback «ejemplo»
│       └── scenes.ts              # contenido por escena × nicho (copy y cifras de ejemplo)
├── ui/
│   ├── film/                      # NUEVO — la película (única carpeta que importa gsap/lenis)
│   │   ├── FilmPage.tsx           # RSC: monta las escenas; el hero es HTML servido
│   │   ├── engine/                # "use client": useFilmEngine (Lenis + ScrollTrigger), NicheProvider
│   │   ├── scenes/                # una escena por archivo, cada una isla cliente diferida
│   │   └── parts/                 # Ribbon, Rail, NichePill, PhoneFrame, RouteMap (landing)
│   ├── sections/                  # se quedan solo las que usan otras páginas públicas
│   └── content/landing.content.ts # se parte: copy de la película → domain/film; lo público → public.ts
└── public.ts                      # solo datos puros (sin componentes, §6.3)
```

- **Verja:** regla ESLint `no-restricted-imports` que permite `gsap` y `lenis` **solo** bajo `modules/landing/ui/film/**`.
- `src/app/(public)/page.tsx` monta `FilmPage` y sigue emitiendo el JSON-LD (Organization, WebSite, FAQPage).

### 5.2 El motor

- **Scroll:** hoy la capa pública no hace scroll en `window`, sino en `div[data-app-scroll]` de `(public)/layout.tsx`. Lenis se instancia con `wrapper` y `content` sobre ese contenedor, y ScrollTrigger con `scroller` apuntando a él (`ScrollTrigger.defaults`). Si el pin da problemas dentro de un scroller propio, la alternativa es que la home haga scroll en `window`. Se decide en F1 con una prueba medida, sin tocar las otras rutas públicas.
- **Carga:** el hero es HTML servido y pintado sin JS (LCP). El motor se importa con `import()` tras el primer frame (`requestIdleCallback`). Cada escena registra su timeline al acercarse (`IntersectionObserver`, margen de una pantalla) y se destruye al alejarse: nunca 17 timelines vivas.
- **Movimiento reducido:** sin Lenis ni pins; cada escena muestra su fotograma final (el prototipo ya lo hace). Lo mismo si GSAP no carga.
- **Solo `transform` y `opacity`**, nada de loops en reposo (DESIGN-SYSTEM §6). El aura de la llamada vive solo mientras la escena está en pantalla.

### 5.3 El nicho

- `parseNiche(searchParams)` → `restaurants | tech | beauty | b2b | example`. Se guarda en `localStorage` (con try/catch) como conveniencia del visitante.
- Los CTA llevan `?plan=free_trial&nicho=<clave>`. **Pendiente:** hoy `/comenzar` lee `?plan=` y `?modulo=` (`onboarding/domain/signup-draft.ts:161,178`) pero no `?nicho=`. Hay que añadir la lectura y preseleccionar el tipo de negocio (mapeo a `NICHES` de onboarding: `restaurants`, `retail_fashion`→`tech`?, `health_beauty`, `b2b_distribution` / `professional_services`). Onboarding no tiene hoy un nicho «tecnología»: el mapeo se decide en F1.
- Analítica: `track("film_niche", { niche, source: "url" | "choice" })`, `track("film_scene", { scene })` una vez por escena y el CTA por delegación de eventos (`core/analytics/outbound.ts`).

### 5.4 Qué se borra (D12)

Se borra lo que la home deja de usar, salvo lo que usan otras rutas:

- **Se borran** (solo los usa la home): `LandingHero`, `LandingSocialProof`, `LandingProblem`, `LandingHowItWorks`, `LandingMetrics`, `LandingTeamControl`, `LandingTerminal`, `LandingFinalCta` y sus hojas exclusivas (`BrandGradientCanvas` si no queda consumidor, `TerminalMockup`, `LaptopMockup`, `FunnelPreview`, `VaultRevealCard`, `ParallaxLayer`…). La lista exacta se saca en F1 con una búsqueda de importaciones.
- **Se conservan:** `RecognitionScanner` y `LandingRecognition` (los usan `/integraciones` y `/casos`), `PricingPlans` y `ModulePlans` (`/precios`), `Reveal`, `DemoLeadForm` (`/contacto`), `LegalDocument` y el contenido de `/productos`.
- También se borra el backup `shared/components/layout/site/legacy/LegacyLandingPage.tsx`: el tag lo sustituye.

## 6. Rendimiento

### 6.1 Línea base (build de producción, 2026-09-30, a850347b)

JavaScript de primera carga (comprimido), según `next build`:

| Ruta | Primera carga |
|---|---|
| Común a todas | 100 kB |
| `/` (landing actual) | **267 kB** |
| `/comenzar` | 277 kB |
| `/precios` | 201 kB |
| `/productos` | 194 kB |
| `/auth/login` | 169 kB |
| `/platform` | 172 kB |
| `/dashboard` | 356 kB |
| `/onboarding` | 368 kB |
| `/orders` | 394 kB |
| `/workspace/inbox` | **487 kB** |

### 6.2 Diagnóstico (auditoría estática del 2026-09-30)

Lo que hoy viaja a **todas** las rutas desde el layout raíz:

- **`socket.io-client`**: `AuthProvider` importa `socketManager` de forma estática (`core/providers/auth-provider.tsx:5` → `core/realtime/socket-manager.ts:3`), y en la capa pública solo llama `halt()` y `reset()`.
- **framer-motion completo**: `AlertProvider` monta `Modal` (`ui/dialog.tsx:6`, `motion` + `AnimatePresence`) y `NotificationsToaster`, y `sileo` importa `motion/react`. Por eso `LazyMotion` en el código propio no bastaría: hay que diferir el toaster y el modal.
- **`CompanySuspendedScreen`** y un `fetch("/api/auth/session")` al montar, también en rutas públicas.

En la capa pública:

- `(public)/layout.tsx` es `"use client"` solo por un `useRef`.
- `SiteFooter` es cliente sin hooks.
- `SiteNavMobile` (Radix Dialog y Accordion) se carga siempre, también en escritorio.

En la home actual:

- Las 13 secciones se importan estáticas.
- `LandingFinalCta` hidrata `DemoLeadForm` (react-hook-form, zod, Radix Select) y un segundo canvas.

Filtración a `/comenzar`:

- `landing/public.ts` reexporta `MODULE_ICONS` desde `ModuleCard.tsx` (arrastra TiltCard y framer-motion) y el `landing.content.ts` entero (1.201 líneas).

### 6.3 Qué entra en este programa (capa raíz y pública)

1. `socket-manager` con `import()` diferido; la capa pública no lo carga.
2. `NotificationsToaster` y `Modal` de `AlertProvider` con `next/dynamic` (cargados al primer aviso o modal).
3. `MotionProvider` con `LazyMotion` + `domAnimation`; migrar a `m` lo global y público (SiteHeader, Reveal, splash, dialog).
4. `(public)/layout.tsx`, `SiteFooter`, `KodecolBanner` y `SocialIcon` a RSC; `SiteNavMobile` diferido hasta abrirse.
5. `landing/public.ts` solo con datos puros: `MODULE_ICONS` sale de `ModuleCard`, el copy se parte.
6. `/api/auth/session` no se pide en rutas públicas si no hay cookie de sesión.
7. `@next/bundle-analyzer` (en `devDependencies`) y `optimizePackageImports: ["framer-motion"]`. Quitar `@heroicons/react`, que no tiene usos.
8. **Presupuesto por ruta en CI:** script `scripts/check-bundle-budget.mjs` que lee los manifiestos del build y falla si una ruta supera su techo. Techos iniciales, que se fijan con la medición de F0:
   - `/` ≤ 200 kB **con el motor incluido** (GSAP + ScrollTrigger ≈ 45 kB y Lenis ≈ 5 kB comprimidos; el motor no entra en la primera carga si se difiere).
   - Común a todas ≤ 85 kB.
   - Ninguna ruta del panel crece por este programa.
9. **Metas de la home:** LCP < 2,5 s, CLS < 0,1, INP < 200 ms y Lighthouse móvil ≥ 90 (throttling por defecto). Medidas en build de producción.

### 6.4 Programa aparte (panel y /platform), propuesto

- `prefetch={false}` o prefetch al pasar el ratón en el sidebar (`nav-item.tsx:170`, `nav-flyout.tsx`): hoy precarga cada enlace visible del menú.
- `@dnd-kit` con `next/dynamic` en tableros y editores (13 archivos; `RuleList` en shared es el más transversal).
- framer-motion en shared del panel (nav-item, RowCollapse, DetailSheet, FilterPanel, pagination) → `m` o CSS.
- `cmdk` diferido.
- Ya están bien: `recharts` (diferido), `react-query` y `openapi-fetch` (aislados en /platform).

## 7. Fases

Cada fase se entrega con: tests (jest, `--maxWorkers=2`), `npm run typecheck`, `next build` verde con la verja de ESLint, **render medido a 390, 768, 1024 y 1440 px** con el arnés de capturas y el protocolo «listo F<N>» para el auditor. Una tarea pesada a la vez (límite de RAM de la máquina).

| Fase | Contenido | Sale cuando |
|---|---|---|
| **F0 · Rendimiento base** | §6.3 puntos 1–8; bundle analyzer; script de presupuesto; nueva línea base. Sin cambios visuales. | El JS común baja y ninguna ruta sube; tests y build verdes. |
| **F1 · Motor y apertura** | `domain/film` (nichos y escenas), motor (Lenis + ScrollTrigger diferidos), riel, píldora, escenas 1, 2 y 17, `?nicho=` en `/comenzar`, borrado de la home vieja (§5.4), JSON-LD. Decide el scroller (§5.2). | La home nueva abre, el nicho reescribe la película y los CTA llevan a `/comenzar` con el nicho. |
| **F2 · Vender** | Escenas 5, 6, 7, 8 y 9. | Coreografía como el storyboard, en los 4 nichos. |
| **F3 · Captar** | Escenas 3 y 4, con el tramo horizontal. Radar verificado contra su rama (D16). | Vocabulario del Radar igual al producto. |
| **F4 · Cobrar, ordenar, crecer, medir** | Escenas 10, 11, 12, 13 y 14. El mapa reutiliza la geometría de `commercial/domain/route-map.ts` (solo el dominio puro, vía barrel) o una copia documentada. | El clímax funciona en escritorio y móvil. |
| **F5 · Cierre y calidad** | Precios (catálogo ISR), FAQ, analítica de escenas, reduced-motion, Lighthouse y presupuesto en CI, QA visual completa, `landing-copy.md` actualizado. | Metas de §6.3.9 medidas; aprobación de la dueña; despliegue. |

## 8. Pendientes y riesgos

- **Radar del decisor:** confirmar nombres y estados en la rama de la dueña antes de F3.
- **Cobros por nicho:** hoy el flag se enciende para turismo, educación, inmobiliaria y SaaS. Hay que decidir si la escena 10 se muestra en los 4 nichos de la película o solo donde aplica.
- **`?nicho=` en `/comenzar`:** el mapeo a los nichos de onboarding (no hay «tecnología» allí).
- **Cifras de ejemplo:** todas coherentes entre sí y marcadas; ninguna se presenta como un caso real.
- **Pin dentro de un scroller propio** (§5.2): riesgo técnico principal; se mide en F1 antes de construir el resto.
- `knowledge-base.md` es del 10-ago y no incluye Cobros, Comercial, Axel ni Alba: el copy se verificó contra el código y los planes.

## 9. Registro de implementación (2026-09-30)

| Fase | Commits | Qué quedó |
|---|---|---|
| F0 | `df941b30`, `ae3e89b0` | socket.io, sileo y el Modal fuera del JS común (`realtime-control`, carga diferida en `AlertProvider`); layout público y footer como RSC; `MODULE_ICONS` sin la tarjeta; fuera `@heroicons/react`; `npm run budget` + `scripts/bundle-budget.json`; verja ESLint de GSAP/Lenis; dominio `domain/film` con tests. |
| F1–F4 | `8e05367b` y siguientes | Las 17 escenas, `FilmRoot`, motor, nicho hasta `/comenzar` y el onboarding, cabecera/pie oscuros en la home, borrado de la home anterior (tag `landing-v1-archive`). |

**Medido tras F0 (First Load JS, `next build`):** `/comenzar` 277→264 kB, `/auth/login` 169→156, `/dashboard` 356→346, `/orders` 394→386, `/workspace/inbox` 487→479. La home se mide tras F4 (ver el commit de cierre).

**Decisiones tomadas en la implementación:**
- Los titulares de escena aparecen mientras la escena entra, fuera del pin: al fijarse ya se lee de qué trata (en el primer render la escena llegaba vacía).
- Ritmo: los pins se acortaron un 20 % (`PACE = 0.8`); con 1 la película de escritorio pasaba de 30.000 px.
- «Tomar esta ruta · aprobar» del storyboard no es un botón en la landing (no hay nada que aprobar): se dice «Axi propone; tú apruebas».
- Precios reutiliza `PricingPlans` (catálogo real); preguntas con `<details>` nativo, sin JS.
- Moda sustituida por Tecnología; en B2B el ejemplo son cajas de guantes (sin tallas).

**Pendiente conocido fuera del programa:** `integrations/.../PromocionesTab.test.tsx` falla desde hoy también en `main` (su fixture usa una promoción que vence el 2026-09-30).

## 10. El hilo de luz · haz de fibra óptica (aprobado el 2026-09-30)

Sustituye las cintas por escena (`Ribbon` + `ribbons()` del motor). Esas cintas eran 7 SVG sueltos, recortados por el `overflow: clip` de cada escena y ocultos en móvil. Por construcción no podían pasar de una escena a otra, y por eso aparecían de golpe.

- **Concepto:** un solo haz recorre toda la home, a partir de la referencia de fibra óptica que aportó la dueña.
  - Va apretado en la cabeza, que es la luz que guía, y se abre detrás en cientos de fibras que se cruzan.
  - En las escenas de trabajo es blanco (tinta). Solo se abre en coral, ámbar y violeta en la apertura, en la meta (donde es la carretera y «vas aquí» va en la cabeza) y en el cierre (donde termina en la α).
  - Cuando la luz llega al protagonista de una escena, este se enciende.
- **Prototipos:** https://claude.ai/artifact/WMQETzbwdQNjWNa2QCkPdN (v2 fibra óptica) y el teléfono A, https://claude.ai/artifact/JSyuEbPxE2RyDZ1ZNjUxNq. Fuentes en `/root/axi/qa/landing/fuentes-diseno/`.

**Dónde vive (se borra quitando esto y nada más):**

| Archivo | Qué es |
|---|---|
| `domain/film/thread-path.ts` | El recorrido, en DATOS: anclas por `data-scene` (en % de la caja de la escena), variantes de escritorio y móvil, e interruptor `enabled`. La meta calcula sus puntos sobre `route-map` con la misma regla «cover» del mapa. |
| `domain/film/thread-geometry.ts` | Matemática pura, con tests: tiempos de las anclas, posición de la escena con o sin pin, muestreo Catmull-Rom y columna del haz. |
| `ui/film/thread/thread.ts` | API pública `createThread({ root, getScroll, getPin, isDesktop, onHead? })` que devuelve `{ refresh, frame, destroy }`. Crea y quita su propio canvas. |
| `ui/film/thread/thread-gl.ts` | Renderer WebGL 1. Maneja la pérdida y recuperación del contexto y tiene niveles de calidad. |
| `ui/film/thread/thread-2d.ts` | Respaldo cuando no hay WebGL: un hilo en tinta con cabeza. |
| `ui/film/thread/thread.css` | El canvas fijo y el encendido: la sección recibe `[data-thread-lit]` y su protagonista, marcado con `[data-thread-target]`, se enciende. |

**Integración en el motor:** tres líneas.
1. `createThread` después de construir los pins.
2. `ScrollTrigger.addEventListener("refresh", thread.refresh)` y `gsap.ticker.add(thread.frame)`.
3. En `stop()`: quitar los dos oyentes y llamar a `thread.destroy()`.

El módulo no importa gsap ni lenis: recibe el scroll y los pins como números. Queda fuera de la verja de ESLint y no depende de dónde se haga el scroll (`window` o `[data-app-scroll]`). Con Lenis sobre `window`: `getScroll = () => lenis.scroll` y `getPin = (scene) => ({ start: st.start, end: st.end })` del ScrollTrigger del pin de esa escena, o `null`.

**Rendimiento:**
- La geometría es estática y se sube una vez: 220 fibras (140 en móvil) en UNA llamada `LINES`, y el brillo y las chispas en una llamada `POINTS`. Por frame solo se sube la columna del haz (96 × 4 floats).
- Para cada frame, las posiciones salen de aritmética, sin `getBoundingClientRect`. `refresh` mide una vez.
- Solo dibuja si cambió el scroll, la ventana o el puntero. En reposo, `frame()` compara números y sale. Pasada la película, el canvas se oculta.
- Tras 45 frames lentos (>24 ms) baja un nivel de calidad (220 → 140 → 80 fibras) en vez de trabarse. DPR con techo de 1,5 en escritorio y 1,25 en móvil.
- Medido en el prototipo a 1440 px: ~0,4 ms de CPU por frame y 60 fps. Va en el chunk diferido del motor, así que no suma a la primera carga.
- Con movimiento reducido el motor no se carga y el hilo no existe (fotogramas finales).

**Pendiente de integrar (axi-14):**
- Conectar las tres líneas.
- Retirar `Ribbon`, `ribbons()` y las `<Ribbon>` de las escenas.
- Marcar el protagonista de cada escena con `data-thread-target`.
- En la meta, colocar «vas aquí» con `onHead` (o quitar la carretera animada del SVG y dejar la punteada como fantasma).
- Anclas del hero (actualizadas tras quitar las dunas, e34d5636): en escritorio, el haz nace bajo el CTA (x 50 %, 75 % del alto) y baja por el hueco central de las cifras (90 %); en móvil, nace en el borde inferior (97 %). Se afina en QA.
- QA visual a 390, 768, 1024 y 1440 px, ajustando los números de `thread-path.ts`.

## 11. Cobrar, ordenar, Axel y medir · rediseño (aprobado el 2026-09-30)

Lienzo aprobado: https://claude.ai/artifact/PyDHa1EJ5YRVcVB9Tnrete (cuatro escenas a 1440 con barra de scroll, el recorrido encadenado y móvil 390). Todo en tinta; un objeto real por escena, que el hilo enciende al llegar (`data-thread-target`).

| Escena | Protagonista | Coreografía (progreso de la escena) |
|---|---|---|
| Cobrar | Recibo de papel N.º 0142 en perspectiva (`rotateX` 44→26°, `rotateZ` −2→−6°), claro sobre el fondo oscuro | 0–0,46 recordatorio → «Pago el lunes sin falta» → promesa; 0,55–0,8 se llena la cuota 3 y cuentan «Total pagado» y «Falta»; 0,82–0,92 sello «PAGADO» (escala 1,5→1); 0,92–1 «PDF enviado por WhatsApp» |
| Ordenar | Tarjeta blanca de Andrés sobre el pipeline como mesa (`rotateX` 40°, origen abajo) | 0,2–0,74 la tarjeta se levanta de «Propuesta» (queda el hueco punteado) y aterriza en «Compromiso» (cambian los conteos); 0,76–0,9 se engancha la cita del sábado; el pronóstico cuenta hasta $ 38,2 M |
| Axel | El horizonte, que es el propio hilo | 0,1–0,46 Axel escribe su resumen con cursor; 0,45–0,8 amanece sobre el horizonte; 0,52–0,96 suben las tres propuestas («Aprobar» / «Ahora no»; el hallazgo, «Ver el detalle»); el violeta queda solo en la marca de Axel |
| Medir | Fibras, una por conversación, que cruzan cuatro puertas (1.240 → 312 → 148 → 121); las que no llegan se apagan en su puerta | 0,12–0,82 las fibras se revelan de izquierda a derecha y cuentan las cifras; 0,82–0,96 convergen y aparece «$ 48,6 M» con la calidad del agente 92/100 |

**Recorrido del hilo** (ya en `thread-path.ts`):
- Cobrar entra arriba al centro, pasa por detrás del recibo y sale por la esquina derecha.
- Ordenar baja por el margen derecho, enciende la tarjeta y sale por debajo de la mesa hacia el arranque de la carretera, abajo a la izquierda.
- Axel entra por la derecha y se tiende como horizonte hasta la izquierda.
- Medir entra por la izquierda, se abre en fibras y sale a la derecha hacia precios.
- En móvil el hilo va por los márgenes y cruza de lado en los bordes entre escenas; en Axel el cruce es el horizonte.

**Nuevo en la geometría: `ThreadPoint.pin`** (0–1). En una escena fijada, un punto llega en esa fracción exacta del pin; en una escena libre, el campo se ignora. Sirve para los tramos horizontales (el horizonte de Axel, las fibras de medir), que por su `y` se cruzarían de golpe. También arregla la meta: la carretera sube por la pantalla y sus puntos caían en el mismo instante, así que la luz la recorría de golpe. Ahora siguen el trazo de la línea de tiempo de `goal`: de 0,2 a 2,4 de 4,9, con `power1.inOut`, en la constante `GOAL_ROAD`. Si esa coreografía cambia, hay que cambiar esa constante.

**Pendiente de axi-14 (implementación):**
- Llevar las cuatro escenas al lienzo:
  - El recibo, la mesa y la tarjeta son CSS con transformaciones. Las fibras de medir son un SVG estático (una sola `path` con muchos subtrazos) que se revela con un `clipPath` animado por `scaleX`. Nada de `backdrop-filter`.
  - La cuota que se llena y el sello van con `transform`/`opacity`.
- Añadir `axel` y `measure` a `PINNED`, que hoy no se fijan. Sin pin, el horizonte y las fibras se cruzan en unos píxeles de scroll y los `pin` del hilo no cuentan. Cobrar y ordenar funcionan libres.
- Poner `data-thread-target` en el recibo, la tarjeta, la línea del horizonte y la cifra producida.
- Revisar en QA dos cruces que ya existían en móvil: de equipo a cobrar y de ordenar a la meta, que pueden rozar un titular.

## 12. Plan maestro del upgrade · diseño (axi-13) y construcción (axi-14)

Reparto: **axi-13 diseña y planifica** (lienzo aprobado por la dueña, recorrido del hilo, dominio puro y contrato de cada escena). **axi-14 construye** exactamente lo aprobado, sin rediseñar. Si algo del lienzo no se puede construir con el presupuesto de rendimiento, se avisa antes de improvisar.

### Estado por escena

| # | Escena | Diseño | Construcción |
|---|---|---|---|
| 1 | Hero | axi-14 (cerrado por la dueña el 2026-09-30; mejoras finas, después) | hecho |
| 2 | Nicho «¿Quién te escribe hoy?» | Aprobado (§13) | pendiente |
| 3 | Radar «Encuentra a quien te va a comprar» | Aprobado (§13) | pendiente |
| 4 | Seguimiento «Nadie se queda esperando» | Aprobado (§13) | pendiente |
| 5 | Chat «Responde en segundos» | Teléfono A, aprobado | pendiente |
| 6 | Foto «Una foto basta» | Aprobado (§13) | pendiente |
| 7 | Llamada «Y cuando hay que llamar, llama» | Aprobado (§13) | pendiente |
| 8 | Bóveda «Nunca inventa un precio» | Aprobado (§13) | pendiente |
| 9 | Equipo «Entra tu equipo» | Aprobado (§13) | pendiente |
| 10–11 | Cobrar, Ordenar | Aprobado (§11) | pendiente |
| 12 | Meta «Tú pones la meta» | Tanda 4 | pendiente |
| 13–14 | Axel, Medir | Aprobado (§11) | pendiente |
| 15–17 | Precios, Preguntas, Cierre | Tanda 4 | pendiente |
| — | Marco: cabecera, píldora de nicho, riel de capítulos, pie | Tanda 4 | pendiente |
| — | Hilo de luz | Aprobado (§10) | pendiente (tras la orden de la dueña) |
| 3b | Piloto automático «Pon tu captación en piloto automático» (F6, §19) | Propuesto; falta lienzo | pendiente · se publica cuando el piloto esté en producción |

**Orden de construcción:** teléfono A → hilo + scroll en `window` → aligerar el motor → §11 → tanda 3 → tanda 4.

### Tanda 3 · Captar y vender (aprobada el 2026-09-30, ver §13)

Lienzo: https://claude.ai/artifact/UoGDRZeneinMckaYVDNrCW (siete escenas con barra de scroll, el recorrido encadenado y móvil 390). Aprobada; recorrido en `thread-path.ts` y coreografía en §13.

Cada escena tiene un objeto real como protagonista, igual que el teléfono A y el recibo:

- **Nicho:** cuatro notificaciones entrantes en profundidad. La elegida viene al frente y se vuelve blanca; el hilo la enciende.
- **Radar:** un instrumento de precisión: esfera con marcas de reloj, barrido blanco y los hallazgos como puntos. La ficha del cliente sale del punto con una línea guía, y la calificación 88 va en grande.
- **Seguimiento:** una regla de tiempo, como la línea de edición de un video. El hilo es el cabezal de reproducción y pasa de la noche del martes a la mañana del miércoles; los mensajes aparecen en su minuto.
- **Foto:** la captura del cliente como una lámina en perspectiva. El hilo la cruza como haz de escaneo; del catálogo, dispuesto en estante, se levanta el producto exacto (similitud 0,93).
- **Llamada:** el hilo se vuelve la onda de la voz. La transcripción aparece por turnos y las seis etapas avanzan sobre la onda.
- **Bóveda:** una etiqueta de precio colgada del hilo, con el precio grabado. El cliente regatea y la etiqueta no cambia; el cupón imprime el total del sistema.
- **Equipo:** un portátil en perspectiva, hermano del teléfono A, con la bandeja abierta. La conversación pasa de Axi a Laura y vuelve.

### Tanda 4 · Crecer y cerrar (siguiente)

- **Meta:** el mapa en tinta. Carretera blanca, «vas aquí» como único punto de marca, el tramo lento en gris punteado; el hilo es la carretera (§11).
- **Precios:** tarjetas en tinta, con el plan recomendado invertido en blanco. Sin cristal.
- **Preguntas:** lectura limpia; el hilo pasa por el margen derecho.
- **Cierre:** las fibras se juntan en la marca de Axi. Es el único momento a todo color: el haz se abre en coral, ámbar y violeta.
- **Marco:** cabecera, píldora de nicho y riel de capítulos en tinta, coherentes con el escenario oscuro.

### Contrato de entrega por escena

La entrega de cada escena a axi-14 incluye:

1. El lienzo aprobado, con barra de scroll: la coreografía está en el tablero.
2. La tabla de coreografía: qué pasa en cada tramo del progreso (0–1) de la escena.
3. El recorrido del hilo ya escrito en `thread-path.ts`, con los momentos `pin` si la escena se fija, y el protagonista que lleva `data-thread-target`.
4. Si se fija (`PINNED`) y su longitud en `sceneTimeline`.
5. La versión móvil 390.

**Reglas de construcción** (valen para todas las escenas):
- Solo `transform` y `opacity` en lo que se mueve con scroll.
- Sin `backdrop-filter` sobre escenas animadas.
- Sin medir el DOM por frame.
- Solo se anima el nicho activo.
- El texto sale de `film-content.ts`: nada inventado.
- Con movimiento reducido se muestra el fotograma final.
- Presupuesto: `/` ≤ 200 kB (`npm run budget`).
- Color en tinta: marca solo en apertura, meta y cierre; violeta solo cuando habla el agente (Axi o Axel).

## 13. Tanda 3 · Captar y vender (aprobada el 2026-09-30)

Lienzo aprobado: https://claude.ai/artifact/UoGDRZeneinMckaYVDNrCW. El recorrido del hilo ya está en `thread-path.ts`, en escritorio y en móvil. Progreso de escena de 0 a 1; cada tramo va con `ease` cúbico de salida.

| Escena | Protagonista (`data-thread-target`) | Coreografía |
|---|---|---|
| Nicho | La notificación elegida | 0,04–0,54: las cuatro llegan desde el fondo (`translateZ` −320 → arco con `rotateY` 9/3/−3/−9°), una tras otra. 0,5–0,74: la elegida (la del nicho activo, o Tecnología por defecto) avanza 90 px en Z, se endereza y se vuelve blanca; las demás bajan a 0,4. 0,8–0,95: «O sigue bajando…». Tocar una tarjeta sigue eligiendo el nicho, como hoy. |
| Radar (fijada) | La ficha blanca de Andrés | 0–0,6: el barrido blanco da dos vueltas y los puntos aparecen al pasar. 0,28–0,48: los tres hallazgos. 0,48–0,56: el objetivo, con escala 2,4 → 1. 0,55–0,65: la línea guía hasta la ficha. 0,6–0,78: entra la ficha. 0,65–0,85: cuenta 88. 0,7–0,9: los ejes. 0,82–0,95: fuentes y «él escribió primero». Esfera con 60 marcas y 12 mayores, en SVG estático. |
| Seguimiento (fijada) | «Venta recuperada» (tarjeta blanca) | El hilo baja por la regla (x 52 %) y cada evento aparece cuando la cabeza pasa por su altura (`onHead`, o los mismos tramos del pin). Hay un tramo punteado «A la mañana siguiente» y el fondo se aclara hacia la mañana (0,3–0,9). |
| Foto | El producto exacto (tarjeta blanca que se levanta) | 0,14–0,46: el haz de escaneo baja por la captura, inclinada `rotateY` −16°. 0,46–0,56: la píldora «Reconocido». 0,55–0,72: el iPhone 17 sale del estante (`rotateX` 34°), sube 46 px y se enciende; el resto baja a 0,55. 0,8–0,92: la respuesta de Axi. |
| Llamada (**añadir a `PINNED`**) | La etapa «Cierre» y «Objetivo cumplido» | El hilo es la onda (barras en SVG estático, reveladas con un `clipPath` que sigue a la cabeza). Seis etapas en x 200/420/640/860/1080/1300 de 1440; se encienden al pasar la cabeza, igual que las cuatro líneas de la transcripción. El reloj cuenta hasta 02:14. |
| Bóveda | La etiqueta metálica | 0–0,4: la etiqueta se balancea, amortiguada, desde el ojal (16°). 0,34–0,44: «¿Me lo dejas en 4 millones?». 0,45–0,56: la etiqueta solo tiembla, porque el precio no cambia. 0,6–0,7: la respuesta con el cupón. 0,7–0,86: el cupón se imprime debajo con el total del sistema, $ 4.409.100. Las cuatro reglas van grabadas en la etiqueta. |
| Equipo | El portátil | 0–0,3: la tapa se abre (`rotateX` −76° → 6°, origen en la bisagra; la carcasa se ve hasta −40°). 0,32–0,4: llega la pregunta. 0,45–0,52: «Axi te la pasó», y el modo pasa a «En cola». 0,55: el modo pasa a «Contigo». 0,6–0,78: Laura escribe su respuesta. 0,86–0,9: se pulsa «Devolver a Axi». 0,9–0,97: «Volvió a Axi: sigue donde quedó» y el modo regresa a «Axi atiende». |

Reglas propias de esta tanda:
- El violeta queda solo en la marca de Axi (etiqueta de la transcripción, punto de «Axi atiende», brillo de la llamada, la píldora «Reconocido»).
- Todo lo demás va en tinta.
- En móvil no se fija ninguna escena: los momentos `pin` se ignoran y el hilo va por los márgenes (tablero «Móvil 390»).

## 14. El hero · A «Mil conversaciones, un hilo» (elegida el 2026-09-30)

Lienzo: https://claude.ai/artifact/JsezJ3BEVbLjquhaGxTQ5F (tablero «A · Mil conversaciones, un hilo» y «Móvil 390», columna A). La dueña descartó el hero actual: el gradiente WebGL con conversaciones flotando. Las direcciones B (eclipse) y C (primer mensaje) quedan descartadas.

**Idea.** Cada fibra es una conversación que entra por un borde. Todas convergen en un nudo bajo el CTA. Ahí se enciende la marca y nace el hilo que recorre la película. Rima con el cierre, donde las fibras se recogen en el isotipo.

**Sale del hero:** `HeroGradientLazy` (`BrandGradientCanvas`), `HeroSkyLazy`/`HeroSky` y `.film-hero-glow`. Se borran si no queda ningún consumidor; hay que comprobarlo con una búsqueda de importaciones. Así la home pierde el WebGL.

**Se queda, sin cambios de texto:** el `SiteHeader` original, el titular «Vende en / cada conversación.», el texto, el CTA coral «Prueba 7 días gratis», «Habla con nuestro agente →», «Sin tarjeta. Tu cuenta queda lista hoy.» y las cuatro cifras con su conteo.

**Iconos de las cifras (pedido de la dueña, 2026-09-30):** cada cifra conserva su icono de lucide, como en `HeroStats`: `Clock` (Atiende sin pausa), `Wrench` (Herramientas del agente), `MessagesSquare` (Canales) y `Gift` (De prueba, sin tarjeta). Van encima del número, a 22 px (`clamp(20px,2.4vw,26px)`), trazo 1,6, en tinta al 70 %. En móvil también, a 18 px.

**Maquetación (escritorio, 1440 × 900):**
- Fondo tinta.
- Titular en Nexa a 104 px (`clamp`), centrado, desde el 19 % del alto.
- CTA hacia el 55 %.
- Nudo en x 50 %, y 68 %.
- Cifras en y 87 %, en una sola fila de 4 × 230 px con filete superior de 1 px al 12 %.
- Entre la cifra 2 y la 3 queda un hueco de 120 px por donde baja el hilo.
- Un halo radial (coral al 10 % → violeta al 4 %) detrás del nudo.

**Maquetación (móvil, 390):**
- Titular a 46 px en tres líneas («Vende en / cada / conversación.»).
- CTA.
- Nudo en y 69 %.
- Cifras en 2 × 2, con un hueco central de 72 px para el hilo y etiquetas cortas.
- Sin fragmentos de texto en las fibras.

**Fibras (un solo `<canvas>` 2D detrás del texto, `aria-hidden`):**
- Cuántas: 56 en escritorio, 30 por debajo de 1024 px y 0 con movimiento reducido (en ese caso se dibuja una vez el fotograma final).
- Geometría pura en `domain/film/hero-fibers.ts`, con semilla determinista y tests:
  - cada fibra es una cuadrática desde un borde hasta el nudo;
  - en escritorio salen del borde izquierdo, del derecho, de abajo a la izquierda y de abajo a la derecha;
  - control = nudo + (origen − nudo) × (0,28–0,48), desplazado 60–150 px hacia abajo;
  - grosor 0,5–1,2 px;
  - blanco al 10–32 %.
- Cada fibra lleva una cabeza de luz (radial blanca de r 7) mientras viaja.
- Ocho fibras de los márgenes llevan una pregunta real, dos por nicho, sacadas de `FILM_CONTENT`: 12,5 px al 62 %, pegadas al borde (x 40 px). Aparecen cuando nace su fibra y se apagan antes de que llegue. Solo desde 1024 px.
- Nudo: radial blanco → ámbar → coral → violeta, con los colores leídos de los tokens (`--axi-brand`, `--axi-amber`, `--axi-violet`). Es uno de los tres momentos de color pleno, junto con la meta y el cierre.

**Coreografía.** La entrada va por tiempo, al cargar. La salida va por scroll. Equivalencia con el lienzo: su barra de 0 a 0,6 son 2,4 s de carga (p × 4 s), y de 0,62 a 1 es el scroll del hero.

| Tramo | Qué pasa |
|---|---|
| 0–0,4 s | Cabecera. Titular y texto con la entrada escalonada de siempre (`film-line`/`film-in`). |
| 0,4–0,9 s | Las cifras (conteo, como hoy). |
| 0,1–2 s | Las fibras nacen escalonadas: cada una arranca entre 0,1 y 0,9 s y tarda 1,2 s en llegar (`ease` cúbico de salida). |
| 1,4–2,1 s | El nudo se enciende: r 30 → 140 y el halo aparece. |
| 2–2,5 s | El hilo de la película sale del nudo y baja un 22 % de su tramo del hero. |
| Scroll 0 → 0,6 | El texto sube 140 px y se apaga. Las cifras se apagan hacia 0,45. |
| Scroll 0 → 0,65 | Las fibras se recogen en el nudo: se dibuja solo el tramo final y la cola avanza. |
| Scroll 0 → 1 | El nudo baja 330 px, encoge y cede el paso al hilo, que sigue hacia el nicho (anclas en `thread-path.ts`). |

La salida usa el `sceneTimeline` del hero (no se fija). Si el usuario hace scroll antes de que termine la entrada, la entrada salta a su final.

**Rendimiento:**
- `HeroFibers` se importa con `dynamic` después del primer pintado. El LCP sigue siendo el titular, que es HTML servido. Mientras llega el canvas, el fondo es tinta con el halo en CSS.
- `Path2D` en caché por fibra. DPR limitado a 2.
- `requestAnimationFrame` solo mientras dura la entrada o cambia el progreso de salida. Cero dibujado con el hero fuera de pantalla (`IntersectionObserver`).
- Presupuesto: la home debe quedar por debajo de los 199,3 kB actuales al quitar `BrandGradientCanvas` y `HeroSky`.

**Borrado seguro:**
- Todo vive en `ui/film/parts/HeroFibers.tsx` y `domain/film/hero-fibers.ts`.
- Quitar `<HeroFibersLazy />` de `opening.tsx` deja un hero tinta estático que funciona. El hilo no depende de él, porque sus anclas están en `thread-path.ts`.

**El hilo:** las anclas del hero ya están actualizadas en `thread-path.ts`:
- escritorio: `p(50,68,1)`, `p(50,88,1)`, `p(56,100,0.8)`;
- móvil: `p(50,69,1)`, `p(50,97,1)`, `p(60,100,0.8)`.

Se afinan en QA contra el nudo real: el nudo y la primera ancla deben coincidir a ±8 px en 390, 768, 1024 y 1440.

**Aceptación:**
- Cero errores de consola y sin scroll horizontal en los cuatro anchos.
- Con movimiento reducido se ve el fotograma final estático.
- Las preguntas no tocan el titular a 1024 px.
- El hilo pasa por el hueco de las cifras sin cruzar texto.
- La cabecera sin cambios; su corte a 1024 px está pendiente de la dueña.

**Orden:** va después del paso 2 (hilo + Lenis en window), porque necesita el hilo nuevo. No bloquea las tandas §11 y §13; se puede intercalar cuando el paso 2 esté listo.

## 15. El hilo de luz queda archivado (decisión de la dueña, 2026-09-30)

La dueña archiva el hilo de luz (§10, §11, §13, §14): «está generando o va a generar bastantes problemas». Se retoma cuando la página esté terminada, con un recorrido diseñado sobre las escenas ya construidas. Hasta entonces nadie diseña ni construye en función del hilo.

**Qué significa archivar:**
- `FILM_THREAD.enabled = false` en `thread-path.ts`. `createThread` devuelve NOOP: no hay canvas ni WebGL, y no se calcula nada por frame. Se enciende con una sola línea.
- El código se conserva tal cual: `ui/film/thread/`, `thread-geometry.ts`, `thread-path.ts` y sus tests. No se borra ni se sigue afinando: el tope por curvatura y la apertura separada del color, pedidos en el QA del paso 2, quedan congelados.
- Las anclas y los momentos `pin` de las tablas de §11, §13 y §14 quedan como referencia, no como contrato.
- `data-thread-target` se puede quedar en el DOM, porque es inerte. Nadie lo mueve más.

**Qué cambia en las escenas:**
- La coreografía de cada escena ya no espera a que llegue la cabeza del hilo. Cada tramo corre por su progreso de escena, con los mismos rangos de las tablas.
- Donde una tabla dice «cuando la cabeza pasa…», se usa ese mismo rango del pin.
- Seguimiento: los eventos aparecen por su tramo del pin. La regla vertical (x 52 %) se dibuja como línea propia, de 1 px blanco al 25 %, y se revela con el progreso.
- Llamada: la onda se revela con el progreso del pin (`clipPath`), no con la cabeza.
- Hero A (§14): las fibras y el nudo se quedan. Del nudo ya no nace el hilo: en la salida, el nudo baja, encoge y se apaga.
- Meta: la ruta blanca del mapa es un trazo propio de la escena (lienzo «Landing · La meta»), no el hilo.
- Cierre: el isotipo se arma con sus propias fibras. Se diseña en la tanda 4.

**Presupuesto:** el hilo va en el chunk diferido del motor. Con el hilo apagado, `thread-gl` (el renderer) debe cargarse con `import()` solo si `enabled`, para que no pese. Si hoy se importa de forma estática, pasarlo a dinámico (tarea de axi-14).

## 16. Tanda 4 · La meta, precios, preguntas y cierre (aprobada el 2026-09-30)

Lienzos aprobados por la dueña («aprobado todo, me encanta»):
- La meta: https://claude.ai/artifact/BHNrvKryyFQrBHqRLdA9nF
- Precios, preguntas y cierre: https://claude.ai/artifact/KH9Qcs6qZJ87hxdRoZ6nq8

El hilo está archivado (§15): nada de esta tanda depende de él. Los progresos van de 0 a 1 y cada tramo usa `ease` cúbico de salida, salvo donde se indica otra cosa.

### 16.1 La meta (fijada en escritorio; sigue en `PINNED`)

**Qué es:** una navegación nocturna en tinta hacia la meta del mes. Reemplaza el mapa plano actual de `GoalScene`.

**Mundo.** Un plano de 2400 × 1500 con una ciudad en rejilla:
- manzanas de 82 px en celdas de 100, con rx 8, relleno blanco al 2,2 %, filete al 5,5 % y alrededor de un 5 % de parques al 4,5 %;
- un río: una banda de 90 px al 3,5 %;
- un viñeteado radial hacia el fondo.

Todo en un solo SVG estático, sin nada por frame.

**Ruta.** Va por los ejes de las calles, con esquinas redondeadas (r 46):
- puntos (291,1391) → (291,1091) → (691,1091) → (691,891) → (1091,891) → (1091,691) → (1491,691) → (1491,491) → (1891,491) → (1891,291) → (2191,291);
- geometría pura en `domain/film/route-map.ts`, que sustituye la carretera actual: muestreo por longitud y `slice(a,b)` para los tramos, con tests;
- las fracciones y cifras siguen saliendo de `route-scenario.ts` (63 % recorrido, 71,7 % esperado, 82 % proyectado y 91 % con la ruta de Axi), así que cuadran por nicho.

**Capas de la ruta:**
- carril de 30 px al 7 %;
- plan punteado (1 13) al 32 %;
- recorrido en blanco de 8 px más un brillo de 20 px desenfocado;
- tramo lento en gris `#8e8e96`, punteado (2 12);
- proyección blanca discontinua (10 12);
- ruta de Axi en violeta de 7 px con brillo, que pasa a blanco al aprobarla.

Cada capa es su propio `<path>`. El avance se hace con `stroke-dasharray` sobre `pathLength=1`, nunca regenerando la `d` en cada frame. El lienzo usa `slice` solo por comodidad.

**Cámara.** Un solo `transform` sobre el plano, con `perspective: 1300px` en el contenedor y `transform-origin: 0 0`:
`translate(foco) rotateX(inclinación) rotateZ(giro) scale(s) translate(−centro)`.
- Foco en escritorio: (600, 600). El centro sigue al coche.
- Las marcas HTML (coche, «Vas aquí», anillos, bandera, etiquetas) se proyectan con la misma matriz: función pura `project(cam, punto)` con tests. Así quedan de frente y no se tuercen.

**Coreografía (progreso del pin):**

| Tramo | Cámara | Qué pasa |
|---|---|---|
| 0–0,12 | inclinación 0 → 52°, escala 0,42 → 1, giro 0 → −7°, del centro del mapa a la salida | Aparecen el titular y el panel (0,08–0,2). «Salida · 1 oct». |
| 0,12–0,5 | sigue al coche (escala 1, 52°) | El coche va de 0 a 63 % (`ease` cúbico de entrada y salida). El recorrido blanco se dibuja detrás. «Vas aquí» cuenta de $ 0 a $ 18,9 M · 63 %, y la barra del panel avanza igual. El coche apunta en la dirección de la ruta proyectada. |
| 0,5–0,58 | fija | Tramo lento gris hasta 71,7 %, con el anillo gris «Tramo lento · vas $ 2,6 M por debajo». En el panel se enciende «Ritmo bajo». |
| 0,6–0,72 | se aleja: escala 0,66, 42°, centro al 62 % entre el coche y el 80 % de la ruta | Proyección discontinua hasta 82 %, con el anillo y la etiqueta blanca «82 % · Si sigues así llegas a $ 24,6 M». Aparece la bandera «Meta · $ 30 M». Entra la opción «Seguir al ritmo de hoy · 82 %». |
| 0,7–0,8 | fija | Habla Axi (violeta): píldora «Axi recalculó tu ruta» junto al coche y ruta violeta hasta 91 %. En el panel entra «Retomar 14 cotizaciones frías · 91 %» con borde violeta y «Aprobar ruta». |
| 0,82–0,84 | — | El botón se hunde (escala 0,94). |
| 0,84–0,9 | — | Aprobada: la ruta violeta pasa a blanca, el anillo va de 82 % a 91 % y la etiqueta cambia a «Con la ruta de Axi llegas a $ 27,3 M». El botón queda en «Ruta aprobada ✓». |
| 0,92–0,97 | — | Se apaga la píldora. |

**Panel** (derecha, 360 px, tinta):
- «Destino · octubre / Vender $ 30.000.000» y la píldora «Ritmo bajo» punteada, en gris y no ámbar.
- La maniobra en una tarjeta blanca: icono de giro, «Cierra 2 ventas hoy» y «Faltan $ 11,1 M en 6 días hábiles».
- «Luego: envía 5 cotizaciones · agenda 3 entregas».
- La barra del mes, con relleno blanco, tramo lento punteado y el anillo de llegada, y debajo «Vas en … / Llegada estimada …».
- «Rutas · las prepara Axi» y la nota «Axi propone; tú apruebas».
- Todos los textos salen de `film-content` (`route`) por nicho.

**Colores:** el coral solo en el coche. El violeta solo mientras Axi propone. Todo lo demás, en tinta.

**Móvil** (no se fija):
- Franja de mapa de 390 × 430 entre el titular y el panel. Foco (170, 250), el mismo mundo y la misma cámara.
- La línea va de la escena en «top 70 %» a «bottom top», con los mismos tramos.
- Panel compacto: la maniobra, la barra y la ruta de Axi con su botón. Sin «Tramo lento» ni «Salida».

**Rendimiento:**
- Por frame solo cambian un `transform` en el plano, `stroke-dasharray` en cinco trazados y unas diez marcas con `transform`.
- La cifra se escribe con `setText` solo cuando cambia.
- Nada de `getPointAtLength` por frame: los puntos salen de la tabla muestreada.

### 16.2 Precios (sin fijar; se compara y se lee)

Se mantiene `PricingPlans` (lo comparte `/precios`: no romperlo). Para la película se le añade una variante visual, sin tocar datos ni lógica:
- Tarjetas en tinta (`#161618` → `#111113`, filete al 10 %, r 28).
- Crecimiento («Más elegido») va invertido en blanco, con la píldora negra y el CTA negro. Las otras dos llevan CTA blanco. En precios no hay coral.
- Cada tarjeta, en este orden: nombre (Nexa 22), frase, precio (Nexa 46, cifras tabulares) con «COP/mes», la nota del periodo, la caja de volumen con el icono de conversaciones («**500** conversaciones al mes»), «Todo lo de X, y además», viñetas con check, CTA «Comienza tus 7 días gratis» y el microtexto.
- Selector Mensual/Anual en píldora, con la opción activa en blanco y la insignia «1 mes gratis». En anual: el precio mensual equivalente y «Pagas $ X al año · 1 mes gratis». Las cifras y los tramos siguen saliendo del catálogo.
- Enterprise va en una franja aparte: «Desde $ 2.900.000 COP/mes · Hablar con ventas». Debajo: «No cobramos por usuario…».
- Entrada, una sola vez con `IntersectionObserver` y sin scrub: titular (0–0,3); tarjetas escalonadas cada 0,12, subiendo de y 48 a 0; la recomendada se eleva 14 px al final. Con movimiento reducido, todo en su sitio.

### 16.3 Preguntas (sin fijar)

- Dos columnas: 400 px a la izquierda y el resto a la derecha.
- Izquierda:
  - «Lo que nos / preguntan.»;
  - el texto;
  - botón blanco «Pregúntale a nuestro agente», con icono de WhatsApp y `salesWhatsAppUrl`;
  - «Axi atiende ahora · responde en segundos», con un punto violeta. Es la voz del agente.
- Derecha:
  - lista con filetes al 10 %, número 01–09 tabular al 40 %, pregunta de 17 px y un botón circular más/menos que se invierte a blanco al abrirse;
  - se sigue usando `<details>` nativo, sin JS, con el texto en el HTML y el JSON-LD FAQPage;
  - los textos son los de `FAQ` en `landing.content.ts` (el lienzo resume algunas respuestas; manda el contenido real);
  - la primera va abierta.

### 16.4 Cierre (sin fijar; scrub desde «top 80 %» hasta «center center»)

| Tramo | Qué pasa |
|---|---|
| 0–0,38 | Las tres cintas del isotipo se dibujan con un trazo blanco de 2 px (`pathLength=1`), escalonadas: coral 0–0,3, violeta 0,06–0,34 y ámbar 0,12–0,38. El isotipo escala de 0,92 a 1. |
| 0,3–0,54 | Se llenan con sus degradados (`BrandMark`: coral 0,3, violeta 0,35 y ámbar 0,4) y el trazo se apaga. |
| 0,4–0,7 | Florece: un halo radial coral → violeta → ámbar, desenfocado 40 px, que escala de 0,7 a 1. |
| 0,5–0,72 | «Tu próxima venta» (0,5) y «ya está escribiendo.» (0,58) suben 26 px. |
| 0,68–0,78 | Burbuja «Andrés está escribiendo», con avatar AG y tres puntos que parpadean. El nombre sale del nicho (`FILM_CONTENT[n].chat`). |
| 0,8–0,92 | CTA coral «Prueba 7 días gratis», «Habla con nuestro agente» y «Sin tarjeta…». |

- Es el único momento de color pleno.
- `BrandMark` necesita que cada cinta se pueda dibujar: ya tiene `data-ribbon`, así que se le pasa el trazo por CSS (`stroke`, `stroke-dasharray` y `fill-opacity` por cinta). No se duplican los paths.
- Móvil: el isotipo a 160 px, titular de 42 px y CTAs a todo lo ancho, con la misma línea.

### 16.5 Cabecera a 1024 px (aprobada con la tanda)

Entre `lg` y 1200 px la cabecera cabía mal: el logo, «Iniciar sesión» y el CTA se partían. En ese rango:
- el selector de tema se oculta solo donde la cabecera es oscura forzada (la home), porque allí no tiene efecto; en el resto de páginas se queda (ajuste del 2026-09-30: no hay desplegable propio en ese rango y no se añade una segunda hamburguesa);
- el CTA dice «Prueba gratis»;
- el logo e «Iniciar sesión» llevan `whitespace-nowrap`.

Por encima de 1200 px y en móvil queda igual. Es el único cambio permitido en el nav.

### 16.6 Orden de construcción

hero A (§14) → §11 (cobrar, ordenar, Axel y medir) → §13 (tanda 3) → §16 (meta, precios, preguntas, cierre y cabecera).

Después de cada paso, QA de axi-13 a 390, 768, 1024 y 1440 px.

## 17. Reparto con dos constructores (2026-09-30)

La dueña pidió acelerar. axi-2e (antes axi-13) coordina y hace QA; dos constructores trabajan en el mismo worktree y rama, sin fusiones:

| Constructor | Carril | Archivos suyos |
|---|---|---|
| `cinematic-film-landing-page` | §11 (cobrar, ordenar, Axel, medir) → §13 (tanda 3) | `engine/film-engine.ts`, `film.css`, `FilmPage.tsx`, `film-content.ts`, `opening.tsx`, `capture.tsx`, `sell.tsx`, `grow.tsx`, `collect/pipeline/axel/measure.tsx` |
| `2-cinematic-film-landing-page` | §16 (cabecera → precios → preguntas → cierre → meta) | `layout/site/*`, `PricingPlans.tsx`, `after.tsx`, `brand-mark.tsx`, `scenes/goal.tsx`, `scenes/close.tsx`, `engine/goal-scene.ts`, `engine/close-scene.ts`, `film-tanda4.css`, `domain/film/route-map.ts`, `goal-camera.ts`, `goal-content.ts` y sus tests |

- Un archivo tiene un solo dueño a la vez. Lo que cruza (registrar un builder en `SCENES`, importar `film-tanda4.css`, cambiar `GoalScene`/`CloseScene` en `FilmPage`) lo hace el dueño, o este cede el archivo de forma explícita.
- Commits con rutas explícitas. Las tareas pesadas (typecheck, jest) se avisan entre ellos: una a la vez.
- QA de axi-2e tras cada commit a 390, 768, 1024 y 1440 px.

### 17.1 Ajustes de construcción validados por axi-2e (2026-09-30)

- La meta en móvil empieza su línea en «top 40 %» y no en «top 70 %» (§16.1). Con 70 % el coche arrancaba bajo el pliegue.
- Escenas sin pin: el fotograma final llega con la escena entera en pantalla («top 85 %» → «center 50 %»; en móvil, «top 80 %» → «bottom 95 %»).
- Riel de capítulos: por debajo de 1536 px solo puntos y línea.
- Precios en la película: «Programa fundadores» en tinta, con el envoltorio `.film-founders`. `/precios` no cambia.
- Sin grano feTurbulence en ninguna escena: rendimiento antes que textura.
- SEO de `/`: el title es «Axi Connect · Vende en cada conversación», la description es el lead del hero y la imagen OG se genera con next/og en tinta.

### 17.2 Borrado seguro, auditado (D12, 2026-09-30)

Verificado de verdad con Axel, en un worktree temporal desde e51d1a25:
- se tocaron solo FilmPage (import y JSX), el builder y la entrada en `SCENES`, `PINNED` en `film-kit.ts` y `git rm` de la escena;
- typecheck, lint y jest de landing quedaron en verde.

El motor solo construye las secciones que encuentra, así que lo demás queda inerte: el CSS de la escena, sus campos de contenido y sus anclas del hilo.

Avisos por escena (además de FilmPage y `SCENES`):
- **Capítulos del riel.** Radar (Captar), chat (Vender), cobrar (Cobrar) y meta (Crecer) llevan `data-chapter`. Si se quita una de estas escenas, hay que mover su capítulo a otra o quitarlo de `TICKS` en FilmRoot.
- **Nicho.** Es el destino de «Cambiar» en la píldora (`goTo("#quien")`).
- **Chat.** Es `#vender`, el destino al elegir nicho.
- **Axel.** `film.test` cuadra `axel.proposals` con la meta.
- **Medir.** `parseFigure` de `funnel-fibers.ts` lo usan también cobrar y ordenar.
- **Meta.** El hilo archivado usa `roadPointAt`, `MAP_WIDTH` y `MAP_HEIGHT` de `route-map.ts`.
- **Precios, preguntas y cierre.** Hay enlaces externos que dependen de `/#planes`, `/#preguntas` y `#demo`.
- **Módulos transversales** (no se borran con ninguna escena): `film-kit`, `ByNiche`, `SceneHead`, `FilmCta`, `film-icons`, `niches.ts` y `film-content.ts`.

## 18. Nav en isla y «Vendemos progreso» (aprobados el 2026-09-30)

Lienzo: https://claude.ai/artifact/KypEd4KaAAzxuNh6kN4ReK (Main, Menu, Mobile, Philosophy y PhilosophyMobile). Aprobado por la dueña («aprobado el lienzo del nav… de resto aprobado»), con un pedido: las tres piezas del isotipo, fieles y ultra premium. Este nav sustituye lo de §16.5.

### 18.1 El nav (construye `2-cinematic-film-landing-page`)

**Barra (escritorio, ≥ lg).** Barra de cristal centrada: 1000 px de máximo, 64 px de alto, a 22 px del borde. Lleva logo, tres menús por intención, Precios, «Iniciar sesión» y el CTA coral.

| Menú | Pilar | Promesa | Color del punto |
|---|---|---|---|
| «Vender y cobrar» | Prosperidad | más ingresos, menos costos | coral |
| «Crecer» | Crecimiento | más alcance, más clientes | ámbar |
| «Atender» | Libertad | más tiempo, menos carga | violeta |

**Isla.** Pasados unos 120 px de scroll, la barra se vuelve isla: 452 × 52, a 16 px del borde.
- Contenido: isotipo, anillo de progreso, capítulo y «Capítulo n de 4», botón de menú y «Prueba gratis».
- El cambio se anima solo con `transform` y `opacity`.
- En la home la alimentan dos eventos de FilmRoot:
  - `film:chapter` con `{chapter, index, total, progress}`;
  - `film:activity` con `{title, detail}`: la isla crece 58 px durante 3 s y muestra el aviso.
- Fuera de la home muestra el nombre de la página y el progreso de lectura.

**Panel de menú.**
- Izquierda: «¿Qué quieres hacer?» con las tres intenciones.
- Centro: las tarjetas de la intención elegida.
- Derecha: «Por tipo de negocio» y «Conecta».
- Abajo: los 7 días de prueba, «Escríbenos» por WhatsApp y el CTA.
- Casos e Integraciones bajan a la columna lateral.

**Tema.** En escritorio, una píldora vertical de cristal fija en el borde derecho; en la home no se muestra. En móvil va dentro de la hoja.

**Móvil.**
- Isla fija con isotipo, «axi connect», «Prueba gratis» y menú.
- El menú se abre como hoja de cristal con acordeones por intención, enlaces, «Iniciar sesión», el selector de tema y el CTA.
- Foco atrapado; Esc cierra.

**Cristal.**
- Es una excepción a la regla de no usar `backdrop-filter`, válida solo en la isla, el panel y la hoja.
- Valores: `blur(22px) saturate(1.7)`, fondo blanco del 13 al 4,5 %, filete al 16 % y brillo interior.
- Si el navegador no soporta `backdrop-filter`, o con `prefers-reduced-transparency`, va sólido: `#141416` al 92 %.

### 18.2 «Vendemos progreso» (construye `cinematic-film-landing-page`)

Escena `philosophy` con el id `progreso`. Va entre el hero y el nicho.
- **Escritorio:** fijada. El scroll mueve una pista horizontal de 3300 px: la intro y tres pilares de 1100 px.
- **Parallax:** las palabras gigantes van al 0,6x, el texto al 1x y las piezas al 1,22x.
- **Móvil:** tarjetas con `scroll-snap`.
- **Textos:** los del lienzo, tal cual.

**Las piezas** (lo que pidió la dueña):
- Cada cinta usa el path EXACTO de `BRAND_RIBBONS`, a escala uniforme, en un encuadre ceñido a su caja. Nunca se rota, se inclina ni se deforma.
- **Desarme.** El isotipo se arma con las tres cintas en un mismo encuadre. Entre 0,03 y 0,14 del progreso se separan solo con `translate`, en la dirección natural de cada una:
  - coral, (−58, 16);
  - violeta, (52, −30);
  - ámbar, (62, 22).
- Debajo aparece «Tres piezas · un solo sistema».
- **Material** (todo estático; con el scroll solo se mueve el `translateX` del grupo):
  - el degradado de marca;
  - una luz cenital: la misma forma con un degradado blanco del 34 % arriba a 0 en el 60 %;
  - un filete blanco al 22 %, de 1 px, con `vector-effect: non-scaling-stroke`.
- **Escenario:**
  - la pieza flota 24 px sobre una línea de suelo (un degradado de 1 px al 14 %);
  - debajo, una sombra de contacto elíptica (negro al 80 %, del 78 % del ancho de la pieza);
  - un halo del color del pilar al 19 %, sin `filter`;
  - un reflejo invertido al 14 %, con máscara que se apaga al 42 %;
  - la leyenda «PIEZA 01 · CORAL».
- **Asignación:** Prosperidad = coral, Crecimiento = ámbar, Libertad = violeta.

## 19. Fase F6 · El piloto automático de captación (propuesta del 2026-09-30, pendiente de lienzo)

Pedido del dueño: que la película muestre el **piloto automático de captación**, «así de dinámico como el mapa de comercial», con un avión o una ruta aérea. Fuente de verdad del producto: servidor `integ/pilot-server` (2b94d08d) y cliente `integ/pilot-client` (09899767; cabeza actual 2cb17f3d, con la errata del RNE corregida), certificados por axi-ad. Plan del producto: `axi/docs/plans/autopilot_captacion_plan.md`. Vocabulario y límites confirmados por axi-ad el 2026-09-30, citando el código.

Lienzos del producto que sirven de referencia:
- canvas P0 del piloto (17 tableros: Recorrido, EnVivo, Trayecto, Decisor, Créditos, Política, Lenguaje…): https://claude.ai/artifact/HT2EbEhcUFuzNK6BZuUFEW, fuente en `docs/design/mockups/captacion-piloto/`;
- ficha P6: https://claude.ai/artifact/6Js5mCWFT2MN4u5amoBq5x (`docs/design/mockups/pilotos-panel`);
- «Axi propone»: https://claude.ai/artifact/DVH69tX1Gj9XEmwMEm8xPt (`docs/design/mockups/pilotos-propone`).

En el producto, el «Trayecto de la ejecución» ya es una línea de ruta (la `RouteLine` de Comercial). La ruta aérea es su versión de película, con los seis pasos como escalas.

> **Bloqueo de publicación.** La escena se construye en esta rama, pero **no se publica antes de que el piloto llegue a producción**: la landing no muestra nada 🚧 (D11). Si la landing sale antes, la escena queda fuera de `FilmPage` (es el borrado seguro de §17.2: FilmPage, `SCENES` y `PINNED`).

### 19.1 Dónde va y qué cuenta

- **Lugar:** escena `pilot`, id `#piloto`, entre el Radar y el Seguimiento: `RadarScene → PilotScene → FollowupScene`. Sigue en el capítulo «Captar» (no lleva `data-chapter` propio).
- **Continuidad:** el Radar es la **torre de control**. Encuentra y califica. El piloto es el **vuelo**: lleva a esa cuenta, paso a paso, hasta la demo.
- **Titular:** «Pon tu captación en **piloto automático**.» (Nexa 200 + 700).
- **Bajada:** «Tú eliges cómo vuela: Asistido, apruebas cada lote; Autónomo, siempre dentro de tu política y tus topes.»
- **Principio que se cita** (plan del piloto §7): «Si no aumenta la relevancia, la confianza o la claridad, no se envía.»

### 19.2 El objeto protagonista: una carta de navegación aérea nocturna

Es la hermana de la meta (§16.1): la misma tinta, la misma cámara en perspectiva y la misma manera de avanzar con `stroke-dasharray`. Pero no es una ciudad en rejilla, es **el paisaje visto desde el aire**:

- **Mundo** (un SVG estático de 2400 × 1500):
  - **curvas de nivel** del terreno (6–8 contornos orgánicos de 1 px al 6 %, es la «naturaleza que computa»);
  - un río en banda de 70 px al 3 %;
  - **luces de pueblos** como puntos de 2–3 px al 18–40 %;
  - una retícula de longitud y latitud cada 300 px al 3 %;
  - un viñeteado radial.
  - Nada se recalcula por frame.
- **La aerovía:** un arco suave con seis **fijos de navegación**, triángulos de 14 px con su etiqueta en mayúsculas espaciadas. Son los seis pasos del piloto:
  1. `BUSCAR` · 2. `COMPLETAR DATOS` · 3. `CALIFICAR Y REVELAR` · 4. `PASAR AL CRM` · 5. `REVISAR LA POLÍTICA` · 6. `INSCRIBIR EN LA SECUENCIA`
  - Termina en el **aeropuerto de destino**: «Demo agendada».
- **Espacio aéreo restringido:** un polígono rayado a 45° (filete discontinuo al 22 %) que la ruta **rodea**. Es la política de contacto: «Lo que se respeta siempre». La etiqueta dice «Fuera de horario hábil» y, al pasar, «Bajas · lista de supresión · Registro de Números Excluidos». **No se nombra la Ley 2300** ni se dice «cumple»: en la UI es «Criterio prudente adoptado» y el servidor la tiene en `pending_legal_review`.
- **El avión:** una silueta blanca de 26 px vista desde arriba, que apunta en la tangente de la ruta. **Es el único elemento sólido.** Detrás va su estela: un trazo blanco de 3 px que se apaga en degradado.
- **Torre de control:** abajo a la izquierda, el anillo del radar de la escena anterior, en miniatura (el mismo dibujo, al 30 %). De él sale la ruta.

**Colores** (regla de la tinta): todo en blanco y grises. El violeta aparece **solo** cuando Axi propone el «Ajuste del piloto». El coral no aparece (la marca solo va en apertura, meta y cierre).

### 19.3 El panel: la cabina (derecha, 360 px, tinta)

De arriba a abajo:

1. **Cabecera:** «Ejecución del piloto» y un **conmutador** «Asistido | Autónomo» en píldora. En la película queda en **Asistido** (la opción activa en blanco), con su frase debajo: «Te pide aprobar el lote antes de escribirle a nadie.»
2. **Instrumentos:**
   - «Paso **3 de 6** · Calificar y revelar», que cambia con el avión;
   - los contadores en vivo «encontró / calificó / contactó»;
   - el medidor «**Dentro del tope**», una barra blanca;
   - el estado de la ejecución, con el vocabulario de la UI: «En ejecución» → «**Espera tu aprobación**» → «En ejecución» → «Terminada».
3. **Tablero de llegadas** («Cuentas por etapa», como el de un aeropuerto): cinco cuentas con su etapa. Las etapas cambian una por una con un **volteo de paleta** (`rotateX` de la fila, solo `transform`). Vocabulario de la UI: Buscando · Completando datos · Calificando · Contactando · En seguimiento · Respondió · Demo agendada · Descartado. **Una fila termina en «Descartado»**: es honestidad, no todas las cuentas aterrizan.
4. **El lote** (como en `RunLiveView.tsx:376` de `integ/pilot-client`): la tarjeta «El lote espera tu aprobación» con cinco casillas, cada una con la etiqueta «Aprobar <nombre de la cuenta>». Cuatro van marcadas. El botón dice «**Aprobar 4 y contactar**» (en blanco, `contrast`) y al lado, en pequeño, «1 se omiten». N y M salen de las casillas, no se escriben a mano. Mientras espera, «Ejecutar ahora» va deshabilitado con su motivo.
5. Pie: «Ver en vivo · Bitácora de la ejecución» (texto, no enlace: la landing no lleva al panel).

### 19.4 Coreografía (progreso del pin)

Escena **fijada** en escritorio (`PINNED`), con una longitud parecida a la de la meta (`sceneTimeline` 3,2 aprox.; se ajusta con `PACE`).

| Tramo | Cámara | Qué pasa |
|---|---|---|
| 0–0,1 | Desde arriba (inclinación 0°, escala 0,45) sobre la torre | El radar en miniatura da un barrido y un punto se enciende: es la cuenta del Radar. Entran el titular y la cabina. |
| 0,1–0,3 | Inclinación 0 → 48°, escala 0,45 → 1, giro −6°. La cámara se pone detrás del avión | **Despegue:** el avión sale de la torre. Se dibuja la estela. Fijos 1 y 2 (`BUSCAR`, `COMPLETAR DATOS`) se encienden al pasar (el triángulo se rellena de blanco). En el tablero, dos filas voltean a «Completando datos». |
| 0,2–0,3 | — | En el fijo 1 se encienden las fuentes como balizas: «Google Maps · RUES abierto · Buscador web». Apollo no se muestra como fuente estrella. |
| 0,3–0,42 | Sigue al avión | Fijo 3 `CALIFICAR Y REVELAR`: una tarjeta sale del fijo con una línea guía: «Personas de este negocio · quién decide, quién recomienda, quién usa» y «Marta Restrepo · Directora de compras» (el decisor del Radar en B2B). |
| 0,42–0,52 | Sigue al avión | La ruta **rodea el espacio restringido**. La etiqueta «Fuera de horario hábil» se enciende al acercarse y se apaga al pasar. |
| 0,52–0,64 | Se aleja un poco (escala 0,8) | **Espera:** en el fijo 5 `REVISAR LA POLÍTICA` el avión entra en un **circuito de espera** (un óvalo de 120 × 60 px que recorre una vez). En la cabina: «Espera tu aprobación» y «El lote espera tu aprobación». |
| 0,64–0,68 | Fija | «Aprobar 4 y contactar» se hunde (escala 0,94). La cuenta omitida se apaga en el tablero y el estado vuelve a «En ejecución». |
| 0,68–0,82 | Sigue al avión | Sale del circuito hacia el fijo 6 `INSCRIBIR EN LA SECUENCIA`. Los canales se encienden en la cabina: «Correo · Llamada del agente · SMS». Sobre la ruta aparece una burbuja del primer mensaje con la **franqueza del agente**: «Tu empresa aparece en información pública de negocios». Es el agente diciendo de dónde salió el contacto, contado como franqueza y no como argumento legal. El tablero voltea: «Contactando» → «En seguimiento» → «Respondió», y una fila a «Descartado». |
| 0,82–0,9 | Desciende: inclinación 48 → 30°, escala 1,15 | **Aterrizaje** en «Demo agendada». La última fila del tablero voltea a «**Demo agendada**». |
| 0,9–1 | Se aleja a toda la ruta (escala 0,55) | **Aterrizó:** la ficha «Lo que trajeron los pilotos · octubre» sube sobre el mapa con su «Embudo del mes» (Encontradas → Calificadas → Contactadas → Respondieron → Demos), solo conteos y rotulado «Cifras de ejemplo». Habla Axi (violeta): «Ajuste del piloto», con «Con los números de tus pilotos, sin inventar nada» y una sola línea de «Qué cambia si lo aplicas» (por ejemplo, «Horario»). El estado pasa a «Terminada». |

Cada tramo usa `ease` cúbico de salida, salvo el vuelo (entrada y salida), como en la meta.

### 19.5 Contenido por nicho (`domain/film`, a validar con el dueño)

El piloto busca **empresas**. En los nichos de consumo, el Radar muestra leads de anuncios, así que aquí el piloto cuenta el lado B2B de ese mismo negocio:

| Nicho | Destino del piloto (lo que busca) | Ejemplo en el tablero |
|---|---|---|
| Restaurantes | Empresas cercanas para almuerzos corporativos (empalma con «30 almuerzos confirmados» de la llamada) | 5 oficinas de la zona |
| Tecnología | Empresas que renuevan equipos | 5 pymes |
| Salud y belleza | Empresas con plan de bienestar para su equipo | 5 empresas |
| Servicios y B2B | Su cliente ideal; el decisor del Radar (Clínica Santa Fe · Marta Restrepo) | 5 cuentas |

Las cifras de ejemplo deben cuadrar entre sí y en cada nicho (test como `film.test`): `encontradas ≥ calificadas ≥ contactadas ≥ respondieron ≥ demos`, y el tope del día mayor o igual que los contactados. **No se muestra ningún porcentaje de conversión.**

### 19.6 Límites honestos (lo que la escena no dice)

- **WhatsApp:** en el producto existe «Plantilla aprobada; sin opt-in solo si tu política lo permite». La escena no lo dibuja, para no sugerir que escribe a cualquiera. Los canales que se ven son «Correo · Llamada del agente · SMS».
- Instagram, LinkedIn y la visita son «Tarea manual»: no se dibujan como envío automático.
- **Nunca «contacta sin permiso»:** en Asistido no sale nada sin aprobación, y siempre se respetan la baja, el habeas data, la lista de supresión, el Registro de Números Excluidos, el horario y el tope diario.
- **Ley 2300:** no se nombra ni se dice que se cumple (`pending_legal_review`).
- **Apollo:** buscar no gasta créditos y revelar sí, con la llave del negocio; el spike pagado sigue pendiente. La escena no habla de Apollo ni de créditos.
- Ningún porcentaje de conversión ni «X demos garantizadas»: la ficha muestra conteos.
- No existe la página de diagnóstico ni ningún canal fuera de la lista.
- Las reglas fijas («Estas reglas no tienen interruptor») se muestran como espacio restringido, nunca como algo que se apaga.
- El nombre del registro es «Registro de Números Excluidos (RNE)». Quedó corregido en `integ/pilot-client` 2cb17f3d, que sustituye a 09899767 como cabeza del cliente.

### 19.7 Arquitectura (sigue §5 y §17.2)

- **Dominio puro y con tests:**
  - `domain/film/flight-route.ts`: la aerovía, sus fijos, el circuito de espera y el polígono restringido. Muestreo por longitud con la misma utilidad de `route-map.ts`, sin duplicarla: se extrae a un módulo común si hace falta.
  - `domain/film/pilot-content.ts`: los textos por nicho y el vocabulario de la UI del piloto.
- **Cámara:** se reutiliza `goal-camera.ts`: `project`, `planeTransform`, `seg` y las curvas. Si hace falta parametrizar la ruta o el foco, se generaliza; no se copia.
- **Escena:** `scenes/pilot.tsx` (Server Component, fotograma final en el HTML) y `engine/pilot-scene.ts` (builder en `SCENES`). Estilos en `film-pilot.css`, **con tokens o variables del alcance de la película**, sin hex sueltos (la revisión de diseño del 2026-09-30 ya marcó ese defecto en `film-sell.css` y `film-tanda4.css`).
- **Rendimiento** (como §16.1): por frame solo cambian un `transform` del plano, el `stroke-dasharray` de dos trazos (estela y ruta recorrida), el `transform` del avión y unas diez marcas. Las etapas del tablero se escriben con `setText` solo cuando cambian. Nada de `getPointAtLength` por frame. Sin `filter` ni `backdrop-filter`. Presupuesto: `/` ≤ 200 kB.
- **Movimiento reducido:** el fotograma final (avión aterrizado, tablero completo, ficha de resultados y ajuste propuesto).
- **Móvil** (no se fija): franja de mapa de 390 × 430 entre el titular y una cabina compacta (paso, tope, tablero de tres filas y botón). La misma línea que la meta en móvil («top 40 %»).
- **Accesibilidad:** el mapa es decorativo (`aria-hidden`); la cabina lleva el texto real. El tablero no lleva `aria-live`.

### 19.8 Orden de trabajo

1. **Lienzo** (mockup HTML con barra de scroll, escritorio y 390) → aprobación del dueño. Regla del proyecto: no se codifica sin lienzo aprobado.
2. Dominio (`flight-route.ts`, `pilot-content.ts`) con tests.
3. Escena, builder y CSS; QA a 390, 768, 1024 y 1440.
4. Auditoría y certificación de axi-ad (calidad, experiencia y salud de datos) antes de fusionar. Lo que axi-ad medirá en la escena:
   - 375, 390, 768 y 1280 px, en claro y oscuro, sin scroll horizontal ni nada recortado;
   - el scroll se recorre de ida y de vuelta, y el último fotograma se lee completo sin animación;
   - `prefers-reduced-motion`: el estado final, sin movimiento;
   - solo `transform` y `opacity`, sin layout por frame ni long tasks, y un LCP que no empeore frente a la landing actual;
   - contraste AA en las etiquetas sobre el mapa y los degradados;
   - cada texto contra el vocabulario de §19.3–§19.4, palabra por palabra, y ninguna promesa de §19.6;
   - accesibilidad: `aria-label` en la escena y su texto también en el DOM.
5. Se publica solo cuando el piloto esté en producción (bloqueo de §19).

### 19.9 Lienzo aprobado y construcción (2026-10-01)

- Lienzo: https://claude.ai/artifact/2zaACPdErU4EU6Gvaong1Y (Main, Mobile, Frames). Lo aprobó la dueña con la cabina en instrumentos:
  - tres relojes (encontró, calificó y contactó, sobre lo encontrado);
  - una pantalla de ruta con el paso y el siguiente;
  - tres testigos con el vocabulario de la UI;
  - «Dentro del tope» como medidor de combustible de 20 segmentos.
- Todo va en blanco sobre tinta. IBM Plex Mono solo en cifras y en la pantalla de ruta.
- Construye `cinematic-film-landing-page`. La escena estuvo apagada (`FILM_PILOT` en `next.config.ts`, `FILM_FEATURES.pilot`) hasta que el piloto llegó a producción.
- **2026-10-01: siempre activa.** La dueña: «ya está en producción». Se quitó el interruptor entero (`FILM_PILOT`, `FILM_FEATURES`, la rama `lazy` de FilmPage, el chunk diferido del motor y su test). Es una escena más: import estático en FilmPage y en `SCENES`.
- **Guion de lectura** (pedido de la dueña: «avanza muy rápido y me pierdo casi toda la info»). `pilotStory(p)` separa el scroll de la historia, con mesetas en los 6 fijos, en la espera, con el lote aprobado y al final. El pin pasa de 320 a 800. En móvil, la franja va pegada (`stickyStrip`, escena de 560svh). Las mesetas viven en `domain/film/story.ts`, que comparte con la meta (§16.1).
- Fusión de la rama `wip` (8a186c3e): `npm run budget` falla en 21 rutas del panel por el crecimiento de main. No es una regresión de la landing (`/` pesa 151,3 kB). Se resuelve en el programa aparte de §6.4; los topes no se suben en esta rama.

## 20. Escucha la llamada · audio de una entrante con orbe de voz (aprobado el 2026-10-01)

Las entrantes ya están en producción. La dueña pidió que en la escena de llamada se pueda escuchar una llamada real, con un orbe de audio «ultra premium y optimizado» con los colores de Axi y sin librerías nuevas.

- **Lienzo aprobado (v4):** https://claude.ai/artifact/Bp2i7Q5VeSFiHmHft94zJp (Main 1440 y Móvil 390, interactivos). La dueña dijo: «perfecto, más que aprobado». El lienzo manda en composición, copia y comportamiento.
- **Audios:** `public/assets/audio/cliente-gafas.mp3` (4,86 s) y `agente-aviador.mp3` (7,89 s), que ya se usan en /productos. Son audios de ejemplo hasta que haya grabaciones de entrantes, y la escena lo dice («audio de ejemplo»).

### 20.1 Composición

- **Cabecera centrada.** Eyebrow «VENDER · LLAMADAS» y título «Y cuando hay que llamar, llama. / Y si te llaman, contesta.» (la segunda línea en Nexa 200). Lead: «Retoma cotizaciones, confirma citas y atiende las entrantes: lleva cada llamada por etapas y, si no puede atender, toma el recado.»
- **Centro: la esfera de voz.** Es el botón de reproducir (`<button>` con `aria-label` «Escuchar la llamada», «Pausar la llamada» o «Escuchar otra vez», y `aria-pressed`). Elementos:
  - esfera de 168 px con volumen, brillo y borde de luz;
  - mezcla interna de la marca (coral, violeta y ámbar) que gira solo mientras suena;
  - tres órbitas en 3D real (`perspective` 1050 px y `preserve-3d`) que cruzan la esfera y pasan por detrás. La coral responde a los graves (radio 150), la violeta a los medios (178, sentido inverso) y la ámbar a los agudos (206). Cada una lleva un punto de luz contrarrotado para que siempre mire a cámara;
  - corona de 64 marcas: espectro en espejo, con los graves arriba y los agudos abajo;
  - piso con horizonte, sombra, reflejo de color y tres ondas que solo se ven con voz.
- **Izquierda:** «LLAMADA ENTRANTE» con punto vivo, el tiempo en IBM Plex Mono («0:04 / 0:12») y el estado («Lista para escuchar», «Habla el cliente», «Contesta Axi», «En pausa» o «Llamada atendida») seguido de «audio de ejemplo».
- **Derecha: «LO QUE AXI ANOTA».** Las cuatro filas están siempre presentes y su valor aparece a su tiempo:
  - Llegó por · Un reel;
  - Busca · Gafas negras, lente naranja;
  - Producto · Aviador Ámbar · quedan pocas;
  - Siguiente paso · Enviar foto y precio.

  No se menciona el canal (límite de §19.6).
- **Debajo: subtítulos de cine**, con `aria-live="polite"`. Antes de reproducir dicen «Alguien vio un reel y llama a preguntar por unas gafas. Toca la esfera y escucha cómo contesta Axi.». Mientras suena, muestran quién habla (avatar CL o el isotipo) y las palabras se encienden con la voz; la palabra actual lleva el degradado coral→violeta.
- **Abajo: línea de tiempo.**
  - Etapas Apertura, Motivo, Propuesta y Cierre en su segundo real.
  - La onda real tiene 202 barras: las del cliente en blanco y las de Axi con el degradado de la marca.
  - Hay un cabezal de reproducción.
- **Quién habla cambia la escena.** Con el cliente, todo queda en plata: campo plata, esfera plata y órbitas al 32 %. Cuando contesta Axi, entra el color. Así el color aparece cuando habla Axi.
- **Móvil 390:** una columna con cabecera, la esfera escalada a 0,739 (340 px), el tiempo, los subtítulos (17 px), la línea de tiempo (358 px) y las notas.
- **La transcripción saliente por nicho** (`c.call.lines`) sale de esta escena. La saliente queda dicha en el título y el lead.

### 20.2 Datos medidos (dominio, con tests)

Van en `domain/film/call-audio.ts`, como datos y funciones puras.

- **`PEAKS`:** envolvente RMS, normalizada con exponente 0,6. Son 77 barras del cliente y 125 de Axi, a unos 62 ms por barra. Se midieron con ffmpeg sobre el audio real y se copian del lienzo, archivo `common.js`.
- **`PHRASES`:** tramos con voz detectados (silencio de más de 240 ms):
  - cliente: [0,12–0,54] «Hola, buenas.», [1,10–3,36] «Oye, vi en el reel unas gafas negras, de lente naranja…» y [3,94–4,72] «¿Todavía las tienen?»;
  - Axi: [0,06–0,96] «¡Hola! Sí, claro.», [1,28–2,74] «Todavía nos quedan unas pocas.», [3,14–5,78] «Son las Aviador Ámbar: montura negra, lente ámbar.» y [6,04–7,78] «Te paso la foto y el precio.».
- **`wordTimes`:** reparte cada palabra dentro de su tramo según el número de letras más uno. `litCount(track, t)` es puro.
- **`STAGES`** (Apertura 0 s, Motivo 1,1 s, Propuesta D0+3,14 s y Cierre D0+6,04 s) y **`NOTES`** (2,0 s, 3,4 s, D0+5,4 s y D0+7,6 s) usan el tiempo global.
- **`D0` y `D1`:** se toman de `audio.duration` cuando hay metadatos. Mientras tanto se usan 4,86 s y 7,89 s.
- **Tests:**
  - las palabras de cada pista coinciden con su texto;
  - los tiempos son crecientes y quedan dentro de su tramo;
  - etapas y notas ordenadas y menores que TOTAL;
  - PEAKS en [0, 1].

### 20.3 Rendimiento (lo que la dueña pidió: «no puede ser costoso»)

- **Sin librerías.** Un solo `AudioContext` se crea al primer toque; antes no se descarga nada (`preload="none"`). Un `AnalyserNode` (fftSize 256, smoothing 0,6) y `createMediaElementSource` para los dos `<audio>`.
- **Bucle `requestAnimationFrame` solo mientras suena.** Por frame:
  - se leen 8 bandas logarítmicas (bins 1·2·3·4·6·8·11·15·21, con ganancia creciente);
  - el ataque es de 0,55 y la caída de 0,16;
  - se escriben 13 variables CSS (`--b0…--b7`, `--lo`, `--mid`, `--hi`, `--e` y `--p`) en UN elemento, la sección.
- **El estado de React cambia solo cuando cambia algo visible:** una palabra, un segundo, una nota o una etapa. Son unas 40 veces por llamada. Nada de `setState` por frame ni por `timeupdate`.
- **Todo lo que se mueve son `transform` y `opacity`** de capas ya pintadas, con `will-change` en las que escala el analizador.
  - Ni `filter`, ni `blur`, ni `canvas`.
  - El avance de la onda se hace con dos traslaciones opuestas (la capa encendida se revela sin repintar). El cabezal también es una traslación.
  - Los giros son animaciones CSS (`animation-play-state` en pausa hasta `.on`).
- **Sin grano.** El lienzo lleva grano feTurbulence; en el sitio no va (§17.1).
- **Fuera de pantalla o pestaña oculta.** Un `IntersectionObserver` pausa el audio y para el bucle al salir la escena; `visibilitychange` hace lo mismo. Al desmontar se cierra el `AudioContext`.
- **`prefers-reduced-motion`:**
  - el audio y los subtítulos funcionan y `--p` avanza;
  - no se escriben bandas;
  - no hay giros, ondas, respiración ni parpadeo.
- **Escena sin pin.** Escuchar pide quedarse quieto. Entra con el patrón de escenas sin pin («top 85 %» → «center 50 %»): cabecera, esfera y línea de tiempo. Se quita `call` de `PINNED` y el builder de `sell-scenes.ts` se reduce a esa entrada.

### 20.4 Reparto y QA

- **Construye `2-cinematic-film-landing-page`** al cerrar el nav en isla: es el dueño de `sell-moments.tsx` y del CSS de vender.
  - Archivos nuevos: `domain/film/call-audio.ts` con su test, `ui/film/film-call.css` y, si conviene, `scenes/call-orb.tsx` (cliente) con el hook `useCallAudio`.
  - Lo que cruza a `film-engine.ts`, `film-kit.ts` (`PINNED`) o `FilmPage.tsx` lo pide a `cinematic-film-landing-page`.
- **QA de axi-2e:**
  - 390, 768, 1024 y 1440, en claro y oscuro (la escena es tinta en ambos);
  - Chromium, WebKit y Firefox: las órbitas pasan por detrás de la esfera en los tres;
  - perfil de rendimiento mientras suena, sin long tasks ni repintado de la onda (Paint flashing);
  - movimiento reducido;
  - teclado: Espacio y Enter en la esfera;
  - se pausa al salir de pantalla.

### 20.5 Construcción y cambios frente al lienzo (2026-10-01, noche)

La construyó axi-2e porque el 2.º constructor quedó detenido en un permiso. Commits: a1367d98 → 4811ed35.

- **Servidor + reproductor.** `scenes/call-scene.tsx` es un Server Component que pinta la escena entera: esfera, órbitas, onda real, las dos pistas de subtítulos con `data-at` por palabra, notas y etapas. Al navegador solo va `parts/CallPlayer.tsx`, que escribe atributos y estilos directo en el DOM, sin React por frame. `call-time.ts` lleva lo mínimo que necesita el cliente.
- **Fotograma final sin JS.** Antes de tocar la esfera, las etapas y las notas se ven completas y la onda tenue (el lienzo las mostraba vacías). Al tocar la esfera, todo vuelve a cero y se llena con la voz.
- **Rendimiento** (perfil de Chromium headless, rueda real, 1440):
  - variables CSS por frame en la sección → transform y opacity directos en unas 16 capas, escritos solo si cambian, a unos 20 Hz y con una transition de 100 ms que interpola el compositor;
  - la corona son 64 trazos en un canvas 2D (una sola capa);
  - las órbitas pasan de 3D real (ordenar planos que giran era lo más caro) a dos medias elipses 2D, la de atrás bajo la esfera y la de delante encima, con la misma lectura de profundidad;
  - los campos del fondo son dos capas que laten por opacidad y no por escala (re-rasterizaban 1100 px).
  - Llamada sonando: p50 de 83 → 16,7 ms con CPU ×1 (33 con ×4, como el chat) y 0 tareas largas.
- **Tipografía.** Las cifras van en Geist Mono, ya cargada en el layout: cero fuentes nuevas (el lienzo usaba IBM Plex Mono).
- **Píldora del nicho.** `data-pill-avoid="always"` en los subtítulos y la línea de tiempo: se aparta en cualquier ancho.
- **Órbitas en Firefox:** el SVG en 3D se descolocaba. Los arcos son div con conic-gradient y máscara.
- **QA:** `qa/qa-llamada.mjs` en Chromium, WebKit y Firefox a 1440, 1024, 768 y 390, más movimiento reducido: suena, cambia de quién habla, las bandas se mueven, se llenan las notas, 0 errores y sin scroll horizontal. Evidencia en `qa/evidencia/landing-llamada/`.

## 21. Cierre de la noche (2026-10-01)

Cifras finales sobre la **build de producción** (`next build` sin `FILM_PILOT`, rama `feat/landing-cinema` en 272bbda5). Evidencia en `axi/qa/evidencia/landing-final/` (Lighthouse JSON y HTML, presupuesto, copia extraída).

### 21.1 Presupuesto (`npm run budget`)

- **Capa pública en verde:** `/` 154,2 kB (tope 200), común 100,9 (103), /precios 200,5 (204), /productos 195,0 (198), /contacto 178,5 (184), /casos 154,6 (158), /soluciones y /integraciones 149,4 (152), /marketplace 109,8 (113), legales 101,5 (104).
- El script sale en rojo por 21 rutas **del panel** que vienen de main (§6.4, programa aparte): no son de la landing y sus topes no se tocan en esta rama.
- Con el piloto apagado no viajaba nada suyo: ni CSS, ni fuente, ni HTML, ni código de servidor. Desde el 2026-10-01 el piloto va siempre (§19.9) y el interruptor no existe: el peso de `/` se vuelve a medir con él dentro (§21.6).

### 21.2 Lighthouse de `/` (mediana de 3, Chromium headless)

| | Rendimiento | LCP | FCP | TBT | CLS | Accesibilidad · Buenas prácticas · SEO |
|---|---|---|---|---|---|---|
| Móvil | **69** (antes 56) | 4,17 s | 2,14 s | 508 ms (antes 1334) | 0 | 100 · 100 · 100 |
| Escritorio | **92** (antes 78) | 1,51 s | 0,51 s | 144 ms (antes 350) | 0,003 | 100 · 100 · 100 |

- **Lo que se arregló esta noche:** el motor construía las 19 escenas en una sola tarea (1,2 s con CPU de gama media). Ahora va por tandas de ≤ 12 ms cediendo el hilo (272bbda5). Precios, preguntas y cierre llevan `content-visibility: auto`.
- **Lo que queda en el LCP móvil (4,2 s), con su causa medida:** el 89 % es retraso de render. El elemento LCP es texto en **Nexa** (el nombre de la marca o las cifras del hero), que se pinta con la fuente de respaldo en el FCP y se repinta cuando llega Nexa, hacia los 4,2 s en 4G lento. Compiten **7 fuentes precargadas** (4 pesos de Poppins, 2 de Nexa y Geist Mono) y 80 kB de CSS bloqueante en 7 hojas (la de la película, 52 kB).
- **Probado y descartado esta noche:**
  - **Geist Mono sin precarga** (`preload: false` en `src/app/layout.tsx`): el móvil EMPEORA en dos medianas seguidas (rendimiento 69 → 62 y 63; LCP 4,17 → 4,88 y 5,44 s), aunque el escritorio mejora (LCP 1,51 → 1,20 s). La home sí usa Geist Mono (las cifras de la llamada, §20): sin precarga se pide tarde y compite en el momento crítico. Revertido; el presupuesto del panel no cambiaba.
  - **Recortar `film.css`** quitando solo lo PROBADO muerto (clases que no aparecen en ningún TS/TSX): son 674 bytes de 52 kB (1,3 %, unos 200 bytes comprimidos: `.film-alpha`, `.film-card`, `.film-mark`). Muy por debajo del ruido del móvil headless (±5 puntos), así que no puede dar los 2 puntos estables que se pedían. No se aplicó. Lo demás lo usa alguna escena o el motor.
- **Palancas pendientes, para decidir con la dueña:**
  1. `font-display: optional` solo en Nexa. El LCP pasaría a ser el FCP, pero quien entra por primera vez con red lenta vería la marca en la fuente de respaldo: cambia la primera impresión de la marca.
  2. Los pesos de Poppins (hoy 4, en una sola instancia de next/font en el layout raíz): precargar solo los que pinta el hero.
  3. CSS de las escenas fuera del `<head>`: cargarlo con JS más `<noscript>`. En el App Router todo el CSS importado bloquea, así que hay que sacarlo de su cadena, con riesgo de FOUC si se baja antes de que llegue. Solo en una rama aparte, con 3 medianas y el barrido completo.
  4. `content-visibility` en las escenas fijadas: bajaría el estilo y layout inicial (4.879 nodos), pero exige recalcular los pins tras el primer render de cada una, con riesgo de saltos.

### 21.3 Perfil de scroll (`qa/qa-perfil.mjs`, Chromium headless 1440, rueda real con Lenis)

- `--film-progress` se escribía en el raíz en cada frame (ba2fa22b). Con eso fuera, el recálculo de estilo baja de segundos a decenas de ms por escena, las tareas > 50 ms quedan en 0 en todas y el frame p50 es 16,7 ms en 15 de 19 escenas. La tabla de antes y después está en el mensaje del commit.
- Con CPU × 4: 60 fps en 16 de 19 escenas. Quedan en 33 ms el hero (la entrada con blur, de una sola vez), el chat (la pose del teléfono va ya sin herencia, dbdc7859) y la llamada sonando (§20).
- Sin `filter: blur` en nada que se anime por frame (1ded1020; bóveda en 85c2d868).

### 21.4 Barrido de calidad (`qa/qa-barrido.mjs`, `qa/qa-costuras.mjs`)

3 motores × 390, 768, 1024 y 1440 × tema claro y oscuro (24 configuraciones):
- 0 errores de página y 0 scroll horizontal;
- pins sin saltos (deriva ≤ 1,5 px);
- 0 escenas que entran tarde, tras arreglar la meta (eb58b4f4) y el piloto (c6b774b5);
- 0 solapes y cortes de texto (el de la llamada a 390 lo resolvió 6dc5af69);
- las costuras de fondo arregladas (seguimiento→chat y nicho→radar).

### 21.5 Lo que quedó hecho esta noche

- Piloto automático §19: dominio, escena, cabina y QA aprobada; apagado hasta producción.
- Nav en isla §18.1: cdde0c0f, aprobado; el panel y la hoja son opacos para leerse sin desenfoque (1ded1020).
- Copia de la película en `axi/docs/business/landing-copy.md`, extraída del navegador.
- Llamada con audio §20, del 2.º carril.

**Pendiente:**
- la decisión de fuentes y CSS del LCP móvil (§21.2);
- el presupuesto del panel (§6.4);
- la revisión de la dueña en :3320.

### 21.6 Rendimiento tras la ronda 2 (2026-10-01)

| | Rendimiento | TBT | LCP | Nota |
|---|---|---|---|---|
| Móvil | **78** (64/78/82; antes 70) | 233 ms (antes 438) | 4,37 s | en móvil se construye solo lo cercano; el resto, al acercarse (8e794bb9) |
| Escritorio | **96** | 84 ms | 1,26 s | |

- **El coste de escritorio no era un refresh final.** Eran 11–13 refrescos completos de ScrollTrigger durante la construcción: el `pin` de GSAP encola uno por frame en que nace un pin, y cada uno revierte y vuelve a medir todos los pins (300–700 ms con CPU ×4). Ahora las escenas se fijan con **sticky** dentro de un `div.pin-spacer` y un relleno de N vh (bc779ca3). Con CPU ×4: 2 refrescos, bloqueo de ~7 s a ~1 s y tarea mayor de 700–1331 ms a ~350 ms.
- **Ritmo de lectura** (`qa/qa-ritmo.mjs`: px de scroll por texto nuevo; referencia, el piloto, con ~120). Se alargan collect 130→330, radar y axel 140→240, team 130→190 y pipeline 120→160. La meta tiene su guion (§16.1): 200→480, con mesetas.

## 22. Riel temario · la ruleta de escenas (aprobada el 2026-10-01)

Lienzo: https://claude.ai/artifact/TAMCLKyh5AdP3xKremX4w9 (v2). La dueña lo aprobó con «Aprobada la ruleta, constrúyela». La v1 era un panel con título y lista; la dueña pidió quitar el título, un contenedor más pequeño, una entrada más cuidada y, sobre todo, el efecto de ruleta.

- **Qué es:** el riel de la izquierda se convierte en el índice de la película. Al pasar el ratón, o con el teclado desde su botón «Ir a una escena», nace del punto actual del riel una ruleta de 272 × 236 px con 5 escenas a la vista. No lleva cabecera.
- **Entrada:** escala, opacidad y desenfoque (0,55 → 1; 10 px → 0) con un easing de salida largo. Solo al abrirse; al cerrarse se va rápido y sin desenfoque.
- **La ruleta:**
  - la escena del centro va sobre una franja de cristal, grande y nítida, con el punto de su pilar encendido, su capítulo encima y «Intro ↵»;
  - las demás se achican (−12 % por paso) y se apagan (−30 %), con viñeta de máscara arriba y abajo;
  - cada paso encaja como un tambor (0,42 s).
- **La rueda:** mientras la ruleta está abierta, la rueda mueve la ruleta y NO la página (un paso cada 60 px, con `data-lenis-prevent` y un `wheel` no pasivo). ↑ ↓ (también Inicio y Fin) hacen lo mismo. Un clic en otra escena la trae al centro. Intro o clic en la del centro inicia el recorrido. Esc cierra y devuelve el foco al riel.
- **El recorrido:** `scrollTo` de Lenis con duración proporcional a la distancia (1,2 a 2,5 s) y easing in-out. Pasa por las escenas, así sus animaciones corren por el camino. Mientras dura, una píldora «Hacia …» en el destino del riel con su barra (escrita por ref). El destino es el de las anclas (M1): el `pin-spacer` si la escena se fija, con `lenis.resize()` antes. Al llegar, el foco va a la escena. Con movimiento reducido, salto directo.
- **Accesibilidad:**
  - el dibujo del riel es decorativo y su botón y la ruleta no;
  - el riel es inerte mientras no se ve y la ruleta, cerrada;
  - la escena actual lleva `aria-current`;
  - es una sola parada de tabulación, porque el foco sigue a la selección.
- **Código:**
  - `domain/film/rail-index.ts` (índice de escenas con su ancla real y su pilar, la pose del tambor, los pasos de rueda y la duración), con tests;
  - `ui/film/parts/FilmDrum.tsx` y `film-drum.css`, con su test;
  - el recorrido en `FilmRoot`;
  - `scrollTo(target, { duration, easing, onComplete })` y `offsetOf()` en el motor.
- **Solo escritorio:** el riel no existe por debajo de 1024 px. El riel lista lo que hay en la página.
- **Ajuste del 2026-10-01 (revisión de diseño):** la escena del centro se lee entera. Su fila mide 60 px y su título puede ir en dos líneas (`line-clamp: 2`, `text-wrap: balance`). La tecla queda en «↵» y las vecinas se apartan `DRUM.bump` = 8 px. Medido a tamaño real: el título más largo («Tu captación en piloto automático») ocupa unos 270 px y la columna deja unos 141 px. Las filas de alrededor siguen en una línea, con elipsis.

## 23. Video inmersivo en lugar de «Vendemos progreso» (aprobado el 2026-10-02)

La dueña: «vamos a eliminar la sección de la filosofía, no me gusta para nada… en lugar de ello vamos a poner un video… en streaming, tal como está el otro, pero incrustado, que se sienta inmersivo». El lienzo (https://claude.ai/artifact/W7Az38XYfiBjUofU2xoUoB) quedó aprobado: «procede y elimina la filosofía, no dejes rastro ni basura, optimizado».

- **Lugar:** justo después del hero (`#video`), escena fijada en escritorio.
- **Fuentes:** las de /productos (`HERO_VIDEO`): Cloudinary en streaming progresivo, H.264 `q_90`, máster horizontal 1920 y vertical 1080×1920, cada uno con su póster.
- **Coreografía:**
  - entra con el video en un marco (la pantalla entera a escala 0,6, o 0,78 en móvil) bajo «Así se ve / un día con Axi.»;
  - fijada, el titular se va y el marco se abre hasta a sangre;
  - la viñeta se intensifica y al final aparece «Vende, cobra y atiende. Mientras tú decides.».
  - El control «Activar sonido» es de cristal; al activarlo, el video vuelve a empezar.
- **Rendimiento:**
  - abrir el marco es un `scale`, con el radio compensado en el recorte; no hay cambio de tamaño ni layout;
  - no se pide ni el póster ni el video hasta que la escena está a una pantalla;
  - se pausa fuera de pantalla y con la pestaña oculta;
  - sin framer-motion: no suma al JS común.
- **Movimiento reducido o ahorro de datos:** póster y «Reproducir el video», sin autoplay.
- **Borrado de la filosofía** (constructor 1, §17.2): escena, builder, CSS, contenido, tests, PINNED, la entrada del riel y la copia. Sin rastro en src.
- **Archivos del video** (axi-2e, 675aea35): `scenes/video.tsx`, `parts/FilmVideo.tsx`, `engine/video-scene.ts`, `film-video.css` y `domain/film/video-content.ts` con su test.

## 24. Pedidos de la dueña del 2026-10-02 (tarde)

- **Modo claro** (lienzo https://claude.ai/artifact/JSWQ6cJQuBWB2VKaTo8Po3, aprobado). Es la misma película con otros tokens:
  - los colores fijos de tinta y blanco pasan a `--foreground` y `--background` con color-mix;
  - no cambian con el tema los objetos con material (etiqueta y cupón de la bóveda, recibo, esfera de la llamada, controles sobre el video) ni las sombras;
  - el portátil del equipo es aluminio en los dos temas, sin la franja negra sobre el teclado;
  - FilmRoot deja de forzar `dark`, y el selector de tema va en la píldora lateral, también en la home.
- **«Una foto basta»:** fotos reales del cliente por nicho, de Unsplash, con licencia libre.

  | Nicho | Foto |
  |---|---|
  | Restaurantes | Hamburguesa |
  | Tecnología | iPhone rojo |
  | Salud y belleza | Manicura con diseño (el match pasa a «Manicura spa») |
  | Servicios y B2B | Guantes de nitrilo |

  Van en WebP 640×800, de 13 a 32 kB, diferidas.
- **Íconos de intención del nav** (aprobados):
  - Vender y cobrar: un círculo perfecto con degradado coral;
  - Crecer: la cinta ámbar;
  - Atender: la cinta violeta;
  - cada uno en una tesela de cristal con halo, en un solo componente.
- **Isla:** «Captar · Vender · Cobrar · Crecer» en lugar de «La película · 4 capítulos».
- **Piloto** siempre activo: ya está en producción y se quita el interruptor.
- **Ritmo:**
  - mesetas también en la meta;
  - más recorrido en cobrar, el radar, Axel, el equipo y ordenar;
  - la ruleta del riel responde a ↑ ↓ Intro sin tabular.

## 25. La luz del hero abraza el marco del video (aprobado el 2026-10-03)

La dueña pidió que la luz del hero, al hacer scroll, se fusione con el marco del video y lo rodee como el anillo de un agujero negro hasta que el video ocupe el 100 %. La sombra violeta de detrás desaparece: «La luz del hero no va por atrás, sino que llega hasta el marco del video y desaparece hasta que el video esté 100% en el ancho».

Lienzo con prototipo de scroll y comparación con la versión actual: https://claude.ai/artifact/FnknynoDN5GzRcVxBFHNWU.

Aprobado con: «Aprobado, procede con las propuestas de claro y móvil, perfecciona el efecto para que se vea con más calidad». El prototipo marca la idea, no el acabado.

### 25.1 Coreografía en escritorio (≥ 768)

| Tramo | Luz | Marco |
|---|---|---|
| Reposo | Es el nudo de hoy (`.film-hero-knot`), bajo el CTA | Fuera de cuadro |
| Cae | El hero sube y el nudo baja (~14 % del alto), estirándose como una gota con estela hacia arriba; el halo del hero se apaga | Entra por abajo |
| Contacto | Al tocar el filo superior se aplasta en un destello horizontal y se abre en dos arcos que recorren el borde hasta cerrarse abajo, en el centro | Sube a su sitio |
| Anillo | El anillo queda encendido por fuera del borde, con un brillo asimétrico que gira despacio (el disco); nada detrás | Fijado a 0,6 |
| Se abre | Su intensidad baja con la apertura, `(1 − open)^~1,15` | 0,6 → 1 |
| 100 % | Apagado del todo antes de que el borde toque los lados de la ventana | A sangre |

- Desaparece el `box-shadow` violeta de `.film-video-clip` (`0 80px 160px -60px`) en los dos temas. Se queda el filete de 1 px.
- No cambian los textos, el recorrido del marco (S0 0,6, TY 9 %, radio 28 compensado), la viñeta ni la frase.
- **El relevo del nudo:** el nudo del hero vive en la sección del hero. La sección del video, que pinta encima, tiene su propia gota y la recoge en el mismo fotograma, sin costura ni doble luz. La gota arranca en la posición exacta del nudo y la pinta el motor del video.

### 25.2 Calidad del acabado (lo que el prototipo no tenía)

- **Tres capas en el anillo:**
  - filo caliente de 1,5 px vistos, blanco y ámbar;
  - corona media coral, de ~6 px y poco desenfoque;
  - bloom ancho y tenue que se pierde en la tinta.
  - Son la paleta del nudo (blanco, ámbar `--axi-amber`, coral `--axi-brand`), con violeta como mucho en un borde lejano y nunca como relleno detrás.
- **Grosor y desenfoque constantes:** se compensan con la escala, igual que el radio, para que el filo no engorde al abrirse.
- **Disco asimétrico:** un lado más brillante, como el disco de un agujero negro. Es una capa con degradado cónico enmascarada al anillo que gira solo con `transform`: no se reanima el degradado.
- **Contacto con destello anamórfico:** el nudo se aplasta en una raya horizontal breve sobre el filo superior. Los dos arcos se dibujan con `stroke-dashoffset`, solo durante el contacto, con un extremo más brillante (la cabeza de la luz que corre).
- **La gota:** se estira con la velocidad del scroll, no con la posición, con una estela hacia arriba. Al soltar el scroll recupera su redondez sin rebote.
- **Sin bandas:** los degradados largos sobre negro llevan un dither de grano sutil (una sola textura estática) para que no se vean escalones a 8 bits.
- **Respiración:** una pulsación lenta de ±6 % de la intensidad en el tramo del anillo, nunca durante el contacto.

### 25.3 Modo claro

El hero es claro y el núcleo blanco desaparece sobre el fondo. En claro, el núcleo de la gota y el filo del anillo van en ámbar y coral, con el blanco solo en el punto más interior y rodeado de color. El anillo vive sobre el negro del video (la sección es negra del 14 % al 86 %), así que conserva su contraste. Hay que comprobar el tramo de caída sobre el claro del hero y el cruce del degradado de tinta a negro.

### 25.4 Móvil (< 768)

No hay marco: el video va a lo ancho desde el principio (§23). La luz cae y, al tocar el borde superior del video, se convierte en un filamento horizontal que se abre del centro a los dos lados y se apaga mientras el video sube. Es una sola capa: solo `transform` (`scaleX`) y opacidad, sin desenfoque animado. No debe sumar al Lighthouse móvil.

### 25.5 Rendimiento y accesibilidad

- Solo `transform`, `opacity` y el `stroke-dashoffset` del contacto. No se escriben variables CSS por frame en ancestros ([[perf-variables-css-por-frame]]). Los desenfoques y sombras son estáticos.
- No se usa `@property` con nombres que ya existen (la lección de `--ry`, §hotfix 625709ef).
- **Movimiento reducido:** no hay caída. En reducido el video no se fija ni se abre (§23), así que el anillo queda quieto, cerrado y tenue (filo y corona, sin bloom) durante todo el recorrido. Es un marco iluminado, no una animación (decisión del 2026-10-03 tras la QA de 0d438b58).
- **Móvil, relevo:** el nudo del hero baja unos px y se apaga mientras el filamento se enciende; nunca las dos luces por encima de 0,3 a la vez.
- `aria-hidden` en todas las capas de luz.

### 25.6 Reparto

- **Constructor 1:** `engine/video-scene.ts`, `scenes/video.tsx`, `film-video.css`, y en el hero lo justo para el relevo del nudo (`HeroFibers` o `film.css`).
- **Constructor 2:**
  - QA a 1024, 1280, 1366×657, 1440 y 1920, en oscuro y claro, y en móvil a 390;
  - capturas de los seis tramos, comprobación de que no hay doble luz ni salto en el relevo, y de que el anillo está a 0 con el video al 100 %;
  - qa-perfil en el tramo del anillo y qa-progreso.
- **axi-2e:** revisión visual contra el lienzo antes de la demo a la dueña.
