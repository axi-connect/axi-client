# Módulo Llamadas — Telefonía con agentes IA (monitoreo · historial · detalle · configuración)

El agente del tenant hace y contesta llamadas (Twilio ConversationRelay + voz
ElevenLabs; el cerebro es el MISMO AgentRuntime del chat). Cada llamada queda
grabada, transcrita, resumida y registrada como actividad del contacto. Fuente
de verdad de arquitectura: `axi-server/docs/plans/calls_module_plan.md`.

Mockup aprobado (F0): artifact «axi · Llamadas» (5 vistas). Fuera de v1 y por
tanto de este doc: sentimiento en vivo, calidad de audio, rail de agentes
humanos/transferencias y campañas en lote.

## Parte A — Contrato del backend

### A.1 REST (`/api/v1`, tipos generados en `core/api/schema.d.ts`)

Todo tenant-scoped y gated por RBAC (ver A.3). Paginación offset estándar
`{ data, meta: { total, page, page_size } }`.

| Método y ruta | Qué hace | Notas |
|---|---|---|
| `GET /calls/overview?granularity=day\|week\|month` | KPIs del ciclo + ciclo anterior + `series` del gráfico + minutos `{used_seconds, limit_seconds}` | Los KPIs van SIEMPRE sobre el ciclo de facturación; `granularity` solo mueve la ventana del gráfico |
| `GET /calls/sessions` | Historial paginado | Filtros: `direction, status, outcome, purpose, ai_agent_id, contact_id, from, to, q` (q = nombre del contacto o dígitos) |
| `GET /calls/sessions/live` | Llamadas vivas (queued/initiated/ringing/in_progress) | Base del Monitoreo; el WS avisa cuándo re-pedirla |
| `GET /calls/sessions/:id` | Detalle: sesión + `segments` + `events` | `events[type='turn_completed'].payload.latency` = desglose §3.4 del popover |
| `GET /calls/sessions/:id/recording` | `{ url, expires_in_seconds }` presigned (TTL 300 s) | 404 `calls/recording_not_available` si no hay audio; pedirla AL REPRODUCIR |
| `GET /calls/settings` · `PUT /calls/settings` | Config del tenant (`settings.calls`) | PUT de sección completa; **responde 204**: re-consultar el GET tras guardar |
| `GET /calls/numbers` | Números asignados al tenant | Array plano `TenantCallNumberDto[]` |
| `POST /calls/test-call` | Banco de pruebas `{to, objective?}` | Camino productivo real: consume minutos |

El canal del recordatorio de citas NO vive aquí: es `reminder_channel`
(`whatsapp|call|both`) del `PUT /scheduling/settings` (sección completa: el
form de agenda lo manda SIEMPRE).

### A.2 WebSocket (namespace `/inbox`)

Eventos al room `company_{id}` (automático): `call.started`,
`call.status_changed`, `call.ended`, `call.summary_ready`. El WS **avisa, no
sincroniza**: cada evento re-consulta REST (en el Monitoreo, con debounce).

`call.transcript_segment` viaja SOLO al room `call_{company}_{session}`
(varios por minuto): join explícito con `inbox.join_call {call_session_id}` /
`inbox.leave_call`. Reglas del join (heredadas de `join_lead`): el effect
depende solo de `socket`; join confirmado por ack; `connect` re-une Y recarga.

### A.3 Permisos y navegación

- `calls:read` — ver el módulo (nodo raíz del sidebar `path:/calls`,
  icono `phone`), historial, detalle, monitoreo, panel del inbox.
- `calls:place` — botón «Llamada de prueba» (y a futuro cualquier originación
  manual). Supervisor+.
- `calls:manage` — editar la configuración. La pestaña Configuración se VE con
  `calls:read`; sin manage el formulario es de solo lectura (molde agenda).

La matriz de roles es dinámica (catálogo del backend): no hay nada que
registrar en el cliente.

## Parte B — Implementación (F4-B/C/D, un PR por fase)

### B.1 Estructura del slice

```
src/modules/calls/
├── domain/call.ts            # tipos de Schemas + labels + StatusMaps + parser de latencia
├── infrastructure/
│   ├── services/calls-service.adapter.ts
│   ├── hooks/use-recording-url.ts      # cache TTL + carga perezosa al primer play
│   ├── stores/live-calls.store.ts      # zustand; re-fetch debounced 400 ms
│   └── realtime/{use-calls-socket,use-live-call}.ts
├── ui/
│   ├── CallsNav.tsx  CallsMonitorView.tsx  CallsHistoryView.tsx
│   ├── CallDetailView.tsx  CallsSettingsView.tsx
│   ├── components/  forms/config/  tables/  lib/call-format.ts
└── public.ts                 # ContactCallsList (rail del inbox)
```

Rutas: `app/(private)/calls/{page (Monitoreo), history, [callId], settings}`
con `loading.tsx` por segmento y `data-app-view` en el layout.

### B.2 Decisiones clave

- **AudioPlayerCore promovido** de `inbox/ui/components/media` a
  `shared/components/features/audio-player` (presentacional puro); el barrel
  del inbox re-exporta.
- El costo por llamada es **estimación de panel** (`metered_seconds` × tarifa
  vigente, USD): la factura la arma billing sobre `usage_event`. `null` =
  sin tarifa (jamás $0).
- Latencia por turno: correlación **posicional** (n-ésimo turno del agente ↔
  n-ésimo `turn_completed`); parser defensivo (`parseTurnLatency`) — un
  payload ilegible se omite, jamás revienta el transcript.
- Timers de las cards vivas: UN `setInterval` compartido en la vista.
- Gráfico de actividad: SVG propio (sin librerías de charts); violeta +
  azul semántico — jamás violeta + ámbar juntos (DESIGN §3.1).
- Rail del inbox: panel `calls` en `context-rail/registry.tsx` que consume
  `ContactCallsList` vía `modules/calls/public`; UN `<audio>` compartido
  (patrón VoiceSelector).
- `reminder_channel` viaja SIEMPRE en el PUT de agenda: omitirlo resetearía
  a whatsapp lo configurado (el PUT es de sección completa).

### B.3 Verificación

- `npm run api:types` contra el openapi del backend (F1–F4 fusionado; hasta
  entonces `api:types:check` de CI falla — orden de fusión: backend primero).
- tsc + eslint acotado (axi-client SIN prettier) + `npm test`.
- Visual: `next dev` contra el backend con `CALLS_*` configurado; la
  test-call llena Monitoreo → transcript en vivo → historial → detalle.

### B.4 Pendientes conocidos

- F4-E: aprovisionamiento en `/platform` (cuenta madre Twilio + números),
  molde `prospecting/ProvidersView` + react-query.
- URL firmada de 300 s: un seek muy tardío en grabaciones largas puede
  encontrarla vencida (post-v1: refresh desde el onError del `<audio>`).
- F5 entrantes y F6 tareas CRM añaden purposes ya contemplados en los labels.
