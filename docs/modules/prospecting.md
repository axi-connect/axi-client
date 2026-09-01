# Captación de leads (`/marketing/leads`)

> Slice `prospecting` del frontend. Backend: `axi-server/docs/plans/prospecting_module_plan.md`.
> Estado: **F1–F5 + borrado** — bandeja con filtros avanzados, selección en lote y borrado, ficha,
> calidad, búsquedas con mapa, fuentes, panel de proveedores, enriquecimiento y su visor en vivo.

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

## Enriquecimiento (F4b y F4c)

Dos botones que llaman a dos endpoints distintos, y la diferencia **no es cosmética**:

| | Dónde | Cuota |
|---|---|---|
| «Buscar datos» | ficha del lead | **Gasta.** Lo pide alguien mirando ese lead, que es cuando pagar por un dato tiene sentido |
| «Buscar datos de N» | bandeja, sobre la selección | **No gasta.** El backend fuerza el lote a lo gratuito: cien leads de pago funden un plan en un clic |

El texto del botón en lote lo dice antes de pulsarlo. No se cambia sin cambiar el endpoint.

### «No encontré nada» es un desenlace, no un silencio (F4c)

Enriquecer era una caja negra. Una pasada que no hallaba nada **no escribía nada** —ni columna, ni
evento, ni fila— así que desde fuera era idéntica a una que seguía corriendo, y la interfaz esperaba
para siempre una señal que no iba a llegar. El usuario veía «Estamos preguntando a las fuentes…» y,
90 s después, mi propio aviso de rendición.

Desde F4c la verdad **es una fila**, `prospecting_enrichment_run`, igual que en las búsquedas: un
registro por pasada con su estado y sus pasos. `lead.last_run` la trae, `EnrichmentRunCard` la pinta,
y **se queda como informe** cuando termina — mañana se puede volver a mirar qué se consultó.

`prospecting_enrichment` no es eso: sigue siendo el libro de cuentas anti-doble-cobro. Son dos tablas
porque son dos preguntas, «qué pasó en esta pasada» y «a quién ya le pagamos».

#### Los estados de un paso son SEIS, no dos

Un stepper de catálogo trae `isCompleted: true|false`, y eso pierde justo lo que hay que contar. El
criterio es el mismo que separó `capped_day` de `capped_month`: **si el remedio es distinto, el
estado es distinto.**

| Estado | Qué significa | Cómo se arregla |
|---|---|---|
| `pending` | Aún no le toca | No se arregla: espera |
| `running` | Consultando ahora mismo | — |
| `found` | Trajo N datos, listados al desplegar | — |
| `no_data` | Respondió y no sabía nada | Con otra fuente |
| `failed` | El proveedor no respondió | Reintentando |
| `no_account` | No hay proveedor para esa capacidad | Dando uno de alta |

`no_data` va en **gris y no en rojo**: preguntar y que no haya nada es normal y frecuente. Pintarlo
como error empuja a reintentar algo que no está roto.

El visor no inventa componente: extiende `Timeline`, que ya es **la única** implementación del
stepper vertical del proyecto, con dos props aditivas (`state` y `content`). Acaba de pasar lo mismo
con `ProviderCard`, que absorbió cuatro copias de la misma tarjeta.

### El tiempo real es comodidad; la fila es la verdad

La ficha se une a la **sala del lead** (`inbox.join_lead`) y recibe `prospecting.lead_enrichment_progress`
y `_completed`. La bandeja **no se une a ninguna**: un lote de cien leads por cinco fuentes son
quinientos mensajes a todos los paneles abiertos del tenant, que es la misma razón por la que
`lead_discovered` está deliberadamente fuera del WS.

Y el sondeo **no se retiró, se degradó a respaldo** —igual que en `SearchesView`—: quien recarga,
quien entra desde otro dispositivo o quien tenía el socket caído tiene que ver lo mismo.

Dos trampas ya pagadas, ambas documentadas en el código:

1. **`joinedRef` solo se fija tras el ack**, y el re-join va en el evento `connect` con un efecto que
   depende **solo de `socket`, nunca de `connected`**. El token rota cada ~14 min con desconexión, y
   con la dependencia ingenua el socket se quedaba fuera de la sala para siempre.
2. **`alert-provider` no memorizaba `showAlert`.** Cualquier aviso que apareciera en cualquier parte
   de la app recreaba `load`, remontaba el efecto del sondeo y **reiniciaba el tope de 90 s desde
   cero**: por eso el `GET` se repetía sin fin en vez de rendirse. Era un bug de infraestructura
   compartida, no del módulo.

### El «buscando datos» de la bandeja se cierra con la marca del intento

`status` tiene el valor `enriching` en el enum desde F1 y el enriquecimiento manual **no lo escribe**:
usarlo taparía el estado real (`Nuevo`, `Calificado`) con uno que el servidor no puso ahí. Los ids en
curso viven en un `useState` local.

