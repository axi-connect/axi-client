# Axel premium — campo, inicio, preguntar y placeholder

## Contexto

El módulo CMO funciona: turno en vivo, markdown, propuesta anclada, enlaces a
borradores. Lo que falta es que **se sienta** como el producto premium que es. Las
cuatro carencias son concretas y salen de mirar la pantalla:

1. **El campo es timidísimo.** `.axel-field` (globals.css:826-870) pinta tres
   halos al 13/11/7% sobre un dot-grid al 28% de opacidad. Es tan sutil que la
   pantalla se lee como un panel administrativo cualquiera. En `AxelChat.tsx` no
   hay ni un degradado propio: el único del archivo es el `bg-brand-gradient` del
   botón de enviar (L324); todo lo demás es `bg-background` + `border-border`.
2. **El inicio es un muro de texto centrado.** `BriefingHero` sin briefing
   apila h1 + párrafo de 46ch + párrafo de reloj, los tres centrados y en pesos
   parecidos, y debajo tres tarjetas que solo dicen dos palabras. Peor: la
   segunda frase («Nada se envía a un cliente sin que tú lo apruebes») **repite**
   la línea que ya está bajo el compositor («Axel propone; tú apruebas. Nunca
   envía nada por su cuenta»). No hay jerarquía ni orden de lectura.
3. **Axel pregunta en prosa.** Cuando le falta una decisión del dueño la pide
   dentro del párrafo, y el dueño tiene que redactar la respuesta. Hay catorce
   tools y ninguna para preguntar.
4. **El compositor no enseña nada.** Placeholder fijo: «Pregúntale a Axel o dile
   qué armar…». Un dueño que entra por primera vez no sabe qué se le puede pedir.

Resultado buscado: el despacho se ve como una superficie viva y premium, el
primer contacto se lee en cinco segundos, Axel puede preguntar con botones, y el
compositor sugiere solo.

## Decisiones tomadas

| # | Decisión | Por qué |
|---|---|---|
| D1 | Aurora **con deriva lenta** (~72 s, solo `transform`) | Elegida sobre la estática. Es una **desviación declarada de DESIGN-SYSTEM §6** («nada parpadea ni se mueve en loop en el workspace»): se documenta en §6 y en `docs/modules/cmo.md`, y se apaga con `prefers-reduced-motion`. |
| D2 | Tocar una opción **envía directo** | Un clic y Axel arranca. Gasta el mismo análisis que escribir la respuesta a mano: el clic no añade costo, quita tecleo. |
| D3 | La pregunta viaja como **dato estructurado**, no como sintaxis de texto | La regla 6 del prompt enumera el formato permitido y hay un test byte-exacto que lo vigila (`cmo_prompt.spec.ts:124`). Un marcador en el texto sería frágil y se leería crudo al fallar. |
| D4 | `ask_owner` **corta el turno** | Hoy nada corta el bucle. Una vuelta más al modelo después de preguntar solo produce relleno y quema presupuesto. |
| D5 | La pregunta llega en `completed()`, **sin evento WS propio** | Siempre llega al cerrar el turno. Un evento aparte sería un segundo camino al mismo hecho — justo lo que la doctrina del módulo evita. |
| D6 | El placeholder se escribe **directo al DOM por ref**, sin estado | «Lo más optimizado posible»: un `setTimeout` en cadena y cero re-renders de React por carácter. |
| D7 | Trabajo en el mismo worktree del servidor, aceptando el conflicto | Decisión tuya tras avisarte. Mitigo: los archivos que la otra sesión tiene sucios (`cmo_runtime.service.ts`, `cmo_tool.ts`, `tools/*`) se tocan **al final** y se **releen justo antes** de cada edición, nunca desde una lectura vieja. |

---

## F1 — El campo: aurora con deriva y luz bajo el compositor

**Todo en `src/app/globals.css`, bloque MÓDULO CMO (L594+).** El fondo lo pone
`<main className="axel-field">` en `CmoView.tsx:78`, no `AxelChat` — cualquier
cambio de campo va al CSS, no al componente. `app/(private)/cmo/loading.tsx:18`
ya lleva la clase, así que hereda gratis.

Reparto de capas nuevo (dos pseudo-elementos, ninguno nuevo en el DOM):

