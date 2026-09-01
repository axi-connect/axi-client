# F4 — Frontend módulo Llamadas (tenant + /platform) y API de lectura

## Context

F1+F2+F3 del backend están implementadas y con suites verdes (worktree `calls-f1`, ramas apiladas `feat/calls-f1←f2←f3`). El mockup aprobado (artifact «axi · Llamadas», addfa84c) define Monitoreo, Historial, Detalle, Configuración y una vista ilustrativa «En el resto de axi» (puntos de integración, no pestaña real). El dueño confirmó el alcance: **módulo tenant `/calls` + interfaz de aprovisionamiento en `/platform`** en esta fase.

**Hallazgos que dimensionan la fase:**
- El backend NO tiene endpoints de lectura de sesiones (solo settings/test-call/numbers) → hace falta un tramo backend de solo-lectura, ya previsto («lectura en F4», calls_module_plan.md:184).
- El gateway WS no tiene `inbox.join_call`/`leave_call` (solo conversation/lead) → añadirlos para el transcript en vivo (el publisher `toCall` ya existe).
- El timeline CRM sale GRATIS: `crm_activity kind='call'` ya se escribe en postprocess y `ACTIVITY_KIND_SUBTITLES.call='Llamada'` existe (timeline_describers.ts:78).
- `StoragePort.getPresignedUrl` (storage.port.ts:29) sirve la grabación por URL firmada TTL 300 s — mismo patrón que los adjuntos del inbox.
- axi-client: el icono `phone` NO existe en `src/core/lib/icons.ts` (caería a Circle); el panel tenant usa zustand+adapters (NO react-query), `/platform` sí usa react-query; ya existe `AudioPlayerCore` (inbox) reutilizable para grabaciones y `use-attachment-url` como patrón de URL firmada con renovación.

**Fuera de F4** (mockup lo marca post-v1): sentimiento en vivo, calidad de audio, rail de agentes humanos/transferencias, campañas (solo la card «próximamente» deshabilitada). **Desviación consciente del mockup**: el horario para llamar se edita como ventana única diaria (`quiet_hours {start_hour, end_hour}` — lo que F2 implementó), no como grid por día.

**Flujo**: un PR por fase con gate del dueño. Backend en el worktree `calls-f1` (rama `feat/calls-f4` apilada sobre f3). Frontend en worktree NUEVO de axi-client (`feat/calls-frontend`; node_modules con `cp -al`, jamás symlink). El plan vivo se copia a `axi-client/docs/plans/calls_frontend_plan.md` y se escribe `axi-client/docs/modules/calls.md` (plantilla `docs/modules/crm.md`: Parte A contrato REST+WS, Parte B fases).

---

## F4-A — Backend: API de lectura + join del room (axi-server)

Nuevo `src/modules/calls/application/queries/call_sessions.query.ts` (tenant-scoped; CallSession/segments/events son DEDICADAS) + endpoints en `calls_admin.controller.ts`, todos `@RequirePermission('calls:read')`:

1. `GET /calls/sessions` — paginación cursor (`created_at,id` — índice `[company_id, created_at]` existe), filtros `direction|status|outcome|purpose|ai_agent_id|from|to|q` (q: nombre del contacto o número). Fila: contacto resuelto (id+nombre), números, purpose, agente (display), duration_seconds, status, outcome, answered_by, `cost_estimate` (= `metered_seconds` × tarifa vigente vía PricingService — coherente con lo medido por los ticks; NADA de agregar usage_event por fila), created_at.
2. `GET /calls/sessions/live` — `status IN (queued, initiated, ringing, in_progress)` (índice `[company_id, status]`). Base del Monitoreo; el realtime actualiza en caliente.
3. `GET /calls/sessions/:id` — sesión + `segments` ordenados por seq + `events` (incluye `turn_completed.payload.latency` para el popover) + contacto + agente.
4. `GET /calls/sessions/:id/recording` — 404 sin `recording_storage_key`; con él → `{ url }` presigned TTL 300 s (molde: adjuntos del inbox).
5. `GET /calls/overview?granularity=day|week|month` — KPIs del ciclo (totales por dirección, tasa de conexión, % goal_met, duración promedio, comparativa vs período anterior) + `series` de actividad por bucket para el gráfico + **minutos del ciclo** `{used_seconds, limit_seconds}` resueltos server-side de usage (el operador con solo `calls:read` no tiene `usage:read`).

