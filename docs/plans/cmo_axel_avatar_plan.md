# Plan — Axel con cara: avatar procedural SVG, reactivo e interactivo en el despacho del CMO

> Plan para `axi-client` (módulo `cmo`) con una pieza de autoría en `axi-video`. Flujo por fases con gate explícito del dueño, mockup HTML antes de codificar y spike antes que fundaciones. Todo lo técnico en inglés; documentación en español. Se versiona en `axi-client/docs/plans/cmo_axel_avatar_plan.md` en F0 (decisión del dueño: recrear `docs/plans/` y `docs/design/mockups/`, archivados el 2026-09-14).

## 1. Contexto

**Qué hay hoy.** Axel vive en `/cmo`. Su única cara es `AxelOrb` (`src/modules/cmo/ui/components/AxelOrb.tsx`): un retrato **raster** (`/images/mascots/cmo-orb.webp`, 24 KB con `priority`) dentro de un orbe de 96 px con anillo cometa tricolor, derrame, vignette, halo y `axel-breathe` cuando piensa. Solo aparece en el hero (`BriefingHero.tsx`) y en `CmoBlockedState`. En cada mensaje de Axel la identidad es `Sparkles` + «Axel» (`AxelChat.tsx`, `MessageBubble` ~L566 y `StreamingBubble` ~L479). El `size="sm"` (34 px) del orbe no tiene consumidor.

**Dos hallazgos del código que condicionan el plan:**
- El anillo cometa (`.axel-orb::after` y `.axel-orb-spill`, `globals.css` ~L1022–1075) gira **en reposo** con `axel-comet 5.5s linear infinite`: repinta un `conic-gradient` (y un `blur(4px)`) cada frame. Es el mayor costo idle de `/cmo` y un loop no declarado en DESIGN-SYSTEM §6. **El dueño decidió eliminarlo** (avatar premium y minimalista).
- `AxelChat` suscribe `thread` y `live` enteros (L124–125): se re-renderiza en **cada delta** de streaming, y con él hero, orbe y todas las burbujas. Hoy es barato (un `<Image>`); con un SVG de decenas de nodos dejaría de serlo. El avatar vivo necesita **suscripción propia** y los avatares pequeños tienen que ser `memo` con props primitivas.

**Qué pide el dueño.** Un avatar «muy premium», reaccionable e interactuable, inspirado en *Bible Strong Avatar Lab*. Reacciones: estado del turno (pensando, hablando, error, cuota), seguir el cursor con la mirada, gesto al tocar (guiño/saludo), expresión distinta al entregar una propuesta o preguntar. Alcance inicial: sustituir el retrato del hero y aparecer en miniatura en cada mensaje. **Corrección del dueño en F0 (2026-09-15): «no quiero que el avatar se vea en cada mensaje, es innecesario de momento».** El alcance v1 es **solo el hero**; las cabeceras de mensaje, la burbuja de streaming y `AxelThinking` se quedan como hoy (`Sparkles` + «Axel»). El tier `sm` y el sprite quedan diseñados pero **aplazados**. Condición añadida: **medir el costo en rendimiento y elegir la opción optimizada sin perder calidad.**

**Señales ya disponibles** (`cmo.store.ts`; nada nuevo del servidor): `thread.thinking`, `live.text` (deltas coalescidos), `live.steps`, `blocker` (`disabled`|`quota`), `message.failed`, `proposal_id`, `question`, `unseen` (`cmo.proposal_created`). El servidor no envía tono ni sentimiento; el humor se deriva en el cliente.

## 2. Licencia (decisión del dueño, 2026-09-15)

Avatar Lab y sus paquetes npm (`@bible-strong/avatar-core|react|web` 0.1.0) son **AGPL-3.0-only**. Camino elegido: **el Studio solo autora; el render es nuestro.** Reglas:

1. **Ni una línea del Lab entra en `axi-client`** (ni npm, ni el motor generado, ni tipos). Lo único que cruza es **un JSON de datos con NUESTRO esquema**.
2. El Studio se instala como herramienta privada en `axi-video/tools/avatar-lab/` como **submódulo git del upstream** (`axi-video` sí es repo git). Uso interno, sin despliegue ni enlace desde ninguna composición ⇒ sin obligación AGPL.
3. **Todas las expresiones y animaciones de Axel se autoran desde cero** en el Studio con nombres propios; no se reutilizan los presets de su biblioteca base (son contenido AGPL).
4. El conversor `axi-video/tools/axel-avatar/convert.mjs` (nuestro, nunca desplegado) lee el export `bible-strong/avatar-definition` v1 solo como formato de interoperabilidad y escribe `axel.avatar.json` en nuestro esquema.
5. Renderer **sala limpia**: diseñado desde nuestro esquema y los precedentes propios (`GlassGlyph`, `BrandMark`), sin leer el código del Lab.

