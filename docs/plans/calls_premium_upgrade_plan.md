# Llamadas premium — cliente (F2–F5)

Estado (2026-09-26): F0 aprobada; F1 (servidor) y F2–F5 (cliente) implementadas en `feat/calls-premium`, sin
fusionar, en auditoría con la sesión `audit-upgrade-design`. Pendiente: render real (§12) y llamada de prueba con
`CALLS_RELAY_EVENTS`.

F0 aprobada por el dueño el 2026-09-26 (canvas `https://claude.ai/artifact/JstQtvZeTGGtYonYQgMBW5`, copia
en `docs/design/mockups/calls-premium/` del monorepo). El servidor (F1) está en `axi-server` rama
`feat/calls-premium` (`docs/plans/calls_premium_upgrade_plan.md` de ese repo).

## Contrato que llega del servidor (F1)

- Sala de la llamada (`inbox.join_call`):
  - `call.speaker_changed {speaker: 'agent'|'caller', state: 'on'|'off', at_ms}`: solo con `CALLS_RELAY_EVENTS`.
  - `call.phase_changed {phase, at_ms}`: `greeting|listening|thinking|speaking|ending|closed`.
  - `call.agent_text {generation, text, at_ms}`: oración del agente al enviarla al TTS. Es provisional.
  - `call.transcript_segment` ahora con `interrupted` y `spoken_at_ms`.
- Detalle: `recording_offset_ms` y `segments[].spoken_at_ms`. Un segmento suena en la grabación en
  `(spoken_at_ms ?? at_ms) + (recording_offset_ms ?? 0)`.

## F2 — primitivas (sin superficie nueva montada)

| Pieza | Dónde | Qué hace |
|---|---|---|
| `live-call.ts` (dominio) | `modules/calls/domain` | Reductor puro del pulso en vivo: quién habla, fase, borrador del agente (se reemplaza con su segmento). `auraModeFor` → `idle|listening|thinking|agent|caller`. |
| `recording-sync.ts` (dominio) | `modules/calls/domain` | Tiempo de cada segmento en la grabación, segmento activo y palabra activa para una posición. |
| `waveform.ts` (dominio) | `modules/calls/domain` | Picos normalizados de un audio (todas las pistas mezcladas) en N cubetas. |
| `CallAura` | `modules/calls/ui/components/aura` | Canvas 2D de cintas en anillo. Color por modo leído de tokens (`--axi-violet`, `--axi-brand`); se pausa fuera de vista o con la pestaña oculta; `prefers-reduced-motion` → un fotograma quieto. Variante `size="mini"`. |
| `useWordReveal` | `modules/calls/ui/hooks` | Aparición palabra a palabra de un texto que crece; con movimiento reducido, entero. |
| `RecordingWaveform` | `modules/calls/ui/components/recording` | Onda de cintas coloreada por hablante (tramo sonado) con cursor; control accesible de posición (`input range`). Sin picos (CORS o error) cae a una barra plana. |
| `useRecordingPeaks` | `modules/calls/infrastructure/hooks` | `fetch` de la URL firmada → `decodeAudioData` → picos. `unavailable` si el storage no permite CORS. |
| `AudioPlayerCore` | `shared/components/features/audio-player` | Opcionales y no rompedores: `onTimeUpdate`, `onPlayingChange` y `controlRef` (`seek`, `toggle`). |

Además: tipos de los eventos nuevos en `core/realtime/events.ts`, callbacks opcionales en `useLiveCall` y el
`schema.d.ts` empalmado a mano (solo los dos campos nuevos, ver la memoria del contrato adelantado).

## F3 — llamada en vivo (`ui/live/`)

`LiveCallView` (cabecera, escenario, tres fichas, conversación), `LiveCallStage` (isla de tinta + aura + frase palabra a
palabra), `LiveConversation` (el borrador del agente fuera del `aria-live`). `CallDetailView` alimenta el pulso.

## F4 — llamada terminada (`ui/finished/`)

`FinishedCallView`, `RecordingPanel` (onda + controles), `SyncedTranscript` (cada frase salta el audio; palabra activa
subrayada), `CallSummaryIsland` (resumen + veredicto del juez), `useRecordingPlayback` (Audio propio con reloj por
rAF). La vista sigue en la sala hasta 10 min tras colgar para recibir `call.summary_ready`.

## F5 — resto del módulo

- Monitoreo (`ui/monitor/`): «Al teléfono ahora» con una tarjeta por llamada que se une a su sala
  (`useLiveCallPreview`: aura, quién habla, última frase); isla «Lo próximo» (devoluciones pedidas —
  `callback_requested` del ciclo—, fallidas y minutos; dice «No pudimos revisar lo pendiente» si no pudo leer);
  «Este ciclo», «Actividad» (salientes coral, entrantes violeta), «Minutos del ciclo» como recorrido con proyección a
  este ritmo, «Terminadas hace poco».
- Historial: fichas del bento, `?outcome=` desde la isla (con su Suspense), tabla con `StatePill`.
- Configuración: números como lista, barra de guardar en tinta solo con cambios, error con reintento.
- Ficha del contacto en el inbox: la llamada en curso arriba con su aura; las demás como lista.
- La barra de pestañas deja el `h1` a cada vista (`CallsPageHeader`).

## Verificación de F2

Jest de dominio (reductor, sincronía, picos, revelado) y de `AudioPlayerCore` (API nueva sin romper la vieja),
`tsc --noEmit`, lint acotado. Las piezas visuales se verifican montadas en F3/F4 con render en 390 → 1440, claro y
oscuro.
