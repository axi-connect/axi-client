# Isla viva del asistente + hallazgos de la entrevista de Alba

> **Estado 2026-10-05.** Plan aprobado por el dueño. F0 (mockup `docs/design/mockups/island-live.html`) publicado, **esperando el visto** antes de F1. Rama `feat/island-live` (cliente; el servidor abre la suya en F2). Informe de origen: `informe-entrevista-axi-con-imagenes` (Descargas del dueño).

## Contexto

Dos encargos del dueño (2026-10-05), sobre el mismo kit `shared/components/features/assistant`:

1. **El informe de la entrevista** (`~/Downloads/informe-entrevista-axi-con-imagenes/`, 17 recomendaciones, 6 figuras). La fricción central: la persona tiene que **salir del chat** para confirmar un dato, entender el avance y descifrar los estados. Lo que el código permite hoy y lo que falta (verificado):
   - Confirmar un dato `derived`/`proposed` solo se puede en la ficha («Así es» re-guarda el valor como `stated`, sin turno). En el chat solo si el modelo ofrece «Sí, así es» como opción libre, y **gasta turno**. El flag `confirmed` de `save_answers` no lo lee nadie. No existe operación `confirm` en el PATCH (`answers|defer|resume|skip|unskip`).
   - Nada frena que «está bien» se guarde como «todo virtual»: los normalizadores miran forma, no certeza; y el modelo **no ve su propia última pregunta** en el historial (`body` vacío cuando el turno es solo pregunta: `send_intake_message.use_case.ts:158`, `intake_runtime.service.ts:349`).
   - El avance cuenta **cualquier valor** como lleno (incluidos los no confirmados) y llama «no aplican» a todo salto, incluidos `no_sabe` y `luego` (`countCaptured`, `intake.ts:232-243`; copy en `SetupSummary.tsx:80`). Un tema con todo `known` nace `done` sin preguntar nada (`intake_progress.ts:140`).
   - «Luego» es un botón de posponer tema que se lee como estado (`SetupProgress.tsx:133-142`); la ficha solo permite saltar un campo como `no_aplica` y solo al pasar el ratón; «No lo sabías» suena a reproche.
   - Nombres de tema truncados (`truncate` en `SetupProgress.tsx:116`; `nowrap` en la píldora).
   - Micrófono: `unsupported` se oculta sin explicar; «sin dispositivo» y «bloqueado» se ven igual (`use-voice-recorder.ts:109-113`). No hay lectura por voz en ningún sitio.
   - Al reabrir no se dice dónde quedó ni qué falta (solo `open_count`).

2. **La isla dinámica.** Hoy `AssistantDock` es una isla de tinta con tres capas (L escenario vacío, S píldora, M trabajando) que se funden por `opacity` y un solo avatar que viaja por `transform` (`globals.css:2029-2317`). **No tiene ranura para preguntar, avisar ni resumir**: `status` y `activity` son un nodo cada uno; los eventos de socket `CmoBriefingReadyEvent.headline` y `CmoProposalCreatedEvent.title` se tiran; `unseen` solo mueve un badge móvil y el humor `proud`. El dueño quiere una isla tipo iOS/macOS arriba, visible sin estorbar, que pregunte, avise, enseñe resúmenes del CMO y se sienta cercana (referencia: las dos capturas con el personaje en la barra superior y chips de actividad).

**Decisiones del dueño (2026-10-05):**
- **D1 La pregunta vive en la burbuja y la isla la sigue.** La tarjeta de confirmación va junto al dato en el chat; la isla la muestra solo cuando esa burbuja no está a la vista (scroll, hoja de la ficha). Siempre una sola copia visible.
- **D2 La isla global (cabecera de toda la plataforma) va después.** El mockup trae un frame para decidirla; esta tanda no toca el shell.
- **D3 Del informe entran las prioridades Alta y Media**, y «Escuchar la pregunta» con `speechSynthesis` del navegador (cero backend). ElevenLabs, la guía de primer uso y la medición con usuarios quedan fuera.

**Invariantes que no se tocan:** una sola instancia viva del avatar · cero timers/rAF en reposo · la isla solo cambia por `transform`/`opacity` (nada anima `height`) · isla de tinta, violeta para la IA, cero coral en el chat · burbujas sólidas · ficha editable sin gastar turno · cierre en solo lectura · `shared/` no importa de `modules/` · cada método de un puerto nace con un llamador · «NO todo al prompt» · `--maxWorkers=2`, un proceso pesado a la vez.

