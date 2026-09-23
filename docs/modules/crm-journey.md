# CRM · El recorrido del cliente (F4 del programa «Método comercial»)

Cliente de la fase F4 del plan `axi-server/docs/plans/commercial_method_plan.md`
(«Recorrido vivo»). Tres piezas: el editor `/crm/settings/recorrido`, la card
«Recorrido» del Contacto 360 y las entradas nuevas del historial con «Deshacer».
El servidor se construyó en paralelo: los tipos wire son TEMPORALES (abajo).

## Qué hay

### Dominio — `src/modules/crm/domain/journey.ts` (puro)
- `STAGE_KINDS` (`new · contacted · qualified · meeting · proposal · negotiation ·
  commitment · fulfillment · custom`), `STAGE_KIND_LABELS` (Nuevo, Contactado,
  Calificado, **Cita**, Propuesta, Negociación, Compromiso, Entrega,
  **Personalizada**), `STAGE_KIND_HINTS` (una frase por tipo), `STAGE_KIND_ORDER`
  (semántico, sin `custom`), `isFinalKind` (compromiso, entrega).
  **Ganado/Perdido NO son kinds**: son `deal.status` (D7 del CRM, P3 del plan).
- Cadencia: `CADENCE_CHANNELS`/`_LABELS` (Mensaje · Llamada · Llamada y luego
  mensaje), `EXHAUSTED_ACTIONS`/`_LABELS` (Marcar perdida · Dejar enfriar · Pasar
  a una persona), `CADENCE_WAIT_OPTIONS` (1 h · 4 h · 12 h · 1 día · 2 · 3 · 7
  días), `DEFAULT_CADENCE` (3 · 24 h · mensaje · dejar enfriar).
- Formato: `cadenceSummary(stage)` → «4 intentos · cada 2 días · Mensaje · máx.
  10 días · luego marcar perdida» (horas si < 24 o no múltiplo de 24; «cada día»
  para 24), `waitLabel`, `waitOptionLabel`, `attemptsLabel`, `daysInStageLabel`
  («hoy» · «6 días»), `stageDeadline`, `moverLabel` («el agente Sofía» · «una
  regla» · nombre de la persona).
- Badges (`StatusMap` para `StatusBadge appearance="dot"`): `STAGE_KIND_BADGES`
  (todos neutros: la etapa no es un semáforo) y `JOURNEY_BADGES` (`custom` → «No
  se mueve sola», `ai_paused` → «Movimientos de la IA en pausa», ambos warning).
- Reglas: `JOURNEY_RULE_LABELS`/`journeyRuleLabel` (espejo de `journey_rules.ts`
  del servidor + `stage_deleted`), `LIFECYCLE_SOURCE_LABELS`/`lifecycleSourceLabel`
  (`contact_lifecycle_event.source_event` → «pedido creado»…; desconocido → null).
- `JOURNEY_CHANGED_EVENT = "crm:journey:changed"`: CustomEvent del DOM con el que
  la card y el historial se avisan un «Deshacer» o un «Reanudar» (arquitectura §9).
- Tests: `domain/__tests__/journey.test.ts` (exhaustividad de labels/orden,
  `cadenceSummary`, formatos, `moverLabel`, reglas).

Los iconos por kind viven en `ui/components/settings/journey/stage-kind-icons.ts`
y no en `domain/`: son componentes React (arquitectura §3.3).

### Adapter — `infrastructure/services/journey-service.adapter.ts`
`getJourney` (`GET /crm/journey`), `putJourney` (`PUT /crm/journey`, 409
`crm/stage_kind_taken`), `applyJourneyTemplate` (`POST /crm/journey/apply-template`),
`getContactJourney` (`GET /crm/contacts/:id/journey`), `revertStageChange`
(`POST /crm/deals/:id/events/:event_id/revert`, `crm:manage`), `resumeAiMoves`
(`PATCH /crm/deals/:id {ai_moves_paused:false}`).

### `/crm/settings/recorrido` — `ui/components/settings/journey/`
Pestaña «Recorrido» en `SettingsNav` (tras Pipelines, `crm:manage`, icono `Route`).
- `JourneyEditor`: carga, PUT del recorrido ENTERO al salir de cada campo
  (optimista; si falla vuelve atrás y avisa; el 409 de tipo repetido dice «Ya hay
  una etapa de tipo X; elige otro tipo»). Cabecera «El recorrido del cliente» +
  lead, explicador, plantilla, lista de etapas, notas al pie.
- `JourneyExplainer`: `Callout` info con `Sparkles` en violeta (permitido: habla de
  la IA).
- `JourneyTemplatePicker`: fila «Plantilla → {nicho}» con «Cambiar» (`hover-reveal`)
  que abre el selector EN LÍNEA (radiogroup) con las plantillas que devuelve el
  servidor (`templates`, 11 nichos), el `niche_code` de la empresa primero
  (`useMyCompany` de `companies/public`); el nombre sale de `nicheByCode`
  (`onboarding/public`) y cae al `name` del servidor si el cliente no conoce el
  código. Aviso «Reemplaza tipos y cadencias. No borra etapas ni oportunidades.»
- `JourneyStageRow`: `li.grouped-row.group` con el botón del nombre + resumen
  (despliega), el `Select` compacto del tipo (kinds ya usados por otra etapa
  deshabilitados «· ya usado») y el badge dot «No se mueve sola» si es
  `custom`. Controles hermanos, nunca anidados.
