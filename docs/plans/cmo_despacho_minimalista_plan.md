# Plan — El despacho de Axel, minimalista: menos texto, scroll con el avatar presente, sesiones y acciones rápidas compactas

> Plan hermano del avatar (`docs/plans/cmo_axel_avatar_plan.md`, ya implementado en el worktree `cmo-axel-avatar`). Misma disciplina: mockup HTML como Artifact antes de codificar (F0), fases con gate explícito del dueño, todo lo técnico en inglés y la documentación en español. Se versiona en `axi-client/docs/plans/cmo_despacho_minimalista_plan.md` en F0. No se construye nada hasta que el dueño apruebe el mockup.


> **Estado (2026-09-15, noche): F0–F4 IMPLEMENTADAS en el worktree `cmo-axel-avatar`** (commit «el despacho minimalista»), F5 con docs hechas y medición en navegador pendiente del dueño. Verja acotada verde: `tsc` sin errores nuevos, 23 suites / 222 tests del módulo CMO y `core/styles`, lint limpio. Dos ajustes salieron de implementar: (1) las tres acciones (Conversaciones, Nueva, Ajustes) viven en la **esquina superior derecha del campo** (`CmoActions`), no dentro de la barra: en el estado vacío la barra baja al centro con Axel y los iconos flotaban junto a la cara; (2) `Intl` con `es-CO` abrevia el mes como «8 de sept», así que las etiquetas quitan el «de» y el punto («8 sept»). Siguiente: fusión a `main` y deploy (petición del dueño).

## 1. Contexto

**Qué hay hoy** (`src/modules/cmo/ui/CmoView.tsx`, `components/AxelChat.tsx`, `CmoBoardRail.tsx`). Un `<main class="axel-field">` full-bleed con un scroller que contiene, en una columna de 640 px: el hero (Axel vivo de 136 px, saludo con fecha, titular del informe, sub-línea), la cejilla «Empieza por aquí» con **tres tarjetas grandes** de arranque (icono, etiqueta y una frase de pista), hasta dos tarjetas de propuesta anchas, el hilo y la burbuja de pensando/escribiendo. El compositor va fuera del scroller, anclado abajo, con el botón «Nueva», el envío y una nota de confianza debajo. A la derecha, un rail de 316 px con «Propuestas por decidir», «La lectura de Axel» (resumen del informe y chips de cifras) y el enlace a ajustes.

**Tres problemas que el dueño señaló (2026-09-15):**
1. **Demasiado texto.** El inventario da ~75 cadenas visibles, ~20 de ellas frases largas. La promesa de confianza está dos veces (hero y compositor); cada tarjeta de arranque lleva una pista de cuatro palabras; el rail y el estado bloqueado explican con párrafos.
2. **El avatar se pierde al bajar.** El hero vive dentro del scroller: a los tres mensajes Axel desaparece y la pantalla se queda sin la presencia que acabamos de construir.
3. **Las sesiones no existen en la UI.** El servidor ya lista hilos (`GET /cmo/threads` con `title`, `last_message_at`, `created_at`), crea, transcribe y archiva; el store solo carga `threads[0]` y descarta el resto. El único control es «Nueva».

**Referencia visual del dueño:** un campo de texto amplio y, debajo, **píldoras compactas** (icono + etiqueta) como acciones rápidas. Estética premium, información «renderizada de otra forma, más entendible y simple».

**Decisiones del dueño (2026-09-15, antes del mockup):**
- **Compositor centrado en el estado vacío** (Axel + una línea + campo + píldoras), que **baja y se ancla** cuando empieza la conversación.
- **Sesiones en un menú de la barra superior** («Conversaciones», lista glass agrupada Hoy / Ayer / Antes, «Nueva» arriba, archivar al pasar el ratón). Sin panel permanente.
- **Rail adelgazado a «Por decidir»** con su contador; las cifras del informe suben a la barra superior como chips; ajustes pasa a un icono.
- **Sin avatar en los mensajes** (decisión previa, se mantiene). **Una sola instancia viva de Axel**, siempre (presupuesto de rendimiento del plan del avatar).