---

## Dirección de diseño de la isla (lo que dibuja el mockup y luego el kit)

La isla sigue siendo **una pieza de tinta sticky arriba del hilo** (`.island-ink .surface-dark`), y gana cuatro formas más. Nunca hay dos a la vez; una cola decide cuál se ve. En columna estrecha (<900 px) se alinea a la izquierda y toma el ancho, como M hoy.

| Forma | Cuándo | Qué enseña | Acciones |
|---|---|---|---|
| **L** escenario | Chat vacío (Axel) | Como hoy | — |
| **S** píldora | Reposo | Avatar 32 px · nombre · meta · estado (Alba: cápsulas de tema + «Tema · n de m»). **Nuevo:** un punto violeta de «hay algo» cuando la cola tiene un ítem plegado | Tap: despliega el ítem pendiente |
| **M** trabajando | Turno vivo | Paso anterior + actual (hoy). **Nuevo:** fila de **chips de actividad** (icono + etiqueta corta, ≤4, tono por tipo: lectura, cálculo, propuesta) a partir de `live.steps` (Axel) o frases (Alba). Referencia: la segunda captura | — |
| **P** pregunta | Hay una pregunta viva **y su burbuja no está a la vista** (D1) | Eyebrow «✦ Alba te pregunta» · texto ≤2 líneas · si es confirmación: el dato (etiqueta, valor, origen «Lo vi en su web») | 2–3 botones: `contrast` el primero, `glass` el resto («Así es» · «Corregir» · «Después»); «Escribir» lleva el foco al compositor. No se pliega sola |
| **A** aviso | Pasó algo | Una línea ≤34 caracteres + detalle opcional (recetas de §9.4) | Un botón como mucho. Se pliega sola a S en 7 s y deja el punto; con botón no se cierra sola |
| **R** resumen | Axel: informe del día listo o al tocar el punto | `briefing.summary` + hasta 3 `highlights` con punto de tono | «Abrir» (BriefingHero/propuestas) · «Escuchar» (speechSynthesis) · plegar |
| **E** escuchando | Alba: dictado en curso | Onda de 7 barras (`.assistant-wave`, ya existe) + «Te escucho» + reloj | «Detener» · «Cancelar» (espejo del compositor, un solo estado) |

**Material y movimiento.** Cada forma es una capa absoluta más con su tamaño natural (como M hoy, que desborda la barra de 52 px por encima del hilo); se mide con `ResizeObserver` que escribe `--p-w`/`--p-h` en la barra (el patrón de `--pill-w`), para que el avatar viaje a su sitio con el mismo `transform`. Aparece con `opacity` + `scale(.94→1)`; su contenido entra con `assistant-rise`. Tope de altura visible 168 px; el resto hace scroll dentro. `prefers-reduced-motion`: sin viaje ni rise. Brillo: violeta en P/R/M, ámbar en A de advertencia, verde en A de éxito, ninguno en neutro (los `data-tone` de `AssistantIslandStage`).

**Comportamiento.** Cola `IslandItem[]` con prioridad pregunta > aviso > resumen; la isla muestra el primero; «plegar» lo deja en el punto de S; «descartar» lo saca. Un solo timer, y solo mientras un aviso está abierto. `Escape` pliega. La isla nunca tapa el compositor ni roba el foco salvo al abrir por teclado. `aria-live="polite"` para A y R; P es `role="group"` con `aria-labelledby`.

**Qué alimenta a cada producto.**
- Alba: progreso (hoy) · aviso al entrar con datos precargados («Encontré 11 datos en tu web · revísalos cuando quieras» [Ver]) · aviso al cerrar un tema («Listo: Cuándo y dónde atienden · 2 de 6») · P que sigue a la pregunta viva · E en el dictado · aviso de micrófono (bloqueado / sin micrófono / sin soporte) con [Escribir] · aviso de regreso («Seguimos donde quedaste · faltan 3 temas»).
- Axel: aviso «Llegó tu informe · 3 por decidir» [Ver] desde `CmoBriefingReadyEvent.headline` · aviso «Nueva propuesta: {title}» [Ver] desde `CmoProposalCreatedEvent` · R con el resumen del informe · chips en M desde `live.steps` (`productive`) · P que sigue a la pregunta viva.
- **Frame «isla global» (solo mockup, D2):** la S de Axel en la cabecera del shell privado sobre el Panel, con el aviso del informe desplegado y un enlace a /cmo.

---