## 3. Flujo de autoría

```
axi-video/tools/avatar-lab/            submódulo upstream (pnpm dev → localhost:5173); en .gitmodules
axi-video/tools/axel-avatar/
├── axel.studio.json                   respaldo del proyecto del Studio (para reeditar)
├── axel.lab.avatar.json               export «Avatar Definition»
├── convert.mjs                        Lab v1 → AxelAvatarDefinition v1; aborta ante primitivas no soportadas
└── README.md                          cómo reeditar y regenerar
axi-client/src/modules/cmo/domain/axel.avatar.json      ← ÚNICO artefacto que cruza (diffable, nunca editado a mano)
```

## 4. Motor de render (nuestro)

### 4.1 Esquema `AxelAvatarDefinition` v1 — `src/modules/cmo/domain/axel-avatar.ts` (TS puro)

- **Primitivas**: `sphere` (`<ellipse>`), `capsule` (`<rect rx>`), `slab` (`<rect>` con `roundness`). El conversor aborta con `cylinder|cone|diamond`; `mickey` = sphere + 2 nodes.
- **`AvatarNode`**: `{ id, primitive, position:[x,y,z], size:[w,h], roundness, roll, material }`. viewBox `0 0 100`, `z ∈ [-1,1]` = factor de parallax y sombreado. `nodes ≤ 6`.
- **Materiales = nombres de token** (`"body" | "body-deep" | "accent"`), nunca hex: el color vive en `globals.css`.
- **Ojos**: `AvatarEye {x,y,width,height,angle}`; estado por expresión `EyeState { open, squintTop, squintBottom, tilt, scale }`. **Boca de trazo** con `mouth` (curvatura −1..1.5 por `scaleY` del arco; negativo = tristeza) y `open` (0..1, elipse para hablar). **Sin cejas independientes**: la «ceja» es `tilt` + `squintTop` del párpado superior (un `rotate` + un `scaleY`).
- **Accesorio** (`accessory: none | headset`): grupo propio bajo `data-acc`, uno a la vez. Las gafas se **descartaron** (dueño, F0). Decisión D0 pendiente entre diadema o ninguno; el mockup arranca sin accesorio.
- **`AvatarExpression`**: `head {yaw,pitch,roll}` (clamp ±22/±12/±10°), `eyes {left,right,spacing,gaze:[x,y]}`, `mouth`, `open`, `depth` (la `perspective` del Lab remapeada 0.5–1.5), `motion {eyes: none|saccades, body: none|drift}`.
- **Animaciones**: `steps[{expression, holdMs, transitionMs, ease: spring|smooth|snappy}]`, `mode once|loop|pingPong`. **`BlinkConfig`** `{initialDelayMs,min,max,durationMs}`.
- `expressions.neutral` obligatorio; ~8 expresiones: `neutral, listening, thinking, speaking, proud, curious, sorry, asleep` (+ gestos `wink, wave, nod` como animaciones `once`).

Resolvers puros del mismo fichero, testeables sin DOM: `assertAvatarDefinition(raw)`, `resolvePose(def, expression) → AxelPose` (números derivados: `faceDx/Dy`, `faceSx`, `eyeGap = spacing·cos(yaw)`, `eyeSxL/R`, `lidTop/Bot`, `lidTilt`, `hotDx/Dy`, `shadowDx`), `poseToStyle(pose, ms, ease) → Record<'--axel-*', string>` (~18 variables), `easeToCss`, `nextBlinkDelayMs(cfg, random)`, `springToLinear(stiffness, damping) → 'linear(...)'`.

`domain/axel-avatar.data.ts`: `export const AXEL_AVATAR = assertAvatarDefinition(raw)` (`resolveJsonModule` ya activo).

### 4.2 SVG sin filtros (patrón `glass-glyph.tsx`: componente = geometría, material por `data-layer`/`data-stop`)