**Fuera de alcance:** el detalle de la propuesta (`ProposalDetail`, hoja lateral) y `/cmo/settings` no cambian en este plan salvo lo que exija el rail.

## 2. La composición nueva, de un vistazo

```
┌ .axel-field ───────────────────────────────────────────────┬ rail «Por decidir» (xl+) ┐
│ ▸ barra dock (sticky, transparente en reposo)              │  Por decidir  ③          │
│    [Axel 136px colgando]         … [Conversaciones][+][⚙]  │  ▪ Persigue los 22 carritos│
│                                                            │  ▪ «Te guardamos tu talla» │
│   ESTADO VACÍO (centrado verticalmente):                   │  ▪ Recompra Denim          │
│      Hola, Cristian                                        │                           │
│      Soy Axel, tu director de mercadeo   ← o el titular    │  (vacío: «Estás al día.») │
│      [chip: Primer informe mañana · 8:00] [chips cifras]   │                           │
│      ┌──────────────────────────────────────┐              │                           │
│      │ Pregúntale a Axel…               (↑) │              │                           │
│      └──────────────────────────────────────┘              │                           │
│      (📊 ¿Cómo vamos?) (🔥 Clientes calientes) (📣 Ármame una campaña)                │
│      Nada sale sin tu aprobación.                          │                           │
│                                                            │                           │
│   CON CONVERSACIÓN: el compositor se ancla abajo; el hilo  │                           │
│   ocupa el centro; al bajar, la barra se vuelve cristal y  │                           │
│   Axel se acopla a 40 px en la esquina con «Axel · mié 15».│                           │
└────────────────────────────────────────────────────────────┴───────────────────────────┘
```

Cuatro piezas nuevas: **la barra dock** (`AxelDock`), **el conmutador de conversaciones** (`ThreadSwitcher`), **las píldoras de arranque** (`StarterPills`) y **la dieta de textos**. Y dos que adelgazan: el rail y la tarjeta ancha.

## 3. El avatar no se pierde: barra dock acoplable

**Mecanismo: `IntersectionObserver` sobre un centinela → atributo `data-docked` en la raíz del chat → transiciones CSS de `transform`/`opacity`.** Un callback por cruce (no por frame), cero `useState` (se escribe `dataset` por ref), compositor puro. La animación continua con `animation-timeline: scroll()` queda como mejora progresiva en F5 bajo `@supports`, sin tocar el JS: en navegadores sin soporte queda la transición binaria.

- **Una sola instancia de Axel, siempre.** `AxelHeroAvatar` se monta una vez **dentro de la barra sticky** (`<header class="axel-dock sticky top-2 z-20">`). Lo que cambia entre hero y dock es un `transform: translate() scale(0.2857)` del contenedor `.axel-hero` (136 → 40 px, `transform-origin: 0 0`, rasteriza grande y reduce: nítido). El rig del avatar (`--gaze-x`, `data-gesture`, `axel-breathe`) vive en hijos y compone con el `transform` del padre sin conflicto. `useAxelGaze` sigue correcto: `getBoundingClientRect()` devuelve el rectángulo ya transformado.
- **La barra en reposo es transparente** (solo los tres iconos a la derecha en `text-muted-foreground`), así el hero sigue leyéndose como hero. **Acoplada es superficie flotante glass** (pseudo `::before` con la receta de `.glass`, encendido por `opacity`; permitido por DESIGN-SYSTEM §5.2, misma categoría que el chip de día sticky del inbox). Título «Axel» y chip del día (`mié 15 sep`) aparecen por `opacity` al acoplar.
- **Números en variables** (`--dock-h: 56px`, `--dock-scale`, spacer 132 px, centinela a 32 px del inicio): una sola fuente para CSS y hook. `useAutoScroll` no se toca: la barra es un elemento en flujo de altura constante.
- **Bloqueado** (`blocker !== null`): no se monta `AxelDock`; `CmoBlockedState` conserva su Axel dormido estático. Nunca hay dos avatares vivos.
- `prefers-reduced-motion`: sin transición, salto directo.
- Hook nuevo `infrastructure/hooks/use-docked-hero.ts` (`root`, `scroller`, `sentinel`, `{enabled}`): IO con `root: scroller`, `rootMargin: "-56px 0 0 0"`, `docked = !isIntersecting && boundingClientRect.top < rootBounds.top`; sin `IntersectionObserver` (jsdom) es no-op.

