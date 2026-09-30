# Agenda premium (F1–F3) + arreglo «Ver llamada»

## Contexto
La Agenda (`/scheduling`) es el último módulo grande sin pasar por el lenguaje premium (Inbox y CRM ya están desplegados). Hoy usa coral en la selección (`bg-primary` en hoy, en el horario elegido y en la recurrencia), texto de 10–11 px, tres mapas de tinte de estado duplicados, y en el celular no cabe (semana de 7 columnas a 390 px). No tiene lienzo ni plan previo.

Hay además un error de origen: cuando el asistente agenda en una **llamada**, `agent_runtime.service.ts:1265-1272` pone `conversation_id = call_session_id`. La cita (y la tarea de seguimiento del CRM) guarda el id de la llamada como si fuera conversación. El detalle (`AppointmentSheetRoute.tsx:175-191`) pinta «Ver conversación» → `/workspace/inbox/{id}`, que no existe. Debe decir **«Ver llamada»** → `/calls/{id}`.

**Decisiones de la dueña (2026-09-30):**
- Todo por fases, con un lienzo aprobado antes de cada una.
- F1 incluye «tocar un hueco para crear» y el arreglo de origen (citas **y** seguimientos), con columna nueva y corrección de datos.
- En el celular: Día por defecto, con una tira de semana.
- Arrastrar para reagendar → **F1b**, opcional; se decide con la F1 en uso.

## Reglas vigentes
- Lienzo aprobado antes de tocar el frontend.
- Plan canónico en `axi-client/docs/plans/agenda_premium_plan.md` (y la parte de servidor en `axi-server/docs/plans/`).
- Rama y worktree propios sobre `origin/main`, nunca `reset --soft main`.
- Una tarea pesada a la vez (9,9 GB); avisar a audit-agent antes de builds o jest completos.
- El auditor certifica y despliega; el servidor lo despliega la dueña a mano.
- Evidencia en `/root/axi/qa/evidencia`.
- Premium es continuidad: nada de coral en la selección, ni islas grandes, ni cristal en el contenido.

---

## F1 · El calendario + origen de la cita

### F1-S · Servidor (rama `fix/origen-llamada`)
1. **Contexto de la tool.** `ToolContext` recibe `call_session_id?: string` (en voz = la sesión). `conversation_id` sigue alimentando las claves de idempotencia (`booking_key`, `activity_key`) para no romper la deduplicación por llamada, pero **no se persiste como origen en voz**. Un helper `originRefs(ctx)` (junto al ToolContext) devuelve `{ conversation_id, call_session_id }` según `channel_kind`.
2. **Prisma.**
   - `scheduling.prisma` Appointment: `call_session_id String?` sin FK (el patrón es referencia sin FK) + índice.
   - `crm.prisma`: la tarea de seguimiento (modelo de la L554-561, con `activity_key`) recibe el mismo campo.
   - Migración con backfill: `UPDATE … SET call_session_id = conversation_id, conversation_id = NULL WHERE conversation_id IN (SELECT id FROM call_session)`, para ambas tablas.
3. **Casos de uso.**
   - `BookingInput` (`scheduling_tools.port.ts:46`) y `book_appointment.use_case.ts:115-129`: aceptan y guardan `call_session_id`.
   - `simulated` se sigue heredando solo de la conversación.
   - `book_appointment.tool.ts:152-167` y `schedule_follow_up.tool.ts:82` usan `originRefs(ctx)`.
   - Revisar con grep las otras tools que persisten `ctx.conversation_id`; lo que no sea de citas o seguimientos queda anotado como deuda.
4. **Efecto colateral.** `auto_reminders.service.ts:81-91` (`resolveChannel`): si `call_session_id` existe y no hay conversación, conserva la caída actual al canal alcanzable más reciente, ahora de forma explícita.
5. **API.**
   - `appointmentSchema` (`scheduling.dto.ts:90-106`) y `toView` (`appointments.query.ts:97-114`) exponen `call_session_id: uuid | null`.
   - Igual en el DTO de las tareas de seguimiento.
   - Los eventos `appointment_booked` y `appointment_completed` llevan `call_session_id`; revisar a los consumidores (scoring, ciclo de vida).
6. **Tests.**
   - Spec de `book_appointment.use_case` y de las tools: en voz guarda `call_session_id` y deja `conversation_id` en null; por chat, al revés (se prueban los dos signos).
   - Test de la migración con una fila de cada tipo.

### F1-C · Cliente (rama `feat/agenda-premium-f1`)
**Origen de la cita:**
- `AppointmentSheetRoute.tsx:175-191`:
  - `call_session_id` → «Ver llamada», icono `Phone`, `/calls/{id}`.
  - `conversation_id` → «Ver conversación».
  - Ninguno → sin enlace.
  - Mismo bloque «Agendada por el asistente», en tinta y violeta según el criterio de la isla.
