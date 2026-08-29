# Captación de leads (`/marketing/leads`)

> Slice `prospecting` del frontend. Backend: `axi-server/docs/plans/prospecting_module_plan.md`.
> Estado: **F1–F4b** — bandeja, ficha, calidad, búsquedas con mapa, fuentes, panel de proveedores
> de plataforma y enriquecimiento de datos.

## La idea en una frase

Los leads viven en **cuarentena** hasta que alguien los promueve. Mientras están ahí, ninguna
campaña puede escribirles: no es un filtro que se pueda olvidar, es que viven en otra tabla.

## Los tres ejes que no se pueden mezclar

Es lo único de este módulo que hay que entender antes de tocarlo. Eran dos hasta F4b.

|                                             | Qué responde                                                       | Dónde vive                             |
| ------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Calidad del dato** (`quality_status`)     | ¿el teléfono existe, el correo recibe, la empresa está registrada? | `StatusBadge` con `QUALITY_STATUS_MAP` |
| **Canales permitidos** (`allowed_channels`) | ¿con qué derecho puedo escribirle, y por dónde?                    | `<ChannelPermissions>`                 |
| **Datos que conocemos** (`dataCompleteness`) | ¿cuántos de los cinco campos clave tenemos?                        | columna «Datos», en gris neutro        |

Un lead puede estar **verificado**, tener los **cinco datos** y aun así tener **WhatsApp tachado**:
la política de Meta prohíbe escribir primero a quien no dio permiso, y la penalización —throttling y
suspensión— cae sobre el número del tenant. Si algún día alguien fusiona esas columnas en un solo
indicador «contactable», el módulo empieza a quemar números. Van contiguas y separadas a propósito.

La columna «Datos» va en **gris neutro y nunca en verde/rojo** por la misma razón: colorearla la
convertiría en un juicio de calidad, que es el eje de al lado.

### El canal tiene tres estados, no dos

`channelVerdict(lead, channel)` devuelve `usable | blocked | no_data`:

- **usable** — hay permiso y hay dato.
- **blocked** — la base legal no lo permite. Tachado, con el motivo en el tooltip.
- **no_data** — podrías, pero no sabemos el correo o el teléfono. Atenuado, no tachado.

La diferencia importa porque el **remedio es distinto**: lo bloqueado no se arregla nunca; lo que
falta se arregla buscando datos. Es exactamente lo que hace el botón de F4b.

`allowed_channels` lo **deriva el backend** de la base legal y no hay forma de escribirlo desde
aquí. El frontend solo lo pinta y explica el porqué.

## Rutas

```
src/app/(private)/(content)/marketing/leads/
├── layout.tsx                       → LeadsNav (la pastilla de cuatro pestañas)
├── page.tsx + loading.tsx           → LeadsInboxView (stats precargadas en el servidor)
├── [leadId]/page.tsx                → LeadDetailView
├── searches/page.tsx + loading.tsx  → SearchesView (F4)
├── sources/page.tsx + loading.tsx   → SourcesView (F4)
└── quality/page.tsx + loading.tsx   → QualityView (F2)

src/app/platform/(admin)/prospecting/page.tsx → ProvidersView (F3, plataforma)
```

El ítem de sidebar es `marketing_leads` («Captación»), hijo de Marketing, con permiso `leads:read`.
Lo siembra `security.seeder.ts` del backend.

## Permisos

- `leads:read` — ver la bandeja y la ficha.
- `leads:manage` — descartar, **buscar datos**, «nunca contactar», ajustes.
- `leads:promote` — **sacar un lead de la cuarentena**. Tres y no dos porque promover escribe PII de
  terceros en el CRM; supervisor lee pero no promueve (mismo criterio que `contacts:import`).

Sin ninguno de los dos permisos de acción, la bandeja **no muestra casillas**: un control que solo
falla al pulsarlo es un control que miente.

## Enriquecimiento (F4b)

Dos botones que llaman a dos endpoints distintos, y la diferencia **no es cosmética**:

| | Dónde | Cuota |
|---|---|---|
| «Buscar datos» | ficha del lead | **Gasta.** Lo pide alguien mirando ese lead, que es cuando pagar por un dato tiene sentido |
| «Buscar datos de N» | bandeja, sobre la selección | **No gasta.** El backend fuerza el lote a lo gratuito: cien leads de pago funden un plan en un clic |

El texto del botón en lote lo dice antes de pulsarlo. No se cambia sin cambiar el endpoint.

### El estado «buscando datos» vive en el cliente

`status` tiene el valor `enriching` en el enum desde F1, y **nadie lo escribe nunca**. Es
deliberado: que un job mute el ciclo de vida deja leads atascados si el worker muere, y hay barrido
de búsquedas estancadas pero no de leads. Un estado de proceso sin barrido no es un estado, es una
trampa —es exactamente el bug que dejaba una búsqueda en `running` bloqueando esa fuente para
siempre—.

Así que: los ids en curso viven en un `useState` local, se recarga cada 5 s, y un lead sale del
conjunto cuando **gana datos** (`dataCompleteness` sube, o `last_enriched_at` cambia en la ficha).
**El tope de 90 s no es opcional**: si un proveedor se cuelga, el trabajo puede no terminar nunca, y
un spinner girando sobre algo parado miente igual que el estado sin barrido.