## 4. Compositor centrado que baja (decisión del dueño) y píldoras

El diseño técnico recomendaba dejar el compositor siempre abajo para evitar animar layout; **se mantiene la decisión del dueño** y se resuelve así:

- **Un solo `<form>` en el DOM, nunca se remonta**: el `textarea` conserva foco, altura y el typewriter. La raíz del chat es una columna flex con dos hijos (scroller y bloque del compositor). En el estado vacío la raíz lleva `data-empty` → `justify-content: center` y el scroller pasa a `flex: 0 0 auto`; con el primer mensaje el atributo cae y la disposición vuelve a `[scroller flex-1][compositor]`.
- **La transición es una sola y finita**: un FLIP de `transform` (framer `layout` con `spring.soft` sobre el bloque del compositor y el hero, ~400 ms, disparado por la acción del usuario al enviar; con `useReducedMotion` no hay viaje). No es un loop ni animación de layout por frame: framer mide dos rectángulos y anima `transform`. Cumple §6.
- **`StarterPills`** (extraído de `AxelChat`): fila `flex-wrap justify-center gap-2` **debajo del formulario**, solo con `!hasMessages && blocked === null`. Píldora `rounded-full border bg-background/80 px-3 py-1.5 text-xs`, icono + etiqueta, **sin pista**; `aria-label` = el prompt que envía. Desaparecen la variante «compact» y la cejilla «Empieza por aquí».
- **Compositor mínimo**: `textarea` + botón enviar. «Nueva» sale del formulario: pasa a la barra (icono `Plus`) y al primer ítem del conmutador.
- `PLACEHOLDER_PHRASES` → 4 (las que las píldoras no cubren): «¿Quiénes están por recomprar?», «¿Por dónde se me va la plata?», «¿Cómo va mi agente?», «¿Qué fecha comercial viene?». `PLACEHOLDER_IDLE` → «Pregúntale a Axel…». Siguen siendo constantes de módulo (invariante de `useTypewriterPlaceholder`).

## 5. Conversaciones (sesiones)

**Primitivo: `Popover` + `Command` (cmdk) sin buscador.** cmdk da `listbox`/`option`, flechas, Home/End, Enter, grupos con encabezado, y sus ítems son `div` (admiten el botón «Archivar» dentro). El `DropdownMenu` propio no lo admite (ítem = `<button>`) y se recorta dentro del scroller. ≤ 30 hilos no justifican `CommandInput`.

- **`ThreadSwitcher.tsx`**: trigger icono `MessagesSquare` (`aria-label="Conversaciones"`, `aria-haspopup="listbox"`, tooltip con el título del hilo actual). Contenido `w-80`: «Nueva conversación» (`Plus`) arriba, separador, grupos **Hoy / Ayer / Antes** (solo los no vacíos) con título truncado, hora (Hoy) o «15 sep» (resto), `Check` + `sr-only «actual»` en el hilo abierto, y botón «Archivar» visible al pasar el ratón o con foco (`stopPropagation`). Vacío: «Aún no hay conversaciones». Deshabilitado con tooltip «Axel está trabajando» mientras `thread.thinking`.
- **`domain/thread-labels.ts`** (puro): `threadTitle(t)` = `title ?? «Conversación del 15 sep»`, `groupThreadsByDay(threads, now)` por día de calendario local, orden `last_message_at` desc.
- **Store** (`cmo.store.ts`): `threads: Section<CmoThreadDTO[]>` (se guardan en `load()` en vez de tirarlos), `refreshThreads()`, `selectThread(id)` (guarda si `thinking` o mismo id; resetea `thread`, `live: null`, `settled: {}`, `blocker: null`; `getTranscript` con **guarda de carrera**: aplica solo si `get().thread.id === id`; error → mensaje `system` «No pude abrir esta conversación.»), `archiveThread(id)` (optimista con rollback; si era el actual, salta al más reciente o a hilo nuevo). **`newThread()` pasa a ser local y sincrónico**: hoy hace `POST /cmo/threads` en el acto y con un conmutador visible produciría hilos vacíos «Conversación del 15 sep» a cada toque; `ask` ya manda `thread_id: undefined` y adopta `reply.thread_id`, así que el hilo nace en el servidor con su primer mensaje. `ask` llama `refreshThreads()` al resolver (título y `last_message_at` del servidor).
- **Adapter**: `archiveThread(id)` → `POST /cmo/threads/{id}/archive` (ya existe en el spec, 201 sin cuerpo); `createThread` queda sin uso (se retira junto con sus mocks en dos tests).
- `use-cmo-socket.ts` ya llama `load()` al reconectar → refresca también `threads`.