Un lead sale de ese conjunto cuando **`last_enriched_at` cambia**, no cuando gana datos. Es C-D3 del
backend: la columna significa «última vez que lo intentamos», y se escribe siempre. Con el criterio
viejo —datos ganados— una pasada sin hallazgos dejaba la fila girando los 90 s enteros para rendirse
en silencio: exactamente el bug que F4c mató en la ficha, sobreviviendo en la bandeja.

**El tope de 90 s no es opcional** de todos modos: si un proveedor se cuelga el trabajo puede no
terminar nunca, y un spinner sobre una fila quieta miente igual.

### La procedencia es real desde F4b

`attributes` es `{campo: {value, source, confidence, fetched_at}}` y `source` **es el proveedor**
(`nominatim`, `site_extractor`, `rues`…). Antes decía siempre `'enrichment'`, y como el backend
cuenta fuentes distintas para la señal de corroboración, eso la tenía congelada.

En la ficha: `LeadIdentityCard` responde «cuáles son los datos» y `LeadProvenance` «de dónde
salieron». Son dos preguntas y se contestan por separado — fundirlas da una lista de quince filas
donde no se encuentra nada. Las etiquetas viven en `PROVIDER_LABELS` y `ATTRIBUTE_LABELS`
(`domain/lead.ts`), no duplicadas en el componente.

## Filtrar la bandeja (F5)

### Las opciones salen del diccionario, y ahí murió un bug de meses

Los tres desplegables anteriores tenían sus `<SelectItem>` escritos a mano en el JSX. El de orígenes
listaba **tres de los seis** y le faltaban `google_places`, `openstreetmap` y `serp` — o sea todos los
que produce una búsqueda, que son la mayoría de la bandeja. Al de estados le faltaban tres más.
Nadie lo vio porque **una opción que no existe no da error**: simplemente no se puede pedir.

Ahora `ui/tables/leads.filters.ts` genera el esquema recorriendo `SOURCE_LABELS`, `STATUS_LABELS`,
`QUALITY_LABELS`, `LEGAL_BASIS_LABELS` y `CHANNEL_ORDER`, que son `Record<Enum, string>` y el
compilador ya vigila contra el enum del contrato. Añadir un origen en el backend **rompe la
compilación aquí** hasta que se le dé etiqueta, y hay un test que cuenta las opciones.

`GET /prospecting/sources` **no sirve** para esto aunque lo parezca: devuelve solo las tres fuentes
*buscables* y se deja fuera `ctwa`, `meta_lead_ads` y `manual`.

`enriching` no se ofrece, y no es un olvido: es un lead que la puerta de admisión aún no ha juzgado,
nace invisible y el backend lo excluye de la bandeja. Sería un filtro que siempre devuelve vacío.

### Un solo vocabulario para las dos pantallas

`domain/criteria.ts` tiene `REQUIRABLE_LABELS`, `REQUIRABLE_ORDER`, `SCORE_STEPS`, `SCORE_CEILINGS` y
`ADMISSION_DATA_FIELDS`. **No es de búsqueda ni de lead: es del slice**, y lo consumen los criterios
de admisión de una búsqueda y los filtros de la bandeja, que hacen la misma pregunta. Se movió desde
`domain/search.ts` **sin reexportar**: un reexporte deja dos puertas al mismo símbolo.

Los nombres de los parámetros son los del backend —`min_data`, `require`, `require_mode`,
`min_score`— y eso no es cosmético: en el servidor la misma regla en dos sitios ya llegó a producción
contando `website ?? domain` en uno y `website` en el otro.

### El conteo lo hace Postgres

`data_count` y `data_present` son **dos columnas generadas** y viajan en el DTO. El cliente ya no
cuenta: `dataCompleteness` lee `data_count`, y `has_email`/`has_phone` se derivan de `data_present`,
que habla el vocabulario de la admisión. Tres copias de la regla convergieron en una **por
eliminación**, que es la única convergencia que se queda convergida.

Efecto colateral bueno: la columna «Datos» **ya se puede ordenar**. Su `accessorKey` era `has_email`,
una mentira de conveniencia que hacía que ordenar por «Datos» ordenara por «tiene correo».

### «Seleccionar los N que cumplen» pide los ids de verdad

Dos pasos, y el segundo es explícito. La casilla de cabecera **nunca pasa de la página**; la banda
ofrece el resto, y al aceptar se piden los ids a `GET /prospecting/leads/ids` en vez de mandar un
filtro a las acciones de lote. Así lo que se promueve son ids concretos que quedan en la auditoría
—«los que cumplían un filtro que ya no existe» no se puede reproducir seis meses después— y el
usuario actúa sobre el mismo conjunto que vio.

Por encima de 50 en ese modo, promover **pide confirmación** con el número real. Promover escribe
datos de terceros en el CRM y no se deshace.

### Aplicar un filtro hace TRES cosas

Fijar el valor, volver a la página 1 y **tirar la selección**.

