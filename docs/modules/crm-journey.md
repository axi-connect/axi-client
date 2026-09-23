# CRM · El recorrido del cliente (F4 del programa «Método comercial»)

Cliente de la fase F4 del plan `axi-server/docs/plans/commercial_method_plan.md`
(«Recorrido vivo»). Tres piezas: el editor `/crm/settings/recorrido`, la card
«Recorrido» del Contacto 360 y las entradas nuevas del historial con «Deshacer».
Los tipos wire salen del contrato generado (`core/api/schema.d.ts`, § Contrato).

> **Regla dura de despliegue: el servidor va ANTES que el cliente.** El cliente
> pide el historial con `sources=…,lifecycle` y el `timelineQuerySchema` de
> producción responde **400** a una fuente que no conoce: el 360 entero se
> quedaría sin historial. Lo mismo para `/crm/journey` (la pestaña «Recorrido»
> daría «El recurso ya no existe») y `/crm/contacts/:id/journey` (la card se
> esconde sola con 404, ese sí degrada). Orden: server F4 en producción →
> cliente F4.

## Qué hay

### Dominio — `src/modules/crm/domain/journey.ts` (puro)
- `STAGE_KINDS` (`new · contacted · qualified · meeting · proposal · negotiation ·
  commitment · fulfillment · custom`), `STAGE_KIND_LABELS` (Nuevo, Contactado,
  Calificado, **Cita**, Propuesta, Negociación, Compromiso, Entrega,
  **Personalizada**), `STAGE_KIND_HINTS` (una frase por tipo), `STAGE_KIND_ORDER`
  (semántico, sin `custom`). **Ganado/Perdido NO son kinds**: son `deal.status`
  (D7 del CRM, P3 del plan).
- Cadencia: `CADENCE_CHANNELS`/`_LABELS` (Mensaje · Llamada · Llamada y luego
  mensaje), `EXHAUSTED_ACTIONS`/`_LABELS` (Marcar perdida · Dejar enfriar · Pasar
  a una persona), `CADENCE_WAIT_OPTIONS` (1 h · 4 h · 12 h · 1 día · 2 · 3 · 7
  días), `DEFAULT_CADENCE` (3 · 24 h · mensaje · dejar enfriar).
- Formato: `cadenceSummary(stage)` → «4 intentos · cada 2 días · mensaje · máx.
  10 días · al agotarse: marcar perdida» (horas si < 24 o no múltiplo de 24;
  «cada día» para 24), `waitLabel`, `waitOptionLabel`, `attemptsLabel`,
  `daysInStageLabel` («hoy» · «6 días»), `stageDeadline`, `moverLabel` («el
  agente Sofía» · «una regla» · nombre de la persona).
- Reglas: `autoAdvanceAfterKindChange(from, to, current)` (Personalizada apaga
  «Se mueve sola»; volver a un tipo lo enciende; entre tipos se respeta lo
  decidido), `isRevertibleMove({rule_code, revertible})` (manda el servidor si
  dice `revertible`; si calla, `paid` y `stage_deleted` no se deshacen:
  `NON_REVERTIBLE_RULES`), `JOURNEY_RULE_LABELS`/`journeyRuleLabel` (espejo de
  `journey_rules.ts` del servidor; `first_reply` = «primera respuesta del
  cliente»), `LIFECYCLE_SOURCE_LABELS`/`lifecycleSourceLabel`
  (`contact_lifecycle_event.source_event` → «pedido creado»…; desconocido → null).
- Badges (`StatusMap` para `StatusBadge appearance="dot"`): `STAGE_KIND_BADGES`
  (todos neutros: la etapa no es un semáforo) y `JOURNEY_BADGES` (`custom` → «No
  se mueve sola», `ai_paused` → «Movimientos de la IA en pausa», ambos warning).
- `JOURNEY_CHANGED_EVENT = "crm:journey:changed"` + `JourneyChangedDetail
  {contactId, dealId}`: el CustomEvent del DOM con el que la card, el historial
  y la página del 360 se avisan un «Deshacer» o un «Reanudar» (arquitectura §9).
  Quien escucha filtra por `contactId`.
- Tests: `domain/__tests__/journey.test.ts`.

Los iconos por kind viven en `ui/components/settings/journey/stage-kind-icons.ts`
(solo los usa el `Select` del editor): son componentes React (§3.3).