## 6. Dieta de textos (objetivo ≤ 40 cadenas visibles, ninguna de más de 12 palabras)

| Hoy | Después |
|---|---|
| «Empieza por aquí» + 3 pistas de las tarjetas | fuera (el prompt va en `aria-label`) |
| «Miro tus números cada día y te dejo propuestas listas para decidir.» + «Axel propone; tú apruebas. Nunca envía nada por su cuenta.» | sub-línea corta solo en primer contacto («Miro tus números y te dejo propuestas.») + **una** nota bajo el compositor: **«Nada sale sin tu aprobación.»** |
| «Buen día, Cristian · lunes, 15 de septiembre» | **«Hola, Cristian»**; la fecha va al chip de la barra («mié 15 sep») |
| «Te dejé N propuestas listas para decidir. Están abajo y en el tablero.» / «Hoy no encontré nada que valga la pena proponerte…» | chip **«N por decidir»** / **«Hoy no hay nada que proponer.»** |
| «Hay N propuestas más en el tablero.» | fuera (el rail lleva contador) |
| «Primer informe · mañana a las 8:00» | **«Primer informe mañana · 8:00»** (sigue siendo estado normal, no error: contrato de la KB) |
| Starters «¿Cómo vamos?» / «Clientes calientes» / «Ármame algo» | **«¿Cómo vamos?» / «Clientes calientes» / «Ármame una campaña»** |
| «Pregúntale a Axel o dile qué armar…» | **«Pregúntale a Axel…»** |
| `AxelThinking`: 5 fases; «Axel está trabajando · N lecturas hasta ahora» | 3 fases («Revisando tus números…», «Armando la recomendación…», «Ya casi…»); **«Trabajando · N lecturas»** |
| «Consultó N fuentes de tus datos» | chip **«N fuentes»** |
| Rail «Propuestas por decidir» + «La lectura de Axel» + resumen + vacíos largos + «Tus directrices y ajustes» | **«Por decidir»** + contador; vacío **«Estás al día.»**; la lectura desaparece (el resumen ya es el h1 y las cifras suben al hero como ≤ 3 chips); ajustes = icono en la barra |
| Tarjeta: sello «Axel · Del informe del día», «N borradores listos, apagados» | sin sello; chip **«N borradores · apagados»** (mantiene la promesa «nada está encendido» de la KB) |
| Bloqueo cuota: título + 2 párrafos + aviso verde de 2 frases | **«Axel agotó sus análisis»** / **«Vuelve el próximo ciclo. Tus agentes siguen atendiendo.»** / CTA **«Ver ajustes»** (contrato KB: los agentes siguen atendiendo) |
| Bloqueo apagado | **«Axel está apagado»** / **«Enciéndelo para recibir propuestas.»** / **«Encender a Axel»**; sin permiso **«Pídeselo a un administrador.»** |
| Notas bajo compositor bloqueado | **«Sin análisis hasta el próximo ciclo.»** / **«Axel está apagado.»** |
| `TIMEOUT_MESSAGE` (2 frases largas) | **«Tardé más de lo normal. Si terminé, la respuesta aparece sola.»** |
| Error de briefing | **«No pude cargar el informe.»** + «Reintentar» |

Nuevas del conmutador: «Conversaciones», «Nueva conversación», «Hoy / Ayer / Antes», «Aún no hay conversaciones», «Archivar», «Axel está trabajando».

## 7. Rail y tarjeta ancha