Gateway (`src/modules/notifications/presentation/ws/inbox.gateway.ts`): `@SubscribeMessage('inbox.join_call')` / `leave_call`, espejo exacto de `join_lead` (ack `{ok}`, validar que la sesión pertenece al company del socket, room `call_{companyId}_{sessionId}`).

DTOs nestjs-zod en `presentation/dto/calls.dto.ts`; openapi regenerado. Nota de moneda: `cost_estimate` va en la unidad de usage (USD); el precio comercial por minuto sigue siendo decisión pendiente del dueño — el «$612 COP» del mockup era ilustrativo.

**Verja F4-A**: tsc + eslint acotado + specs de la query y del gateway + `npm test` + `npm run test:integration` (los corro yo, como en F1–F3) + prettier a los tocados + commit.

## F4-B — Cliente: cimientos + Historial + Detalle (axi-client)

Cimientos (checklist del informe de exploración):
- `npm run api:types` apuntando al `openapi.json` del worktree `calls-f1` (main aún no tiene F1–F4); NO editar `schema.d.ts` a mano.
- `src/core/lib/icons.ts` → `phone: Phone` (lucide).
- Verificar `/calls` fuera de `UNIMPLEMENTED_NAV_PATHS` (`src/core/config/routes.ts`; hoy no está — sin alias).
- Slice `src/modules/calls/{domain,infrastructure/{services,stores,realtime},ui/{components,forms,tables}}`; `domain/` deriva tipos de `Schemas` (TS puro).
- Rutas: `src/app/(private)/calls/{layout.tsx (data-app-view + CallsNav), page.tsx → Monitoreo, history/, [callId]/, settings/}` + `loading.tsx` por segmento (obligatorio). El detalle es **ruta completa** (transcript largo; molde `LeadDetailView`), no sheet — «Detalle» no es pestaña y «En el resto de axi» no existe en la app.
- `CallsNav` con `NavTabs` (molde `SchedulingNav`/`CrmNav` con filtro por permiso): Monitoreo · Historial · Configuración (esta gated `calls:manage`). Pastilla activa = `bg-accent` (regla dura AA). Acento secundario del módulo: **violeta** (voz ya usa violeta; jamás violeta+ámbar juntos).

Historial (`/calls/history`):
- KPIs con `StatTile` desde `GET /calls/overview`; barra de minutos del ciclo.
- `DataTable` server-side + `usePaginatedList` + `FilterPanel`/`FilterChips` (dirección, resultado, agente, rango); búsqueda por contacto/número. `StatusBadge` con StatusMap propio del slice (verde=goal_met, ámbar=voicemail, neutro=no_answer, rojo=error/colgó — semántica fuera de la marca). Fila → `/calls/[callId]`. `EmptyState` (glifo `conversation` o icono, acento violeta).

Detalle (`/calls/[callId]`):
- Header contacto + pills de outcome/purpose/costo; rail con `FieldList` (agente+voz, números, duración, answered_by, grabación, costo) y `Timeline` de eventos técnicos (call_event: marcando/contestada/AMD/aviso legal/interrupciones/finalizada).
- Grabación: **promover `AudioPlayerCore` de `modules/inbox/ui/components/media/` a `src/shared/components/features/audio-player/`** (es presentacional puro; inbox no tiene `public.ts`) actualizando los imports del inbox en el mismo PR; wrapper que pide la URL firmada al primer play con el patrón `use-attachment-url` (cache TTL + refresh en onError).
- Resumen (card violeta) + tags; transcript por turnos (roles caller/agent/system, marca `interrumpió` con `interrupted`) con **badge de latencia por turno** y popover del desglose (`turn_completed.payload.latency`: stt/cola/llm 1er token/tools/relay/tts, segmentos estimados marcados con ~) — la feature §3.4 del plan maestro.

**Verja F4-B**: `tsc` + eslint acotado (axi-client SIN prettier — no formatear ajenos) + gate del dueño con `next dev` visual.

## F4-C — Cliente: Monitoreo en vivo + test-call

