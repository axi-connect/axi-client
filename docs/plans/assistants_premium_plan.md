# Upgrade premium de Alba (/configurar) y de Axel (/cmo): plan y estado

> **Estado 2026-09-28.** Lienzo aprobado por el dueño («Aprobado, procede a implementarlo»): https://claude.ai/artifact/N9NQ1hEPBhU746ub1bdEbT. Axel toma la **dirección A (despacho refinado) con la isla**. Rama `feat/assistants-premium`.
>
> Decisiones del dueño en la ronda del lienzo:
> 1. El chat va en **tinta, no coral**, como el inbox.
> 2. Las propuestas de Axel van sin violeta, con el lenguaje de las fichas de /comercial y botones de cristal.
> 3. La barra es una **isla de tinta tipo Dynamic Island** en varios tamaños. Referencia: los videos igexport que mandó el dueño.
>
> Listas de paridad: `alba_configurar_premium_inventario.md` y `cmo_rediseno_inventario.md`. Arnés: `docs/qa/assistants-premium/` en la raíz del monorepo.

## Context
El dueño pidió un upgrade «ultrapremium, optimizado, eficiente y profesional» de sus dos asistentes.
- **Alba** vive en `/configurar/{token}` (slice `intake`). No hay que crear nada nuevo: es un upgrade de acabado y rendimiento de la misma pantalla, sin perder funciones.
- **Axel** vive en `/cmo`. El dueño quiere ver un rediseño completo, centrado en rendimiento y acabado, y decidir sobre el lienzo cuánto cambia: «habría que discutirlo».

Todo el trabajo es solo del cliente, con los mismos endpoints y eventos de socket. Si una dirección de Axel necesitara un dato que hoy no llega, el lienzo lo marca y queda fuera de esta tanda.

Los dos asistentes comparten el kit `src/shared/components/features/assistant/`: lo que se mejore ahí sirve a ambos.

## Invariantes que no se tocan (decisiones del dueño)
- La misma cara para los dos; Alba con la diadema siempre.
- Un solo avatar vivo por pantalla.
- Cero timers y cero rAF en reposo.
- El avatar no se vuelve a pintar con cada fragmento (lo fija `AxelHeroAvatar.test`).
- Aura `.assistant-field` sin bucle y sin haz arriba.
- Sin micrófono en Axel.
- Ficha de Alba editable sin gastar turno.
- Cierre de Alba en solo lectura.
- Mensajes contractuales de Axel: «Nada sale sin tu aprobación.», el de cuota con «Tus agentes siguen atendiendo» y el primer informe como estado normal.

Un rediseño de Axel **puede reabrir**, solo si el dueño lo elige en el lienzo:
- compositor centrado que baja al primer mensaje;
- menú «Conversaciones»;
- panel «Por decidir»;
- chips bajo el h1;
- el límite de 40 cadenas de texto.

## Deudas medidas en la exploración
- **Alba** (`src/modules/intake/ui/SetupView.tsx`)
  - `messages` y `session` se suscriben enteros: guardar un dato de la ficha vuelve a pintar toda la vista, el hilo y las dos fichas.
  - Hay dos `SetupSummary` montados a la vez, uno para escritorio y otro para la hoja móvil (l.126-151, 233, 274).
  - `SetupThread`, `SetupSummary` y `SetupFieldRow` no llevan `memo`, y sus callbacks se crean en línea.
  - `SetupFieldRow` tiene 433 líneas.
  - La hoja móvil está hecha a mano, sin gestión de foco (H7, pendiente).
  - En oscuro la ficha queda más plana que el diseño original.
  - No hay test de `SetupView`.
- **Axel** (`src/modules/cmo/ui/components/AxelChat.tsx`)
  - Suscribe `thread` y `live` enteros (l.262-268): cada fragmento del streaming vuelve a pintar el hero, `BriefingHero`, todas las burbujas y las `ProposalCard`.
  - `autoScrollDeps` incluye `live.text.length` (l.369), así que el scroll corre con cada fragmento.
  - `CmoView` tiene 9 selectores sueltos.
  - El esqueleto de `loading.tsx` no coincide con la pantalla real: dibuja un bloque que ya no existe y pone el hero arriba cuando el estado vacío va centrado.
  - El chip de meta llega tarde.
  - En xl hay propuestas duplicadas entre el hero y el panel, y el contador «Por decidir» sale dos veces.
  - `cmo.store.ts` tiene 807 líneas, `ProposalDetail.tsx` 520 y `CmoSettingsView.tsx` 401.

