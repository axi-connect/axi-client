# Marketing ultra-premium

Aprobado por el dueño el 2026-09-26 sobre el canvas https://claude.ai/artifact/V2AedwTMHB2bGXxrpcY4yW (copia en el
monorepo: `docs/design/mockups/marketing-premium/`), con una condición explícita:

> Las tablas no pueden desbordar en los diferentes tamaños y el scroll debe ser optimizado, con el estilo de axi del
> scroll.

Cuatro fases, cada una con auditoría y despliegue propios:

1. **Primitivas y Configuración** (esta rama, `feat/marketing-premium-f1`).
2. Campañas: lista, detalle y creación (retomar y duplicar borradores; tasas del servidor).
3. Recuperación, Promociones y el Resumen.
4. Captación (slice `prospecting`).

## Fase 1

### Primitivas compartidas (valen para toda la app)

- **La barra de scroll de axi** (`.axi-scroll` en `globals.css`): fina, con el degradado de marca, en los dos ejes. En
  Firefox, `scrollbar-width: thin` + `scrollbar-color`, solo donde no hay `::-webkit-scrollbar` (en Chrome el estándar
  anularía el degradado). `.sidebar-scroll` queda como alias.
- **`Table` con su propio contenedor** (`ui/table.tsx`, como el shadcn de origen): `overflow-x-auto` +
  `overscroll-x-contain` + `.axi-scroll`. Toda tabla de la app deja de empujar la página cuando no cabe: scrollea dentro
  de su tarjeta, sin mover el panel ni encadenar el gesto al scroll de la página.
- En el celular las tablas de marketing ocultan sus columnas secundarias (`hidden md:table-cell`) y suben el dato a la
  primera columna: el scroll lateral es el último recurso, no el primero.

### El marco del módulo

- `MarketingHeader`: antetítulo, título en Nexa, descripción, acciones y **la navegación única del módulo** (Resumen ·
  Campañas · Recuperación · Promociones · Captación · Configuración) con `NavTabs`. Lo montan todas las secciones raíz de
  marketing; el detalle de una campaña y el asistente conservan su «volver».
- Captación hereda la barra desde su layout (su rediseño es la fase 4).

### Configuración

- Layout: `MarketingHeader` («Configuración») + sub-navegación `NavTabs surface="inline"`: Ajustes · Mensajes ·
  Plantillas de Meta · Bajas («Plantillas» pasa a «Mensajes»: son textos propios; las de Meta son otra cosa).
- **Ajustes**: tarjetas de bento, `Switch` en vez de casillas, la protección de WhatsApp Web sin la caja ámbar, y
  «Guardar» en una barra de tinta pegada abajo solo cuando hay cambios (§9.5.1).
- **Mensajes**: `Table` con estado en punto (`StatePill`), menú con `DropdownMenu` en vez de `<details>`, `Switch` en el
  panel de edición.
- **Plantillas de Meta**: `Select` compartido para el canal, tres fichas (canal, aprobadas, costo por mensaje),
  `Table` con estado, motivo del rechazo y costo; sin los tres pasos tintados ni la caja informativa (su texto pasa a
  la descripción del encabezado).
- **Bajas**: `SegmentedControl` Activas/Todas, `Table`, sin la caja informativa.
- Un solo componente de error con reintento (`LoadError`) para las cuatro vistas.

### Verificación

- tsc, lint y jest acotados; `next build`.
- Render con el arnés de tenant (`docs/qa/marketing-premium/arnes`) a 390, 768, 1024, 1280 y 1440, claro y oscuro,
  con datos largos: **cero** `scroll-horizontal-del-panel`, cero hijos fuera de su tarjeta, y el scroll interno de la
  tabla medido (la tabla scrollea, la página no).

## Fase 2 — Campañas (`feat/marketing-premium-f2`, sale de `ec6ca28d`)

### Lista (`CampaignsView`)

- `MarketingHeader` + filtro de estado en `SegmentedControl` (Todas + los seis estados) + recuento.
- `TableCard` con columnas por container query: Campaña (siempre), Acciones `@md`, Estado `@xl`, Cuándo `@2xl`,
  Audiencia `@3xl`. Estrecha, el punto de estado y la fecha suben bajo el nombre y las acciones bajo la fila.