- `src/core/realtime/events.ts` → payloads `call.started|status_changed|transcript_segment|ended|summary_ready` en `InboxServerEvents` + comandos `inbox.join_call`/`leave_call` con ack.
- `infrastructure/realtime/use-calls-socket.ts` (molde `use-crm-socket`, 50 líneas): eventos → store zustand `live-calls.store.ts`; **re-fetch de `/calls/sessions/live` en reconexión** (regla: el effect depende solo de `socket`, jamás de `connected` — LeadDetailView:105-148).
- Vista Monitoreo (`/calls`): KPIs + gráfico de actividad (series del overview, granularidad Días/Semanas/Meses con `SegmentedControl` — elige opción sin panel), cards de llamadas en curso (estado, duración con timer local, purpose, agente; acciones: ver detalle) y rail con minutos del ciclo + aviso de pausa. Sin sentimiento/calidad-audio/agentes humanos.
- Transcript en vivo en el detalle: si `status` activo, join al room `call_…` tras ack y append de `call.transcript_segment`; `call.ended`/`summary_ready` refrescan.
- Botón «Llamada de prueba» (`PageHeader`, gated `calls:place`) → modal con teléfono → `POST /calls/test-call`; feedback: la llamada aparece en Monitoreo.

**Verja F4-C**: tsc + eslint + gate del dueño con una llamada real viéndose en vivo.

## F4-D — Cliente: Configuración + integraciones

- `/calls/settings` (gate `calls:manage`; con solo `calls:read` → variante lectura, molde `SchedulingSettingsView`): card del número asignado (`GET /calls/numbers`: número, agente que contesta, entrantes sí/no) + minutos del ciclo; form (`DynamicForm` + config Zod) sobre `GET/PUT /calls/settings`: `ai_enabled`, grabación + aviso legal (textarea), ventana de horario (quiet_hours única), duración máxima, simultáneas. Voz del agente: card informativa con link al personaje del agente (la voz vive ahí) + preview con el patrón `VoiceSelector`.
- Rail del inbox: card «Últimas llamadas del contacto» en el registry del panel de contexto (`src/modules/inbox/ui/components/context/registry.tsx` o equivalente): últimas N sesiones del contacto con outcome, duración y play (URL firmada perezosa); visible solo con `calls:read`.
- `src/modules/rbac/domain/permission.ts`: registrar `calls:read|place|manage` para la matriz de roles.
- `docs/modules/calls.md` (Parte A contrato + Parte B fases) + copia del plan a `docs/plans/calls_frontend_plan.md`.

**Verja F4-D**: tsc + eslint + gate del dueño.

## F4-E — /platform: aprovisionamiento Twilio

Arquitectura aislada del platform (react-query + `platform-client.ts` openapi-fetch):
- `src/modules/platform/domain/navigation.ts` → entrada «Llamadas» en `PLATFORM_NAV` + icono en el mapa local de `PlatformSidebar.tsx` (NO usa icons.ts).
- Feature `ui/features/calls/`:
  - `CallProvidersView` (molde exacto `prospecting/ProvidersView` + `ConnectProviderSheet` + `use-prospecting-providers`): cuenta madre Twilio — alta (account_sid + auth_token, el token viaja directo al API y jamás se re-muestra: solo `token_last4`), rotate credenciales, probe de salud, enable/disable, caps de gasto.
  - `CallNumbersView`: tabla de números (estado, tenant asignado, agente por defecto, entrantes, costo mensual) + sheet de compra (search por país/área → buy) + asignación a tenant (selector de company + selector del agente IA del tenant destino) + release con `ConfirmTyped` (el número vuelve al stock/se libera en Twilio).
  - Hooks `use-call-providers.ts`/`use-call-numbers.ts` con `platformKeys.calls.*`.
- Endpoints ya existen todos (`/platform/calls/providers*`, `/platform/calls/numbers*`).

**Verja F4-E**: tsc + eslint + gate del dueño (alta real de la cuenta madre desde la UI — esto además rota el Auth Token del spike).

---

## Orden y fusión

F4-A → F4-B → F4-C → F4-D → F4-E, cada una con reporte y gate explícito. Los PRs backend (F1→F4) se fusionan antes o junto con el frontend (misma regla que voice-catalog). Al cerrar: descartar worktree/rama del spike, reindexar grafo de ambos repos.

## Verificación

- F4-A: suites completas del server las corro yo (unit + integration), como en F1–F3.
- F4-B–E: verja barata (tsc exit code real + eslint acotado heap 2048); `npm run api:types:check` en verde; build y verificación visual las hace el dueño (`next dev` + navegación con los datos reales de sus llamadas de prueba de F2/F3).
- Cierre F4 (plan maestro): el dueño navega el módulo completo con datos reales y opera el aprovisionamiento desde /platform.