Lo de la página 1 es a mano porque `usePaginatedList` dice en su comentario que lo hace al cambiar
`extraParams` y **no lo hace**; el síntoma es feo: en la página 7 cambias un filtro que deja dos
páginas y ves una tabla vacía que se lee como «no hay resultados». Lo de la selección es de
seguridad: una selección «todos los que cumplen» atada a un filtro que el usuario ya cambió es
exactamente cómo se promueven cuatrocientos leads que nadie quería.

### El embudo NO reacciona a los filtros, y lo dice

Va etiquetado «De toda la base». Si reaccionara sería una tautología: filtra a «nuevos» y el embudo
informa `promoted: 0` — aritméticamente correcto y engañoso. El número filtrado vive en el pie de la
tabla, de `meta.total`.

## Borrar

**No hay papelera ni deshacer**, así que la confirmación es la única barrera que existe. Plan y
decisiones en `axi-server/docs/plans/prospecting_delete_frontend.md`; mockup en
`docs/design/mockups/prospecting-delete.html`.

### Vive SOLO en la barra de selección

Nada en la fila y nada en el menú contextual. Borrar uno cuesta un clic más que un botón de fila, y
eso es a favor: sin papelera, un clic antes de algo irreversible no es fricción, es margen. Un menú
contextual además aparece con clic derecho sin avisar, que es el peor sitio posible.

### El destructivo va DE CONTORNO, y relleno solo en el diálogo

Lo destapó **renderizar** el mockup, no razonarlo. La regla del sistema —«destructivo ≠ coral»— se
cumplía: coral de marca contra rojo semántico. Y aun así, al lado de «Promover», los dos se leían
**casi iguales**, porque a tamaño de botón ambos son un rectángulo rojo. Dos botones contiguos que se
parecen y hacen cosas opuestas es el error, no el matiz.

**Es el tratamiento del slice**: un borrado en otra vista sale de aquí y no de una segunda invención.

### Aviso al terminar; panel solo si hay algo que explicar

`needsDeleteSheet(outcome)` decide, y devuelve `true` solo con `kept` o `missing`. Un panel
obligatorio tras borrar tres filas sin novedad se aprende a cerrar sin leer, y entonces no se lee el
que sí importa.

El informe se lee sin sumar a mano porque el backend garantiza
**`deleted + kept.length + missing` = lo enviado**. Y `missing` es un **número y no una lista** a
propósito: tras un borrado masivo no se puede saber cuál de los ausentes lo borramos nosotros, así
que dar ids sería inventarse el detalle.

### Una búsqueda enseña el número EXACTO, y el diálogo espera a tenerlo

`new_count` y `found_count` de la tarjeta son **históricos**: dicen lo que la búsqueda trajo y no se
ajustan al promover o borrar leads (por eso la etiqueta dice «Trajo N» — es la única forma de
explicar en qué se gastó el dinero). Enseñar 184 y que el resultado diga 120 se lee como que se
perdió algo, así que se pide `GET /prospecting/searches/deletion-preview` y **el diálogo no abre
hasta tener la cifra**. Si la previa falla, se dice y **no se ofrece borrar a ciegas**.

Una búsqueda viva avisa en **ámbar y no en rojo**: es un efecto colateral que hay que saber —se
detiene al borrarla—, no un peligro.

### Lo que el diálogo NO dice, por decisión del dueño

**Borrar no suprime**: el mismo negocio puede volver en otra búsqueda, y con una fuente de pago se
vuelve a pagar. Se le puso delante en la confirmación con ese argumento y **eligió quitarlo**, dos
veces preguntado. No es un olvido, y no se cuela por otra pantalla —la sesión del backend se
comprometió a no marcarlo tampoco en el reporte de una búsqueda—. Vive en el docblock de
`DeleteLeadsUseCase` y del adapter, para quien toque el código.

### Un lead ya promovido no se puede marcar

La casilla sale **deshabilitada, no ausente**: quitarla descuadra la columna y no dice por qué. El
backend responde 409 (`prospecting/lead_not_deletable`), así que ofrecerla y fallar después sería un
control que miente. Consecuencia buena: en la selección de una página el `kept` siempre viene vacío,
porque no se puede marcar lo que sobrevive.

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
  `EnrichmentRunCard` (qué se consultó y qué dio cada fuente, F4c),
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
- **Reintentar una pasada fallida** desde el visor. La fila deja el estado escrito, así que el dato
  está; reintentar es una decisión de alguien, no un efecto automático.
- **Absorber los otros paneles de filtros** en `FilterPanel`: `ContactFilters` del CRM,
  `ProductFilters` del catálogo, `AdvancedSearchOptions` de la hoja de búsqueda y los `Select` sueltos
  de cartera y admin. La regla para que no aparezca una quinta copia: **un listado nuevo con filtros
  usa `FilterPanel` + un `*.filters.ts`, nunca un panel propio.**
- **La bandeja no tiene visor**, solo el chip de «buscando datos». Es a propósito (ver arriba: no se
  une a las salas por lead), pero si algún día hace falta, la fila ya está escrita.