**Dirección de arte (dueño, 2026-09-15): familia de Lumo.** Cabeza de arcilla blanca mate, ojos ovalados de carbón, sonrisa de trazo, sombras muy suaves; «premium y profesional». El violeta de IA vive solo en el halo del orbe.

Capas `lg` de atrás adelante: cuerpo (radial 3 stops blanco → marfil → arena, foco arriba-izq) → oclusión suave abajo-derecha → especular ancho y tenue (se mueve **contra** el giro: la luz está fija en el mundo) → cara: por ojo óvalo de carbón (gradiente 2 stops) + glint (`translate` por gaze) → párpado superior/inferior (`<rect>` fill `--axel-lid` = marfil, `scaleY` con `transform-box: fill-box`, `rotate` para la ceja) → boca (arco `stroke` carbón, `scaleY` por curvatura; elipse `open` para hablar) → accesorio (gafas en la cara; diadema en un grupo `band` que sigue al cuerpo). Sin platillo de sombra dentro del orbe. `defs`: 3 clipPath + ≤ 5 gradientes con `useId()`.

El 3D se falsea solo con `transform`: parallax en tres profundidades, la cara se comprime en X con el yaw y el ojo lejano más, la separación baja con `cos(yaw)`, `roll` gira cuerpo + cara juntos. Apertura, squint, mirada, parpadeo y curvatura de la boca son `scaleY`/`translate`: **ningún path morph**. Cero `<filter>`, cero `backdrop-filter`, cero hex.

### 4.3 Mecánica de animación — CSS variables + `transition` (elegida)

| Opción | Costo por frame | Veredicto |
|---|---|---|
| **(a) vars en `style` del `<svg>` + `transition: transform` en ≤ 8 grupos rig** | 0 JS; repaint del SVG de 96 px solo durante transiciones finitas | **Elegida** |
| (b) framer `useMotionValue`/`animate` | rAF en el hilo principal toda la transición; §6 lo veta para animación crítica | Descartada |
| (c) WAAPI | sin JS por frame pero N `Animation` por grupo y gestión en JS | Sobra |

- Presets nuevos en `src/core/styles/motion.ts`: `cssEase = { spring: linear(...) ≡ spring.soft (260/30), snappy: linear(...) ≡ spring.snappy (400/30), smooth: cubic-bezier(0.4,0,0.2,1), fallback: cubic-bezier(0.22,1,0.36,1) }`; un test fija que `springToLinear` reproduce las constantes. `@supports not (transition-timing-function: linear(0,1))` → fallback.
- React solo escribe `style` (pose + `--axel-dur`/`--axel-ease`) y `data-expression`. `AxelAvatar` es `memo` con props primitivas.
- **Gotcha verificado en el mockup:** la regla genérica del rig (`transform-box`/`transform-origin` para `[class^="axel-rig-"]`) debe declararse con **`:where()`** (especificidad cero). Con un selector normal ganaba a los orígenes de cada pieza y boca, párpados y apertura escalaban alrededor del centro de la cara: la boca «viajaba» por la cara al hablar y la de tristeza aparecía sobre los ojos. La boca (arco + apertura) vive en un grupo `lips` que se mueve con la mirada, y el arco pivota en la línea del labio (`transform-origin: 50px 60px`).
- El *runtime* (parpadeo, saccades, mirada, secuencias) escribe **directo al DOM por ref** en variables que React no toca (`--gaze-x/y`, `--axel-track-yaw/pitch`); el CSS compone `calc(var(--axel-yaw) + var(--axel-track-yaw, 0))`. Sin competencia por la misma propiedad. Precedentes: `TiltCard`, `useTypewriterPlaceholder`.
- Secuencias = `setTimeout` encadenado por paso (3–6 re-renders por turno), solo con turno vivo o one-shot.

### 4.4 Dos tiers (v1 construye solo `lg`)