Y por eso el indicador va **al lado** del estado del lead, no encima: `LEAD_STATUS_MAP.enriching`
existe con su spinner, pero usarlo taparía el estado real (`Nuevo`, `Calificado`) con uno que el
servidor no escribió.

### La procedencia es real desde F4b

`attributes` es `{campo: {value, source, confidence, fetched_at}}` y `source` **es el proveedor**
(`nominatim`, `site_extractor`, `rues`…). Antes decía siempre `'enrichment'`, y como el backend
cuenta fuentes distintas para la señal de corroboración, eso la tenía congelada.

En la ficha: `LeadIdentityCard` responde «cuáles son los datos» y `LeadProvenance` «de dónde
salieron». Son dos preguntas y se contestan por separado — fundirlas da una lista de quince filas
donde no se encuentra nada. Las etiquetas viven en `PROVIDER_LABELS` y `ATTRIBUTE_LABELS`
(`domain/lead.ts`), no duplicadas en el componente.

## Gotchas del contrato

1. **`POST /prospecting/leads/promote` responde 200 con fallos parciales.** El cuerpo trae
   `{ promoted, failed }` y hay que leer `failed` aunque la petición haya ido bien.
2. **Los dos endpoints de enriquecer responden 202**, no 200: el trabajo sigue en una cola. `queued`
   trae los ids aceptados, que pueden ser menos de los pedidos.
3. **Una señal sin medir NO es una señal fallida.** `quality_signals.checks[]` trae `unknown` para lo
   que nadie pudo medir, y se pinta en gris, no en rojo. Es la invariante F2-D1 del backend.
4. **El denominador de un eje es lo evaluable, no su peso.** `readAxisEvaluable` devuelve cuántos
   puntos se pudieron medir.
5. **El estado de calidad no sale del puntaje.** Un lead puede tener 92 y estar `risky` porque su
   dominio es catch-all. Nunca derives el semáforo del número.
6. **`extraParams` de `usePaginatedList` va memoizado** o el hook entra en bucle de fetch.
7. **`LeadRow` es un `type`, no un `interface`.** `DataTable` exige `Record<string, Primitive>`.
   Por eso existe `mapLeadToRow`, que **aplana booleanos y nunca valores**: la tabla no pinta PII.
8. **Al tocar `mapLeadToRow`, se añaden campos — no se reescribe.** Rellena `has_email`/`has_phone`,
   y sin ellos la columna «Puedo contactar por» vuelve a pintar el correo en verde para leads sin
   correo. Hay un test que lo guarda.

## Archivos

- `domain/lead.ts` — DTOs, etiquetas, `channelVerdict`, `mapLeadToRow`, `readSocials`,
  `dataCompleteness`, `canEnrich`, `PROVIDER_LABELS`, `ATTRIBUTE_LABELS`. TypeScript puro.
- `domain/search.ts` — búsquedas, categorías del catálogo y radios.
- `infrastructure/services/prospecting-service.adapter.ts` — la única puerta al HTTP.
- `ui/LeadsInboxView.tsx` · `LeadDetailView.tsx` · `QualityView.tsx` · `SearchesView.tsx` ·
  `SourcesView.tsx`
- `ui/components/` — `LeadIdentityCard` (los datos, F4b), `LeadProvenance` (de dónde salieron),
  `CaptureFunnel`, `ChannelPermissions`, `QualityIndex` + `QualityBreakdown`, `QualityEvidence`,
  `QualityDistribution`, `IcpEditor`, `PromotionGate`, `LeadTimeline`, `LeadsNav`, `SearchRun`,
  `StartSearchSheet`.
- `ui/tables/leads.config.tsx` — columnas por factory (`buildLeadColumns`): la casilla necesita leer
  la selección, y desde F4b también qué filas se pueden marcar y cuáles están trabajando.

**Compartidos que usa y no hay que duplicar:** `ProviderCard` (la tarjeta premium, que absorbió
cuatro copias), `MapPreview` + `LocationSearch` (teselas reales de OSM, sin librería de mapas),
`FieldList` (datos copiables), `MagnifiedShowcase`, `StatusBadge`, `RelativeDate`.

## Pendiente

- **Lista de supresión**: el backend la expone desde F1 (`GET|POST|DELETE /prospecting/suppressions`)
  y el adapter ya la llama, pero **no tiene pantalla**. Ojo al diseñarla: la lista **no devuelve el
  valor en claro**, solo su hash — se puede saber cuántos hay y quitar uno por su id, no leer a quién
  se dejó fuera.
- **Editar los topes del proveedor desde el panel**: `ConnectProviderSheet` solo pide etiqueta y
  credenciales. Ni el diario ni el mensual se pueden fijar desde la interfaz; se hacen por el
  endpoint de actualización, que sí los acepta. La tarjeta ya los muestra.
- **Tiempo real por lead**: hoy solo hay dos eventos WS, ambos de búsqueda
  (`prospecting.search_progress` y `search_completed`). El enriquecimiento usa sondeo porque es una
  acción que el usuario acaba de pedir y está mirando.
