# Captación de leads (`/marketing/leads`)

> Slice `prospecting` del frontend. Backend: `axi-server/docs/plans/prospecting_module_plan.md`.
> Estado: **F1** — bandeja y detalle. Búsquedas, fuentes y calidad llegan en sus fases.

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
├── page.tsx + loading.tsx          → LeadsInboxView (stats precargadas en el servidor)
└── [leadId]/page.tsx               → LeadDetailView
```

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
2. **`quality_signals` llega vacío hasta F2.** `readQualityAxes` devuelve los cuatro ejes en cero y
   `hasQualitySignals` dice si alguien midió algo. La UI pinta «—» en vez de un 0 que parecería una
   mala nota.
3. **`extraParams` de `usePaginatedList` va memoizado** o el hook entra en bucle de fetch (mismo
   gotcha que `CampaignDetailView`).
4. **`LeadRow` es un `type`, no un `interface`.** `DataTable` exige `Record<string, Primitive>` y un
   `interface` no satisface un index signature. Por eso existe `mapLeadToRow`: aplana el desglose
   del índice y los permisos a primitivos.

## Archivos

- `domain/lead.ts` — DTOs, etiquetas en español, `whyChannelBlocked`, `mapLeadToRow`, los mapas de
  semáforo. TypeScript puro.
- `infrastructure/services/prospecting-service.adapter.ts` — la única puerta al HTTP.
- `ui/LeadsInboxView.tsx` · `ui/LeadDetailView.tsx`
- `ui/components/` — `CaptureFunnel` (la cuarentena hecha visible), `ChannelPermissions`,
  `QualityIndex` + `QualityBreakdown`, `LeadProvenance` (de dónde salió cada dato),
  `PromotionGate` (la puerta con sus requisitos listados antes de pulsar), `LeadTimeline`.
- `ui/tables/leads.config.tsx` — columnas por factory (`buildLeadColumns`), porque la casilla
  necesita leer la selección y `ColumnDef.cell` solo recibe la fila.

## Pendiente para las fases siguientes

- **Búsquedas** (F4) y **Fuentes** (F3/F5): el mockup las tiene, el backend todavía no. Cuando
  lleguen, la sección pasa a `NavTabs` (patrón `MarketingSettingsNav`) con Bandeja · Búsquedas ·
  Fuentes · Calidad. Hoy es una sola vista y no vale la pena la pastilla.
- **Calidad** (F2): la pestaña con el ICP editable, los pesos por eje y la lista de supresión. El
  backend ya expone `GET|PUT /prospecting/settings` y el CRUD de supresiones; falta la pantalla.
- **Tiempo real**: cuando F4 traiga búsquedas con progreso, el patrón es WS como señal primaria y
  polling derivado del estado como respaldo (`campaignPollInterval` es el modelo exacto).