- **Rail** = `aside` 316 px con solo la lista: cabecera «Por decidir» + `Badge` contador, `ProposalCard compact` × N, vacío «Estás al día.», error + «Reintentar», skeletons. El scroller sigue siendo de bloque (invariante documentada de §4.2). Salen los props `briefing*` y `onRetryBriefing`; ajustes pasa a icono `Settings2` en la barra (`Link` a `/cmo/settings`, `aria-label="Ajustes de Axel"`). No colapsable en esta pasada; el FAB bajo `xl` y `unseen` se quedan.
- **Highlights del briefing** → ≤ 3 chips con `toneClasses` bajo el h1 en `BriefingHero` (viajan con el informe).
- **Tarjeta ancha**: conserva chip de tipo, vencimiento, título, headline, rationale, CTA («Revisar» / «Ver qué quedó»), estado decidido, `axel-comet-card--new` (finito) y `axel-card-halo`. Se retira el prop `stamped` y la frase de borradores pasa a chip. `compact` intacta.

## 8. Archivos

**Nuevos** (`src/modules/cmo/`): `ui/components/AxelDock.tsx` (barra sticky: slot del stage, título, chip del día con `useTodayLabel` migrado desde `BriefingHero`, acciones), `infrastructure/hooks/use-docked-hero.ts`, `ui/components/ThreadSwitcher.tsx`, `domain/thread-labels.ts`, `ui/components/StarterPills.tsx`. Docs: `docs/plans/cmo_despacho_minimalista_plan.md` (este plan), `docs/design/mockups/cmo-despacho-minimalista.html`.

**Modificados**: `ui/components/AxelChat.tsx` (dock dentro del scroller, `data-empty` + FLIP, píldoras bajo el form, sin «Nueva», sin cejilla, 4 frases, copy), `BriefingHero.tsx` (solo copy + chips; el avatar y la fecha se van a la barra), `ui/CmoView.tsx` (recorta props del rail), `infrastructure/stores/cmo.store.ts` (`threads`, `refreshThreads`, `selectThread`, `archiveThread`, `newThread` local, `TIMEOUT_MESSAGE`), `infrastructure/services/cmo-service.adapter.ts` (`archiveThread`; retirar `createThread`), `CmoBoardRail.tsx` (solo lista), `ProposalCard.tsx` (sin `stamped`, chip), `CmoBlockedState.tsx` y `AxelThinking.tsx` (copy), `src/app/globals.css` (bloque `.axel-dock*`, `.axel-hero`, `.axel-hero-spacer`, `[data-empty]`), `docs/modules/cmo.md` (distribución, «sin briefing» como chip, conversaciones, dock), `docs/design/DESIGN-SYSTEM.md` §5.2 (fila: barra dock de Axel, sticky glass).

**Tests**: `AxelChat.test.tsx` (quitar «Empieza por aquí», nombres sin pista, `/nada sale sin tu aprobación/i` una vez, `within(getByRole("log"))` para «Axel», `mockState` con `threads/selectThread/archiveThread/refreshThreads`; nuevos: píldoras bajo el compositor y desaparecen con mensajes, **un solo** «Saludar a Axel» en el DOM con y sin mensajes); `use-docked-hero.test.tsx` (FakeIO como en `InboxList.test.tsx`: cruce → `data-docked`, vuelta → sin atributo, sin IO no-op, `disconnect` al desmontar); `AxelDock.test.tsx`; `thread-labels.test.ts`; `ThreadSwitcher.test.tsx` (store real con adapter mockeado, patrón `AxelHeroAvatar.test`); `cmo.store.test.ts` (`load` guarda hilos, `selectThread` resetea y guarda de carrera, `newThread` sin API, `ask` refresca hilos, `archiveThread` optimista + rollback); `cmo-service.adapter.test.ts` (`archiveThread`); `CmoBoardRail.test.tsx` (fuera «La lectura de Axel»); `CmoBlockedState.test.tsx` (nuevas regex). Ejecución acotada: `npm test -- --maxWorkers=2 --testPathPattern "modules/cmo"`.

## 9. Fases y gates