- **`lg` 136 px (hero y `CmoBlockedState`)**: inline con `useId`, rig completo, vida y mirada. ≤ 70 nodos.
- **`sm` 34 px — APLAZADO por decisión del dueño (F0)**. El diseño se conserva para cuando se retome: cabeceras de mensaje, streaming, thinking; pose congelada, sin párpados/glint/rim/sombra/transiciones. **Sprite**: `AxelAvatarSprite` (`<svg width=0 height=0 aria-hidden>` con `<symbol id="axel-sm-v1">` y defs; `position:absolute`, **nunca** `display:none`) montado **una vez** en `CmoView`; cada instancia es `<svg class="axel-avatar axel-avatar--sm" aria-hidden><use href="#axel-sm-v1"/></svg>` (≤ 4 nodos). Con 50 mensajes: ~216 nodos vs ~700 inline, ~7 KB vs ~55 KB de HTML SSR. Theming funciona porque `.dark` es ancestro del sprite. Prop `sprite={false}` conserva el modo inline como fallback y para el spike. Una expresión por instancia vía `data-expression` (idle/proud/curious/speaking/thinking): variantes del symbol o pequeñas clases CSS sobre `<use>`; lo decide el spike.

### 4.5 El orbe desaparece (decisión del dueño, segunda vuelta de F0)

**Sin orbe: solo el personaje, más grande y con sombra.** `AxelOrb` **se elimina** (disco, borde, halo, anillo cometa, derrame, vignette y el `<Image>`). En su lugar, `AxelHeroAvatar` monta un escenario `.axel-stage` de 136 × 140 px con el `AxelAvatar lg` a ancho completo y una **sombra de contacto** debajo (`.axel-ground`: elipse con `radial-gradient` sobre `--axel-shadow`, sin `filter`). `axel-breathe` solo con turno vivo, sobre el raíz HTML (compositor): el personaje sube 1,5 px y escala 1,035 mientras la sombra se encoge en contrafase. Se borran de `globals.css` todas las reglas `.axel-orb*`; el `@keyframes axel-comet` **se conserva** porque lo usa `.axel-comet-card--new::after` (3 vueltas finitas). El violeta de IA ya no está en el avatar: queda en el resto del módulo (Sparkles, tarjetas, aurora).

### 4.6 Theming

Tokens declarados una vez en `.axel-avatar` y redefinidos en `.dark .axel-avatar`: el material del personaje es **propio y estable en ambos temas** (la arcilla blanca es la identidad, como el retrato de Lumo), con las sombras un punto más profundas en oscuro: `--axel-body-hi|mid|deep`, `--axel-occ`, `--axel-hot`, `--axel-ink`, `--axel-ink-hi`, `--axel-glint`, `--axel-lid`, `--axel-halo` (este sí derivado de `--axi-violet`). Son los únicos literales del avatar y viven en `globals.css`, como los blancos «de física» de `.glass-glyph`. Hooks `[data-stop="body-hi"] { stop-color: var(--axel-body-hi) }`, `[data-layer="mouth"] { stroke: var(--axel-ink) }`.

## 5. Humor, vida e interacción

### 5.1 Máquina de humor (dominio puro) — `src/modules/cmo/domain/axel-mood.ts`

`AxelMood = idle | listening | thinking | speaking | proud | curious | sorry | asleep`; `AxelGesture = wink | wave | nod`. Entrada `AxelMoodInput` **solo primitivos**: `{ blocker, thinking, streaming (live.text.length > 0), lastMessage: {role, failed, hasProposal, hasQuestion} | null, ownerTyping, celebrating }`.

Prioridad de `resolveAxelMood` (la primera gana): 1 `blocker` → `asleep` · 2 último mensaje del dueño `failed` → `sorry` (pegajoso hasta reintentar) · 3 `thinking && !streaming` → `thinking` · 4 `thinking && streaming` → `speaking` · 5 `ownerTyping` → `listening` (teclear es la señal más nueva; una cara que sigue «preguntando» mientras le contestas lee como que no escucha) · 6 `celebrating` → `proud` · 7 último de Axel con pregunta → `curious` (pegajoso, igual que `questionLive`) · 8/9 → `idle`.

Constantes: `PROUD_MS = 6000`, `GESTURE_MS = {wink:600, nod:500, wave:900}`, `TAP_WINDOW_MS = 1500`, `TAP_COOLDOWN_MS = 250`, `EASTER_EGG_TAPS = 3`. Helpers: `gestureForTap(n)` (1–2 → wink, 3 → wave), `messageExpression(m)` (proposal > question > idle), `gazeAllowed(mood)` (idle|listening|curious|proud), `MOOD_EXPRESSION: Record<AxelMood, string>`.

No-objetivos v1 (documentados): `hasSteps` como humor distinto (obligaría a suscribir `live.steps`; `AxelThinking` ya lo cuenta con palabras), `offline` (el store no expone conectividad).