## F0: inventario y lienzo (sin código de producto)
1. **Listas de paridad**, siguiendo la regla «un rediseño no quita funciones»:
   - `axi-client/docs/plans/alba_configurar_premium_inventario.md` cubre saludo, hilo, preguntas con opciones, dictado, ficha por temas, estados known/derived/proposed/confirmed/skipped, saltar con motivo, editor de listas, progreso, hoja móvil, bloqueos, cierre, `SetupNextSteps` y «revisar».
   - `axi-client/docs/plans/cmo_rediseno_inventario.md` cubre todo lo que muestra /cmo hoy: dock, acciones, hero y chips, propuestas ancladas y compactas, estado vacío con píldoras, compositor y sus tres pies, cinco tipos de mensaje, pasos en vivo, bloqueos, panel lateral, detalle en hoja con URL compartible y los ajustes.
2. **Lienzo de diseño** (artifact) con fuentes e iconos reales, a 1280 y 375 px, en claro y oscuro.
   - **Alba:** una propuesta de upgrade.
     - Ficha con peldaño de material en oscuro.
     - Progreso por tema.
     - Estados de campo con `StatePill`.
     - Filas de la ficha como lista (regla «una ficha es una lista»).
     - Hoja móvil con foco.
     - Cierre con `SetupNextSteps` en bento.
   - **Axel:** la pantalla de hoy como referencia, más tres direcciones puestas lado a lado. Cada una indica qué decisión anterior conserva y cuál reabre.
     - **A · Despacho refinado:** la misma estructura, sin duplicados (las propuestas viven solo en el panel y en el hilo anclado; el hero solo cuenta). Tarjetas de propuesta nuevas y el esqueleto igual al píxel.
     - **B · Mesa del día:** primero el informe. Un bento con el resumen, 3 cifras y las propuestas como mazo que se aprueba y rechaza ahí mismo. La conversación va en un compositor acoplado abajo que se expande a hilo. Se quita el panel lateral.
     - **C · Conversación pura:** una sola columna. Las propuestas solo aparecen en el hilo, el contador va en el dock, y el panel pasa a ser una hoja bajo demanda.
     - Cada dirección lleva su **presupuesto de rendimiento**: repintados por fragmento, DOM inicial y sus animaciones.
3. **Medición del lienzo** con arnés Playwright para encontrar desbordes, antes de entregarlo.
4. **Salida de F0:** el dueño elige la dirección de Axel y aprueba el upgrade de Alba. No se codifica sin eso.

## F1: rendimiento del kit y de Axel, independiente de la dirección
El grueso de F1 vale para cualquier dirección, así que puede arrancar mientras se discute el lienzo, si el dueño lo autoriza.
- **Burbuja de streaming aislada.** Un componente `LiveBubble` con su propia suscripción a `live.text` y `live.steps`. `AxelChat` deja de suscribir `live` entero; solo lee `useCmoStore(s => s.live !== null)`.
- **Burbujas y tarjetas con `memo`.** `MessageBubble` y `ProposalCard` llevan `memo` y props estables. `onPick` e `inThread` salen del render y pasan a `useCallback`/`useMemo`.
- **Selectores agrupados.** `CmoView` pasa a `useShallow` (patrón ya usado en `useAxelMood`).
- **Autoscroll sin fragmentos.** Deja de depender de `live.text.length`: un `ResizeObserver` sobre el final del hilo en `useAutoScroll` del kit, con rAF de una vez por cuadro solo mientras hay turno vivo.
- **Chip de meta sin salto.** `useGoalChip` se lanza en paralelo con `load()` y el chip reserva su hueco para que nada se mueva.
- **Tests nuevos.** `AxelChat.test` cuenta los repintados con `React.Profiler`: 20 fragmentos → 0 repintados de las burbujas ya asentadas y de las tarjetas.