## Fases

Rama de trabajo: `feat/island-live` en `axi-client` y `axi-server` desde el main local (worktree, [[worktree-and-plan-in-docs]]). Plan versionado en `axi-client/docs/plans/island_live_plan.md` (copia de este documento + estado). Gate explícito del dueño entre fases. La auditora certifica cada fase antes de fusionar.

### F0 — Mockup navegable (Artifact) · GATE
`axi-client/docs/design/mockups/island-live.{build.py,template.html,html,lucide.json}` con el patrón de `alba-closing-summary.build.py` (toma `TOKENS_CSS`, `FIELD_CSS`, `STAGE_CSS`, `RIG_JS` de `assistant-kit-premium.template.html` con `between()`, iconos de `_axi_mockup_kit.Icons`, fuentes del build). **Añade** el CSS real de la isla (`globals.css:2029-2317`) copiado literal, más las capas nuevas. Barra de vistas y tema claro/oscuro; marcado «Mockup F0 · no es producto». Vistas:
1. **La isla, forma a forma** (galería): L · S con punto · M con chips · P pregunta (Alba confirmación / Axel decisión) · A aviso (éxito, advertencia, con botón) · R resumen · E escuchando. Con un botón «Simular» que recorre la cola (S → A → S con punto → tap → P → S) para ver el movimiento.
2. **Alba escritorio**: hilo con la **tarjeta de confirmación junto al dato** (etiqueta, valor, «Lo vi en su web», [Así es] [Corregir] [Después], y el estado tras pulsar: «✓ Confirmado»), una pregunta por turno de ≤2 líneas con opciones cerradas + «Otra respuesta», la isla P siguiendo la pregunta al hacer scroll, y la **ficha compacta**: arriba el tema activo con «x de y datos esenciales confirmados», pendientes de revisar, temas con nombre completo en dos líneas, estados con texto e icono (Pendiente de confirmar · En curso · Confirmado · Ya lo teníamos · Pospuesto), «Posponer tema» como verbo; el resto bajo «Ver resumen».
3. **Alba móvil** (400 px): isla alineada a la izquierda con P desplegada mientras la hoja de la ficha está abierta; E dictando; aviso de micrófono bloqueado.
4. **Axel**: aviso del informe → R desplegado con «Escuchar»; M con chips de lectura.
5. **Isla global** (frame de decisión, D2): cabecera del Panel con la S de Axel y el aviso del informe.
6. **Revisión final de Alba**: «Revisa antes de terminar» con cada dato, origen y estado, «Editar» por dato, pendientes arriba, y el botón que nombra su efecto («Enviar a revisión»).

Publicado como Artifact privado para el dueño. Vista a 1280/768/400 y en oscuro ([[mockup-auditar-desbordes-renderizando]]).

### F1 — Kit: las formas nuevas de la isla (cliente, `shared/`)
- `types.ts`: `AssistantIslandItem = { id; kind: 'question'|'notice'|'summary'; tone?; title; body?; data?: {label; value; origin}; actions: {label; emphasis: 'contrast'|'glass'; onSelect}[]; autoCloseMs? }`, `AssistantActivityChip {icon; label; tone}`.
- `avatar/AssistantDock.tsx`: props nuevas `item?: AssistantIslandItem | null`, `badge?: boolean`, `chips?: readonly AssistantActivityChip[]`, `listening?: { seconds; onStop; onCancel }`; capas `--p` (panel: P/A/R comparten capa, cambia el contenido), `--e`; `ResizeObserver` por capa → `--p-w/--p-h`; `data-shape="pill|working|panel|listening"` en el header. S gana el punto (`.assistant-dock__badge`) y pasa a `<button>` cuando hay `badge` (hoy es un `div` sin interacción).
- Nuevos: `chat/AssistantIslandPanel.tsx` (eyebrow con `AssistantMark`, cuerpo, `data`, botones), `chat/AssistantIslandChips.tsx`, `chat/AssistantIslandListening.tsx`, `hooks/use-island-queue.ts` (cola con prioridad, `open/collapse/dismiss`, un timer solo con aviso abierto, limpieza en unmount y `visibilitychange`), `hooks/use-in-view.ts` (IntersectionObserver sobre la burbuja de la pregunta viva → `questionOffscreen`, escribe `dataset`, sin `useState` por scroll).
- `AssistantIslandActivity`: acepta `chips` y los pinta bajo las líneas.
- CSS en el bloque «EL CHAT DEL KIT»: `.assistant-island--p`, `--e`, `__badge`, `__chips`, transforms del avatar para P/E, tope 168 px + scroll interno, tonos, reduced motion. Variables nuevas una vez.
- Tests: `AssistantDock.test` (una sola forma visible por `data-shape`, punto solo con `badge`, el `<button>` de S solo con badge), `use-island-queue.test` (prioridad, timer solo con aviso, limpieza), `AssistantIslandPanel.test` (botones reales, `contrast` el primero, Escape pliega), `use-in-view.test`. `AxelChat.test`/`AxelHeroAvatar.test` siguen verdes sin tocar aserciones (invariante: el avatar no se re-renderiza por el ítem; el ítem llega por props primitivas al dock, no al hero).
- Verja acotada: `npx jest --testPathPattern "assistant" --maxWorkers=2` · `npx next lint --dir src/shared/components/features/assistant` · tsc acotado.