### 5.2 Hook — `src/modules/cmo/infrastructure/hooks/use-axel-mood.ts`

- Selector `selectMoodSnapshot` (exportado) con **`useShallow`** de `zustand/react/shallow` (zustand 5.0.8; primer uso en el repo): `{ thinking, streaming: live!==null && live.text.length>0, blocker, lastId, lastRole, lastFailed, lastProposal, lastQuestion, unseen }`. Nueve primitivos ⇒ **cero re-renders del avatar durante todo el streaming**. Nunca `live`, `live.text`, `live.steps` ni `seq`.
- `motion = useReducedMotion() !== true` (framer, precedente `tilt-card.tsx`).
- **Celebración one-shot**: efecto sobre `[lastId, unseen]`; no celebra en el montaje (hilo recargado con propuesta vieja); celebra si llega un mensaje de Axel con `proposal_id` o `unseen` sube, **solo con `document.visibilityState === "visible"`**: `celebrating` 6 s + gesto `nod`. Timer único, reinicia con otra propuesta, limpia al desmontar.
- **Gestos**: un `gestureTimer`; el gesto termina por `setTimeout(GESTURE_MS)` en el hook (un solo camino de verdad; con `animation:none` bajo reduced-motion `animationend` jamás llegaría).
- **`greet()`**: inerte si `!motion`, gesto en curso, cooldown, o mood `thinking|speaking|asleep|sorry`. Cuenta toques en ventana; 3.º = `wave`.
- `visibilitychange` → oculto cancela gesto y timer.

### 5.3 Vida (parpadeo, saccades, secuencias) — `infrastructure/hooks/use-axel-life.ts` (DOM por ref)

**Decisión del dueño: solo con actividad.** En reposo puro: **cero timers, cero rAF**.

| Disparador | Qué se mueve | Clase §6 |
|---|---|---|
| `thinking` (trabajo del servidor) | blink + saccades + secuencia `thinking` (foco izq/der) + `axel-breathe` del escenario | indicador ligado a un job |
| `speaking` (deltas llegando) | expresión `speaking` + micro-asentimiento por CSS bajo `[data-expression="speaking"]`; el nodo existe solo mientras el servidor escribe | idem |
| Mensaje final / cambio de humor | one-shot `ack` (doble parpadeo, ≤ 1.2 s, `once`) | finito, por evento |
| Montaje de `/cmo` con `SplashContext.phase === "idle"` | one-shot `wake` ≤ 1.5 s, una vez por pantalla | finito (condición de las celebraciones) |
| `pointerenter`/`:focus-visible` en el hero | mirada + la cabeza sigue al 30 % | «lo enciende el ratón» |
| reduced-motion | nada de lo anterior; el cambio de expresión salta sin `transition` | obligatorio |

Todos los timers se pausan con `visibilitychange` (patrón `FlipCountdown`, `ConversationPanel`). DESIGN-SYSTEM §6 gana **una viñeta en «lo que NO cuenta como excepción»** (mirada, gestos, vida ligada al turno); la excepción de la aurora **no se amplía** y el orbe deja de tener loops.

### 5.4 Mirada (solo hero) — `infrastructure/hooks/use-axel-gaze.ts`

`useAxelGaze(ref, { enabled })` con `enabled = motion && gazeAllowed(mood) && gesture === null`. Escribe `--gaze-x/--gaze-y ∈ [-1,1]` por `el.style.setProperty`; el CSS mueve iris/párpados con `translate(calc(var(--gaze-x,0) * Npx))` y `transition: transform 90ms linear` (la transición CSS suaviza, sin lerp ni bucle). Detalles: `pointermove` en `window` `{passive:true}` (los ojos siguen al puntero por toda la pantalla; el radio `280 px` satura al borde); **solo `(hover: hover) and (pointer: fine)`** (en táctil nada en reposo; el toque es el gesto); `IntersectionObserver` quita el listener cuando el hero sale de pantalla (arranca activo; en jsdom IO es no-op); coalescido a **un** rAF por frame que lee `getBoundingClientRect()` una vez; **sin puntero moviéndose no hay rAF vivo**; `mouseleave`/oculto → `0,0` + `data-gaze="settle"` (transición 400 ms). Cleanup completo al desmontar. Prop `gaze?: {x,y}` del renderer queda como override estático (tests, mockup, bloqueado).

### 5.5 Gesto al tocar