```
.axel-field            color base + grano fino tileado   ← estático, cobertura total
.axel-field::before    los halos, z:-2, inset:-30%       ← LA CAPA QUE DERIVA
.axel-field::after     dot-grid + viñeta, z:-1           ← estático
```

- **El color base se muda del `::before` al elemento.** Hoy vive en el
  `::before` junto a los halos (L837), y eso impide usar `opacity` en esa capa
  como perilla de intensidad por tema. Separados, `.dark .axel-field::before {
  opacity: … }` sube el tinte en oscuro sin duplicar la estructura — el mismo
  truco que `.dark .channel-surface::before` (L270).
- **Tinte muy por encima del techo.** De 13/11/7% a ~24/20/13%, más un cuarto
  halo violeta anclado abajo-centro. Es una desviación consciente del techo del
  sistema (14% de `--color-accent`), del mismo tipo que la ya sancionada en
  `.channel-surface` (7–34%, comentada en L206-211): el tinte no compite con el
  coral de acción ni con los colores de estado.
- **`inset: -30%` en el `::before` es lo que hace la deriva posible.** Con
  `inset: 0` cualquier `translate` descubriría el borde de la capa; sobredimensionada,
  se mueve dentro de su propio margen. Y por eso el color base tiene que estar
  en el elemento: si estuviera en la capa que se mueve, quedaría fondo desnudo.
- `@keyframes axel-drift` — tres pasos de `translate3d` de pocos puntos
  porcentuales más un `scale` de 1.04, `72s ease-in-out infinite alternate`.
  `alternate` para que no salte al reiniciar. Solo `transform`: compositor, sin
  layout ni repaint del texto (§6).
- **Grano** en `.axel-field` como un `background-image` de `feTurbulence` en data
  URI, tileado a 180px. Es un solo paint, sin `filter`, y es la mitad de la
  sensación premium.
- `.axel-composer-glow` — utilidad nueva: bloom violeta abajo-centro **detrás del
  compositor**, para que el input lea como la fuente de luz de la pantalla. Se
  aplica en `AxelChat.tsx` al `<div className="flex-none …">` (L273), que es el
  único elemento que ya está donde tiene que estar.
- **Reduced-motion**: `.axel-field::before` se añade al bloque existente de
  L872-880 (`animation: none`); el degradado se queda quieto y completo.

**Docs**: la desviación se declara en `docs/design/DESIGN-SYSTEM.md` §6 y en el
apartado «Lenguaje visual» de `docs/modules/cmo.md`. Sin eso, la próxima persona
la borra por incumplir la regla.

## F2 — El inicio: menos prosa, más estructura

`src/modules/cmo/ui/components/BriefingHero.tsx` + el bloque de starters de
`AxelChat.tsx` (L166-213).

Estado sin briefing, después:

```
              ( orbe 96 )
      Soy Axel, tu director de mercadeo     ← h1, se queda como está
   Miro tus números cada día y te dejo      ← UNA línea (hoy son dos frases)
        propuestas para decidir.
      ╭ 🕐 Primer informe · mañana 8:00 ╮   ← chip, no párrafo
      ╰────────────────────────────────╯
      ──────  EMPIEZA POR AQUÍ  ──────       ← eyebrow: el orden que falta
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ 📊       │ │ 🔥       │ │ 📣       │
   │ ¿Cómo    │ │ Clientes │ │ Ármame   │
   │ vamos?   │ │ calientes│ │ algo     │
   │ Embudo y │ │ Quién va │ │ Campaña  │  ← `hint` nuevo: la tarjeta dice
   │ ventas   │ │ a comprar│ │ o promo  │     QUÉ hace, no solo cómo se llama
   └──────────┘ └──────────┘ └──────────┘
```

Cuatro cambios, todos de resta o de estructura:

1. **Se borra la frase duplicada.** «Nada se envía a un cliente sin que tú lo
   apruebes» sale del hero: ya está bajo el compositor (`AxelChat.tsx:335`) y
   ese es su sitio, pegada al botón de enviar.
2. **La hora del primer informe pasa de párrafo a chip** (pill con borde,
   reloj violeta). Deja de competir en peso con la propuesta de valor.
3. **`STARTERS` gana `hint`** (3-5 palabras). El tipo se amplía y las tarjetas lo
   pintan bajo el label en `text-muted-foreground`; la variante `compact`
   (píldoras, cuando ya hay propuestas en el hilo) lo ignora — ahí no cabe.
