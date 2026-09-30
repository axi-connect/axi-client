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
