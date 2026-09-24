# Deuda técnica — axi-client

> Lo que se sabe que está mal o duplicado y se decide NO tocar ahora, con el motivo y dónde vive. Cada entrada nace con una fecha y muere cuando se salda.

## `Section<T>` repetido en seis stores (2026-09-23, auditoría F3 del método comercial)

El patrón «estado de una sección» (`{ status: idle|loading|ready|error; data; error }` con `idle/loading/ready/failed` y la regla «el refetch conserva los datos») vive copiado en `dashboard`, `cmo`, `analytics`, `marketing` (overview), `intake` y ahora `commercial` (`src/modules/commercial/infrastructure/stores/commercial.store.ts:20-33`). Candidato a `src/core/state/section.ts` (tipo + los cuatro constructores). No se hizo en F3 porque toca cinco slices ajenos a la fase y cada uno tiene tests que fijan la forma; se salda en una tanda propia con el auditor. El servidor no tiene un `Section` equivalente: la deuda es solo del cliente.

## Bajas de la auditoría del cliente del método comercial (2026-09-23, auditor axi-23 sobre 31171bfe/5149d613)

No bloquean; quedan fuera para no reabrir el build certificado.

- **`isCrmAiMissing` lee el MENSAJE del servidor** (`src/modules/commercial/domain/proposals.ts`): si cambia el texto de `outreach_actions.service.ts`, el fallo vuelve a verse técnico. Arreglo: que `failed[]` traiga `code` (`entitlements/capability_not_granted`) y decidir por él (cambio de contrato en el server).
- **C12 · unión duplicada**: `RouteRateKey` (`src/modules/commercial/public.ts`) sin consumidor y `RouteRate` (`src/modules/analytics/domain/live-rates.ts`) son la misma unión. Dejar una.
- **C6 · zona horaria**: «Se aprobó el {d} de {mes}» (`approvedOnPhrase`) usa la del navegador, no la del tenant.
- **C5 · falta test** de `useApproveAccess` con `loaded=false` (no pinta botón ni línea).
- **`useJourneyRealtime` no recarga al reconectar** (el hook comercial sí).
- **Doble recarga**: un movimiento propio recarga por el evento local y por el eco del WS; `commercial.goal_set` y `pace_updated` usan claves de debounce distintas y hacen doble fetch.
- **`GoalProgressBlock` pinta datos viejos sin señal** cuando falla el refetch.
- **`DetailSheet` devuelve siempre el foco** a quien lo abrió, también tras clic fuera o al navegar; si quien lo abrió vive en el shell, el `setTimeout` de Radix le roba el foco al autofocus de la página nueva. Afecta a los 69 sheets: acotar a cierre por Escape/botón y comprobar en navegador.
- **El test de contraste lee `globals.css` por búsqueda de texto**: frágil si se mueven los tokens.
- **Enlace duplicado** «Ver en Tareas/Secuencias» en la fila y en el pie del detalle de acción.