4. **Eyebrow «Empieza por aquí»** sobre la rejilla, en las dos variantes de
   starter. Es lo que convierte tres botones sueltos en un primer paso.

Con briefing el hero apenas cambia: `summary` sigue siendo el h1 y la línea de
propuestas se queda. Solo hereda el eyebrow. No se toca `AxelOrb`.

## F3 — `ask_owner`: preguntar con opciones

### Servidor (`axi-server/.claude/worktrees/feat+cmo`)

Se toca al final y releyendo cada archivo justo antes (D7).

1. **`prisma/schema/cmo.prisma`** — `CmoMessage` gana `question Json?`. No hay
   ninguna columna JSON libre hoy (`tool_calls` tiene su semántica declarada y ya
   se sirve tipada), así que meterla ahí rompería su contrato. Migración con
   `npm run migrate` (nombre `cmo_ask_owner`): `ADD COLUMN "question" JSONB`.
   Aditiva y nullable — sin riesgo en el deploy.
2. **`application/tools/ask_owner.tool.ts`** (nuevo, patrón calcado de
   `save_directive.tool.ts`): `CmoTool<Args>`, **no** `idempotent`.
   ```ts
   z.object({
     question: z.string().min(8).max(200),
     options: z.array(z.object({
       label: z.string().min(2).max(60),   // lo que se manda al tocarla
       hint:  z.string().max(90).optional(),
     })).min(2).max(4),
     allow_free_text: z.boolean().optional(),
   }).strict()
   ```
   **Un solo campo por opción, no `label` + `reply`.** Dos textos que el modelo
   tiene que mantener coherentes son dos textos que se pueden desincronizar; al
   tocar la opción se manda su `label` tal cual.
   `execute` escribe `ctx.question` y devuelve un `content` que dice
   **TERMINA EL TURNO AHORA y no repitas la pregunta en tu texto** — mismo tono
   imperativo y por la misma razón que `DRAFT_PENDING_NOTICE`: el modelo obedece
   el texto que le devolvemos. Segunda llamada en el mismo turno → error
   corregible, `productive: false`.
3. **`tools/cmo_tool.ts`** — `CmoAskQuestion` + `question?: CmoAskQuestion` en
   `CmoToolContext`, con el comentario que explica que es un canal de salida
   igual que `submitted_proposal_id` (L55-64 es el precedente literal).
4. **`cmo_runtime.service.ts`** — propagar `CmoToolContext → GatherResult →
   CmoTurnResult`, y tres cortes:
   - Tras el `for` de tool_calls: `if (toolCtx.question !== undefined) { truncated = false; break; }` (D4).
   - `orphan_drafts` se calcula `&& toolCtx.question === undefined`: preguntar a
     mitad de armar algo es legítimo, y sin esta guarda `finalize` remataría con
     «no alcancé a armar la propuesta», que sería falso.
   - `finalize`: con pregunta, el `reply` vacío **no** cae al «No logré completar
     el análisis». La pregunta es el mensaje; el cuerpo puede quedar vacío y el
     cliente pinta el bloque solo.
5. **`tool_labels.ts`** — `ask_owner: 'Preparando una pregunta para ti'`.
6. **`cmo.module.ts`** — `AskOwnerTool` al array `TOOLS` (el registry y el
   runtime son agnósticos: es literalmente eso).
7. **`cmo_prompt.ts`** — una línea en `DOCTRINE` / «Cómo trabajas»:
   **«Pregunta con opciones, no con prosa»** — cuando falte una decisión del
   dueño, dos a cuatro caminos concretos en vez de una pregunta abierta. Va al
   bloque **estable** (cacheado). **La regla 6 no se toca**, así que su test
   byte-exacto sigue verde; el del bloque estable sí hay que actualizarlo.
8. **`presentation/dto/cmo.dto.ts`** — `cmoQuestionSchema` + `CmoQuestionDto`
   (prefijo `Cmo` obligatorio: el namespace de OpenAPI es global) y el campo
   `question` nullable en `cmoReplySchema` **y** en `cmoMessageSchema` — el
   segundo es lo que hace que la pregunta sobreviva a un F5.
9. **`threads.repository.ts`** — `question` en `appendTurn`, en `MessageView` y
   en el `select` de `transcript`.
10. **`use_cases/send_cmo_message.use_case.ts`** — hilar `result.question` hasta
    `appendTurn` y hasta la salida.