### F2 — Servidor intake: confirmar, no inferir, saber dónde va (hotfix de dominio)
- **`confirm` en el PATCH** (`public_intake.dto.ts`, `patch_intake_answers.use_case.ts`): `confirm: field_code[]` marca el valor actual como `stated` **sin re-enviar el valor**, emite `intake_field_confirmed`; `corrected` sigue saliendo del `answers` con valor distinto. La ficha deja de re-guardar.
- **La revisión de lo encontrado es guionizada, sin IA** (es el «Paso 1 · Revisa lo que encontramos» del informe). Todo lo `derived`/`proposed` nace en el pre-llenado, al emitir el enlace; no aparece a mitad de entrevista. Así que `view` devuelve `review: { field_code; topic; label; value; source; confidence }[]` (ordenado por tema, solo con valor confirmable) y el cliente presenta una tarjeta tras otra con una línea guionizada por origen («Lo vi en su web», «Lo propuse por tu tipo de negocio»): confirmar, corregir o dejar para después es un `PATCH` y la siguiente tarjeta sale al instante. Coste cero, sin turnos, sin que el modelo interprete un «sí». Cuando la lista se vacía (o se pospone), el modelo toma la entrevista: su bloque «Lo que ya tienes» ya no trae pendientes, y lo marcado `luego` **no se vuelve a preguntar**: va a la revisión final. No hace falta un `kind: 'confirm'` en `ask_client` (nacería sin llamador). `save_answers.confirmed` se borra (no lo lee nadie). Verificado: no existe un turno de avance vacío (`message` es `min(1)`), por eso la revisión no puede apoyarse en el modelo sin gastar turno.
- **Historial con la pregunta**: el turno que es solo pregunta guarda en `body` el texto de la pregunta (o la memoria del turno la incluye) para que «Sí» llegue con lo que responde.
- **Regla de ambigüedad en el prompt** (`intake_prompt.ts`): una respuesta general a una pregunta con varias lecturas («está bien», «sí») solo confirma lo presentado; nunca produce un valor nuevo; si la pregunta mezclaba datos, se desglosa con opciones. Una pregunta por turno, ≤2 líneas antes de preguntar. Para «no sé / somos nuevos»: ofrecer «Ayúdame a definirlo» (el modelo propone un ejemplo editable → `proposed`), «Usar un ejemplo», «Definir después» (`luego`). Medición: el spec del prompt fija el bloque estable byte-idéntico (patrón de P3).
- **Saltos**: `luego` permitido en un campo obligatorio **que tiene valor confirmable** (= revisar después: el valor se queda `derived`, el tema no cierra); la ficha puede saltar como `no_sabe` y `luego`, no solo `no_aplica`. Etiquetas: «No aplica», «Por definir» (antes «No lo sabías»), «Para después».
- **Progreso** (`intake_progress.ts`): expone `essential: {confirmed, total}` (obligatorios con valor `stated`/`known`) y por tema `{confirmed, total, pending_confirmation}`; `percent` por esenciales confirmados. `done` no cambia (producto: `known` es dato del propio tenant). DTO y `schema.d.ts` regenerado.
- **Regreso**: `view` devuelve `resume: { missing_topics: string[]; last_topic } | null` cuando `open_count > 1` y hay mensajes; el saludo no se regenera (coste cero).
- Telemetría: `intake_field_confirmed`/`corrected` ya existen; nuevo `intake_question_listened` (contador escalar, dentro del UPDATE existente).
- Tests: use cases, tool, prompt spec, `intake_progress.spec`, e2e `intake_public_link` con `confirm` contra Postgres real ([[verjas-no-ven-css]]: SQL crudo se ejecuta, no se compila).
- Migración: una, mínima y dedicada ([[migraciones-dedicadas-sin-gate]]): la columna escalar `listened_count` en `intake_session`. Nada más toca el esquema.

