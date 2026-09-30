# Hotfix · Plantillas de seguimiento — parte visual

| | |
|---|---|
| **Fecha** | 2026-09-29 |
| **Plan maestro** | `axi-server/docs/plans/hotfix_plantillas_seguimiento_plan.md` (diagnóstico, decisiones D1–D10 y contrato) |
| **Base** | cliente `669cd6e5` = `origin/main` al abrir · rama `hotfix/plantillas-seguimiento` |
| **Regla** | Nada de UI se codifica antes de que la dueña apruebe el lienzo (H2–H4). Dominio y store pueden avanzar antes. |

## 1. Diagnóstico (árbol `669cd6e5`)

- **La burbuja de plantilla está vacía.** `MessageBubble.tsx` no tiene rama `template`: cae al fallback (110-122), que pinta el `content_type` crudo («template») y `body ?? "(sin contenido)"`. En una plantilla `body` siempre es `null`; el contenido vive en `payload.template.{name, language, components}`.
- **El estado casi no se ve.** `use-inbox-socket.ts:185-189` solo trata `message_status` con `failed` y descarta `error_code`. `delivered`/`read` no llegaban porque el servidor no los publicaba (D5 del plan maestro lo cambia). `confirmMessage` (`inbox.store.ts:780-795`) pisa `read` con `sent`. Nadie lee `message.error`.
- **«Reintentar» no sirve para lo que falla en el servidor.** `use-send-message.ts:90-131` exige `local_id` y solo rehace texto o media: con una plantilla que Meta rechazó, el botón se ve y no hace nada.
- **«Programados» no dice a quién.** `ScheduledAgenda.tsx` pinta hora, `title`, `objective` y agente. `ActivityDto` ya trae `contact_name` y `opening_template`; el plan maestro añade `contact_phone`, `bulk_id` y `last_opening` (D10).
- **El aviso no abre nada útil.** `crm.task_opening_failed` caería en la familia `crm.task_` → `/crm/tasks` (`notification-target.ts:54`).

## 2. Qué se hace

| # | Pieza | Capa |
|---|---|---|
| C1 | `extractTemplatePayload`, `parseMessageError` (acepta `{code, detail}` del envío y `{code, title, details}` del webhook), `metaFailureCopy(code)` (textos en español por código, con caída al título de Meta) y `mergeDeliveryStatus` (precedencia `queued < sent < delivered < read`, `failed` manda) | `inbox/domain` (puro, con tests) |
| C2 | `message_status` aplica `delivered`/`read`/`failed` con `mergeDeliveryStatus` y guarda el `error_code`; `confirmMessage` deja de bajar `read` a `sent` | `inbox` store y realtime |
| C3 | El texto de la plantilla: catálogo del canal (`listHsmTemplates({channel_id})`, en caché por canal durante la sesión) + `renderHsmPreview` con los parámetros del mensaje. Si la plantilla ya no está en el catálogo: nombre y parámetros, nunca «(sin contenido)». `readTemplatePieces` entra al barrel de marketing (cabecera, pie, botones). | `inbox` + `marketing/public.ts` |
| C4 | Burbuja de plantilla + estado vivo + motivo del fallo + «Reenviar» (endpoint D6) para lo que falló en el servidor; el «Reintentar» local se queda para optimistas | `inbox/ui` — **según lienzo** |
| C5 | Fila de «Programados»: contacto primero, plantilla, cómo va el envío; grupo propio para las que no llegaron, con «Reenviar» y «Ver en el chat» | `crm/ui` — **según lienzo** |
| C6 | «Ejecuciones»: el intento dice su entrega (leída, entregada, no llegó y por qué) | `crm/ui` — **según lienzo** |
| C7 | `crm.task_opening_failed` abre la conversación (donde está el mensaje y el botón «Reenviar») | `notifications/domain` |

## 3. Lienzo (antes de C4–C6)

Continuidad con `docs/design/mockups/inbox-premium/f2/` (burbuja en tinta, estados como texto con tono) y `crm-premium/f3/Programados` (agenda por día, sin franjas de color, el estado en el punto de una `StatePill`). Artboards previstos:

1. Chat: la plantilla entregada y leída dentro del hilo.
2. Chat: la plantilla que no llegó, con el motivo y «Reenviar», y el reenvío en curso.
3. Burbuja: todos los estados, incluida la plantilla que ya no está en el catálogo, en claro y oscuro.
4. Programados, antes y después: contacto, plantilla y entrega por fila; grupo «No llegaron».
5. Ejecuciones con la entrega por intento.
6. Celular a 390 px (chat y agenda).
7. La campanita con el aviso.

## 4. Verificación

- Unitarios del dominio con los valores reales del incidente (131042 con el payload de `sesion_en_vivo_v2`).
- Los dos signos: un `delivered` tardío no baja un `read`; un `failed` sí manda sobre `read`.
- Render 390 → 1440, claro y oscuro, parámetros largos, plantilla con cabecera de imagen y botones.

## 5. Estado de la implementación (2026-09-29)

Rama `hotfix/plantillas-seguimiento`, base `669cd6e5` (= `origin/main`, sin movimiento al cerrar).

| Pieza | Commit |
|---|---|
| Lienzo aprobado, fuentes en `docs/design/mockups/hotfix-plantillas/` | `c7d8fc73` |
| C1–C2 dominio y estado vivo | `7db410ae` |
| C3–C4 burbuja de plantilla, motivo y «Reenviar» | `11e00844` |
| C5–C7 Programados, Ejecuciones y campanita | `84da16c2` |

**Hallazgo que explica el «mini div»:** la apertura del CRM sale con `sender_type: "system"` y la burbuja la trataba como la píldora central de avisos internos, con `body` vacío. La rama de plantilla va antes de ese caso.

**Decisiones tomadas al implementar:**
- **Texto del reenvío:** «Se reenvió a las…» y no «La reenviaste», porque puede reenviarla otra persona del equipo. El autor del mensaje nuevo sí distingue «Tú · reenvío» de «El equipo · reenvío».
- **Adaptador del CRM:** el reenvío de la agenda llama `…/resend` desde el adaptador del CRM, como ya hace la reachability. Así `crm` no importa `inbox` y no se crea un ciclo.
- **Caída del aviso:** sin conversación, el aviso abre `/crm/tasks`. `?view=scheduled` no existe todavía.

**Verificación:**
- `tsc`: exit 0.
- Lint: sin errores.
- Jest: 4476 pasan. El único fallo es `Composer.recording.test.tsx:104`, que **también falla en `main` 669cd6e5**: es previo.
- `next build`: compila.
- Falsificación de la precedencia: cae `inbox.store.test.ts:160` (esperaba `read` y recibe `delivered`).
- **Pendiente:** render medido 390 → 1440 en claro y oscuro (mandamiento 11), con datos reales.