11. **`presentation/http/cmo.controller.ts`** — `normalizeQuestion` hermano de
    `normalizeTrace` (Prisma devuelve `Json`), en el POST y en el transcript.
12. **`cmo_turn_broadcaster.ts`** — `question` en el payload de `completed()`
    (D5). Sin evento nuevo en `realtime_events.ts`.
13. `npm run openapi:generate`.

### Cliente

14. **`src/core/realtime/events.ts`** — `question` en `CmoTurnCompletedEvent`.
15. **`domain/cmo.ts`** — `CmoQuestionDTO` derivado de `Schemas` (regla del
    slice: ni una interfaz a mano). Tipos con
    `./node_modules/.bin/openapi-typescript <ruta absoluta del worktree>` —
    `npm run api:types` no resuelve su ruta relativa desde un worktree.
16. **`stores/cmo.store.ts`** — `UiMessage.question`; se puebla desde el POST y
    desde `onTurnCompleted` (los dos caminos que ya existen para
    `proposal_id`); acción `answer(label)` que delega en `ask`.
17. **`ui/components/AxelQuestion.tsx`** (nuevo) — lenguaje visual tomado de
    `inbox/ui/components/interactive/InteractiveMessage.tsx`: sub-bloque con
    `border-t`, eyebrow en mayúsculas y filas de opción. **Diferencia
    deliberada, con comentario:** ahí las opciones son `<div>` porque el operador
    no puede responder por el cliente; aquí son `<button>` porque el dueño ES
    quien responde. `allow_free_text` añade «Otra cosa…», que enfoca el textarea
    en vez de enviar.
18. **`AxelChat.tsx`** — el bloque va dentro de la burbuja de Axel, bajo
    `AxelMarkdown`. **Solo la pregunta del último mensaje está viva**; las
    anteriores se pintan inertes con la opción elegida marcada. Esa regla no
    necesita ninguna columna ni casar textos: la posición en el hilo ya lo dice.
    Deshabilitadas mientras `thread.thinking`.

## F4 — El placeholder que se escribe solo

**`src/modules/cmo/infrastructure/hooks/use-typewriter-placeholder.ts`** (nuevo).
No existe ningún hook así en el repo; el único precedente de tecleado es
`landing/ui/components/mockups/TerminalMockup.tsx` (setTimeout recursivo, bandera
`dead`, array de timers que se limpia) y de ahí sale la forma.

```ts
useTypewriterPlaceholder(textareaRef, { phrases, enabled })
```

- **Cero re-renders** (D6): escribe `el.placeholder` por el ref. Un solo
  `setTimeout` vivo a la vez. **Invariante documentada y con test**: el
  `placeholder` del JSX tiene que seguir siendo una **constante**; React solo
  parchea el atributo cuando la prop cambia, así que una prop fija no pisa nunca
  al hook — pero si alguien la vuelve dinámica, el efecto se apaga solo. Esa
  constante es además el valor de SSR y el de sin-JS.
- **Se detiene** con: campo con texto, campo con foco (no se teclea debajo del
  cursor), `document.hidden`, `disabled`, y `prefers-reduced-motion` — en ese
  último caso deja **una** frase completa y no vuelve a tocar nada.
- Cadencia: 34 ms/carácter, 1,8 s de reposo, 18 ms borrando, 400 ms de hueco.
  **Sin jitter**, al contrario que el terminal de la landing: en un campo real
  una cadencia irregular se lee como un fallo, no como una persona.
- Frases: los tres `prompt` de `STARTERS` más tres que cubren otras
  capacidades (recompra, calidad del agente, calendario comercial), en una
  constante junto a `STARTERS`. La lista es del cliente: nada aquí justifica
  una llamada al servidor.

---

## Archivos

**Cliente** — `axi-client/.claude/worktrees/feat+cmo-frontend`
- `src/app/globals.css` (bloque CMO: `.axel-field`, `@keyframes axel-drift`, `.axel-composer-glow`, reduced-motion)
- `src/modules/cmo/ui/components/{AxelChat,BriefingHero}.tsx`
- `src/modules/cmo/ui/components/AxelQuestion.tsx` *(nuevo)*
- `src/modules/cmo/infrastructure/hooks/use-typewriter-placeholder.ts` *(nuevo)*
- `src/modules/cmo/infrastructure/stores/cmo.store.ts`, `domain/cmo.ts`, `core/realtime/events.ts`, `core/api/schema.d.ts` *(generado)*
- `docs/design/DESIGN-SYSTEM.md` §6, `docs/modules/cmo.md`