- Acción principal según estado: un borrador se **Continúa** (contraste, abre el asistente), el resto se **Ve**.
  El resto en un menú «Más acciones» con `portal`: Editar (solo programada), Pausar, Reanudar, **Duplicar** (toda
  campaña) y, separadas, Cancelar campaña / Eliminar borrador.
- `DropdownMenuContent portal`: opt-in nuevo del sistema. El panel se pinta en `body` con posición fija junto al
  disparador (el scroller de la tabla lo recortaría) y se cierra al hacer scroll o redimensionar. Los otros 96 usos
  no cambian.

### Retomar y duplicar (dominio `campaign-draft.ts`)

- `fromCampaignDTO` reconstruye el borrador desde lo guardado (modo de audiencia deducido; el mapeo de la plantilla
  de Meta se filtra por forma; la fecha vuelve en hora local). `resumeStep` abre en el primer paso con bloqueo, o en
  la revisión si no falta nada.
- `/marketing/campaigns/new?campaign=<id>` retoma (la página pasa `resumeId` y remonta el asistente con `key`). Una
  campaña que ya salió no se edita: el asistente lo dice y enlaza al detalle. Una programada se edita y se guarda
  («Guardar cambios») sin relanzar.
- Duplicar es de cliente: `createCampaign(toDuplicateCampaignDTO)` — misma audiencia y mensaje, SIN fecha (una
  programación vieja saldría al instante), nombre `Copia de …` recortado a los 80 que acepta el servidor — y abre la
  copia en el asistente.

### Detalle (`CampaignDetailView`)

- Cabecera con kicker «Campaña · estado», descripción de audiencia/contenido/fecha, «Se actualiza sola» y
  Continuar/Editar cuando se puede.
- Bento: Despachados (cifra + barra segmentada salieron / no lo recibieron / en cola), Lo que ya vendió, El camino
  del mensaje (despachados → entregados → leídos → respondieron → compraron), No lo recibieron (motivos, sin el
  anti-spam transitorio) y Destinatarios (`SegmentedControl`, Exportar CSV, `TableCard`).
- Un borrador no tiene avance: «Se calcula al lanzar» + continuar.
- Acciones del ciclo de vida en la isla de tinta pegada abajo (Cancelar envío · Pausar · Reanudar).
- **Tasas:** los porcentajes del camino se calculan sobre lo despachado, para que cuadren con las barras. Las tasas
  del servidor no comparten base (`delivery_rate` va sobre despachados; `reply_rate` y `conversion_rate`, sobre la
  audiencia), así que mezclarlas en la misma fila daría barras y porcentajes que no casan. Queda anotado para la
  consola de margen/analítica, no se muestran aquí.
- Datos, WebSocket dirigido, polling y CSV: sin cambios.

### Asistente (`CampaignWizard`)

- Los pasos son una lista vertical: los hechos se pliegan en una tarjeta con ✓, su resumen en una línea y «Cambiar»;
  el actual se abre con su pregunta («¿A quién le hablas?», «¿Qué les dices?», «¿Cuándo sale?», «Antes de enviar»);
  los que faltan, tenues.
- Selects nativos → `Select` del sistema (segmento, mensaje guardado, número de WhatsApp). Avisos sin caja tintada:
  punto ámbar + texto.
- Contenido: las dos mitades (dentro de 24 h / fuera de 24 h) lado a lado desde `lg`, con la vista previa en globo.
- «Antes de enviar»: audiencia, cuándo sale, cuánto cuesta (tope en USD), el cupo de Meta y quién no lo recibe; al
  lado, los dos mensajes como los vería un contacto de ejemplo.
- Navegación en la isla de tinta pegada abajo: qué falta (o el resumen en la revisión), Atrás y Continuar /
  Programar campaña / Lanzar campaña / Guardar cambios.

### Verificación

- tsc, lint y jest acotados (marketing + `dropdown-menu`); `next build`.
- Arnés propio: `docs/qa/marketing-premium-f2/arnes` (el de la fase 1 lo usa la auditoría). 12 escenarios de
  campañas × 5 anchos × 2 temas: lista (con datos, vacía, solo lectura, error), detalle (enviando, borrador,
  procesada) y asistente (nuevo, retomado en contenido, en revisión, programada, bloqueada).

