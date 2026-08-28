# Captación de leads (`/marketing/leads`)

> Slice `prospecting` del frontend. Backend: `axi-server/docs/plans/prospecting_module_plan.md`.
> Estado: **F1 + F2** — bandeja, detalle con evidencia, y pestaña de Calidad con el cliente
> ideal editable. Búsquedas y fuentes llegan en F3/F4.

## La idea en una frase

Los leads viven en **cuarentena** hasta que alguien los promueve. Mientras están ahí, ninguna
campaña puede escribirles: no es un filtro que se pueda olvidar, es que viven en otra tabla.

## Los dos ejes que no se pueden mezclar

Es lo único de este módulo que hay que entender antes de tocarlo.

|                                             | Qué responde                                                       | Dónde vive                             |
| ------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Calidad del dato** (`quality_status`)     | ¿el teléfono existe, el correo recibe, la empresa está registrada? | `StatusBadge` con `QUALITY_STATUS_MAP` |
| **Canales permitidos** (`allowed_channels`) | ¿con qué derecho puedo escribirle, y por dónde?                    | `<ChannelPermissions>`                 |

Un lead puede estar **verificado** y aun así tener **WhatsApp tachado**: la política de Meta
prohíbe escribir primero a quien no dio permiso, y la penalización —throttling y suspensión— cae
sobre el número del tenant. Si algún día alguien fusiona las dos columnas en un solo indicador
«contactable», el módulo empieza a quemar números. Van contiguas y separadas a propósito.

`allowed_channels` lo **deriva el backend** de la base legal y no hay forma de escribirlo desde
aquí. El frontend solo lo pinta y explica el porqué en el tooltip (`whyChannelBlocked`): un icono
tachado sin motivo se lee como un fallo del sistema.

## Rutas

```
src/app/(private)/(content)/marketing/leads/
├── layout.tsx                      → LeadsNav (la pastilla de pestañas)
├── page.tsx + loading.tsx          → LeadsInboxView (stats precargadas en el servidor)
├── [leadId]/page.tsx               → LeadDetailView
└── quality/page.tsx + loading.tsx  → QualityView (F2)
```

La pastilla aparece con F2, cuando hay dos vistas que valen una URL propia. Con una sola pantalla
habría sido decoración.

El ítem de sidebar es `marketing_leads` («Captación»), hijo de Marketing, con permiso
`leads:read`. Lo siembra `security.seeder.ts` del backend.

## Permisos

- `leads:read` — ver la bandeja y el detalle.
- `leads:manage` — descartar, gestionar «nunca contactar», ajustes.
- `leads:promote` — **sacar un lead de la cuarentena**. Tres y no dos porque promover escribe PII
  de terceros en el CRM; supervisor lee pero no promueve (mismo criterio que `contacts:import`).

Sin `leads:promote` la bandeja **no muestra casillas de selección**: un control que solo falla al
pulsarlo es un control que miente.

## Gotchas del contrato

1. **`POST /prospecting/leads/promote` responde 200 con fallos parciales.** El cuerpo trae
   `{ promoted, failed }` y hay que leer `failed` aunque la petición haya ido bien: que uno de
   cinco esté suprimido no invalida los otros cuatro.
2. **Una señal sin medir NO es una señal fallida.** `quality_signals.checks[]` trae `unknown` para
   lo que nadie pudo medir, y se pinta en gris, no en rojo: si el motor no tiene proveedor de
   verificación conectado, esas señales quedan sin medir y **no bajan el puntaje de nadie**. Es la
   invariante F2-D1 del backend, y la UI tiene que contarla igual.
3. **El denominador de un eje es lo evaluable, no su peso.** `readAxisEvaluable` devuelve cuántos
   puntos se pudieron medir; decir «18 de 25» cuando solo se midieron 22 sería mentir sobre lo que
   se sabe.
4. **El estado de calidad no sale del puntaje.** Un lead puede tener 92 y estar `risky` porque su
   dominio es catch-all. Nunca derives el semáforo del número.
5. **`extraParams` de `usePaginatedList` va memoizado** o el hook entra en bucle de fetch (mismo
   gotcha que `CampaignDetailView`).
6. **`LeadRow` es un `type`, no un `interface`.** `DataTable` exige `Record<string, Primitive>` y un
   `interface` no satisface un index signature. Por eso existe `mapLeadToRow`: aplana el desglose
   del índice y los permisos a primitivos.

## Archivos

- `domain/lead.ts` — DTOs, etiquetas en español, `whyChannelBlocked`, `mapLeadToRow`, los mapas de
  semáforo. TypeScript puro.
- `infrastructure/services/prospecting-service.adapter.ts` — la única puerta al HTTP.
- `ui/LeadsInboxView.tsx` · `ui/LeadDetailView.tsx`
- `ui/QualityView.tsx` — la pestaña de Calidad (F2).
- `ui/components/` — `CaptureFunnel` (la cuarentena hecha visible), `ChannelPermissions`,
  `QualityIndex` + `QualityBreakdown`, `QualityEvidence` (la evidencia por señal),
  `QualityDistribution`, `IcpEditor` (el cliente ideal editable), `LeadProvenance` (de dónde salió
  cada dato), `PromotionGate` (la puerta con sus requisitos listados antes de pulsar),
  `LeadTimeline`, `LeadsNav`.
- `ui/tables/leads.config.tsx` — columnas por factory (`buildLeadColumns`), porque la casilla
  necesita leer la selección y `ColumnDef.cell` solo recibe la fila.

## Pendiente para las fases siguientes

- **Búsquedas** (F4) y **Fuentes** (F3/F5): el mockup las tiene, el backend todavía no. Cuando
  lleguen, la sección pasa a `NavTabs` (patrón `MarketingSettingsNav`) con Bandeja · Búsquedas ·
  Fuentes · Calidad. Hoy es una sola vista y no vale la pena la pastilla.
- **Lista de supresión**: el backend la expone desde F1 (`GET|POST|DELETE /prospecting/suppressions`)
  pero todavía no tiene pantalla. Ojo al diseñarla: la lista **no devuelve el valor en claro**, solo
  su hash — se puede saber cuántos hay y quitar uno por su id, no leer a quién se dejó fuera.
- **Tiempo real**: cuando F4 traiga búsquedas con progreso, el patrón es WS como señal primaria y
  polling derivado del estado como respaldo (`campaignPollInterval` es el modelo exacto).
