# Kit compartido de asistente premium — Axel (/cmo) y Alba (/configurar)

> Plan aprobado por el dueño el 2026-09-17. Rama `feat/assistant-kit` (worktree
> `.claude/worktrees/assistant-kit`) a partir del main local `0a7f717`, que ya trae
> `intake` y `campaign-hsm` sin push. Mockup F0: `docs/design/mockups/assistant-kit-premium.html`
> (se genera con `assistant-kit-premium.build.py` a partir de `assistant-kit-premium.template.html`).

## 1. Contexto

La puesta en marcha conversacional (`modules/intake`, `/configurar/{token}`, asistente «Alba») se
construyó con un lenguaje visual propio —orbe, cápsula de cristal propia, burbujas iOS, bloque
`.intake-*` en `globals.css`— y **duplica** lo que ya existe en el despacho de Axel (`modules/cmo`).
Verificado en el código antes de planificar:

- `SetupQuestion` y `AxelQuestion` tienen la misma firma (`{question, live, busy, onPick, onWriteInstead}`),
  la misma puerta `live && !busy`, el mismo bucle de opciones y la misma salida «prefiero escribir».
- El compositor repite `MAX_PX = 120`, el autosize y el handler Enter/Shift+Enter línea por línea.
- `SetupChat` reimplementa a mano `core/hooks/use-auto-scroll.ts`, que Axel ya usa.
- `UiMessage {pending, failed}` se declara tres veces; la burbuja propia repite `items-end gap-1.5`,
  el radio asimétrico, `opacity-60` y el `RotateCcw` de reintento.
- La marca «✦ + nombre» (`Sparkles text-accent-violet`) está inlineada en seis sitios.
- Dos bloques CSS sin una declaración en común (`.axel-*` y `.intake-*`); `.intake-glass` es una cuarta
  receta de cristal fuera de las tres del DESIGN-SYSTEM §5.
- Defectos incidentales: `SetupChat` recibe `assistantName` y no lo usa; `.intake-flash` es CSS muerto;
  `SetupView` suscribe el store entero sin selectores; `.axel-hero` se usa en JSX y no tiene regla.

**Objetivo.** Un solo kit presentacional en `shared/` (avatar, escenario, dock, hilo, burbujas,
pregunta, pensando, markdown, compositor, píldoras, aura) con acabado premium estilo Apple/iOS
dentro de la línea de axi, consumido por Axel y por Alba. Se borra lo duplicado.

## 2. Decisiones del dueño (2026-09-17)

1. **Alba = la misma cara** (rig familia Lumo) y el mismo escenario/dock, personaje propio: se llama
   Alba y **lleva la diadema siempre**. Axel sigue con su preferencia (`none` por defecto). Sustituye
   al «no es Axel y no debe parecerse» de `AlbaMark`.
2. **Sin micrófono en Axel**: el compositor expone la voz como prop opcional; solo Alba la activa.
   Cero cambios de backend.
3. **Misma piel en ambos a la vez**: burbuja del humano en coral degradado (el «azul de Messages»),
   tarjeta del asistente sólida sin borde con `shadow-float`, compositor cápsula `.glass`, dock de
   cristal al acoplarse, aura compartida.

**Fuera de alcance:** backend; la lógica de la ficha de Alba (solo se re-viste); `ProposalCard`,
`BriefingHero`, `ThreadSwitcher`, `CmoBoardRail` (dominio CMO); el inbox de operadores (mensajería
con ticks y media, sigue aparte).

## 3. Dirección de diseño

Referente DESIGN.md: Apple/iOS, minimalista, translúcido selectivo, tipografía protagonista,
movimiento sutil y físico. Tokens literales; ningún hex nuevo en componentes.