Con `motion`: el hero es `<button type="button" aria-label="Saludar a Axel">` con `onPointerDown={e => e.preventDefault()}` (no roba el foco al compositor; Tab/Enter siguen funcionando), anillo `focus-visible:ring-ring`, `touch-action: manipulation`. Sin `motion`: `<div role="img" aria-label="Axel, tu director de mercadeo">` (un botón que no hace nada visible sería un control que promete lo que no existe). `CmoBlockedState`: `role="img"`, `asleep`, sin botón.

### 5.6 Accesibilidad

Label del hero **estático** (el humor va en `data-mood`/`data-gesture`, no en el label: `AxelThinking` ya anuncia por `aria-live` y el `role="log"` la respuesta final; cambiar el label de un botón enfocado se re-anunciaría). SVG siempre `aria-hidden focusable="false"` sin `<title>`. Mini avatares `aria-hidden` (el `<span>Axel</span>` es la identidad; `AxelChat.test.tsx` L325 depende de él). Ningún `aria-live` nuevo. Reduced-motion: `.axel-avatar, .axel-avatar * { transition:none; animation:none }` en el bloque de L1375.

## 6. Presupuesto de rendimiento y medición (petición del dueño)

Nota honesta: un `transform` en un `<g>` interno **no** crea capa de compositor; repinta el SVG. A 96 px son décimas de milisegundo y sin layout. Compositor puro solo el `transform` del raíz HTML.

| Métrica | `lg` | `sm` sprite / inline | Verificación |
|---|---|---|---|
| Nodos `svg *` por instancia | ≤ 70 | ≤ 4 / ≤ 20 | jest |
| `<filter>`, `filter:`, `backdrop-filter`, hex en el componente | 0 | 0 | jest (regex `innerHTML`, patrón `glass-glyph.test.tsx`) |
| Gradientes en `defs` | ≤ 6 | 2 compartidos | jest |
| Grupos con `transition` | ≤ 8 | 0 | jest sobre clases `axel-rig-*` |
| rAF vivos en reposo | 0 | 0 | Performance Monitor + código |
| Timers en reposo / con turno vivo | 0 / ≤ 2 | 0 | jest `useFakeTimers` + `getTimerCount()` |
| Re-renders del avatar en 50 deltas | **0** | 0 (`memo`) | Profiler + test con `useCmoStore.setState` × 50 y contador |
| Paint por frame en transición | ≤ 0.5 ms | — | Performance panel |
| Long tasks atribuibles al avatar en un turno | 0 | 0 | Performance panel |
| CPU idle en `/cmo` (pestaña visible, sin puntero) | **≈ 0 %** (hoy ~1–2 % por el cometa) | — | Performance Monitor 30 s |
| Puntero → mirada | < 16 ms | — | Performance panel |
| Bundle renderer + resolvers + hooks + JSON (gz) | ≤ 6 KB (objetivo 4.5) | incl. | `next build` + `gzip -c` |
| Delta First Load JS de `/cmo` | ≤ +5 KB gz | — | `next build` antes/después |
| `axel.avatar.json` raw | ≤ 3 KB | — | validador + test |
| Peticiones eliminadas | `cmo-orb.webp` 24 KB `priority` | — | Network |

**Protocolo antes/después** (build de producción, `next start`, Chrome limpio, claro y oscuro): (1) `next build` → First Load JS de `/cmo`; (2) reposo 30 s → CPU %, layouts/s, recalcs/s; repetir con puntero sobre el hero 10 s; (3) grabar un turno real → long tasks, scripting, paint, composite filtrados por el subárbol del orbe; (4) Layers: el orbe raíz con capa propia en `axel-breathe`, ningún nodo del SVG con capa nueva; (5) Profiler «record why each component rendered» con 50 deltas → `AxelAvatar` 0 commits; (6) `AxelAvatar.test.tsx` con el presupuesto ejecutable. Los números se anotan en el plan versionado.

## 7. Archivos