**Servidor** — `axi-server/.claude/worktrees/feat+cmo`
- `prisma/schema/cmo.prisma` + migración `cmo_ask_owner`
- `src/modules/cmo/application/tools/ask_owner.tool.ts` *(nuevo)*, `tools/cmo_tool.ts`, `cmo_runtime.service.ts`, `cmo_prompt.ts`, `tool_labels.ts`, `cmo_turn_broadcaster.ts`, `threads.repository.ts`, `use_cases/send_cmo_message.use_case.ts`
- `src/modules/cmo/cmo.module.ts`, `presentation/dto/cmo.dto.ts`, `presentation/http/cmo.controller.ts`
- `openapi/openapi.json` *(generado)*

## Pruebas

**Nuevas**
- `use-typewriter-placeholder.test.ts` — teclea progresivamente, borra y pasa a la siguiente; se detiene con foco y con texto; reduced-motion deja una frase entera de golpe; el cleanup mata los timers; el atributo del JSX no pisa al hook.
- `AxelQuestion.test.tsx` — pinta las opciones con su `hint`; el clic manda el `label`; la pregunta de un mensaje que no es el último es inerte; «Otra cosa…» enfoca el textarea y no envía.
- `ask_owner.tool.spec.ts` — rechaza menos de 2 y más de 4 opciones; escribe `ctx.question`; la segunda llamada del turno no la sobrescribe.

**Ampliadas**
- `cmo_runtime.service.spec.ts` — `ask_owner` corta el bucle; un turno con pregunta y borradores **no** avisa de propuesta huérfana; respuesta vacía con pregunta no cae al texto de fallo.
- `cmo_prompt.spec.ts` — el bloque estable byte-exacto con la línea nueva; la regla 6 intacta.
- `cmo_turn_broadcaster.spec.ts` — `completed()` lleva la pregunta.
- `cmo.store.test.ts` — la pregunta llega por el POST y por `turn_completed`; responder manda el `label`.
- `AxelChat.test.tsx` — el bloque va dentro de la burbuja de Axel; solo el último está vivo; el placeholder rota.
- `BriefingHero`: verificar que el texto duplicado ya no aparece dos veces en pantalla.

## Verificación

Las seis puertas del servidor, y en el cliente typecheck + `next lint` + `npm test`.

Tú compilas y levantas (yo no arranco nada ni mato tus procesos):

```bash
# servidor — worktree feat+cmo
npm run migrate            # crea y aplica la migración cmo_ask_owner
npm test && npm run test:integration
npm run openapi:generate
npm run build && npm run start:prod

# cliente — worktree feat+cmo-frontend
./node_modules/.bin/openapi-typescript \
  /home/davela/dev/axi/axi-server/.claude/worktrees/feat+cmo/openapi/openapi.json \
  -o src/core/api/schema.d.ts
npm test && npm run build && npm start
```

`next build` no se corre desde aquí mientras tengas `next start` vivo en 3001:
reescribir `.next` bajo un servidor en marcha lo rompe.

**A ojo, en `/cmo`:**
1. El campo se nota, y en un minuto los halos se han movido de sitio. Con
   `prefers-reduced-motion` quietos. Claro y oscuro.
2. El inicio se lee de un tirón: identidad → qué hace → cuándo → «empieza por
   aquí» + tres tarjetas que dicen qué hacen. La frase de «nada se envía» aparece
   **una** vez, bajo el compositor.
3. Con el campo vacío y sin foco, el placeholder teclea y rota. Al hacer clic,
   para en seco.
4. Pídele algo que le falte un dato («ármame una campaña») y que responda con el
   bloque de opciones; un clic arranca el turno siguiente, y la pregunta anterior
   se queda marcada e inerte.

Nada se pushea sin que lo autorices: el push a main despliega.

## Riesgo abierto

La otra sesión (`cmo-test-lab-cleanup-docs`) tenía siete archivos del servidor
sucios al escribir este plan, cuatro de ellos en el camino de F3. Mitigación
acordada: F3 va al final y releo cada archivo justo antes de editarlo. Si al
llegar ahí sigue escribiendo en los mismos archivos, paro y te aviso en vez de
pisarle trabajo.