| Pieza | Decisión |
|---|---|
| Suelo | `.assistant-field` = el aura actual de `.axel-field` (dos resplandores violeta anclados abajo + grano; sin animación/filter). Compartida con /configurar → DESIGN-SYSTEM §2.3 pasa a nombrar `.assistant-field` como la excepción al techo del 14 %. |
| Avatar | Mismo rig SVG (≤70 nodos, ≤6 gradientes, sin filter, sin hex). Hero 136×140 que se acopla a 40 px (`scale(0.2857)`) por `IntersectionObserver`. Alba: `accessory="headset"` fijo. |
| Dock | Sticky; transparente en reposo, `.glass` acoplado (§5.2). Título en Nexa, meta a la derecha (fecha en Axel · «Poniendo a punto {empresa}» en Alba). Acciones arriba a la derecha del campo (Axel: Conversaciones/Nueva/Ajustes; Alba: chip `n/m` de la ficha en móvil). |
| Tarjeta del asistente | `bg-background`, sin borde, `shadow-float`, radio 20 con la esquina inferior-izquierda a 6 px; cabecera «✦ Nombre» + chip «N fuentes» opcional; cuerpo `AssistantMarkdown` a 15 px/1.55; `children` para pregunta o extras. |
| Burbuja del humano | Coral degradado `linear-gradient(160deg, brand 78 %+white, brand 45 %, brand-2)`, texto on-color, `max-w-[82%]`, radio 20/6; `opacity-60` pendiente; anillo `destructive/40` + «Reintentar» fallida; pie «Dictado» con `Mic`. |
| Pregunta | Dentro de la tarjeta; eyebrow «Elige una» / «Pregunta anterior» en violeta; opciones como lista agrupada iOS (`.grouped-list`/`.grouped-row`, hairline inset 16 px, chevron, hint en segunda línea), `<button>` reales; salida en `text-brand`. Copy por props. |
| Pensando | Con pasos del servidor: lista `Loader2/Check` + ms (Axel). Sin pasos: tres puntos en tarjeta pequeña. Indicador ligado a un trabajo del servidor (§6), no un loop. |
| Compositor | Cápsula `.glass` (65 %/16px), radio 26, `shadow-float`, `focus-within` violeta 30 %; autosize ≤120 px; enviar 36 px `bg-brand-gradient` con `ArrowUp`; micrófono opcional; rama «grabando» con onda de 7 barras y Cancelar/Detener; placeholder máquina de escribir opcional; `footer` para la línea de confianza. En Axel conserva el FLIP centrado→abajo. |
| Píldoras | `rounded-full`, `bg-background/80 backdrop-blur`, icono + etiqueta, prompt en `aria-label`. |
| Movimiento | Entrada `assistant-rise` (translateY 10 px + fade, 320 ms, `cssEase.spring`) solo para mensajes nuevos de la sesión; dock/compositor solo `transform`/`opacity`; todo apagado con `prefers-reduced-motion`. Sin loops en reposo. |
| Lista agrupada | `.grouped-list`/`.grouped-row` reemplazan `.intake-card`/`.intake-row`; la usan la pregunta y la ficha (etiqueta → valor, una línea secundaria, un solo indicador). |

## 4. Arquitectura destino

`shared/` nunca importa de `modules/` → el kit es **presentacional puro** (props y slots); cada slice
aporta su store, su copy y su personaje.

```
src/shared/components/features/assistant/
├── index.ts · types.ts
├── avatar/   avatar-rig.ts · avatar-mood.ts · AssistantAvatar · AssistantStage · AssistantHeroAvatar · AssistantDock
├── chat/     AssistantMark · AssistantBubble · UserBubble · SystemNote · AssistantQuestion · AssistantThinking
│             AssistantMarkdown · markdown.ts · AssistantComposer · StarterPills
├── shell/    AssistantChatShell · use-composer-flip.ts
└── hooks/    use-avatar-gaze · use-avatar-life · use-docked-hero · use-stored-accessory
src/core/hooks/use-typewriter-placeholder.ts · use-voice-recorder.ts
```