**Nuevos (`axi-client`)**
- `src/modules/cmo/domain/axel-avatar.ts` (+ `__tests__/axel-avatar.test.ts`), `domain/axel-mood.ts` (+ tests de tabla), `domain/axel.avatar.json`, `domain/axel-avatar.data.ts`
- `src/modules/cmo/infrastructure/hooks/use-axel-mood.ts`, `use-axel-life.ts`, `use-axel-gaze.ts` (+ `__tests__/`)
- `src/modules/cmo/ui/components/AxelAvatar.tsx` (`forwardRef`, `memo`; tier lg inline / sm `<use>`), `AxelAvatarSprite.tsx`, `AxelHeroAvatar.tsx` (suscripción propia + botón/img + escenario con sombra), `AxelCardHeader.tsx` (**aplazado**: fila `sm` + «Axel» + children) (+ `__tests__/AxelAvatar.test.tsx`, `AxelHeroAvatar.test.tsx`)
- `docs/plans/cmo_axel_avatar_plan.md` (este plan), `docs/design/mockups/axel-avatar.html`

**Modificados**
- `AxelOrb.tsx`: **se elimina** (sus dos consumidores, `BriefingHero` y `CmoBlockedState`, pasan a `AxelHeroAvatar` / `AxelAvatar` sobre `.axel-stage`).
- `BriefingHero.tsx`: `busy` → `ownerTyping`; monta `AxelHeroAvatar`.
- `AxelChat.tsx`: `composerFocused` local + `ownerTyping={composerFocused || draft.trim() !== ""}`; `MessageBubble`/`StreamingBubble` usan `AxelCardHeader` (adiós `Sparkles` ahí; se conserva el de la nota del compositor).
- `AxelThinking.tsx`: `AxelCardHeader expression="thinking"` («pensando…») sobre pasos/frases (continuidad de la tarjeta en hilos largos; opt-out de una línea).
- `CmoBlockedState.tsx`: `AxelOrb` → `.axel-stage` con `AxelAvatar lg asleep` y sombra, `role="img"`.
- `CmoView.tsx`: monta `AxelAvatarSprite` una vez (test: exactamente uno).
- `src/core/styles/motion.ts`: `cssEase`.
- `src/app/globals.css`: bloque `.axel-avatar` (tokens, `data-stop`, rig transitions, `@keyframes axel-blink`, `@supports linear()`), `.axel-stage`/`.axel-ground`/`axel-breathe`, **borrado de todas las reglas `.axel-orb*`**, reduced-motion en L1375.
- `docs/design/DESIGN-SYSTEM.md` §6: viñeta en «lo que NO cuenta como excepción»; nota de que el orbe ya no tiene loops.
- `public/images/mascots/cmo-orb.webp`: borrar en F5 (único consumidor verificado).
- `AxelChat.test.tsx`: `mockState` gana `blocker: null, unseen: 0`; aserciones nuevas de `data-expression` por mensaje y en streaming.

**Nuevos (`axi-video`)**: `tools/avatar-lab` (submódulo), `tools/axel-avatar/{convert.mjs, README.md, axel.studio.json, axel.lab.avatar.json}`.

## 8. Fases y gates

| Fase | Entrega | Gate del dueño |
|---|---|---|
| **F0 Mockup** | Worktree `feat/cmo-axel-avatar` en `axi-client`. Plan commiteado en `docs/plans/`. `docs/design/mockups/axel-avatar.html` como Artifact: el orbe nuevo sin anillo, los 8 humores × 2 tiers, 3 gestos, mirada con el ratón, toggle claro/oscuro y reduced-motion, hilo de ejemplo con cabeceras `sm`. Solo CSS vars y `data-*`, tokens literales de `globals.css`, fuentes incrustadas. | Aprueba la cara de Axel, las expresiones y el orbe minimalista. |
| **F0.5 Spike go/no-go** (1–2 días, desechable) | Studio instalado en `axi-video/tools/avatar-lab`; Axel autorado y exportado; `convert.mjs` mínimo; `AxelAvatar lg` con rig + botones de expresión al lado del raster actual; 50 `sm` por sprite + 1 `lg` con deltas simulados; Safari/Firefox (`<use>` + tokens, fallback de `linear()`); `next build` delta; test jest de presupuesto. | **Go** si: el dueño prefiere el SVG al raster; idle ≈ 0 %; paint ≤ 0.5 ms/frame; 0 re-renders en 50 deltas; sprite temático correcto en 3 navegadores; bundle ≤ 6 KB. **No-go parcial**: SVG solo en el hero, raster/`Sparkles` en `sm`. **No-go total**: dos frames raster con crossfade. |
| **F1 Dominio + renderer** | `axel-avatar.ts`, `axel-mood.ts`, JSON + data, `AxelAvatar`/`AxelAvatarSprite`, `cssEase`, bloque CSS; tests de dominio y de presupuesto. | Verja acotada verde (`npm test -- --maxWorkers=2` sobre `src/modules/cmo`, `tsc`, lint de lo tocado). |
| **F2 Hero** | `use-axel-mood`, `use-axel-life`, `AxelHeroAvatar` (escenario + sombra), borrado de `AxelOrb`, `BriefingHero`/`AxelChat` (`ownerTyping`), `CmoBlockedState`. | Test de 0 re-renders verde; visual claro/oscuro; `AxelChat.test` verde. |
| **F3 Mensajes/streaming** | **APLAZADA** (dueño, F0): sin avatar en los mensajes. Se retoma solo si el dueño lo pide; el diseño (`AxelCardHeader`, sprite `sm`) queda en §4.4 y §5.3. | — |
| **F4 Mirada + gesto** | `use-axel-gaze`, botón `greet`, easter egg, cooldown. | Tests de hook/componente; prueba manual táctil (sin mirada, toque = guiño) y reduced-motion (imagen, nada se mueve). |
| **F5 Pulido, docs, medición** | Reduced-motion final, §6 del DESIGN-SYSTEM, borrar `cmo-orb.webp`, tabla de medición antes/después rellenada en el plan, README de autoría en `axi-video`. | Checklist §11 del DESIGN-SYSTEM; suites completas y build delegadas a la sesión auditora; el dueño cierra y decide el push. |