## Fase 3 — Recuperación, Promociones y Resumen (`feat/marketing-premium-f3`, sale de la fase 2 `a0cd8e8c`)

### Resumen (`MarketingOverviewView`)

- Bento en tres columnas (`md` 2, `xl` 3): «Recuperado por tus reglas» (cifra en millones, una barra ámbar por
  disparador, mensajes / compraron después / cupones canjeados), «Campañas en curso» (barra de avance y, al lado,
  respondieron · compraron · recuperado; una programada dice cuándo sale), y debajo «Recuperación en vivo»,
  Promociones (activas y las dos primeras con su barra de canjes), Plantillas de Meta (aprobadas / en revisión /
  rechazadas), Bajas y el Cupo de Meta de hoy.
- «Lo próximo» es la ÚNICA isla (`MarketingNextUpIsland`, dominio puro `domain/next-up.ts`): plantilla rechazada →
  regla que no puede enviar (enlaza a esa regla) → promoción que vence en 48 h o va por el 90 % → cupo de Meta bajo
  el 10 % → borradores sin lanzar. Mismo contrato que la del Panel: silueta mientras una fuente que la decide no
  respondió; sin filas pero con una fuente sin leer, «No pudimos revisar lo pendiente» en vez de «Todo en orden».
- Cada tarjeta carga y falla por su cuenta («No pudimos leer …» + Reintentar en su sitio): se va la franja roja
  global.
- Store: `RecoveryTotals.byTrigger`, `drafts` (solo `meta.total` de los borradores) y `meta` (primer número Cloud:
  plantillas por estado + cupo; `null` = sin número Cloud, que las tarjetas dicen como «Conectar WhatsApp»).
- Captación queda para la fase 4 (su tarjeta entra con su slice).

### Recuperación (`AutomationsView`)

- Una tarjeta por disparador (icono, qué pasó para que salte, «Añadir regla») con las reglas en filas: prioridad,
  nombre (abre el editor), cuándo escribe, la promoción que ofrece, enviados/delegadas · compraron % · recuperado,
  el interruptor del sistema y el menú con `portal`. Una regla que exige plantilla de Meta lo dice con un punto ámbar
  y «Poner plantilla».
- A la derecha: lo recuperado por todas las reglas y «Cuidamos a tus clientes», que lee los límites REALES de Ajustes
  (tope diario, enfriamiento, esperar si atiende una persona): no promete lo que el tenant no tiene encendido.

### Promociones (`PromotionsView`, `PromotionCard`, `RedemptionsSheet`)

- La barra de filtros vive dentro de la tarjeta: estado en `SegmentedControl`, tipo y origen en `Select`, búsqueda.
- Fila: código(s), nombre, condiciones; canjes con barra ámbar y cupones sin canjear; `StatePill` con su nota de
  vigencia (`promotionWhenNote`: vence hoy / mañana por día de calendario, cupón válido N h, empieza el…, llegó a su
  tope); interruptor (solo las locales) y menú con Ver canjes / Editar / Eliminar. La espejada de la tienda lleva
  la insignia de Shopify y «Se edita en la tienda», sin interruptor ni edición.
- `?new=1` abre el editor vacío (lo usa «Nueva promoción» del Resumen) y limpia el parámetro.
- Canjes: la cifra grande con su barra, tabla del sistema (Cupón, Cuándo, Pedido, Aplicado; un revertido es un
  `StatePill`), y la nota de qué significa revertido.

## Fase 4 — Captación (`feat/marketing-premium-f4`, sale de la fase 3 `fc90f640`) · PLAN, sin código

Slice `prospecting`, rutas `/marketing/leads/*`. Mapa del estado actual (2026-09-26): cinco pantallas, sin store,
servicios en `prospecting-service.adapter.ts`; ya usan `DataTable`/`ui/table` (no hay `<table>` ni `<select>`
nativos), pero con callouts tintados hechos a mano, `BrandLoader` dentro de las vistas y dos pantallas sin estado
de error propio. Solo la Bandeja está en el canvas aprobado; las demás siguen su lenguaje.