## F2: Alba, rendimiento y estructura (sin cambio visual)
- **Suscripciones.** `SetupView` usa `useShallow` para los primitivos. El hilo y la ficha reciben `messages` y la sección que les toca, no `session` entera.
- **`memo` donde hace falta.** `SetupThread`, `SetupSummary` y `SetupFieldRow` llevan `memo`, con callbacks estables (las acciones del store ya lo son; se pasan directas).
- **Una sola ficha montada.** `useMediaQuery('(min-width: 1024px)')` decide entre el lateral y la hoja. Primero se busca el hook existente en `src/core/hooks`.
- **`SetupFieldRow` partida por tipo de campo.** Queda en `SetupFieldRow` + `FieldValue` + `FieldActions` sin cambiar su comportamiento.
- **Hoja móvil.** Se cambia la hoja hecha a mano por la primitiva `Sheet`/Dialog de Radix que ya existe en `shared/ui`, con foco atrapado y devuelto (cierra H7).
- **Tests.** Uno nuevo de `SetupView` (editar la ficha no repinta el hilo, una sola ficha en el DOM), y los de intake existentes siguen verdes sin tocar sus aserciones.

## F3: Alba, acabado según el lienzo aprobado
- Material de la ficha en claro y oscuro.
- Progreso por tema.
- `StatePill` para los estados.
- Filas en `DetailList`.
- Cierre en bento.
- Todo con primitivas del DS de `@/shared/components/features/bento` y tokens de `:root`, sin hex nuevos.

## F4: Axel, la dirección elegida
- Se reescribe la composición de `AxelChat`, `BriefingHero`, `CmoBoardRail` y `ProposalCard` según el lienzo.
- `loading.tsx` se rehace igual al píxel del estado real.
- Si la dirección lo pide, `cmo.store.ts` se parte en slices (`briefing`, `threads`, `live`) sin cambiar su API pública.
- `ProposalDetail` y `CmoSettingsView` cambian solo el marco, salvo que el lienzo diga otra cosa.
- Se marca la paridad del inventario.

## F5: medición y cierre
- **Arnés Playwright** en `docs/qa/assistants-premium/arnes/`, contra `next dev -p 3007` con escenarios de fixtures:
  - vacío, hilo largo, streaming, bloqueo de cuota y 7 propuestas en Axel;
  - saludo, ficha llena, saltos y cierre en Alba.
  - Cada escenario a 1280, 768 y 375 px, en claro y oscuro.
  - Mide desbordes, CLS del primer render y tareas largas durante 20 fragmentos simulados.
- **Documentación** de DESIGN-SYSTEM y de los planes, y marcar los inventarios.
- **Auditoría** por la sesión auditora.

## Dónde y cómo
- Worktree del cliente `feat/assistants-premium` desde main, con su propio `npm ci` (nunca `ln -s`). El `.env.local` no se comitea y se borra al limpiar.
- Un commit por fase.
- Un solo proceso pesado a la vez, en primer plano bajo `flock /tmp/axi-heavy.lock`. `next dev` se para antes de correr tests. Nada de npx.
- **Verjas acotadas una sola vez por fase:**
  - `npm test -- --testPathPattern 'modules/(cmo|intake)|features/assistant'`
  - tsc
  - eslint sobre los archivos tocados
- El `next build` y la suite completa quedan para la integración.
- Push solo con la confirmación del dueño. El cliente despliega por CI en cada push.

## Verificación
- **Tests por fase:** el conteo de repintados en `AxelChat.test` y el nuevo `SetupView.test`. Los de `AxelHeroAvatar.test` (0 repintados por fragmento, un solo Axel, el form no se remonta) siguen verdes sin tocarlos.
- **Arnés F5:** 0 desbordes reales en los tres anchos y los dos temas.
- **Presupuesto de rendimiento** (el arnés lo mide antes y después):
  - 20 fragmentos → como mucho 1 repintado del hilo;
  - CLS del primer render de /cmo < 0,05;
  - ninguna tarea larga > 50 ms durante el streaming.
- **Manual con backend local:**
  - /cmo: preguntar con streaming, aprobar una propuesta, cambiar de conversación, bloqueo de cuota;
  - /configurar/{token}: dictar, editar la ficha, saltar con motivo y cerrar hasta «Listo».
