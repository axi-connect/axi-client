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