### F3 — Alba sobre la isla + el informe (cliente `modules/intake`)
- **Revisión guionizada + tarjeta de confirmación** `ui/components/ConfirmCard.tsx`: mientras `review` tenga ítems, el hilo muestra (como burbuja de Alba, guionizada) «Encontré esto en tu web» + la tarjeta del dato (etiqueta, valor, origen) con [Así es] → `PATCH confirm` · [Corregir] → editor inline de `SetupFieldRow` para texto/lista/opción, foco al compositor para los complejos (horario) · [Después] → `PATCH skip luego`. Tras pulsar, la tarjeta queda «✓ Confirmado · Cuándo y dónde atienden» (o «Corregido» / «Para después») y sale la siguiente al instante, sin turno. Un contador «3 de 11 revisados» en la isla S durante la revisión. Al acabar, el hilo sigue con el modelo (el compositor queda libre durante la revisión: escribir salta la revisión y la deja para después).
- **`useAlbaIsland`** (selector con `useShallow`): cola de ítems desde el store (`resume`, datos precargados al entrar, tema cerrado, errores de micrófono) + `questionOffscreen` del hook del kit → `item`/`badge`/`listening` al dock.
- **Progreso y ficha**: `countCaptured` por `essential`; copy «x de y datos esenciales confirmados · z pendientes de revisar · w no aplican» (solo `no_aplica` cuenta ahí); `SetupProgress` con nombres completos (`line-clamp-2`), estado con texto e icono, «Posponer tema» como verbo con su efecto («vuelve al final»); ficha con el tema activo arriba, pendientes, y el resto bajo «Ver resumen» (`<details>`); saltos por campo visibles sin hover en móvil; «No aplica / Por definir / Para después».
- **Voz**: `use-voice-recorder` distingue `unsupported | no_device | denied | failed` (`NotFoundError` vs `NotAllowedError`), consulta `navigator.permissions` si existe; el compositor explica cada uno y ofrece «Escribir». «Escuchar la pregunta» (`core/hooks/use-speech.ts` sobre `speechSynthesis`, voz `es-*` si hay; botón ▶/⏸ en la burbuja de la pregunta viva y en R/P de la isla; oculto si no hay soporte) + `listened` al servidor.
- **Regreso**: `SystemNote` «Seguimos donde quedaste · faltan: …» + aviso en la isla, una vez por apertura (`sessionStorage`).
- **Cierre en dos pasos**: al pulsar «Terminar» con pendientes de revisar, la isla avisa «3 datos sin confirmar» [Revisarlos] y la ficha salta a ellos; el botón final nombra su efecto («Enviar a revisión»; el equipo aplica). `SetupDone` sin cambios de lógica.
- Tests: `ConfirmCard.test`, `use-alba-island.test`, `SetupProgress.test` (nombres completos, verbo), `intake.store.test` (confirm sin turno, resume), `use-voice-recorder.test` (cuatro estados), `use-speech.test`.
- Verja acotada: `npx jest --testPathPattern "intake|assistant" --maxWorkers=2`, lint por dirs, tsc acotado; visual en `/configurar/{token}` escritorio/móvil/oscuro con el servidor local.

### F4 — Axel sobre la isla (cliente `modules/cmo`)
- `useAxelIsland`: avisos desde `onBriefingReady` (headline) y `onProposalCreated` (title) en `cmo.store` (hoy solo refetch); R con `briefing.summary` + `highlights`; chips en M desde `live.steps` (`productive`, agrupados por `name`); P que sigue a la pregunta viva. `unseen` sigue moviendo el badge móvil.
- «Escuchar» el resumen con el mismo `use-speech`.
- Tests: `cmo.store.test` (los eventos encolan un aviso), `AxelChat.test` sin tocar aserciones.