- **Compositor**: `{ onSend(body, {voice}), disabled?, busy?, placeholder, placeholderPhrases?,
  voice?: { transcribe(blob) }, focusToken?, textareaRef?, footer?, after?, formRef? }`.
- **Shell**: `{ empty, docked?, dock, actions?, hero?, children, composer, autoScrollDeps, ariaLabel }`.
  La raíz escribe `data-empty`; `useDockedHero` escribe `data-docked` por `dataset`.
- **Se queda en `cmo`**: `AxelChat` (wrapper: mapea `UiMessage`, propuestas hermanas, `settled/anchored`,
  `BriefingHero`, `CmoActions`, `CmoBlockedState`), `AxelHeroAvatar` (= `useAxelMood` → `AssistantHeroAvatar`),
  `AXEL_LABEL`, `STARTERS`, `PLACEHOLDER_PHRASES`, `ProposalCard`, `ThreadSwitcher`, `CmoBoardRail`, `CmoView`.
- **Se queda en `intake`**: `SetupView` (con selectores), `SetupThread` (mapea `IntakeMessage`; la línea
  «✓ Anotado · …» es de intake), `AlbaHeroAvatar` + `useAlbaMood`, `ALBA_LABEL`, la ficha re-vestida.
- **CSS**: renombrar `.axel-avatar/.axel-rig-*/.axel-stage*/.axel-ground/.axel-field/.axel-chat/.axel-scroller/
  .axel-dock*/.axel-hero-spacer` → `.assistant-*` en un bloque único; añadir `.assistant-bubble-user`,
  `.assistant-send`, `.assistant-rise`, `.assistant-dots`, `.assistant-wave`, `.grouped-list`, `.grouped-row`;
  borrar el bloque `.intake-*` y `.axel-hero`. Se conservan `.axel-comet-card*`, `.axel-card-halo` (cmo).

## 5. Invariantes que el refactor no puede romper (fijadas por tests)

1. Cero timers/rAF en reposo; vida solo con turno vivo (`AxelHeroAvatar.test`).
2. El avatar no se re-renderiza por delta de streaming: la única suscripción es el wrapper con
   `useShallow` de 9 primitivos; el hero compartido es `memo` con props primitivas. Nunca pasar `mood`
   desde el chat.
3. Un solo Axel vivo (hero = dock, misma instancia; bloqueado = cara estática dormida).
4. El `<form>` no se remonta; `data-empty` cambia el layout; FLIP finito por WAAPI; salto directo con
   reduced motion.
5. Docking por `IntersectionObserver` + `dataset`, sin `useState` ni scroll listeners.
6. Solo `transform`/`opacity` en dock y burbujas; números una vez como variables CSS.
7. Avatar = geometría (sin hex, sin `<filter>`, ≤70 nodos, ≤6 gradientes; `:where()` en la regla del rig).
8. Gestos terminan por `setTimeout`; pausa en `visibilitychange`.
9. Copy en /cmo: ≤40 cadenas, ninguna >12 palabras, la promesa de confianza una sola vez.
10. Pregunta: envía el `label` exacto; opciones `<button>`; solo la última viva; «escribir» no envía.
11. Burbujas sólidas, nunca glass. Cristal solo en dock acoplado, compositor y píldoras.
12. `AssistantMarkdown` con `useMemo` y sin HTML.
13. Scroller interno `min-h-0 flex-1 overflow-y-auto` en bloque, no `flex flex-col`.

## 6. Fases (gate explícito del dueño entre fases)

### F0 — Mockup navegable + este plan · GATE
Cinco vistas: Axel vacío · Axel conversando · Alba escritorio · Alba móvil · Estados (dictando,
pensando con y sin pasos, fallo + reintento, Listo, enlace caducado, cuota, propuesta editable, las
ocho expresiones con y sin diadema). Claro/oscuro. El mockup sirve también para el visto pendiente
de la «propuesta editable» de F2 del intake.