### Infraestructura
- `services/journey-service.adapter.ts`: `getJourney` (`GET /crm/journey`,
  `crm:read`), `putJourney` (`PUT /crm/journey` con lista PARCIAL de etapas;
  409 `crm/stage_kind_taken`), `applyJourneyTemplate`
  (`POST /crm/journey/apply-template`), `getContactJourney`
  (`GET /crm/contacts/:id/journey`), `revertStageChange`
  (`POST /crm/deals/:id/events/:event_id/revert`, `crm:manage`),
  `resumeAiMoves` (`PATCH /crm/deals/:id {ai_moves_paused:false}`).
- `journey-events.ts`: `emitJourneyChanged(detail)` y
  `subscribeJourneyChanged(contactId, handler) → unsubscribe`.
- `hooks/use-revert-stage-change.ts`: **el único** «Deshacer». Confirma en un
  modal («¿Deshacer el paso a X?» · «La oportunidad vuelve a {from} y queda en
  el historial» + la frase de la pausa si lo movió la IA; la acción NO es
  destructiva: variante por defecto), llama al servidor UNA vez (`busy` en ref
  corta el doble clic), avisa y emite el evento del contacto. Lo usan la card y
  el historial.

### `/crm/settings/recorrido` — `ui/components/settings/journey/`
Pestaña «Recorrido» en `SettingsNav` (tras Pipelines, `crm:manage`, icono `Route`).
- `JourneyEditor`: cada campo guarda al salir con un **PUT de SOLO su etapa**;
  la respuesta se fusiona solo en esa etapa. El estado vive en un ref que se
  actualiza junto al `setState` (dos guardados seguidos leen lo último). Por
  etapa: contador de secuencia que descarta una respuesta vieja, foto previa a
  la que volver si el servidor rechaza, y `busy` propio (sus controles se
  bloquean; los de las demás no). `saveErrorTitle(err, kind)`: 409 de tipo
  repetido → «Ya hay una etapa de tipo X; elige otro tipo»; otro 409 → «el
  recorrido cambió mientras editabas. Recarga la página»; resto → `errorMessage`.
  Cambiar el tipo aplica `autoAdvanceAfterKindChange`. Aplicar plantilla:
  si falla, la promesa rechaza y el selector se queda abierto con la elección.
- `JourneyExplainer`: `Callout` info con `Sparkles` en violeta (habla de la IA).
- `JourneyTemplatePicker`: fila «Plantilla → {nicho}» con «Cambiar»
  (`hover-reveal`) que abre el selector EN LÍNEA: radiogroup con **foco
  itinerante** (Tab entra por el marcado, flechas/Home/End recorren y marcan),
  las plantillas que devuelve el servidor (`templates`), el `niche_code` de la
  empresa primero (`useMyCompany` de `companies/public`); nombre por
  `nicheByCode` (`onboarding/public`) con caída al `name` del servidor.
  Singular/plural: «1 etapa con cadencia».
- `JourneyStageRow`: `li.grouped-row.reveal-group` con el botón del nombre +
  resumen (despliega; `aria-controls` solo cuando el panel existe), el `Select`
  compacto del tipo (kinds ya usados por otra etapa deshabilitados «· ya usado»)
  y el badge dot «No se mueve sola» si es `custom`. Controles hermanos.
- `JourneyCadenceFields`: filas etiqueta → control con SOLO lo que el modelo
  guarda: Intentos (1–20; guarda al blur/Enter; **un valor fuera de rango se
  queda con el error debajo**, `aria-invalid` + `role="alert"`), Espera, Canal,
  Tiempo máximo en la etapa (días → `rotting_days`, vacío = sin máximo), Al
  agotarse, «Se mueve sola» (`auto_advance`; hint FUERA del `<label>` vía
  `aria-describedby`: «Apagado: solo una persona o el agente la mueven»;
  bloqueado en `custom`), «Activar/Quitar cadencia» y «La mueven solos: …».
- Tests: `journey/__tests__/JourneyEditor.test.tsx` (PUT parcial, dos guardados
  concurrentes con A tarde tras B, busy por etapa, Personalizada ↔ tipo con el
  `Select` real, 409 de tipo repetido, tipo ya usado deshabilitado, número
  inválido, foco itinerante, fallo de plantilla con el selector abierto).

