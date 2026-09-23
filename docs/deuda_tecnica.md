# Deuda técnica — axi-client

> Lo que se sabe que está mal o duplicado y se decide NO tocar ahora, con el motivo y dónde vive. Cada entrada nace con una fecha y muere cuando se salda.

## `Section<T>` repetido en seis stores (2026-09-23, auditoría F3 del método comercial)

El patrón «estado de una sección» (`{ status: idle|loading|ready|error; data; error }` con `idle/loading/ready/failed` y la regla «el refetch conserva los datos») vive copiado en `dashboard`, `cmo`, `analytics`, `marketing` (overview), `intake` y ahora `commercial` (`src/modules/commercial/infrastructure/stores/commercial.store.ts:20-33`). Candidato a `src/core/state/section.ts` (tipo + los cuatro constructores). No se hizo en F3 porque toca cinco slices ajenos a la fase y cada uno tiene tests que fijan la forma; se salda en una tanda propia con el auditor. El servidor no tiene un `Section` equivalente: la deuda es solo del cliente.