### F1 — Kit en `shared/` con la piel nueva, consumido por Axel
1. Mover con `git mv` los archivos de cmo listados en §4 y renombrar símbolos (`Axel*`→`Assistant*`,
   `axel-*`→`assistant-*`), con sus tests. Generalizar: `AssistantQuestion` (tipo estructural, labels por
   props), `AssistantThinking` (`phrases`, `doneLabel`), `StarterPills` (`starters`), `AssistantDock`
   (`title`, `hero`, `meta`), `AssistantHeroAvatar` tonto, `useAvatarLife({saccades})`, `useStoredAccessory(key)`.
2. `AssistantComposer` desde el núcleo común; `useVoiceRecorder` a `core/hooks`.
3. `AssistantChatShell` extraído de `AxelChat`; `AxelChat` pasa a componer.
4. CSS: bloque único «KIT DE ASISTENTE»; `CmoView` usa `assistant-field`; 15 px en el hilo.
5. Tests nuevos: `AssistantComposer`, `AssistantChatShell`, `UserBubble`. `AxelChat.test` y
   `AxelHeroAvatar.test` siguen verdes sin tocar sus aserciones.
6. Verja acotada (un proceso a la vez): lint de lo tocado · `npm test -- --testPathPattern
   "assistant|cmo|core/hooks" --maxWorkers=2` · visual en `/cmo`.

### F2 — Alba sobre el kit; borrar lo duplicado
1. `SetupView` con selectores; `<main class="assistant-field h-[100dvh]">` + shell (`empty=false`
   siempre) con dock Alba (`meta` «Poniendo a punto {empresa}»); chip `n/m` en `actions` (móvil);
   `SetupProgress` a la cabecera del rail y de la hoja.
2. `AlbaHeroAvatar` + `useAlbaMood` (`useShallow`; `accessory="headset"`; `celebrating` al terminar).
3. `SetupThread` reemplaza `SetupChat`; compositor con `voice` si `session.voice_enabled`.
4. Estados: Listo → `proud`; enlace caducado → `asleep`; cargando → `AssistantStage busy`.
5. Ficha con `.grouped-*` y tokens del tema; comportamiento intacto.
6. Borrar `AlbaMark`, `SetupChat`, `SetupComposer`, `SetupQuestion`, el `use-voice-recorder` del slice,
   el bloque `.intake-*`, el `UiMessage` duplicado y la prop `assistantName`.
7. Tests: `SetupThread`, humo de `SetupView`, `use-voice-recorder` en core.
8. Verja acotada + visual en `/configurar/{token}` (móvil y escritorio, dictado incluido).

### F3 — Documentación, invariantes globales y cierre
DESIGN-SYSTEM §2.3, §5.2, §6, §9; architecture §4.1 y §12; planes de cmo/intake con nota de
reubicación. Verjas completas de una en una: lint · `tsc` · `npm test -- --maxWorkers=2` · `next build`.
Memoria del proyecto actualizada.

## 7. Verificación end-to-end

1. Mockup navegado y aprobado por el dueño en claro/oscuro y móvil.
2. Axel: vacío → compositor centrado con píldoras; primer mensaje → FLIP y dock acoplado al hacer
   scroll; pregunta pulsable solo en el último mensaje; propuesta hermana con cometa; cuota → cara
   dormida; reduced motion → sin viaje ni gestos; un solo «Saludar a Axel» en el DOM.
3. Alba: saludo guionizado, dock con diadema, ficha con propuesta editable; texto y dictado; reintento;
   corregir desde la ficha sin gastar turno; «Listo» con Alba orgullosa; enlace caducado dormida; hoja
   en móvil.
4. Grep de cierre: cero `intake-` en `src/`; cero `AxelQuestion|SetupQuestion|AlbaMark|SetupComposer`;
   `Sparkles` + `text-accent-violet` solo dentro de `AssistantMark`.