- `JourneyCadenceFields`: filas etiqueta → control con SOLO lo que el modelo
  guarda: Intentos (1–20, guarda al blur/Enter), Espera (`Select`), Canal, Tiempo
  máximo en la etapa (días → `rotting_days`, vacío = sin máximo), Al agotarse, el
  interruptor «Se mueve sola» (`auto_advance`, hint «Apagado: solo una persona o el
  agente la mueven»; apagado y bloqueado en `custom`), «Activar cadencia» /
  «Quitar cadencia» y el texto «La mueven solos: … » con `moves_on`.
- Tests: `journey/__tests__/JourneyEditor.test.tsx`.

### Contacto 360 — `contact-detail/ContactJourneyCard.tsx`
Montada sobre `ScorePanel` en `crm/contacts/[contactId]/page.tsx`. Lista
etiqueta → valor: «Etapa → {nombre} + badge neutro del tipo», «En la etapa → 6
días · máx. 10 días · vence el …», «La movió → el agente Sofía · «razón» · hace
2 h» con **Deshacer** al hover/foco (`crm:manage`; confirma con `showModal`; si lo
movió la IA el aviso dice que sus movimientos quedan en pausa), «Cadencia →
intento 1 de 4 · próximo el … · Mensaje», y si `deal.ai_moves_paused` la fila
«Movimientos de la IA → en pausa» con **Reanudar**. Sin deal: «Sin recorrido
activo. Se abre solo al detectar intención o al crear una oportunidad.» 404/403 →
no se pinta. Tests: `contact-detail/__tests__/ContactJourneyCard.test.tsx`.

### Historial — `contact-detail/ContactTimelineFeed.tsx`
- `TIMELINE_SOURCES` += `lifecycle` («Ciclo de vida», icono `UserRound`).
- `journeyItem(entry)`: `deal_stage_changed` con `actor_type='ai_agent'` → icono
  `Route` en violeta, «Pasó a {etapa} — agente IA · «razón»» + `AiBadge`; con
  `system` → neutro «Pasó a {etapa} — regla: cita agendada»; con `user` → «Pasó a
  {etapa}» (+ «razón» si la hay). `deal_stage_reverted` → «Se deshizo el paso a
  {etapa}». `lifecycle` → «Prospecto → Lead (pedido creado)». El nombre de la
  etapa sale de `payload.to_stage_name` (el servidor lo resuelve en batch) y cae
  al label del kind.
- **Deshacer** (`canRevert`, lo pasa `ContactTimeline` con `crm:manage`) solo en
  `deal_stage_changed` con `deal_id` y que no figure como `reverted_event_id` de
  un `deal_stage_reverted` cargado. Confirma, llama `revertStageChange`, emite
  `JOURNEY_CHANGED_EVENT`; el feed y la card escuchan ese evento y recargan.
- Tests en `__tests__/ContactTimelineFeed.test.tsx` (bloque «recorrido (F4)»).

### Compartido
- `shared/components/features/timeline/Timeline.tsx`: `TimelineItem.action?:
  ReactNode` pintado a la derecha en un `div.hover-reveal`; el `li` pasa a
  `group`. Única modificación del compartido. Test en su spec.
- `globals.css`: utilidad `.hover-reveal` — dentro de `@media (hover: hover)` se
  esconde hasta el hover o el `focus-within` de su `.group` (o su propio
  `focus-visible` / `aria-expanded="true"`); en táctil queda siempre visible.

## Tipos TEMPORALES a sustituir al regenerar `core/api/schema.d.ts`
Marcados con `// TEMPORAL (F4)`:
- `src/modules/crm/domain/journey.ts`: `JourneyCadenceDTO`, `JourneyStageDTO`,
  `JourneyTemplateStageDTO`, `JourneyTemplateDTO`, `JourneyDTO`,
  `PutJourneyStageDTO`, `PutJourneyDTO`, `ContactJourneyDTO`, `JourneyActorType`,
  `StageKind`, `CadenceChannel`, `ExhaustedAction`.
  Supuestos que el servidor debe confirmar: `PUT /crm/journey` acepta
  `auto_advance` por etapa; `GET /crm/contacts/:id/journey` trae
  `deal.ai_moves_paused`, `last_move.rule_code` y `stage: null` cuando no hay
  deal.
- `src/modules/crm/domain/contact.ts`: `TimelineSource` y `TimelineEntryDTO`
  amplían el generado con `source: "lifecycle"`.

## Deuda y decisiones fuera del plan
- **«Pausar cadencia» no se pinta**: no existe endpoint. Cuando llegue, la fila
  «Cadencia» de `ContactJourneyCard` gana la acción (`hover-reveal`).
- El botón «Deshacer» del historial solo sabe que un paso ya se deshizo si el
  `stage_reverted` está en la página cargada; si quedó en una página posterior,
  el servidor responde 409 `crm/stage_change_not_revertible` y se muestra el
  mensaje.
- `templateName` prefiere el nombre del catálogo del cliente (`NICHES`, 9
  nichos) y cae al `name` del servidor para `software_saas` y `retail_tech`;
  no se tocó `onboarding/domain/niches.ts`.
- La etiqueta del kind `meeting` es «Cita» (no «Agenda», que es el módulo).
- Al cambiar una etapa a «Personalizada» el editor apaga `auto_advance` en la
  misma escritura: una etapa sin reglas no puede prometer que se mueve sola.