## 9. Verificación end-to-end

1. `npm test -- --maxWorkers=2 --testPathPattern "modules/cmo"` y `npx tsc --noEmit -p tsconfig.json` (acotado; las suites completas y `next build` las corre la auditora, que también ejecuta el protocolo §6).
2. En `/cmo` con el tenant Axi Demo: reposo 30 s (CPU ≈ 0, sin rAF), teclear → `listening`, enviar «¿Cómo vamos?» → `thinking` con parpadeo/saccades → deltas → `speaking` → mensaje final → `ack` → `idle`; propuesta nueva → `proud` 6 s + `nod`; pregunta → `curious`; forzar fallo del POST → `sorry` y reintentar; apagar Axel en `/cmo/settings` → `asleep` sin botón; mover el ratón por la pantalla → mirada; click → guiño, 3 clicks → saludo; `prefers-reduced-motion` → imagen quieta con expresiones instantáneas; pestaña oculta → timers pausados.
3. Cada mensaje histórico de Axel muestra su `sm` congelado (proud/curious/idle); la burbuja de streaming `speaking`; `AxelThinking` `thinking`.
4. Claro y oscuro, Chrome/Safari/Firefox, móvil (sin mirada, toque = gesto).

## 10. Decisiones cerradas y riesgos

**Cerradas por el dueño (2026-09-15):** licencia = Studio solo autora (opción 2), el Studio vive en `axi-video`; alcance = hero + mensajes + streaming; reacciones = turno, mirada, toque, propuesta/pregunta; **el anillo cometa se elimina**; vida solo con actividad; plan y mockup recreados en `axi-client/docs`.

**Segunda vuelta de F0 (2026-09-15):** el dueño rechazó la primera cara (esfera violeta con ojos luminosos) y pidió la **familia de Lumo**; el mockup se rehízo con arcilla blanca mate, ojos de carbón, boca de trazo y selector de accesorio. Tercera vuelta el mismo día: **fuera el orbe**, solo el personaje a 136 px con sombra de contacto. Cuarta: **sin avatar en los mensajes** (tier `sm` aplazado), **sin gafas** (D0 = diadema o nada) y corrección del bug de especificidad del rig.

**Tomadas en el plan (revisables en F0):** sin cejas; boca de trazo; **D0 accesorio** (gafas propuestas, diadema o ninguno); `listening` gana a `curious`/`proud`; `AxelThinking` lleva cabecera con avatar; `sm` por sprite; sin humor `hasSteps` ni `offline` en v1; label ARIA estático.

**Riesgos:** fidelidad de una esfera con radiales frente al render del Studio (lo resuelve el spike); `linear()` sin soporte en Safari < 17.2 (fallback cubic-bezier); `<use>` + tokens en Safari viejo (fallback inline); el conversor no cubre todas las primitivas del Lab (aborta con mensaje; se autora dentro del subconjunto); el formato del Lab es pre-release (guardamos `axel.studio.json` y nuestro JSON es la fuente estable).