### F4a — Marco y Bandeja (lo del canvas)

- **Marco:** `MarketingHeader` con kicker «Marketing · Captación» y título «Leads por conocer»; `LeadsNav` como
  sub-navegación bajo la barra del módulo (Bandeja · Búsquedas · Calidad · Fuentes) y **pasarle `pendingCount`**
  (hoy nunca llega: el contador de la pestaña no se ve). El «38» de Captación en la barra del módulo sale del mismo dato.
- **Embudo** (`CaptureFunnel`): una tarjeta bento con cinco cifras y su barra —descubiertos, en cuarentena,
  calificados, en el CRM, no contactar— en `@container` (5 columnas anchas, 2–3 estrechas).
- **Bandeja** (`LeadsInboxView` + `leads.config.tsx`): la tabla dentro de una tarjeta `@container` con columnas por
  container query (Lead siempre; Fuente, Datos «4 de 5 · teléfono, web, correo», Calidad con barra y cifra, Estado
  como `StatePill`); búsqueda + `FilterTrigger` + chips en la cabecera de la tarjeta; «buscando datos…» en la fila
  mientras enriquece. Se quitan los anchos fijos (`w-[88px]` de la calidad).
- **Selección:** la barra de tinta pegada abajo (§9.5.1) con «N seleccionados · o los N que cumplen el filtro»,
  Eliminar (ghost destructivo) · Buscar datos · gratis (glass) · Pasar al CRM (contrast), respetando
  `leads:delete` / `leads:manage` / `leads:promote` y el tope de 500. Sustituye al `SelectionBanner` en esta vista.
- «Puedo contactar por»: chips enfocables con nombre accesible (hoy son `span` con tooltip, sin teclado).

### F4b — Ficha del lead (`LeadDetailView`)

- Bento a dos columnas: identidad y datos, la búsqueda de datos en curso (`EnrichmentRunCard`), la calidad
  desglosada, de dónde salió cada dato (sin la columna fija de 108 px) y la línea de tiempo. «Pasar al CRM» es la
  única isla (la puerta de promoción); ya promovido, la isla dice «Ya está en el CRM» con «Ver en el CRM».
- Cabecera que envuelve en móvil (hoy tres botones desbordan a 390 px). **Estado de error propio** con Reintentar
  (hoy redirige con un toast) y `loading.tsx`.
- **«Descartar» exige `leads:manage`** (hoy no mira permisos, a diferencia de todo lo demás).

### F4c — Búsquedas, Calidad y Fuentes

- **Búsquedas:** cada búsqueda es una fila en tarjeta con `StatePill`, barra de avance y acciones en menú con portal;
  la hoja «Nueva búsqueda» con el `SegmentedControl` del sistema en vez del hecho a mano; el borrado con aviso sin
  caja tintada. Estado de error propio.
- **Calidad:** la distribución en bento; el editor del cliente ideal con el deslizador del sistema y chips con «x» de
  24 px (hoy ~12 px); **estado de error** (hoy se queda en el cargador para siempre); solo lectura sin `leads:manage`.
- **Fuentes:** `ProviderCard` ya es premium; ajustar insignias y el texto «Las llaves las pone axi». Solo lectura.
- **Resumen:** la tarjeta «Captación de leads» (descubiertos → calificados → en el CRM) que quedó pendiente en la fase 3.

### Fuera de alcance

- Servidor: ninguno (todo existe en `/prospecting/*`). Las funciones del adaptador sin uso (supresiones, ajustes,
  borrado individual) no se tocan en esta fase.
- Las llaves de proveedor viven en platform; el tenant no las ve.

### Verificación (acotada, sin duplicar)

- Por sub-fase: tsc y eslint de lo tocado; jest solo de los tests del slice que cambian (`SourcesView`, `SearchRun`,
  `StartSearchSheet`, `DeleteResultSheet`, `EnrichmentRunCard`) y tests nuevos para Bandeja y Ficha (hoy no tienen).
- Render, suite completa y build: la sesión auditora, con el arnés `docs/qa/marketing-premium-f4/arnes` que dejo listo.