- Mismo trato en el CRM, donde se pinta el origen del seguimiento (`TasksView`, `TaskRunsSheet`, `ScheduledAgenda`).
- Regenerar `src/core/api/schema.d.ts`.
- Test del detalle con los tres casos.

**Calendario (según el lienzo aprobado):**
- `CalendarToolbar`: segmentado Mes/Semana/Día/Lista y «Hoy» en tinta. «Nueva cita» sigue siendo la única acción coral.
- `MonthGrid`, `TimeGrid`, `AppointmentBlock`:
  - Hoy y la selección en tinta, no coral.
  - El estado va en el punto (StatePill), sin franjas de color.
  - Se eliminan los `text-[10px]/[11px]` (mínimo `text-xs`).
  - **Un único mapa de tono de estado** en `domain/appointment.ts`, que reemplaza los tres duplicados (`AppointmentBlock.tsx:9-15`, `MonthGrid.tsx:17-23`, `appointment.ts:39`).
- **Tocar un hueco para crear:**
  - Clic o Enter en una franja libre de Semana o Día navega a `/scheduling/calendar/create?starts_at=…` (redondeado a 15 min).
  - `AppointmentFormModal` precarga la fecha y la hora.
  - Se ignoran los huecos del pasado.
  - La franja fuera de horario se puede tocar, pero el formulario lo avisa (reutiliza «Otra hora (fuera de la grilla)» de `TimeAvailabilityField`).
- **Celular (< md):**
  - Vista Día por defecto, con una tira de 7 días arriba para cambiar de día.
  - Mes como mapa de puntos; tocar un día abre ese Día.
  - La Semana se oculta en el celular.
  - El detalle usa `DetailSheet side="auto"`.
- **Estados:** vacíos en Día y Semana («Día libre» con acción para crear), además de los que ya existen.
- **Reagendado rápido:** en el detalle, «Reagendar» abre los horarios libres del día (reutiliza `AvailabilityPanel`); elegir uno lleva al modal ya precargado.
- **Reutilizar:**
  - `StatePill` y los tonos de `crm/public`.
  - `SegmentedControl` y `NavTabs`.
  - `business-time.ts`.
  - `ScheduledAgenda` (CRM F3) como referente de la agenda por día.
- **Tests:** dominio del tono único; el test que prueba que tocar un hueco arma el `starts_at` en la zona del negocio (dos signos: con zona distinta a la del navegador y con la misma); el test del detalle.

### F1b · Arrastrar para reagendar (opcional, pendiente de decisión)
- Solo en computador, con `@dnd-kit` (ya se usa en el kanban del CRM).
- Se mueve de 15 en 15 minutos, con confirmación, y si no hay cupo la cita vuelve a su lugar.
- Se decide cuando la F1 esté en producción.

## F2 · La cita
- Detalle (`AppointmentSheetRoute`, `StatusActions`) y `AppointmentFormModal`/`AppointmentForm`, en el lenguaje premium: FieldList, acciones en tinta y la cancelación en línea (respetando las capas z-50/z-60).
- `AvailabilityPanel`: horario elegido en tinta.

Lienzo propio antes de implementar.

## F3 · Recordatorios y Configuración
- `RemindersView` (tabla, filtros y diálogos), `RecurrenceBuilder` (chips en tinta), `SchedulingSettingsView` y `ReminderOffsetsEditor`.

Lienzo propio antes de implementar.

---

## Orden de trabajo de la F1
1. Escribir el plan canónico en `docs/plans`.
2. **Lienzo F1** (artboards: principal interactivo con Semana, Día, Mes y Lista; tocar un hueco; detalle con «Ver llamada» / «Ver conversación» / sin origen; estados; oscuro; celular Día + tira; celular Mes). Generado con el kit de lienzos de Inbox y publicado como Artifact. **Esperar la aprobación.**
3. F1-S en paralelo al lienzo (el servidor no necesita mockup): implementación, specs, migración contra la base local.
4. F1-C sobre la API regenerada.
5. «listo F1» a audit-agent (servidor y cliente); el cliente lo despliega el auditor y el servidor, la dueña.

## Verificación
- **Servidor:**
  - Specs de la tool y del use case (voz y chat).
  - Migración aplicada a una copia sembrada: la cita de la llamada pasa a `call_session_id` y la de chat queda intacta.
  - Lint y `tsc`.
- **Cliente:**
  - Vitest del módulo.
  - Siembra en `axi_render` (con guardia): una cita por llamada, una por chat, una manual, citas solapadas y una que cruza la medianoche.
  - Render con Playwright a 390, 768, 1280 y 1440 px, claro y oscuro, con datos largos: medir que no haya desborde, las capas de modal y panel, iconos y pestañas.
  - Hacer clic en «Ver llamada» y comprobar que abre `/calls/{id}`.
  - Tocar un hueco y comprobar que el modal abre con la hora.
  - Build.