### F5 — Documentación, verjas completas y cierre
- `DESIGN-SYSTEM.md` §5.2/§6 (las siete formas de la isla; «una isla, una cola, un timer»), §9.4 (el aviso dentro del chat del asistente es la forma A de la isla, no un toast: una ranura, mismas recetas de copy), `architecture.md` §12. Plan `island_live_plan.md` con estado. Nota de reubicación en `assistants_premium_plan.md`.
- Verjas completas de una en una ([[verja-completa-no-encadenada-oom]]) o delegadas a la auditora: servidor `npm test -- --maxWorkers=2`, lint, tsc, e2e intake; cliente jest, `next lint`, `tsc`, `next build` (heap 4 GB, `rm -rf .next` si `WasmHash`). Contrato: `api:types:check`.
- Memoria: `island-live-plan.md` + línea en MEMORY.md; actualizar `alba-hotfix-p1-p5.md` (origen `confirm`) y `assistant-kit-plan.md`.

---

## Archivos críticos

**Kit (cliente):** `src/shared/components/features/assistant/{types.ts,index.ts}`, `avatar/AssistantDock.tsx`, `chat/AssistantIslandActivity.tsx`, nuevos `chat/AssistantIslandPanel.tsx`, `chat/AssistantIslandChips.tsx`, `chat/AssistantIslandListening.tsx`, `hooks/use-island-queue.ts`, `hooks/use-in-view.ts`; `src/app/globals.css` (bloque 2029-2317); `src/core/hooks/use-voice-recorder.ts`, nuevo `src/core/hooks/use-speech.ts`.
**Alba (cliente):** `src/modules/intake/ui/SetupView.tsx`, `components/{SetupThread,SetupProgress,SetupSummary,SetupFieldRow,AlbaIslandStatus,SetupStates}.tsx`, nuevos `components/ConfirmCard.tsx`, `infrastructure/hooks/use-alba-island.ts`; `domain/intake.ts` (`countCaptured`, labels); `infrastructure/stores/intake.store.ts` (`confirm`, `resume`).
**Axel (cliente):** `src/modules/cmo/ui/components/AxelChat.tsx`, `infrastructure/stores/cmo.store.ts`, nuevo `infrastructure/hooks/use-axel-island.ts`.
**Servidor:** `src/modules/intake/presentation/dto/public_intake.dto.ts`, `application/use_cases/{patch_intake_answers,view_intake_session,send_intake_message}.use_case.ts`, `application/tools/{ask_client,save_answers,skip_field,intake_tool}.ts`, `application/intake_prompt.ts`, `application/intake_runtime.service.ts`, `domain/{intake_progress,intake_skips,intake_telemetry}.ts`, `application/sessions.repository.ts`, `prisma/schema/intake.prisma` + migración, `openapi/openapi.json`, `test/e2e/intake_public_link.e2e.spec.ts`.
**Mockup:** `axi-client/docs/design/mockups/island-live.*` (reutiliza `assistant-kit-premium.template.html` por `between()` y `_axi_mockup_kit.py`).

**Reutilizar:** `islandClassName` (`features/island`), `AssistantIslandStage` tonos, `.assistant-wave`, `assistant-rise`, `AssistantMark`, `Button variant="contrast"|"glass"`, `useAutoScroll`, recetas de copy de §9.4, `SetupFieldRow` editores, `needsConfirmation`/`INTAKE_ANSWER_SOURCES`, `pendingNotice`.

---

## Verificación end-to-end

1. **Mockup** (F0): el dueño recorre las 6 vistas en claro/oscuro y a 400 px; aprueba las formas y el copy antes de F1.
2. **Isla** (F1): en `/cmo` y `/configurar` una sola forma visible en todo momento (`data-shape`); el punto aparece al plegar un aviso y desaparece al abrirlo; Escape pliega; reduced motion sin viaje; el avatar sigue siendo una instancia; DevTools: cero timers con la isla en S.
3. **Alba** (F2+F3): sesión sembrada con datos de la web → Alba presenta el dato con la tarjeta; «Así es» no gasta turno (`turn_count` igual, `source: stated`, evento `intake_field_confirmed` en la fila); «está bien» a una pregunta mixta produce un desglose, no un valor; el avance sube solo al confirmar; nombres completos; «Posponer tema» explica su efecto; micrófono bloqueado → aviso con «Escribir»; «Escuchar» lee la pregunta y se pausa; reabrir el enlace muestra «Seguimos donde quedaste»; terminar con pendientes avisa y salta a ellos.
4. **Axel** (F4): al llegar `cmo.briefing_ready` por socket la isla avisa con el titular; «Ver» abre el resumen R; «Nueva propuesta» al crearse una; chips durante el turno.
5. **Suites**: acotadas por fase; completas + `next build` + e2e intake en F5, un proceso a la vez; certificación de la auditora antes de fusionar y de empujar.