| Fase | Entrega | Gate del dueño |
|---|---|---|
| **F0 Mockup** | Artifact + `docs/design/mockups/cmo-despacho-minimalista.html`: estado vacío centrado con píldoras, briefing con propuestas, conversación larga con la barra acoplada (scroll real), conmutador abierto, bloqueado; claro/oscuro; movimiento reducido; tokens y fuentes reales. | Aprueba composición, barra dock, píldoras, conmutador y la tabla de textos de §6. |
| **F1 Textos + píldoras — HECHA** | Dieta de copy, `StarterPills`, 4 frases, `AxelThinking`/`CmoBlockedState`/tarjeta/rail. Sin cambio estructural. | Suite CMO verde; cadenas visibles ≤ 40 y ninguna > 12 palabras; la nota de confianza aparece una vez; KB: cuota dice «siguen atendiendo», sin-briefing es un chip normal. |
| **F2 Dock + compositor centrado — HECHA** (FLIP con WAAPI `el.animate`, no framer: sin dependencia del hilo de framer y no-op en jsdom) | `AxelDock`, `use-docked-hero`, CSS, `data-empty` + FLIP, `BriefingHero` solo copy. | Un solo «Saludar a Axel» en el DOM; el test «0 re-renders por delta» sigue verde; Paint flashing: al acoplar solo repinta la barra; 0 long tasks al hacer scroll; reduced-motion salta sin transición; Firefox y Safari. |
| **F3 Conversaciones — HECHA** | Store + adapter + `ThreadSwitcher` + `newThread` local. | Tests del store verdes; QA: «Nueva» no crea hilos vacíos, cambiar con `thinking` bloqueado, archivar el actual salta al siguiente; teclado completo (Tab, Enter, flechas, Esc devuelve el foco). |
| **F4 Rail — HECHA** | Solo lista; highlights al hero; ajustes a la barra. | `CmoBoardRail.test` verde; bajo `xl` el FAB y `unseen` siguen; AA en los chips de tono. |
| **F5 Pulido y medición — PARCIAL** (docs `cmo.md` y DS §5.2 hechas; la mejora scroll-driven y la medición en navegador quedan para después del deploy) | Mejora scroll-driven bajo `@supports`, ajuste de umbral y spacer, `cmo.md`, DS §5.2, revisión visual. | `next build` sin dependencia nueva (cmdk y Radix ya están); sin `scroll` listeners nuevos (solo el de `useAutoScroll`); el dueño cierra. |

## 10. Verificación end-to-end

1. `npm test -- --maxWorkers=2 --testPathPattern "modules/cmo"`, `npx tsc --noEmit`, `npx eslint src/modules/cmo`. Suites completas y `next build` en la sesión auditora.
2. En `/cmo` (tenant Axi Demo): estado vacío centrado → tocar «¿Cómo vamos?» → el compositor baja con la respuesta, el hilo crece → bajar 20 mensajes → la barra se vuelve cristal y Axel se acopla a 40 px, sigue parpadeando al pensar y mirando al puntero → subir → vuelve al hero. Abrir «Conversaciones»: grupos por día, hilo actual marcado, «Nueva» no crea entradas vacías, archivar el actual salta al siguiente. Rail solo «Por decidir» con contador; cifras del informe como chips bajo el titular. Bloqueo por cuota: «Tus agentes siguen atendiendo». Claro/oscuro, móvil (FAB del tablero), `prefers-reduced-motion`.
3. Contar las cadenas visibles del `/cmo` principal tras F1 (≤ 40) y comprobar que ninguna supera 12 palabras.

## 11. Riesgos y notas

- `backdrop-filter` en el pseudo de la barra + `transform` en el stage hijo puede forzar una capa extra en Safari; si Paint flashing muestra repintado del hilo al acoplar, el pseudo pasa a un hermano absoluto del stage.
- El FLIP del compositor al primer mensaje corre una vez por conversación en el hilo principal (framer); si en el spike visual se nota, la alternativa es el salto directo (como reduced-motion), que también es aceptable.
- `.axel-hero` se usa como clase en `AxelHeroAvatar` y hoy no existe en `globals.css`: pasa a ser la raíz del stage acoplable, sin renombrar.
- `getTranscript` no manda el `limit` que el spec declara requerido; funciona por default del backend. Si el conmutador trae hilos largos, revisar.