### Contacto 360 — `contact-detail/ContactJourneyCard.tsx`
Montada sobre `ScorePanel` en `crm/contacts/[contactId]/page.tsx`; la página
también escucha `crm:journey:changed` de su contacto y recarga los deals. Lista
etiqueta → valor: «Etapa → {nombre} + badge neutro del tipo», «En la etapa → 6
días · máx. 10 días · vence el …», «La movió → el agente Sofía · «razón» · hace
2 h» con **Deshacer** (`crm:manage` y `isRevertibleMove(last_move)`; el servidor
manda en `last_move` solo el último `stage_changed` NO deshecho, así tras un
Deshacer la fila desaparece), «Cadencia → intento 1 de 4 · próximo el … ·
Mensaje», y si `deal.ai_moves_paused` la fila «Movimientos de la IA → en pausa»
con **Reanudar**. Sin deal: «Sin recorrido activo…»; con `ambiguous:true`:
«Tiene varias oportunidades abiertas: el recorrido se sigue desde cada una en
Pipeline.» 404/403 → no se pinta. Tests en `__tests__/ContactJourneyCard.test.tsx`.

### Historial — `contact-detail/ContactTimelineFeed.tsx`
- `TIMELINE_SOURCES` += `lifecycle` («Ciclo de vida», icono `UserRound`).
- `journeyItem(entry)`: `deal_stage_changed` con `actor_type='ai_agent'` → icono
  `Route` en violeta, «Pasó a {etapa} — agente IA · «razón»» + `AiBadge`; con
  `system` → neutro «Pasó a {etapa} — regla: cita agendada»; con `user` → «Pasó a
  {etapa}» (+ «razón»). `deal_stage_reverted` → «Se deshizo el paso a {etapa}».
  `lifecycle` → «Prospecto → Lead (pedido creado)». El nombre de la etapa sale de
  `payload.to_stage_name` y cae al label del kind.
- **Deshacer** (`canRevert`, lo pasa `ContactTimeline` con `crm:manage`) solo en
  `deal_stage_changed` con `deal_id` que además: no figure como
  `reverted_event_id` de un `deal_stage_reverted` cargado; no sea de una
  oportunidad ganada/perdida (el primer `deal_won`/`deal_lost`/`deal_reopened`
  visto por deal —la lista va de nueva a vieja— es su estado); pase
  `isRevertibleMove` (`rule_code` ≠ `paid`/`stage_deleted`, `payload.revertible`
  ≠ false). Usa `useRevertStageChange`; el feed escucha el evento del contacto.
- Tests en `__tests__/ContactTimelineFeed.test.tsx` (bloque «recorrido (F4)»).

### Compartido
- `shared/components/features/timeline/Timeline.tsx`: `TimelineItem.action?:
  ReactNode` a la derecha en un `div.hover-reveal`; el `li` es `.reveal-group`.
  Única modificación del compartido. Test en su spec.
- `globals.css`: utilidad `.hover-reveal` dentro de `@media (hover: hover)`:
  se esconde hasta el hover o `focus-within` de su `.reveal-group` (clase propia,
  no el `.group` de Tailwind: cualquier ancestro `.group` la dispararía), o su
  propio `focus-visible`/`aria-expanded`; en táctil siempre visible. La fila es
  el `.reveal-group` más cercano; no se anidan.

## Contrato
Los tipos wire salen de `core/api/schema.d.ts` (regenerado en `c121fef` desde el
openapi del servidor F4): `Schemas["JourneyDto"]`, `Schemas["UpdateJourneyDto"]`
(lista parcial de etapas), `Schemas["ApplyJourneyTemplateDto"]`,
`Schemas["ContactJourneyDto"]` (con `ambiguous` y `last_move.revertible`),
`Schemas["RevertStageChangeDto"]`, `UpdateDealDto.ai_moves_paused` y
`TimelineDto` con `source: "lifecycle"`. Ya no queda ningún tipo TEMPORAL en el
slice; `STAGE_KINDS`/`CADENCE_CHANNELS`/`EXHAUSTED_ACTIONS` son listas de ORDEN
tipadas contra el contrato y los `Record<StageKind, …>` son la verja de
exhaustividad.

## Deuda
- **«Pausar cadencia» no se pinta**: no existe endpoint. Cuando llegue, la fila
  «Cadencia» de `ContactJourneyCard.tsx` gana la acción (`hover-reveal`).
- **Deshacer en el historial y el estado del deal** (`ContactTimelineFeed.tsx`,
  cálculo de `closedDealIds`): se deduce de los eventos cargados en la página;
  si el `deal_won` quedó en una página posterior, el botón se pinta y el
  servidor responde 409 `crm/stage_change_not_revertible` (se muestra el
  mensaje). Se cierra cuando el payload traiga `revertible`.
- `templateName` prefiere el nombre del catálogo del cliente (`NICHES`, 9
  nichos) y cae al `name` del servidor para `software_saas` y `retail_tech`;
  no se tocó `onboarding/domain/niches.ts`.
- `formatShortDate` da «03 de oct de 2026» (más largo que el «3 oct» del
  mockup); es el helper compartido.
