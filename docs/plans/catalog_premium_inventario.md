# Catálogo premium — inventario de paridad (F0)

Levantado el 2026-09-27 sobre `axi-client` `origin/main` 9cb96f27, leyendo el código real (solo lectura). Es la
lista de lo que el módulo **hace y dice hoy**: el rediseño no puede perder nada de esto sin una decisión explícita
del dueño ([[rediseno-no-quita-funciones-inventario-primero]]). Copy literal entre «», con `archivo:línea`.

Partes:
- **A. Listado de productos** (`/catalog/products`)
- **B. Ficha del producto** (crear y detalle)
- **C. Categorías, Tipos de producto y Catálogos** + superficie pública
- **D. Huecos de hoy que el rediseño corrige** (no son funciones a conservar)

---

## A. Listado de productos

Estado a 2026-09-27, leído de `axi-client` (sin editar nada). Rutas relativas a `src/`.
Abreviaturas: **page** = `app/(private)/(content)/catalog/products/page.tsx`; **cfg** = `modules/catalog/ui/tables/config/product.config.tsx`; **act** = `modules/catalog/ui/tables/product.actions.tsx`; **grid** = `modules/catalog/ui/components/ProductGrid.tsx`; **filt** = `modules/catalog/ui/components/ProductFilters.tsx`; **dom** = `modules/catalog/domain/product.ts`; **DT** = `shared/components/features/data-table/index.tsx`.

---

### 1. Ruta(s) y cabecera

- `/catalog` redirige a `/catalog/products` (`app/(private)/(content)/catalog/page.tsx:4-6`). No tiene contenido propio.
- `/catalog/products`: componente cliente `ProductsPage` (page:35).
- **Layout de la sección** (`catalog/layout.tsx:9-23`), común a todas las subrutas:
  - Envuelve todo en `CatalogProvider` (layout:11).
  - `h1` «Catálogo» (layout:14), `text-3xl font-semibold`.
  - Subtítulo «Administra tus productos, categorías, tipos de producto y catálogos.» (layout:15-17).
  - Debajo, `<CatalogNav />` (layout:19) y luego el contenido.
- **Cabecera de la página** (page:116-146):
  - `h2` «Productos» (page:118), `text-xl font-semibold`.
  - Descripción «Tu catálogo completo: productos físicos y servicios agendables.» (page:119-121).
  - A la derecha: el conmutador de vista (§3) y el botón «Crear producto» (§3).

### 2. Navegación / pestañas

`CatalogNav` (`modules/catalog/ui/components/CatalogNav.tsx:11-20`) usa `NavTabs` con `label="Secciones del catálogo"` (aria-label del `<nav>`). Marca la pestaña activa por prefijo de ruta con `aria-current="page"` (`shared/components/layout/nav-tabs.tsx:97`).

| Orden | Etiqueta | href | Icono lucide |
|---|---|---|---|
| 1 | «Productos» | `/catalog/products` | `Package` |
| 2 | «Categorías» | `/catalog/categories` | `FolderTree` |
| 3 | «Tipos de producto» | `/catalog/product-types` | `Shapes` |
| 4 | «Catálogos» | `/catalog/catalogs` | `BookOpen` |

(CatalogNav.tsx:12-15). `NavTabs` usa `labels="auto"` por defecto: en móvil las pestañas inactivas quedan solo con el icono y la etiqueta se revela en `md` (nav-tabs.tsx:63,101; `segmented.tsx:207-225`).

### 3. Acciones de página y permisos

- Permiso leído: `hasPermission("catalog:manage")` → `canManage` (page:39).
- **Conmutador de vista** (`SegmentedControl`, page:124-136). Siempre visible, sin permiso.
  - aria-label del grupo: «Cambiar vista» (page:127).
  - Ítems: «Tabla» (icono `List`, valor `table`) y «Tarjetas» (icono `LayoutGrid`, valor `grid`) (page:133-134).
  - `labels="active"`: solo la vista activa muestra su texto; las demás muestran solo el icono, aunque el texto sigue en el DOM para lectores de pantalla (page:131; segmented.tsx:207-225).
  - `size="sm"`, `surface="inline"`.
- **«Crear producto»** (page:137-144). Botón con enlace a `/catalog/products/create`, icono `Plus`, `rounded-full`. **Solo se muestra con `catalog:manage`.**
- El mismo CTA vuelve a aparecer en el estado vacío, también limitado a `catalog:manage` (page:161-169).
- No hay en la página: exportar, importar, acciones en lote, selección de filas, orden ni menú de columnas.
- Permisos de fila: ver §8. `catalog:stock` NO interviene en este listado (§8.4).

### 4. Filtros

Componente `ProductFilters` (filt:30-123), dentro de la tarjeta de contenido y encima de la tabla o las tarjetas (page:174-179). Todos son `Select` de altura `h-9`: ancho completo en móvil y ancho fijo desde `sm`. Hay un valor centinela `"__all__"` para «todos» (filt:15). Estado inicial `{}`, sin ningún filtro (page:42). Los filtros **no se persisten** (no van a la URL ni a localStorage).

| # | aria-label del trigger | Placeholder (no se ve nunca: siempre hay valor) | Opción «todos» (valor por defecto) | Resto de opciones | Parámetro enviado | Ancho sm+ | Línea |
|---|---|---|---|---|---|---|---|
| 1 | «Filtrar por catálogo» | «Catálogo» | «Todos los catálogos» | un ítem por catálogo con `catalog.name` (de `useCatalog().catalogs`) | `catalog_id` | `w-40` | filt:49-64 |
| 2 | «Filtrar por categoría» | «Categoría» | «Todas las categorías» | árbol aplanado con sangría textual `"— "` repetido `depth` veces + nombre (por ejemplo «— — Camisas») | `category_id` | `w-44` | filt:66-81 |
| 3 | «Filtrar por tipo» | «Tipo» | «Todo» | «Productos» (`product`), «Servicios» (`service`) | `kind` | `w-32` | filt:83-97 |
| 4 | «Filtrar por estado» | «Estado» | «Cualquier estado» | «Activos» (`true`), «Inactivos» (`false`) | `is_active` | `w-32` | filt:99-113 |

- Las categorías salen de `flattenCategoryTree(categoryTree)` (page:83; `domain/category.ts:20-28`). **Incluye categorías inactivas** (no se filtra `is_active`) y no las distingue visualmente.
- El filtro «Tipo» se refiere a `kind` (producto o servicio). **No hay filtro por «Tipo de producto»** (`product_type_id`), aunque el contexto carga `productTypes`.
- **Limpiar** (filt:115-120): botón ghost `sm`, icono `X`, texto «Limpiar». Solo aparece si hay algún filtro activo y vuelve a `{}`. No borra la búsqueda.
- Cambiar un filtro devuelve a la página 1, porque `extraParams` cambia y `usePaginatedList` reinicia (page:56-64; filt:28).
- Las opciones de catálogo y categoría vienen del `CatalogProvider`. Si fallan, el `error` del contexto («No se pudieron cargar los catálogos» / «…las categorías» / «…los tipos de producto», `catalog.context.tsx:42,52,62`) **no se muestra en esta página** y el select queda solo con «Todos…».
- Sin chips de filtro activo ni contador de filtros.

### 5. Búsqueda y paginación

- `PAGE_SIZE = 20` (page:25, con el comentario «default del backend para /catalog/products (no 25)»). No hay selector de tamaño de página.
- La búsqueda es del servidor, en el parámetro `q` (page:76-81). `setSearch` vuelve a la página 1 y convierte `""` en `undefined` (`shared/api/use-paginated-list.ts:92-95`).
- El backend ordena siempre por `created_at desc` (dom:120; `product-service.adapter.ts:18`). La UI no permite ordenar: ninguna columna es `sortable` y no se pasa `onSortChange`.
- Parámetros de `GET /catalog/products` (dom:121-129): `q`, `catalog_id`, `category_id`, `kind`, `is_active`, `page`, `page_size`. `buildListParams` añade `page` y `page_size` (`shared/api/query.ts:24-39`).

**Vista Tabla** (usa el `SearchBar` interno de DataTable; page:185-197):
- Placeholder y aria-label: «Buscar productos…» (se pasa `messages.searchPlaceholder: () => "Buscar productos…"`, page:194; SearchBar.tsx:31-33,54).
- Debounce de 350 ms al teclear (`searchDebounceMs` por defecto, DT:187). Sin botón «Buscar», porque el trigger es `debounced`.
- Con texto aparece un botón `X` con aria-label y title «Limpiar» (SearchBar.tsx:56-67).
- **Selector de campo engañoso:** DataTable detecta como buscables todas las columnas con `accessorKey` y cabecera de texto: Nombre, Tipo, Categoría, Precio, Stock, Fotos y Estado (`utils/hooks.ts:13-43`). Como son más de uno, pinta un desplegable con aria-label «Seleccionar campo», el texto «Nombre» con `ChevronDown` y el menú «Opciones de campo» (SearchBar.tsx:75-90). La página **ignora el campo** y solo usa `value` → `q` (page:191). Es un control inerte: el rediseño puede quitarlo sin perder función.
- Pie (DT:537-553): «Página {p} de {tp} — {total} registros» (caption por defecto, DT:206), más `BasicPagination`.

**Vista Tarjetas** (buscador propio; page:201-216):
- Formulario `max-w-sm` con icono `Search`. El input tiene placeholder «Buscar productos…» y `aria-label="Buscar productos"`, sin la elipsis (page:212-214).
- **Solo busca al pulsar Enter** (submit). No hay debounce ni botón para limpiar.
- Su estado (`gridSearch`) es independiente del de la tabla. Al cambiar de vista, el texto no se sincroniza aunque la búsqueda aplicada (`q`) sí se mantiene.
- Pie (page:226-231): «Página {page} de {totalPages} — {total} productos» (`tabular-nums`), más `BasicPagination`.

**`BasicPagination`** (`shared/components/ui/pagination/index.tsx`, `core.tsx`), común a ambas vistas:
- Botones «Anterior» y «Próximo», ocultos por debajo de `sm`, donde solo queda el chevron (core.tsx:80,96).
- Los aria-label están en inglés: «Go to previous page», «Go to next page», «More pages» en la elipsis y «pagination» en el `<nav>` (core.tsx:15,74,91,114).
- Muestra 1 hermano a cada lado y 1 página en cada extremo.

### 6. Vista tabla — columnas

Definición en `productColumns` (cfg:101-194), pintada por `DataTable`/`TableView`, con la cabecera en `bg-muted` (TableView.tsx:35). **Columnas responsivas:** el ancho mínimo por defecto es 150 px y cada columna declara el suyo. Las columnas que no caben (las que no son `alwaysVisible`) pasan a una fila plegable bajo cada fila, con el botón «Ver más» / «Ver menos» (icono `ChevronDown`, `aria-expanded`). Ahí se muestran como tarjetitas «etiqueta de cabecera + celda» en una rejilla de 1 o 2 columnas (`utils/hooks.ts:81-130`; RowCollapse.tsx:81-111). Siempre visibles: miniatura, Nombre y acciones.

| # | Cabecera (copy) | Clave | min px | Qué muestra y cómo | Línea |
|---|---|---|---|---|---|
| 1 | *(vacía)* `""` | `image_url` | 56 | `ProductThumb` de 40×40 `rounded-lg`. alt «Imagen de {nombre}». Si falta la URL o falla la carga, muestra el icono del kind (`Package` para producto, `Wrench` para servicio, 20 px) sobre `bg-muted`, con `aria-hidden`. `next/image` `unoptimized`, `sizes="64px"`, `object-cover` (cfg:102-115; ProductThumb.tsx:29-52) | cfg:102 |
| 2 | «Nombre» | `name` | 200 | Enlace a `/catalog/products/{id}`, `font-medium`, hover `text-brand` | cfg:116-129 |
| 3 | «Tipo» | `kind` | 100 | Badge `secondary` con «Producto» o «Servicio» (`PRODUCT_KIND_LABELS`, dom:115-118) | cfg:130-139 |
| 4 | «Categoría» | `category_name` | 140 | Texto `text-muted-foreground`. Es la categoría **efectiva**: `effective_category.name`, si no el nombre de `category_id` en el árbol, y si no «—». Si `effective_category.is_automatic`, lleva delante el icono `Sparkles` violeta (`text-accent-violet`, 14 px) con `aria-label="Categoría automática"` (cfg:140-155, mapeo cfg:207-218) | cfg:140 |
| 5 | «Precio» | `price_label` | 110 | `formatMoney(price_cents, currency)`: `Intl` es-CO, estilo moneda; COP sin decimales, otras monedas con 2 (`core/lib/format.ts:55-64`); `tabular-nums`. Es el precio **base del producto**, no un rango de variantes | cfg:156-163 |
| 6 | «Stock» | `stock_total` | 140 | `ProductStockBadge` (cfg:35-68); detalle abajo | cfg:164-169 |
| 7 | «Fotos» | `image_count` | 90 | `ProductImageCountBadge` (cfg:74-99). Con N > 0: icono `Camera` gris + N. Con 0: icono y «0» en `text-muted-foreground/60`, enfocable (`tabIndex=0`), con el tooltip «Sin fotos: tu agente no podrá mostrar este producto» | cfg:170-177 |
| 8 | «Estado» | `is_active` | 100 | Badge «Activo» (variante `default` = `bg-primary text-primary-foreground`) o «Inactivo» (variante `secondary`) | cfg:178-187 |
| 9 | *(sin cabecera)* | id `actions` | 80 | `ProductRowActions`, menú ⋯ (§8). Anclada al final | cfg:188-193 |

**Stock (`ProductStockBadge`, cfg:35-68; agregación `aggregateStock`, dom:182-203)**
- Estados y etiquetas (`PRODUCT_STOCK_LABELS`, dom:138-144):
  - `ok`: punto `bg-success` + «{total} · Disponible».
  - `low`: punto `bg-warning` + «{total} · Stock bajo».
  - `out`: punto `bg-destructive` + «{total} · Agotado».
  - `untracked`: punto `bg-muted-foreground/40` + «Sin control de stock», sin cifra y todo en gris.
  - `none` (servicios): solo «—» gris.
- El punto mide 8 px (`h-2 w-2 rounded-full`) y lleva `aria-hidden`. La cifra va en `tabular-nums` y « · etiqueta» en `text-muted-foreground`.
- Reglas de la agregación:
  - servicio → `none`;
  - ninguna variante activa → `out` con total 0;
  - ninguna variante activa con fila de stock → `untracked`;
  - total = suma de `on_hand` de las variantes rastreadas;
  - todas las activas no disponibles → `out`;
  - alguna no disponible → `low`;
  - resto → `ok`.
- «Bajo» significa **que alguna variante está agotada**, no que el stock quede por debajo de un umbral.
- `stock === null` se trata como «disponible, sin control» (incidente 2026-09-10, dom:176-180).
- Colores de badge (`shared/components/ui/badge.tsx:8-17`): `default` = `bg-primary`, `secondary` = `bg-secondary`, `destructive` = `bg-destructive text-white`.
- Menú contextual con clic derecho: no hay (no se pasa `rowContextMenu`).

### 7. Vista tarjetas — qué muestra cada tarjeta

`ProductGrid` (grid:14-72). Es una lista `<ul>` en rejilla de 1, 2, 3 o 4 columnas (`sm`/`lg`/`xl`) con `gap-4`. Cada `<li>` es `rounded-2xl border` con sombra al pasar el ratón.
- **Toda la tarjeta enlaza** a `/catalog/products/{id}` mediante un `Link` absoluto con `aria-label="Ver {nombre}"` (grid:22-26).
- **Imagen** `aspect-[4/3]` a todo el ancho. alt «Imagen de {nombre}». El icono de respaldo mide 32 px. `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"` (grid:28-35).
- **Badges arriba a la izquierda, sobre la imagen** (grid:36-42), en este orden:
  - «Servicio» (`secondary`), solo si `kind === service`;
  - «Shopify» (`secondary`), si el producto está gobernado (`governed_by_connection_id` no nulo). El texto está fijo aunque la integración sea otra;
  - «Inactivo» (`secondary`), si no está activo;
  - «Agotado» (`destructive`), solo si `stock_state === out`.
- **Contador de fotos, abajo a la derecha** (grid:44-50): píldora `bg-background/85` con icono `Camera` y N. Con 0 lleva el atributo `title` «Sin fotos: tu agente no podrá mostrar este producto».
- **Cuerpo** (grid:52-67):
  - Nombre truncado, `text-sm font-medium`.
  - Línea secundaria truncada: si es servicio con duración, «{n} min»; si no, el nombre de la categoría (si no es «—»); si no, «{n} variante» / «{n} variantes». Aquí **no** aparece el icono de categoría automática.
  - Precio `price_label`, `font-semibold tabular-nums`.
  - A la derecha, el menú ⋯ (`ProductRowActions`) con `z-10` por encima del enlace.
- Diferencias con la tabla:
  - no muestra las cifras de stock, «Stock bajo», «Sin control de stock» ni «Disponible»;
  - no muestra el badge «Producto» ni el «Activo» (solo los estados negativos);
  - la tabla **no** muestra el badge «Shopify» ni la duración, que solo existen en tarjetas.

### 8. Acciones por fila

`ProductRowActions` (act:25-117), la misma en la tabla y en las tarjetas.

### 8.1 Menú
- Disparador: botón ghost de 32×32 con `MoreHorizontal` y el texto sr-only «Abrir menú de acciones». Hace `stopPropagation` en el clic (act:53-58).
- Contenido (`align="end"`):
  - Etiqueta «Acciones», seguida de un separador (act:60-61).
  - «Ver producto» (icono `Eye`) → `router.push('/catalog/products/{id}')`. **Sin permiso** (act:62-68).
  - «Editar» (icono `Pencil`) → **la misma ruta** del detalle, que es un hub editable. Requiere **`catalog:manage`** (act:69-77).
  - «Eliminar» (icono `Trash`, `text-destructive`) → abre la confirmación. Requiere **`catalog:manage` y que el producto NO esté gobernado** por una integración; un espejo de Shopify devolvería un 409 (act:78-88).

### 8.2 Confirmación de borrado (`Modal`, act:92-114)
- Título: «Eliminar producto».
- Descripción: «¿Seguro que deseas eliminar “{nombre}”?» (con comillas tipográficas “ ”).
- Cuerpo: «El producto dejará de aparecer en el catálogo y para la IA. Sus variantes se conservan en el histórico.»
- Botones:
  - «Cancelar»: `outline`, cierra, id `product-delete-cancel`.
  - «Eliminar»: `destructive`, `asClose: false`, id `product-delete-confirm`. Mientras borra muestra «Eliminando...» con tres puntos ASCII y no se deshabilita, aunque un guard `if (submitting) return` evita el doble envío.
- Ancho `sm:max-w-md`. Tiene la X de cierre del Dialog con el sr-only «Close» en inglés (`shared/components/ui/dialog.tsx:209`).
- `deleteProduct` hace un soft-delete con `DELETE /catalog/products/{id}` (adapter:36-39).

### 8.3 Avisos (toasts sileo, vía `showAlert` → `notify.fromAlert`, `core/providers/alert-provider.tsx:31-36`)
- Éxito: la acción emite `products:delete:success` y la página muestra «Producto eliminado correctamente» (`tone: success`) y hace `refresh()` (page:94-97). El modal se cierra (act:37-38).
- Error: se emite `products:error` con `errorMessage(err, "No se pudo eliminar el producto")` y la página lo muestra con `tone: error`. El respaldo de la página, si el detalle no trae mensaje, es «No se pudo completar la acción» (page:98-101; act:40-44). El modal queda abierto.

### 8.4 Popover de ajuste de stock
**NO se monta en este listado.** `StockAdjustPopover` solo se usa en `VariantsTable.tsx:177`, en el detalle del producto. Se documenta por si el rediseño quiere traerlo a la fila (`modules/catalog/ui/components/StockAdjustPopover.tsx`):
- Permiso: `catalog:stock`, según los comentarios (StockAdjustPopover.tsx:16; adapter:67). El propio componente no comprueba el permiso.
- Disparador: botón icono `PackagePlus` de 32×32 con aria-label «Ajustar stock de {sku}» (:74).
- Título: «Ajustar stock — {sku}» (:79).
- Conmutador con `role="group"`, aria-label «Tipo de ajuste» y `aria-pressed`: «Fijar» (`set`, por defecto) / «Sumar / restar» (`increment`) (:81-96).
- «Cantidad»: número, `step 1`. Placeholder «128» al fijar y «-5 resta, 5 suma» al sumar o restar (:98-109).
- «Umbral de agotado»: número, `min 0`, placeholder «0», valor inicial `out_of_stock_threshold` actual. Ayuda: «Disponible cuando el stock supera el umbral» (:111-124).
- Botón «Aplicar» / «Aplicando…» a todo el ancho, deshabilitado mientras envía (:126-128).
- Validaciones con toast de error:
  - «Indica una cantidad entera»;
  - «Al fijar, la cantidad debe ser ≥ 0»;
  - «El umbral debe ser un entero ≥ 0» (:40,44,49).
- Éxito: «Stock actualizado». Error: `errorMessage(err, "No se pudo ajustar el stock")` (:61,65).
- Llama a `PATCH /catalog/variants/{id}/stock` con `{op, quantity, out_of_stock_threshold?}` (adapter:68-70).

### 9. Estados

- **Carga de ruta** (`products/loading.tsx:3-5`): `TableSkeleton rows=8` con cabecera. Tiene `role="status"`, `aria-label="Cargando listado"` y `aria-busy="true"` (`shared/components/features/loading/TableSkeleton.tsx:21-24`). Pinta la barra de herramientas, la cabecera y 8 filas de 4 columnas más un círculo a la derecha. No reproduce la forma real (miniatura y 8 columnas).
- **Carga de datos, solo cuando no hay filas previas**:
  - tabla: `TableSkeleton rows=6 showHeader={false}` (page:182-183);
  - tarjetas: `TableSkeleton rows=4 showHeader={false}` (page:217-218), es decir, un esqueleto de tabla también en la vista de tarjetas.
  - Al recargar con filas ya presentes (cambio de página, filtro o búsqueda) **no hay ningún indicador**: se mantienen las filas viejas hasta que llega la respuesta.
- **Vacío (sin productos)**: se da cuando no carga, `total === 0`, no hay búsqueda ni filtros (page:110-111). En ese caso se ocultan los filtros y la tabla y aparece `EmptyState` (page:156-171):
  - `glyph="catalog"` (glifo de cristal), `variant="solid"`;
  - título (h2) «Aún no tienes productos»;
  - descripción «Crea el primero para que tu equipo y la IA puedan ofrecerlo.»;
  - acción «Crear producto» (con `Plus`), solo con `catalog:manage`. Sin permiso, no hay acción.
  - Posible destello: en el primer render `loading` vale `false` y `total` vale 0 hasta que corre el efecto del hook (`use-paginated-list.ts:36,77-79`), así que el estado vacío puede verse un instante.
- **Sin resultados** (hay búsqueda o filtros):
  - tabla: una fila con «Sin resultados para esta búsqueda», centrada y en gris (page:195; TableView.tsx:68-73);
  - tarjetas: párrafo «Sin resultados para esta búsqueda», `py-12` centrado (page:219-222).
  - El texto dice «búsqueda» aunque la causa sea un filtro, y no hay CTA para limpiar.
- **Error** (page:148-154): sustituye filtros y listado, así que no se puede cambiar el filtro que falla. Es una caja `rounded-2xl border p-8` centrada con `errorMessage(error)` y el botón `outline` «Reintentar», que hace `refresh()`.
  - Respaldo genérico de `errorMessage`: «Ocurrió un error inesperado»; con 429: «Demasiadas peticiones. Reintenta en {n}s.»; si no, el `detail` o `title` del problem (`core/lib/error-messages.ts:378-399`).
  - Error de red sin HttpError: el mensaje del Error o «Error de red» (`use-paginated-list.ts:66-70`).

### 10. Persistencia y eventos window

- `localStorage["catalog:products:view"]` = `"table"` | `"grid"` (page:26). Se lee tras el montaje, para evitar el desajuste de SSR, y se escribe al conmutar (page:46-54). La vista por defecto es `table`. **Sin try/catch.**
- No se persisten filtros, búsqueda ni página: ni URL, ni querystring, ni almacenamiento.
- Eventos `window` (CustomEvent):
  - `products:delete:success` con `detail: { id }`: lo emite act:37 y lo escucha page:102, que muestra el toast y refresca.
  - `products:error` con `detail: { message }`: lo emite act:40-44 y lo escucha page:103, que muestra el toast.
- Contexto `CatalogProvider` (`catalog.context.tsx:30-87`): al montar el layout carga `catalogs`, `categoryTree` y `productTypes`. Expone `fetchX` y `error`, que esta página no consume.

### 11. Datos del DTO disponibles pero NO mostrados

Contrato `ProductsListDto.data[]` (`core/api/schema.d.ts:11078-11201`). Campos que llegan en cada fila del listado y hoy no se pintan:

- **Identidad y organización:**
  - `catalog_id`: se puede filtrar, pero no se muestra a qué catálogo pertenece el producto;
  - `product_type_id`: el tipo de producto, sin columna ni filtro;
  - `description`;
  - `metadata`;
  - `created_at`: se mapea en `ProductRow.created_at` (cfg:229) pero no se pinta; es el orden implícito;
  - `updated_at`.
- **Categoría efectiva completa:** `effective_category.source` (por ejemplo `shopify_collection`, `alias_match`, `llm`, `enrichment`, `tenant`) y `effective_category.confidence`. Ya existe el helper `effectiveCategoryNote` → «automática · 80 % · por el nombre» (dom:301-320), que solo usa el detalle. La tabla solo pinta el destello `Sparkles` y las tarjetas nada.
- **Servicios:**
  - `duration_minutes` (solo en tarjetas);
  - `buffer_minutes`;
  - `requires_booking`.
- **Gobierno por integración:**
  - `governed_by_connection_id`: en las tarjetas solo como «Shopify» fijo, y en la tabla nada, salvo que oculta «Eliminar»;
  - `locked_fields[]` (`name`, `description`, `price`, `status`, `category`, `variants`, `stock`, `images`): qué campos manda la tienda.
- **Atributos EAV:** `attribute_values[]` con `code`, `label`, `type` y `value`.
- **Variantes** `variants[]`: `sku`, `name`, `attributes`, `price_cents` por variante (permitiría un rango de precios), `service_date`, `is_default`, `is_active`, `position` y `stock{on_hand, out_of_stock_threshold, available}` por variante. Hoy solo se usan el número de variantes (en tarjetas) y el agregado de stock. El SKU no aparece en el listado.
- **Imágenes** `images[]` (opcional): `status` (`pending`/`ready`/`failed`, que permitiría avisar de imports en curso o fallidos), `source` (`upload`/`url_import`), `url` (miniatura con URL firmada de ~300 s), `alt_text`, `width`/`height`, `error`. Hoy solo se usan `image_url` y `image_count`.
- **Enriquecimiento con IA** `enrichment` (opcional): `status` (`pending`/`ready`/`failed`/`disabled`), `source` (`text`/`vision`), `description`, `attributes` y `attribute_labels`, `search_terms[]`, `suggested_category`, `locked_category`, `vertical_code`, `model`, `edited_by_user_at`, `generated_at`, `error`, `skipped_reason`. Ya existen `enrichmentDisplayState` y `ENRICHMENT_STATE_LABELS` («Sin generar», «Generando…», «Listo», «Editado por ti», «Desactivado», «No se pudo generar», dom:232-254), pero no se usan en el listado.
- **Meta:** `meta.page` y `meta.page_size` (solo se usa `total`).
- **Contexto no usado aquí:** `productTypes`, cargado por el provider.

---

## B. Ficha del producto

Repo: `/home/davela/dev/axi/axi-client`. Estado leído el 2026-09-27. Solo lectura; no se tocó ningún archivo del repo.

**Leyenda de rutas citadas** (file:line):

| Abrev. | Archivo |
|---|---|
| `CP` | `src/app/(private)/(content)/catalog/products/create/page.tsx` |
| `CL` | `src/app/(private)/(content)/catalog/products/create/loading.tsx` |
| `DP` | `src/app/(private)/(content)/catalog/products/[id]/page.tsx` |
| `DL` | `src/app/(private)/(content)/catalog/products/[id]/loading.tsx` |
| `PF` | `src/modules/catalog/ui/forms/ProductForm.tsx` |
| `PC` | `src/modules/catalog/ui/forms/config/product.config.tsx` |
| `VF` | `src/modules/catalog/ui/forms/VariantForm.tsx` |
| `HDR` | `src/modules/catalog/ui/components/ProductDetailHeader.tsx` |
| `BASE` | `src/modules/catalog/ui/components/ProductBaseSection.tsx` |
| `CAT` | `src/modules/catalog/ui/components/EffectiveCategoryField.tsx` |
| `ATTR` | `src/modules/catalog/ui/components/ProductAttributesSection.tsx` |
| `AVI` | `src/modules/catalog/ui/components/AttributeValueInput.tsx` |
| `ENR` | `src/modules/catalog/ui/components/ProductEnrichmentSection.tsx` |
| `PHS` | `src/modules/catalog/ui/components/ProductPhotosSection.tsx` |
| `UPL` / `TILE` / `LBX` / `GAL` | `.../components/photos/PhotoUploader.tsx` / `PhotoTile.tsx` / `PhotoLightbox.tsx` / `SortablePhotoGallery.tsx` |
| `VT` | `src/modules/catalog/ui/components/VariantsTable.tsx` |
| `VRE` | `src/modules/catalog/ui/components/VariantRowsEditor.tsx` |
| `DEP` | `src/modules/catalog/ui/components/DepartureCalendar.tsx` |
| `STK` | `src/modules/catalog/ui/components/StockAdjustPopover.tsx` |
| `THUMB` | `src/modules/catalog/ui/components/ProductThumb.tsx` |
| `PRICE` | `src/shared/components/features/price-input.tsx` (re-exportado por `components/PriceInput.tsx:7`) |
| `DOM` | `src/modules/catalog/domain/product.ts` |
| `PT` | `src/modules/catalog/domain/product-type.ts` |
| `POLL` | `src/modules/catalog/infrastructure/hooks/use-product-images-polling.ts` |
| `SVC` / `IMG` / `ENRS` | `infrastructure/services/product-service.adapter.ts` / `product-image-service.adapter.ts` / `product-enrichment-service.adapter.ts` |
| `ERR` | `src/core/lib/error-messages.ts` |
| `HEAD` | `src/shared/components/layout/private-header.tsx` |
| `LAY` | `src/app/(private)/(content)/catalog/layout.tsx` |

---

### 1. Rutas, cabecera, migas y acciones de cabecera

### 1.1 Rutas
- `/catalog/products/create` → `CreateProductPage` (`CP:14`). Entrada desde el listado: botón «Crear producto» (solo con `catalog:manage`, `src/app/(private)/(content)/catalog/products/page.tsx:137-143` y en el estado vacío `:161-168`). **La página de crear NO comprueba permisos** por sí misma: con la URL directa se ve el formulario y el POST fallaría en backend (toast de error).
- `/catalog/products/[id]` → `ProductDetailPage` (`DP:35`). Acepta query `?pending_attributes=1` (`DP:43`) que activa el resaltado de atributos requeridos pendientes (se añade al redirigir tras crear, `CP:38`).
- Ambas viven dentro del shell de Catálogo (`LAY:9-23`): encima SIEMPRE se ven
  - h1 «Catálogo» (`LAY:13`) y subtítulo «Administra tus productos, categorías, tipos de producto y catálogos.» (`LAY:14-16`)
  - sub-navegación `CatalogNav` (aria «Secciones del catálogo»): «Productos», «Categorías», «Tipos de producto», «Catálogos»; en crear/detalle queda activo «Productos» por prefijo (`components/CatalogNav.tsx:11-19`, `shared/components/layout/nav-tabs.tsx:49`).

### 1.2 Migas (header privado global)
- `buildCrumbs` (`HEAD:88-99`): `catalog` → «Catálogo», `products` → «Productos» (`HEAD:46-47`).
- Detalle: el segmento UUID se nombra «Producto» (`HEAD:66`) → «Catálogo › Productos › Producto».
- Crear: `create` **no está en `LABELS`**, así que la miga cae al segmento crudo → «Catálogo › Productos › create» (inferido de `HEAD:96`, sin etiqueta para "create"; sí existe `"new": "Nueva"` en `HEAD:27`). Observación para el rediseño.

### 1.3 Cabecera de CREAR (`CP:19-32`)
- Enlace volver: icono `ArrowLeft` + «Productos» → `/catalog/products` (`CP:21-27`).
- h2 «Crear producto» (`CP:28`).
- Subtítulo «Completa la ficha; las variantes y el stock se pueden ajustar después.» (`CP:29-31`).
- Sin badges ni acciones de cabecera; las acciones van al pie del formulario (§7).

### 1.4 Cabecera de DETALLE
- Enlace volver: `ArrowLeft` + «Productos» → `/catalog/products` (`DP:164-170`). Siempre visible, también en carga/error.
- **Banner de producto gobernado** (solo si `governed_by_connection_id != null`, `DP:109,183-197`), tarjeta `bg-secondary/40`:
  «**Este producto lo gobierna tu tienda conectada.** Nombre, precio, stock e imágenes se actualizan solos desde Shopify; editarlos allá es la forma de cambiarlos aquí. La conexión se administra en [Integraciones](/settings/integrations).» (`DP:186-194`). El proveedor «Shopify» está escrito a fuego.
- **Tarjeta de cabecera** `ProductDetailHeader` (`DP:199-210`, `HDR:32-73`):
  - Miniatura 96×96 (`h-24 w-24 rounded-2xl`) desde `product.image_url` (campo legado, NO la primera foto de la galería), alt «Imagen de {nombre}» (`HDR:34-41`); si no hay URL o falla, icono `Package` (producto) o `Wrench` (servicio) sobre `bg-muted`, `aria-hidden` (`THUMB:36-44`).
  - h2 con el nombre (`HDR:44`).
  - Badge de estado: «Activo» (variant default) / «Inactivo» (secondary) (`HDR:45-47`).
  - Badge de tipo: «Producto» / «Servicio» (`HDR:48`, `DOM:115-118`).
  - Línea de contexto «{catálogo} · {categoría}» (omite vacíos; oculto si ambos faltan) (`HDR:30,50`). Ojo: la categoría sale de `product.category_id` (la propia/gobernada, `DP:92-97`), NO de `effective_category` que se muestra en la sección Información → pueden discrepar.
  - Precio `formatMoney(price_cents, currency)` + código de moneda en gris, p.ej. «$ 45.000 COP» (`HDR:51-54`; COP sin decimales, resto 2 decimales, locale es-CO: `src/core/lib/format.ts:55-64`).
  - Solo servicios con duración: «{n} min» + « · buffer {b} min» (si buffer>0) + « · requiere reserva» (si aplica) (`HDR:55-61`).
  - Acciones (solo si `canManage` = `catalog:manage` && `status` no bloqueado, `DP:205`, `HDR:63-72`):
    - Botón outline «Desactivar» / «Activar» (según `is_active`); mientras guarda «Guardando…» y deshabilitado (`HDR:65-67`).
    - Botón destructive «Eliminar» → abre modal de confirmación (§7) (`HDR:68-70`).

---

### 2. Layout actual

### 2.1 Crear (`CP:19-44`, `PF:109-485`)
- Columna única. Contenedor `space-y-4`; formulario dentro de una tarjeta `max-w-4xl rounded-2xl border bg-background p-4 md:p-6` (`CP:34`).
- Formulario `id="product-form"`, `space-y-8` (`PF:111`), secciones en este orden, cada una con `SectionHeader` (h3 + subtítulo opcional + `Separator`, `PF:46-54`):
  1. «Datos básicos» (sin subtítulo) (`PF:113-199`): Qué vas a ofrecer (fila completa) → grid 2 col [Nombre | Imagen (URL)+preview] → Descripción (fila completa).
  2. «Clasificación» — «Dónde vive y cómo se tipa este producto.» (`PF:202-285`): grid 3 col [Catálogo | Categoría | Tipo de producto].
  3. «Precio» (sin subtítulo) (`PF:288-334`): grid 3 col [Precio base | Moneda | (vacío)].
  4. «Agendamiento» — «Cómo se reserva este servicio.» — **solo si kind=service** (`PF:337-403`): grid 3 col [Duración | Buffer | Requiere reserva].
  5. «Variantes» — «Todo producto nace con al menos una variante (su SKU).» (`PF:406-474`): selector de modo → SKU (max-w-sm) o editor de filas.
  6. Pie alineado a la derecha: «Cancelar» + «Crear producto» (`PF:476-483`).

### 2.2 Detalle (`DP:162-296`)
Columna única, `space-y-6`, ancho completo (sin `max-w`). Orden:
1. Enlace «Productos».
2. Banner gobernado (condicional).
3. Tarjeta Cabecera (`HDR`).
4. Tarjeta «Información» (`BASE`) — form con guardado propio.
5. Tarjeta «Fotos» (`PHS`).
6. Sección «Búsqueda con IA» (`ENR`) — es su propia tarjeta (no va envuelta en la tarjeta estándar), teñida violeta salvo en estados `none`/`disabled` (`ENR:196-203`). Título es h2 `text-sm` (no h3 como el resto) (`ENR:208`).
7. Tarjeta «Atributos ({tipo})» (`ATTR`) — solo si el producto tiene tipo, el tipo cargó y hay atributos de ámbito producto (`DP:242-253`, `ATTR:61`).
8. Tarjeta «Variantes y stock ({n})» / «Variantes ({n})» (`VT`), con el calendario de salidas dentro cuando aplica.
9. Modal de eliminar producto (fuera de flujo).

Tarjetas estándar: `rounded-2xl border border-border bg-background p-4 md:p-6` (`DP:199,212,223,243,255`). Cada sección guarda por separado (el backend fragmenta endpoints, comentario `DP:30-34`); no hay un «Guardar» global.

Grids internos del detalle: Información = [Nombre | Imagen (URL)] 2 col, Descripción ancho completo, luego 4 col en lg [Categoría | Tipo de producto | Precio base | Moneda] (`BASE:106-152`), y para servicios 3 col [Duración | Buffer | Requiere reserva] (`BASE:229-230`). Atributos: 1/2/3 col (`ATTR:132`). Enriquecimiento: 2 col `1.4fr_1fr` en md (`ENR:285`). Fotos: grid auto-fill de mínimo 5.5rem (`GAL:89`).

---

### 3. Campos por sección

### 3.1 CREAR — Datos básicos
| Campo | Label | Tipo / control | Placeholder | Help | Validación (literal) | Default | Cita |
|---|---|---|---|---|---|---|---|
| `kind` | «Qué vas a ofrecer» | SegmentedControl (radiogroup) aria-label «Tipo de producto»; opciones «Producto» / «Servicio» | — | producto: «Un producto físico: maneja variantes y stock.» · servicio: «Un servicio agendable: define duración y reserva.» | enum | `product` | `PF:115-141`, `PC:29,90` |
| `name` | «Nombre» | Input text, maxLength 200 | producto «Camiseta básica» · servicio «Corte de cabello» | — | «Nombre requerido», «Máximo 200 caracteres» | `""` | `PF:143-155`, `PC:30` |
| `image_url` | «Imagen (URL)» | Input url + miniatura 36px a la derecha (alt «Vista previa de la imagen», icono por kind si vacía/rota) | «https://…/producto.png» | «La descargaremos y la serviremos desde axi para que siempre cargue rápido» | «URL inválida» (opcional) | `""` | `PF:156-179`, `PC:32` |
| `description` | «Descripción» | Textarea 3 filas, maxLength 2000 | «Describe el producto: la IA la usa para recomendarlo (opcional)» | — | «Máximo 2000 caracteres» | `""` | `PF:181-198`, `PC:31` |

Requeridos marcados visualmente: ninguno (no hay asteriscos en crear).

### 3.2 CREAR — Clasificación
| Campo | Label | Control | Placeholder / opciones | Validación | Default | Cita |
|---|---|---|---|---|---|---|
| `catalog_id` | «Catálogo» | Select | placeholder «Selecciona catálogo»; opciones = nombres de catálogos del contexto | «Selecciona el catálogo» | `""` | `PF:205-228`, `PC:33,94` |
| `category_id` | «Categoría» | Select | «Sin categoría» (valor centinela `__none__`) + árbol aplanado con sangría «— » por nivel (incluye categorías inactivas; en detalle se filtran) | opcional | `__none__` | `PF:229-253`, `PC:11,95` |
| `product_type_id` | «Tipo de producto» | Select | «Sin tipo» + tipos por nombre | opcional | `__none__` | `PF:254-283`, `PC:96` |
| — | help condicional | FormDescription | «Ejes de variante: {label1}, {label2}» si el tipo elegido tiene atributos `scope=variant` | — | — | `PF:275-279` |

### 3.3 CREAR — Precio
| Campo | Label | Control | Validación | Default | Cita |
|---|---|---|---|---|---|
| `price_cents` | «Precio base» | `PriceInput`: prefijo «$» (aria-hidden), inputMode decimal, formato es-CO («45.000» / «45.000,50»), placeholder «0», formatea al salir; texto ilegible se conserva con aria-invalid | «Precio requerido», «Debe ser ≥ 0» | `null` | `PF:291-308`, `PC:36-41,97`, `PRICE:19-95` |
| `currency` | «Moneda» | Select sin placeholder; opciones literales «COP», «USD», «EUR», «MXN» | «Código de 3 letras» | `COP` | `PF:309-332`, `PC:13,42,98` |

### 3.4 CREAR — Agendamiento (solo `kind=service`)
| Campo | Label | Control | Placeholder | Help | Validación | Default | Cita |
|---|---|---|---|---|---|---|---|
| `duration_minutes` | «Duración (min)» | number min 5 max 480 step 5 | «45» | — | «Un servicio requiere duración en minutos» (requerido en servicio), «Debe ser un entero», «Mínimo 5 minutos», «Máximo 480 minutos» | vacío | `PF:341-362`, `PC:43-48,61-67` |
| `buffer_minutes` | «Buffer (min)» | number min 0 max 240 step 5 | «10» | «Margen entre citas» | «Debe ser un entero», «Debe ser ≥ 0», «Máximo 240 minutos» | vacío | `PF:363-385`, `PC:49-54` |
| `requires_booking` | «Requiere reserva» | Switch (aria «Requiere reserva») | — | — | — | `false` | `PF:386-400`, `PC:55,101` |

Al enviar un producto (no servicio) no viajan duración/buffer/reserva (`PC:126-132`).

### 3.5 CREAR — Variantes
- Selector de modo (SegmentedControl, aria «Modo de variantes», sin label visible): «Producto simple» (o «Servicio simple» si servicio) / «Con variantes» (`PF:411-431`). Default `simple` (`PC:102`).
- **Modo simple** → campo `default_sku`: label «SKU», placeholder «CAM-001», maxLength 64, fuente mono, help «Identificador único de venta»; errores «SKU requerido», «Máximo 64 caracteres» (`PF:436-451`, `PC:57,68-70`).
- **Modo con variantes** → `VariantRowsEditor` (§6.4). Errores a nivel lista: «Añade al menos una variante»; por fila «SKU requerido», «Máximo 64 caracteres», «SKU repetido» (comparación sin mayúsculas), nombre «Máximo 120 caracteres», precio/stock «Debe ser ≥ 0», stock «Debe ser un entero» (`PC:15-23,71-84`, `PF:469`).
- Errores del servidor con `validation/failed` se pintan en los campos (`PF:102`, `ERR:411-425`); si no, toast.

### 3.6 DETALLE — «Información» (`BASE`)
Section aria-label «Información del producto» (`BASE:92`). h3 «Información» + botón «Guardar cambios» a la derecha (§7) (`BASE:95-101`). Todo el form dentro de `<fieldset disabled={!canManage}>` (`BASE:105`).

| Campo | Label | Control | Placeholder | Help | Validación | Cita |
|---|---|---|---|---|---|---|
| `name` | «Nombre» | Input maxLength 200 | — (en crear sí tiene) | — | «Nombre requerido», «Máximo 200 caracteres» | `BASE:107-119`, `PC:150` |
| `image_url` | «Imagen (URL)» | Input url (sin miniatura de vista previa, a diferencia de crear) | «https://…/producto.png» | «La descargaremos y la serviremos desde axi para que siempre cargue rápido» | «URL inválida» | `BASE:120-135`, `PC:152` |
| `description` | «Descripción» | Textarea 3 filas, maxLength 2000 | — (sin placeholder) | — | «Máximo 2000 caracteres» | `BASE:138-150`, `PC:151` |
| categoría efectiva | «Categoría» | `EffectiveCategoryField` (ver 3.7) — guarda al instante, NO con «Guardar cambios» | | | | `BASE:153-158` |
| `product_type_id` | «Tipo de producto» | Select «Sin tipo» + tipos | «Sin tipo» | — | — | `BASE:159-183` |
| `price_cents` | «Precio base» | PriceInput (deshabilitado sin permiso) | «0» | — | «Precio requerido», «Debe ser ≥ 0» | `BASE:184-202`, `PC:154-159` |
| `currency` | «Moneda» | Select COP/USD/EUR/MXN | — | — | «Código de 3 letras» | `BASE:203-226` |
| `duration_minutes` (servicio) | «Duración (min)» | number 5–480 step 5 | — (sin «45») | — | igual que crear + «Un servicio requiere duración en minutos» | `BASE:229-253`, `PC:162-184` |
| `buffer_minutes` (servicio) | «Buffer (min)» | number 0–240 step 5 | — (sin «10») | **sin** «Margen entre citas» (solo en crear) | igual que crear | `BASE:254-276` |
| `requires_booking` (servicio) | «Requiere reserva» | Switch aria «Requiere reserva» | | | | `BASE:277-295` |

NO editables en detalle (restricción backend, `BASE:42-45`): catálogo (solo se ve en la línea de contexto de la cabecera) y `kind` (solo badge). El PATCH no envía categoría (`PC:209-211`); para no-servicios no envía duración/buffer/reserva (`PC:215-221`). Descripción/imagen vacías se envían como `null` (`PC:207-208`).

### 3.7 DETALLE — Categoría efectiva (`CAT`)
- Etiqueta «Categoría» (span, no `<label>`) (`CAT:84`), `data-testid="effective-category"`.
- Caja con borde según estado (`CAT:85-92`) y 4 estados (`DOM:285-299`):
  - `fixed` (neutro, icono Check): la puso/confirmó el tenant.
  - `automatic` (borde violeta discontinuo, icono Sparkles): la puso el clasificador.
  - `external` (violeta, icono Store): vino de una colección de la tienda.
  - `none` (borde warning discontinuo, icono TriangleAlert): «**Sin categoría** · la clasificación no encontró una que aplique» (`CAT:104-107`).
- Con categoría: «**{nombre}** · {nota}», nota = partes unidas con « · »: «automática» (si auto) + «{NN} %» (confianza, si auto) + fuente (`CAT:98-102`, `DOM:310-320`). Fuentes literales (`DOM:301-308`): «por la colección de la tienda», «por el tipo de producto de la tienda», «por el nombre», «por IA», «por los metadatos con IA», «fijada por ti».
- Controles (solo `canManage` de la sección Información, `CAT:110-140`):
  - Botón sm «Confirmar» (solo en automatic/external), spinner mientras trabaja (`CAT:112-122`) → toast «Categoría confirmada».
  - Select compacto (w-44, aria «Cambiar categoría», placeholder «Elegir…») (`CAT:123-138`) con: «Volver al automático» (solo si `fixed`) → toast «Categoría devuelta al automático»; «Sin categoría» → toast «Categoría fijada»; categorías ACTIVAS con sangría «— » → toast «Categoría fijada» (`CAT:71-80`).
  - Error: «No se pudo cambiar la categoría» (`CAT:65`).
- Help debajo (siempre, incluso sin permiso): `fixed` «La fijaste tú: la clasificación automática no la toca.» · resto «Confirmar la fija como tuya. Cambiarla también la fija.» (`CAT:142-146`).

### 3.8 DETALLE — Atributos (`ATTR`)
- Visible solo si tipo + atributos `scope=product` (ordenados por `position`) (`ATTR:53-61`). Si falla la carga del tipo, la sección desaparece sin aviso (`DP:79-80`).
- Section aria «Atributos del producto»; h3 «Atributos ({nombre del tipo})» (`ATTR:115-118`).
- Aviso en warning cuando `?pending_attributes=1` y faltan: «Faltan atributos requeridos: {labels}» (`ATTR:119-123`); los inputs que faltan llevan `aria-invalid` (`ATTR:101,108`).
- Por atributo: Label «{label}» + « *» rojo si requerido + « ({unidad})» si tiene unidad (`ATTR:135-139`); input según tipo (`AVI:47-126`):
  - `select`: Select, placeholder/primera opción «Sin definir», luego opciones del tipo (`AVI:48-66`).
  - `boolean`: checkbox con texto «Sí» (`AVI:67-80`).
  - `number`: Input number, inputMode decimal (`AVI:81-94`).
  - `date`: Input date nativo ISO (`AVI:95-107`).
  - `text`: Input maxLength 120 (`AVI:108-119`).
- Botón «Guardar atributos» / «Guardando…» (solo `canManage && !governed`) (`ATTR:125-129`, `DP:247`). Validación cliente: toast «Completa los atributos requeridos: {labels}» (`ATTR:80-85`). Éxito «Atributos guardados correctamente»; error «No se pudieron guardar los atributos» (`ATTR:90-93`). Envía el record completo (replace-set, `SVC:41-47`).

---

### 4. Fotos (`PHS`, `photos/*`)

- Section aria «Fotos del producto»; h3 «Fotos» (`PHS:142-144`). Botón outline sm «Actualizar» (icono RefreshCw) aparece a la derecha solo cuando el polling se estancó (`PHS:145-150`).
- **Banner educativo** one-shot (localStorage `axi.catalog.photos_banner_dismissed`, `PHS:33,61-76`), violeta con Sparkles: «Tu agente de ventas envía estas fotos por WhatsApp cuando un cliente pide ver un producto. Sube fotos por color/talla para que muestre la variante exacta.» Botón X aria «Descartar aviso» (`PHS:154-170`). Se muestra también a usuarios sin permiso.
- **Galería del producto (comodín)**: rótulo «Fotos del producto» + «(comodín para todas las variantes)» (este último oculto en móvil) y contador «{n}/10» (`PHS:173-181`). Vacía sin permiso: «Este producto aún no tiene fotos.» (`PHS:195-199`); vacía con permiso: solo el tile de subir.
- **Galerías por variante** (si hay variantes): subtítulo «Por variante» (`PHS:206`); por cada variante: nombre (o SKU) + chip mono con el SKU + contador «{n}/5» (`PHS:209-222`); vacía: «Sin fotos — usará las del producto.» (`PHS:237-241`). Alt por defecto «{producto} — {variante}» (`PHS:210`).
- **Límites** (`DOM:37-46`): 5 MB por foto, 10 fotos producto, 5 por variante, formatos `image/jpeg,image/png,image/webp`.
- **Subir** (`UPL`): tile cuadrado discontinuo, aria «Subir fotos», icono ImagePlus + «Subir foto»; subiendo: spinner + «Subiendo…» (`UPL:87-118`). Click abre selector múltiple; drag&drop con resaltado (`UPL:91-101`). Deshabilitado al llegar al tope o sin permiso (`UPL:40`); sin permiso ni se pinta (`GAL:107-115`). Sube secuencial, sin barra de %.
  - Toasts: «Solo quedan {n} espacio(s) en esta galería» (`UPL:45-50`); por archivo inválido título «Formato no soportado: usa JPEG, PNG o WebP.» o «La imagen supera el máximo de 5 MB.» con descripción = nombre del archivo (`UPL:55-58`, `DOM:74-86`); fallo de subida «No se pudo subir la imagen» (`UPL:63`). Errores backend mapeados: «La imagen no es válida: usa JPEG, PNG o WebP de máximo 5 MB», «Alcanzaste el límite de fotos de esta galería», «No encontramos esa imagen. Recarga e inténtalo de nuevo» (`ERR:172-174`).
  - No se envía `alt_text` aunque el adapter lo acepta (`IMG:18-35`).
- **Reordenar** (`GAL`): drag&drop dnd-kit (puntero con 6 px de umbral, táctil con 180 ms, teclado) (`GAL:67-72`); desactivado sin permiso o con <2 fotos (`GAL:75`); cursor grab. Optimista con rollback y toast «No se pudo guardar el orden» (`PHS:93-107`). **La primera posición es la foto principal** (la que la IA envía primero), pero **no hay ningún distintivo visual de «principal»** en la UI (solo comentarios `GAL:33`, `IMG:57`).
- **Tile** (`TILE`), cuadrado:
  - `pending`: spinner + «Importando…» (`TILE:53-57`).
  - `failed`: fondo destructivo, icono alerta, «No se pudo importar», tooltip `title` = error del backend o «No se pudo importar la imagen»; con permiso, botón «Reintentar» (icono RotateCw) que re-guarda la misma `source_url` (`TILE:58-75`, `PHS:124-136`) → error «No se pudo reintentar el import».
  - roto/sin url: icono ImageOff + «No disponible» (`TILE:76-80`); antes hace UN auto-reintento refrescando el detalle (URL presignada vencida) (`TILE:41-48`, `PHS:88-90`).
  - listo: al hover/focus, degradado con botones redondos «Ver original» (aria, icono Maximize2) y, con permiso, «Borrar foto» (aria, icono Trash2) (`TILE:94-120`).
- **Borrar** → modal «Borrar foto», descripción «La foto desaparecerá de la galería y tu agente dejará de enviarla.», acciones «Cancelar» / «Borrar» (destructive; «Borrando…» mientras) (`PHS:256-274`). Error «No se pudo borrar la foto» (`PHS:117`). Sin toast de éxito.
- **Lightbox** (`LBX`): Dialog del DS (Esc/overlay), título sr-only = alt; pide URL fresca del original al abrir; cargando: spinner + sr-only «Cargando imagen…»; error «No se pudo cargar la imagen» (`LBX:28-67`). Imagen `max-h-[80vh]`. Sin navegación entre fotos.
- **Polling de import por URL** (`POLL`, `PHS:84-85`): cada 3 s mientras haya `pending`, tope 30 s → `stalled` → botón «Actualizar» (reinicia el presupuesto) (`DOM:48-71`, `POLL:13-63`).
- **Cuota de almacenamiento**: no existe ningún mensaje de cuota en este árbol (ni en `modules/catalog` ni en `ERR`); la tanda «storage quota» no está en esta rama.
- Import por URL: se dispara desde «Imagen (URL)» de Información (producto) o del modal de variante; `image_url` de cabecera es el campo legado.

---

### 5. Enriquecimiento IA — «Búsqueda con IA» (`ENR`)

- Section `aria-labelledby` → h2 (icono Sparkles) «Búsqueda con IA» + badge de estado (`ENR:199-212`). Badge con punto (pulsa en pending) y etiquetas (`DOM:247-254`): «Sin generar», «Generando…», «Listo», «Editado por ti», «Desactivado», «No se pudo generar». Violeta en ready/pending, warning en failed, gris en el resto (`ENR:429-444`).
- Estado derivado (`DOM:237-245`): sin fila → none; `edited_by_user_at` convierte ready en «edited».
- **Explicación bajo el título por estado** (`ENR:446-463`):
  - none: «Genera la descripción que verá el agente, los atributos y las palabras con que tus clientes piden este producto. No consume tu plan y no escribe nada en tu tienda.»
  - pending: «Mirando la foto principal y la ficha. Suele tardar unos segundos; puedes seguir editando el resto del producto.»
  - edited: «Corregiste estos metadatos. Aunque cambie la foto o la ficha, no se vuelven a generar solos: «Regenerar» los reemplaza.»
  - disabled: «Para este producto el agente usa solo la descripción de la ficha y los clientes lo encuentran por su nombre y categoría. Lo generado se conserva por si lo vuelves a activar.»
  - failed: «Mientras tanto el agente usa la descripción de la ficha, como hasta ahora.»
  - ready con `source=text`: «Generado a partir del nombre y la ficha. Cuando subas la primera foto se vuelve a generar mirando el producto.»
  - ready (vision): «Lo que la IA entendió de este producto para que tus clientes lo encuentren aunque lo pidan con otras palabras. El agente usa esta descripción en vez de la de la ficha; términos y atributos solo sirven para buscar.»
- **Botones de cabecera** (solo `canManage`; en espejados también, `DP:232-240`) (`ENR:215-246`):
  - none: «Generar con IA» (primario, Sparkles/spinner).
  - disabled: «Activar de nuevo» (outline) → toast «Metadatos activados» / «El agente usa de nuevo la descripción generada.».
  - pending/ready/edited/failed: «Regenerar» (o «Intentar de nuevo» en failed), outline, icono RefreshCw/spinner, deshabilitado en pending; + ghost «Desactivar para este producto» (no en failed) → toast «Metadatos desactivados para este producto» / «El agente vuelve a usar la descripción de la ficha.» (`ENR:167-173`).
  - Regenerar no pide confirmación aunque reemplaza ediciones. Error «No se pudo pedir la generación» (`ENR:137`); error toggle «No se pudo cambiar el estado» (`ENR:175`).
- **Pending**: skeleton violeta en 2 columnas, `role=status` aria «Generando metadatos con IA»; polling 3 s / tope 30 s → «Está tardando más de lo normal. [Actualizar]» (`ENR:91-119,249-270`, `DOM:219-230`).
- **Failed**: aviso rojo «**El servicio de IA no pudo generar los metadatos.** Mientras tanto el agente usa la descripción de la ficha. Vuelve a intentarlo o espera al próximo cambio del producto.» (`ENR:272-281`). El `error` concreto del backend no se muestra.
- **Contenido** (si no pending, hay contenido y no disabled; se ve también en failed con contenido previo) (`ENR:283-424`):
  - «DESCRIPCIÓN QUE VE EL AGENTE» (overline) + contador «{n} / 160»; Textarea 3 filas maxLength 160, aria «Descripción generada, editable», readOnly sin permiso (`ENR:287-307`, `DOM:215`).
  - «CÓMO LO PIDEN TUS CLIENTES» + contador «{n} / 12»; chips (aria del contenedor «Términos de búsqueda»), cada uno con X aria «Quitar {término}» (con permiso); input «+ agregar» (aria «Agregar término») que añade con Enter, normaliza a minúsculas, recorta a 40, sin duplicados, máx 12; desaparece al llegar a 12 (`ENR:308-353`, `DOM:216-217,269-278`).
  - «ATRIBUTOS»: lista `dl` clave/valor; clave = `attribute_labels[key]` o la clave cruda; valor editable (Input maxLength 40, aria = etiqueta) o texto si sin permiso; vacía: «Sin atributos deducibles.» No se pueden añadir ni quitar claves; valores vacíos se descartan al guardar (`ENR:356-384,484-490`).
  - **Categoría sugerida** (si existe): icono FolderOpen «Categoría sugerida: **{nombre}** · ya se usa para buscar» + botón «Aplicar categoría» (spinner) → toast «Categoría aplicada», error «No se pudo aplicar la categoría»; en su lugar texto «La categoría la define tu tienda conectada» (si `locked_category`) o «Sin permiso para cambiar la categoría» (sin permiso o `category` bloqueada) (`ENR:387-407,181-194`). Aplicar recarga todo el producto (`DP:238`).
  - **Pie**: procedencia (`ENR:465-482`): «Editado el {fecha}» o «Generado con la foto principal y la ficha el {fecha}» / «Generado con la ficha, sin foto, el {fecha}» + « · {modelo}»; fecha es-CO «día mes-corto, hh:mm». Con cambios sin guardar (`dirty`) y permiso: «Descartar» (ghost, restaura) + «Guardar metadatos» (spinner) → toast «Metadatos guardados» / «El automático ya no los pisa.»; error «No se pudieron guardar los metadatos» (`ENR:143-159,409-422`).
- Mientras hay edición a medias, una recarga externa del producto no pisa lo editado (`ENR:75-80`).

---

### 6. Variantes

### 6.1 Tabla del detalle (`VT`)
- Section aria «Variantes y stock». h3 «Variantes y stock» (producto) / «Variantes» (servicio) + «({n})» (`VT:115-120`). Botón outline «Añadir variante» (icono Plus) con `canManage` && `variants` no bloqueado (`VT:121-126`, `DP:259`).
- Calendario de salidas (6.3) entre cabecera y tabla (`VT:130`).
- Tabla con scroll horizontal (`sidebar-scroll overflow-x-auto`, `VT:132`). Filas ordenadas por `position` (`VT:76`); inactivas al 60 % de opacidad (`VT:147`). Columnas:
  1. «SKU» — mono, estrella (aria «Variante por defecto») si es la por defecto (`VT:148-155`).
  2. «Nombre» — o «—» (`VT:156`).
  3. «Atributos» — solo si alguna variante tiene atributos; «{Eje}: {valor} · …»; fechas como «sáb 14 nov» (`VT:104-112,138,157-161`).
  4. «Precio» — resuelto (propio o heredado), moneda del producto (`VT:162-164`).
  5. «Estado» — badge «Activa» / «Inactiva» (`VT:165-169`).
  6. «Stock» (encabezado vacío en servicios) — servicio «—»; sin inventario «Sin inventario»; con inventario: punto verde/rojo + cantidad + «disponible» o «agotado (umbral {n})» (`VT:28-46,141,170-172`).
  7. «Acciones» (derecha; si `canManage || canAdjustStock`): ajustar stock (6.5, solo productos físicos con `catalog:stock` y stock no bloqueado), «Editar variante {sku}» (lápiz), «Eliminar variante {sku}» (papelera, rojo) (`VT:142,173-205`, `DP:262`).
- No hay paginación, orden por columna, ni selección múltiple. No se puede reordenar variantes.

### 6.2 Modal de variante (`VT:212-237`, `VF`)
- Título «Añadir variante» o «Editar variante {sku}»; descripción «La combinación de atributos debe ser única en el producto» (crear) / «Actualiza los datos de la variante» (editar); `sm:max-w-2xl`.
- Campos (grid 2 col) (`VF`):
  - «SKU» — mono, maxLength 64, placeholder «CAM-R-M»; errores inline «SKU requerido», «Máximo 64 caracteres» (`VF:86-95,130-141`).
  - «Nombre» — maxLength 120, placeholder «Salida del 14 de marzo (opcional)» si algún eje es fecha, si no «Roja · M (opcional)» (`VF:142-151`, `PT:77-85`).
  - «Precio» — PriceInput placeholder «Hereda el precio base»; help «Vacío = hereda el precio base del producto». Al editar arranca con el precio resuelto (no distingue heredado) (`VF:54-57,152-162`).
  - «Imagen (URL)» — url, placeholder «https://…/variante.jpg», help «La descargaremos y la serviremos desde axi para que siempre cargue rápido»; siempre empieza vacío (no muestra la actual) (`VF:60,163-175`).
  - Un campo por eje `scope=variant`: «{label}» + « ({unidad})», control por tipo (`AVI`) (`VF:177-194`).
  - Switches «Variante por defecto» (aria igual; default false) y «Activa» (aria «Variante activa»; default true) (`VF:50-51,197-206`).
  - Nota solo al crear en productos físicos: «El stock inicial es 0: ajústalo desde la tabla tras crear la variante.» (`VF:208-212`).
  - Botones «Cancelar» / «Crear variante» · «Guardar cambios» · «Guardando…» (`VF:214-221`).
- Toasts: «Variante creada» / «Variante actualizada»; errores «No se pudo crear la variante» / «No se pudo actualizar la variante» (`VF:114-120`). Backend: «Ya existe una variante con ese SKU», «Ya existe una variante con esa combinación de atributos», «Algún atributo tiene un valor inválido para su tipo» (`ERR:161-167`). Tras guardar se cierra y recarga el producto.
- Eliminar variante: modal «Eliminar variante», «¿Seguro que deseas eliminar la variante “{sku}”?», cuerpo «No puede eliminarse la última variante activa. Si era la variante por defecto, otra activa tomará su lugar.», acciones «Cancelar» / «Eliminar» («Eliminando...») (`VT:239-261`). Toasts «Variante eliminada» / «No se pudo eliminar la variante» (`VT:94-98`); backend «No puedes eliminar la última variante activa del producto» (`ERR:170`).

### 6.3 Calendario de salidas (`DEP`)
- Solo si alguna variante tiene `service_date` (`DEP:94-95`). Section aria «Calendario de salidas», tarjeta `rounded-3xl`.
- Encabezado «Calendario de salidas» + «{n} por salir · {m} ya salió/ya salieron» (`DEP:103-111`).
- Riel horizontal con scroll; nodo circular por salida ordenada por fecha: pasada = relleno tinta con check; futura = número de cupos libres (o «·» si no aplica); llena = gris (`DEP:113-147`). Debajo la fecha «sáb 14 nov» (días «dom…sáb», meses «ene…dic», `DEP:8-29`) y el estado: «ya salió», «por salir» (servicio), «sin inventario», «llena», «1 cupo», «{n} cupos» (`DEP:148-163`). Cupos = `on_hand` si disponible, 0 si agotada (`DEP:68-73`). «Hoy» se calcula en día local.

### 6.4 Editor de filas al crear (`VRE`)
- Vacío: caja discontinua «Añade la primera variante (será la variante por defecto).» (`VRE:81-85`).
- Cada fila en tarjeta: rótulo «Variante por defecto» (con estrella, fila 1) o «Variante {n}»; botón papelera aria «Eliminar variante {sku o n}» (`VRE:92-107`).
- Campos (grid 1/2/4 col): «SKU» (placeholder «CAM-R-M», mono, max 64, error inline), «Nombre» (placeholder según ejes, max 120), «Precio» (placeholder «Hereda el precio base»), «Stock inicial» (solo productos; number ≥0 step 1, placeholder «0»), y un campo por eje (placeholder = unidad si number, si no el label del eje; label + « ({unidad})») (`VRE:109-177`).
- Botón outline «Añadir variante» (Plus) al final (`VRE:184-187`). No hay switches activo/por defecto: la primera fila es la por defecto.

### 6.5 Ajuste de stock (`STK`, permiso `catalog:stock`)
- Botón icono PackagePlus aria «Ajustar stock de {sku}» → popover (w-72) (`STK:72-78`).
- Título «Ajustar stock — {sku}»; conmutador aria «Tipo de ajuste»: «Fijar» / «Sumar / restar» (aria-pressed) (`STK:79-96`).
- «Cantidad»: placeholder «128» (fijar) / «-5 resta, 5 suma» (sumar) (`STK:98-109`).
- «Umbral de agotado»: ≥0, placeholder «0», precargado con el umbral actual; help «Disponible cuando el stock supera el umbral» (`STK:111-124`).
- Botón «Aplicar» / «Aplicando…» (`STK:126-128`).
- Validación (toasts): «Indica una cantidad entera», «Al fijar, la cantidad debe ser ≥ 0», «El umbral debe ser un entero ≥ 0» (`STK:39-51`). Éxito «Stock actualizado» (parchea la fila sin recargar, `DP:141-160`); error «No se pudo ajustar el stock» (`STK:61-65`). Backend: «Los servicios no manejan inventario» (`ERR:169`).

---

### 7. Guardar / cancelar / eliminar, permisos y diálogos

### 7.1 Permisos
- `catalog:manage` → `canManage`; `catalog:stock` → `canAdjustStock` (`DP:41-42`).
- Bloqueos por `locked_fields` (servidos por backend; producto espejado) (`DP:104-109`):
  - `status` → oculta Activar/Desactivar/Eliminar (`DP:205`).
  - `name` o `price` → toda la sección Información pasa a solo lectura (incluida la categoría efectiva) (`DP:217`).
  - `images` → Fotos solo lectura (`DP:226`).
  - `category` → solo afecta «Aplicar categoría» del enriquecimiento (`DP:237`).
  - `variants` → oculta añadir/editar/eliminar variante (`DP:259`).
  - `stock` → oculta ajuste de stock (`DP:262`).
  - `description` existe en el enum (`src/core/api/schema.d.ts:11234`) pero **la UI no lo consulta**.
  - Atributos: bloqueados si hay cualquier gobierno (`governed`), no por campo (`DP:247`).
  - Enriquecimiento: editable aun en espejados (`DP:232-236`).

### 7.2 Crear
- Botones del pie: «Cancelar» (outline, `window.history.back()`, sin confirmación) y «Crear producto» / «Creando…» (deshabilitado mientras envía) (`PF:476-483`).
- Éxito: **sin toast**; redirige (`router.replace`) al detalle, con `?pending_attributes=1` si el tipo tiene atributos de producto requeridos (`CP:37-40`, `PF:97-100`).
- Error: validación de servidor en campos, o toast «No se pudo crear el producto» (`PF:101-104`). Backend mapeado p.ej. «Un servicio requiere duración en minutos», «Ya existe una variante con ese SKU» (`ERR:161,168`).

### 7.3 Detalle
- Información: «Guardar cambios» / «Guardando…», deshabilitado si no hay cambios (`isDirty`) (`BASE:74,98-99`). Éxito «Producto actualizado correctamente»; error «No se pudo actualizar el producto» (`BASE:81-85`). Tras cualquier recarga del producto se resetea el form (`BASE:68-71`) → se pierden cambios sin guardar de Información si otra sección provoca recarga.
- Activar/desactivar: toasts «Producto activado» / «Producto desactivado»; error «No se pudo cambiar el estado» (`DP:117-122`). Sin confirmación.
- Eliminar producto: modal «Eliminar producto», «¿Seguro que deseas eliminar “{nombre}”?», cuerpo «El producto dejará de aparecer en el catálogo y para la IA.», acciones «Cancelar» (id `product-detail-delete-cancel`) / «Eliminar» («Eliminando...» con tres puntos ASCII) destructive (`DP:271-293`). Éxito: sin toast, `router.replace("/catalog/products")`; error «No se pudo eliminar el producto» (`DP:128-138`). Es soft-delete (`SVC:36-39`).
- Modal compartido: `asClose:false` mantiene el modal abierto al pulsar (`src/shared/components/ui/modal.tsx:40-50,123`).
- **Estado sucio**: no hay dock de cambios sin guardar, ni `beforeunload`, ni aviso al navegar en ninguna de las dos pantallas (búsqueda sin resultados en `modules/catalog` y rutas). Cada sección tiene su propio «dirty»: Información (`isDirty`), Enriquecimiento (`dirty` con «Descartar»/«Guardar metadatos»), Atributos (sin dirty: el botón siempre activo).
- Todos los toasts van por `useAlert().showAlert({tone, title, description?})` (`CP:15`, `DP:52`).

---

### 8. Estados

- **Carga de ruta** (`CL:3-5`, `DL:3-5`): `FormSkeleton fields=8` con cabecera (título+subtítulo simulados), grid 2 col, fila de 2 botones; `role=status`, aria «Cargando formulario», sr-only «Cargando formulario…» (`src/shared/components/features/loading/FormSkeleton.tsx:16-50`).
- **Carga en detalle** (cliente, producto aún null): `FormSkeleton fields=8 showHeader=false` bajo el enlace «Productos» (`DP:179-180`).
- **Error de carga / no encontrado**: tarjeta centrada con el mensaje y botón outline redondo «Reintentar» (`DP:172-178`). Mensaje: el del backend o «No se pudo cargar el producto»; un 404 `catalog/product_not_found` se lee «El producto ya no existe» (`ERR:157`). No hay estado «no encontrado» diferenciado ni enlace de vuelta distinto.
- **Tipo de producto que no carga**: se oculta Atributos en silencio (`DP:79-80`).
- **Sin `catalog:manage`** (solo lectura):
  - Cabecera: sin Activar/Desactivar/Eliminar.
  - Información: inputs **deshabilitados** (fieldset disabled), no ocultos; sin «Guardar cambios». La categoría efectiva se ve sin Confirmar ni select, pero el help «Confirmar la fija como tuya…» sigue visible.
  - Fotos: sin subir/borrar/reordenar/reintentar; «Ver original» sí; vacío «Este producto aún no tiene fotos.»; banner educativo sí.
  - Enriquecimiento: sin botones; descripción readOnly; chips sin X y sin «+ agregar»; atributos como texto; categoría sugerida con «Sin permiso para cambiar la categoría».
  - Atributos: inputs deshabilitados, sin guardar.
  - Variantes: sin añadir/editar/eliminar; columna Acciones solo si tiene `catalog:stock`.
- **Crear sin permiso**: la página renderiza igual (no hay guarda); falla al enviar.
- **Crear sin catálogos**: el select queda vacío, sin mensaje ni enlace para crear uno (`PF:217-223`).
- Pending de fotos/enriquecimiento: ver §4 y §5.

---

### 9. Datos del DTO disponibles pero NO mostrados

`ProductDto` (`src/core/api/schema.d.ts:11202-11318`):
- `id` (solo en URL), `created_at`, `updated_at` del producto — no se muestran fechas de alta/edición.
- `metadata` (objeto libre) — ni se ve ni se edita.
- `governed_by_connection_id` — solo se usa como booleano para el banner; no se dice qué conexión.
- `locked_fields` — no se muestra qué campos están bloqueados (se ocultan/deshabilitan en bloque); `description` no se aplica.
- `category_id` vs `effective_category`: la cabecera usa `category_id`; Información usa la efectiva. `effective_category.confidence/source` sí se muestran; `category_id` propio no se distingue en Información.
- `attribute_values[].label/type` del producto — la UI usa la definición del tipo; valores de atributos que ya no estén en el tipo no se ven.
- `image_count` — no se usa (se cuenta el array).
- Variantes: `position` (solo ordena; no editable), `service_date` solo en el calendario (no hay columna ni campo editable propio; se edita vía eje de tipo `date`), `stock.out_of_stock_threshold` solo visible cuando está agotada o dentro del popover. Precio propio vs heredado no se distingue.
- Imágenes (`ProductImageDto`, `:11416-11436`): `alt_text` (solo como alt, no editable), `source` (upload/url_import), `source_url` (solo para reintentar), `mime_type`, `size_bytes`, `width`, `height`, `created_at`, `error` (solo tooltip en fallidas). No se indica cuál es la principal.
- Enriquecimiento (`:11288-11317`): `vertical_code`, `error` (el motivo concreto del fallo), `skipped_reason`, `updated_at`, `suggested_category.id`; `source` solo influye en textos.
- Tipo de producto (`ProductTypeDto`, `:11029-11052`): `description` del tipo no se muestra; atributos de ámbito variante solo como ejes.
- Capacidades del contrato sin UI: `UpsertVariantDto.position` (reordenar variantes), `UpdateProductDto.kind` / `category_id` / `metadata` (el PATCH los admite; la UI no), `CreateProductDto.metadata`, `alt_text` al subir foto.

### Componente fuera de alcance real
- `AliasesInput` **no se usa en la ficha de producto**: solo en el formulario de categoría (`src/modules/catalog/ui/forms/config/category.config.tsx:14,93`). Copy por si se reutiliza: placeholder «jean, denim, baggy…» / «+ agregar», aria «Agregar sinónimo», «Quitar {alias}», contador «{n} de 40», 60 caracteres máx., Enter/coma agregan, Retroceso quita el último (`components/AliasesInput.tsx:9-86`).

---

## C. Categorías, Tipos de producto y Catálogos

Solo lectura, levantado el 2026-09-27 sobre `/home/davela/dev/axi/axi-client`. Las rutas de archivo son relativas a `src/`. Abreviaturas:
- `CAT` = `app/(private)/(content)/catalog`
- `MC` = `modules/catalog`

---

### 0. Carcasa común (layout de la sección, aplica a las 3 pantallas)

- **Layout** `CAT/layout.tsx:9-23`: envuelve todo en `CatalogProvider`.
  - H1 «Catálogo» (`:14`).
  - Subtítulo «Administra tus productos, categorías, tipos de producto y catálogos.» (`:16`).
- **Sub-navegación** `MC/ui/components/CatalogNav.tsx:11-19`, con `NavTabs` y `label="Secciones del catálogo"` (aria):
  - «Productos» → `/catalog/products` (icono Package)
  - «Categorías» → `/catalog/categories` (icono FolderTree)
  - «Tipos de producto» → `/catalog/product-types` (icono Shapes)
  - «Catálogos» → `/catalog/catalogs` (icono BookOpen)
  - `NavTabItem` admite `count` (`shared/components/layout/nav-tabs.tsx:38`), pero CatalogNav **no lo usa**: ninguna pestaña muestra conteo.
- **Redirección** `/catalog` → `/catalog/products` (`core/config/routes.ts:78`).
- **Migas** (`shared/components/layout/private-header.tsx`):
  - Tienen etiqueta propia: «Catálogo» (`:46`), «Tipos de producto» (`:48`), y «Tipo de producto» como detalle de un id bajo `/catalog/product-types` (`:67`).
  - **Sin etiqueta propia**: `categories`, `catalogs` y `create` caen al slug crudo (`:98`, `?? seg`). La miga muestra literalmente «categories», «catalogs» o «create». Es deuda existente, no una función que haya que conservar.
- **Caché de referencia** `MC/infrastructure/stores/catalog.context.tsx:30-87`:
  - Al montar carga en paralelo catálogos, árbol de categorías y tipos (`:66-70`).
  - Mensajes de error (`:42, :52, :62`):
    - «No se pudieron cargar los catálogos»
    - «No se pudieron cargar las categorías»
    - «No se pudieron cargar los tipos de producto»
  - Estos errores se guardan en `error`, pero **ninguna de las 3 pantallas lo lee ni lo pinta**.
- **Permiso**: todas las acciones de escritura dependen de `hasPermission("catalog:manage")`. No hay ninguna guarda de lectura explícita en estas páginas: quien entra, ve.
- **Modal compartido** (`shared/components/ui/modal.tsx`, sobre `ui/dialog.tsx`): el botón X de cierre existe por defecto y su texto sr-only es «Close», en inglés (`ui/dialog.tsx:209`).

---

### 1. CATEGORÍAS — `/catalog/categories`

### 1.1 Ruta, título, descripción
- Archivo `CAT/categories/page.tsx`; loading `CAT/categories/loading.tsx`.
- H2 «Categorías» (`page.tsx:218`).
- Descripción (`:220-222`): «La plataforma trae la base de tu tipo de negocio y la mantiene al día; tú renombras, ocultas o agregas las tuyas. Árbol de hasta 6 niveles.»

### 1.2 Presentación
- **Árbol** (`TreeView`, `:262-321`) dentro de una tarjeta `rounded-2xl border` (`:238`).
- **Título del árbol** «Árbol de categorías» (`:266`); lo pinta TreeView como h3 (`shared/components/features/tree-view/TreeView.tsx:319`).
- **Cabecera del árbol** (`:267-287`):
  - Botón «Expandir todo» (`:271`).
  - Botón «Contraer todo» (`:274`).
  - Leyenda a la derecha:
    - icono Sparkles violeta + «Plataforma» (`:277`)
    - icono Tag + «Propia» (`:280`)
    - icono EyeOff ámbar + «Oculta» (`:283`)
- **Buscador** (`:252-261`):
  - Input con placeholder «Buscar categoría…» y `aria-label="Buscar categoría"`, con icono Search.
  - Filtra en cliente por `label` (`tree-view/hooks/use-tree-state.ts:94-96`).
  - **Solo filtra los nodos VISIBLES**, es decir, los expandidos: una subcategoría dentro de un padre contraído no aparece al buscar. Es un comportamiento actual a decidir si se conserva.
- **Fila del nodo**:
  - **Icono de origen/estado** al inicio (`getIcon`, `:291-305`):
    - `!is_active` → EyeOff ámbar, `aria-label="Oculta"` (`:294`).
    - `origin === "platform"` → Sparkles violeta, `aria-label` = «De la plataforma» (`:297-302`).
    - Resto → Tag con `aria-label` = `CATEGORY_ORIGIN_LABELS[origin]`, que vale «Propia» (tenant) o «De la tienda conectada» (integration) (`:304`).
    - Etiquetas en `MC/domain/category.ts:33-37`.
    - **Nota**: las categorías de integración usan el mismo icono Tag que las propias. La diferencia solo está en el aria-label; la leyenda no la menciona.
  - **Nombre** (`renderLabel`, `:306-319`): si la categoría está inactiva, en `text-muted-foreground`.
  - **Sinónimos** al lado del nombre: solo en md+, en mono xs, los primeros 4 unidos con « · » y luego « · +N» si hay más (`:311-316`).
  - **Sangría y chevron**:
    - Guías verticales de 16 px por nivel (TreeView `:14-22`).
    - Botón chevron con `aria-label` «Toggle», o «Empty» si no tiene hijos, en inglés (`TreeView.tsx:93`).
    - Rol `treeitem` con `aria-level` y `aria-expanded`; contenedor `role="tree"` con `aria-label="Tree"`, en inglés (`:326`).
    - Región aria-live (`:354`) que anuncia «{label} expandido» o «{label} colapsado» (`:205`).
  - **Teclado** (`TreeView.tsx:83-89`): Enter/Espacio seleccionan (sin efecto aquí, no hay `onSelect`); →/← alternan; ↑/↓ mueven el foco.
  - **Menú de acciones por fila**:
    - Sale al pasar el ratón; opacity-0 hasta hover (`TreeView.tsx:138`).
    - Todos los nodos se marcan `isLeaf: true` para que el menú aparezca también en padres (`page.tsx:88-91`).
- **Conteos**: no hay. TreeView soporta `showCounts` con `meta.count` (`TreeView.tsx:132`), pero no se pasa y el DTO no trae conteo de productos ni de hijos.
- **Orden**: el que devuelve el backend (por `position`). No se ordena en cliente.

### 1.3 Acciones, permisos, diálogos, toasts

**De página (solo con `catalog:manage`, `:224-235`)**
- **«Actualizar taxonomía»** (outline, icono RefreshCw que gira mientras siembra, deshabilitado mientras `seeding`) (`:226-229`).
  - Llama a `POST /catalog/categories/platform-taxonomy` (`MC/infrastructure/services/category-service.adapter.ts:37-39`).
  - Toast de éxito (`:126-133`):
    - Si no tocó nada: «La taxonomía ya estaba al día».
    - Si tocó algo: título «Taxonomía actualizada» y descripción `{created} nuevas · {adopted} adoptadas por nombre · {updated} con sinónimos nuevos`.
  - Toast de error: `errorMessage(err, "No se pudo actualizar la taxonomía")` (`:136`).
  - Después refresca el árbol.
- **«Nueva categoría»** (primario, icono Plus) (`:230-233`): abre el modal de alta con padre raíz y posición 0.

**Por fila (menú, solo con `catalog:manage`, `:163-209`)**
- Trigger: botón ghost con MoreVertical y sr-only «Acciones de {nombre}» (`:172`).
- Encabezado del menú «Acciones» (`:177`) + separador.
- «Crear subcategoría» (Plus) (`:180-183`): solo si `depth + 1 < 6` (`MAX_CATEGORY_DEPTH`, `:167`). Abre el alta con ese padre.
- «Editar» (Pencil) (`:185-188`).
- Borrado, que cambia según el origen:
  - Si tiene `taxonomy_code` (`isTaxonomyCategory`, `domain/category.ts:44-46`): «Ocultar» (EyeOff) (`:190-196`).
  - Si no: «Eliminar» (Trash, en rojo) (`:198-204`).

**Diálogo Ocultar/Eliminar (`:327-353`)**
- Título: «Ocultar categoría» o «Eliminar categoría» (`:331`).
- Descripción (`:332-334`):
  - Ocultar: «“{nombre}” dejará de ofrecerse y de usarse para clasificar. Puedes mostrarla de nuevo desde Editar.»
  - Eliminar: «¿Seguro que deseas eliminar “{nombre}”?»
- Cuerpo (`:349-351`):
  - Ocultar: «Es una categoría de la taxonomía de tu tipo de negocio: no se borra, se oculta, para que la próxima actualización no la vuelva a crear.»
  - Eliminar: «Solo puede eliminarse si no tiene subcategorías ni productos asociados.»
- Botones:
  - «Cancelar» (outline, id `category-delete-cancel`).
  - Confirmar, id `category-delete-confirm`, no cierra solo (`:336-343`): etiqueta «Guardando…» mientras borra (también al eliminar), si no «Ocultar» (variante default) o «Eliminar» (destructive).
- Ancho `sm:max-w-md`.
- Toast de éxito (`:147-153`):
  - Ocultar: título «Categoría oculta», descripción «El agente ya no la ofrece y sus productos vuelven a la clasificación automática.»
  - Eliminar: «Categoría eliminada correctamente».
- Toast de error: `errorMessage(err, "No se pudo eliminar la categoría")` (`:157`).
  - Código conocido: `catalog/category_in_use` → «La categoría tiene subcategorías o productos asociados» (`core/lib/error-messages.ts:163`).
- Ambos casos llaman a `DELETE /catalog/categories/:id`; el backend decide si oculta o borra (`category-service.adapter.ts:28-34`).

**Modal Crear/Editar categoría (`:355-385`, formulario `MC/ui/forms/CategoryForm.tsx`, config `MC/ui/forms/config/category.config.tsx`)**
- Título: «Editar categoría» o «Nueva categoría» (`page.tsx:359`).
- Descripción: «Actualiza la información de la categoría» (editar) o «Crea una categoría para clasificar tus productos» (alta) (`:360-362`).
- Botones:
  - «Cancelar» (id `category-cancel`).
  - «Guardar cambios» (editar) o «Guardar» (alta), id `category-save`; hace `requestSubmit()` del `#category-form` (`:363-373`).
- El DynamicForm va sin `actions` propias, así que no pinta botón interno (`shared/components/features/dynamic-form/dynamic-form.tsx:113`).
- Rejilla de 1 columna en sm y 2 en md (`CategoryForm.tsx:60`).
- Campos, en este orden:
  1. **«Nombre»** — placeholder «Camisetas», autofocus, maxLength 120 (`category.config.tsx:49-53`). Validación: «Nombre requerido», «Máximo 120 caracteres» (`:20`).
  2. **«Categoría padre»** — Select `id=df-parent_id`, placeholder «Categoría raíz» (`:54-76`).
     - Primera opción: «Sin padre (raíz)» (sentinel `__root__`).
     - Después, todas las categorías aplanadas con prefijo «— » repetido por cada nivel de profundidad (`:67-71`).
     - Al editar se excluye el subárbol del propio nodo (`page.tsx:75-83`).
     - Se incluyen también las categorías inactivas, sin marcarlas.
     - No hay validación en cliente de la profundidad máxima al mover. Si se pasa, el backend responde `catalog/category_too_deep` → «Alcanzaste la profundidad máxima de categorías (6 niveles)» (`error-messages.ts:166`). Un ciclo da `catalog/category_cycle` → «Una categoría no puede ser descendiente de sí misma» (`:165`).
  3. **«Descripción»** — textarea que ocupa 2 columnas en md, placeholder «Qué agrupa esta categoría (opcional)», maxLength 500 (`:77-83`). Validación: «Máximo 500 caracteres» (`:22`).
  4. **«Posición»** — number, min 0, step 1, ayuda «Orden entre hermanas (menor = primero)» (`:84-89`). Validación: «Debe ser un entero», «Debe ser ≥ 0» (`:23`).
     - Es la **única** forma de reordenar; no hay arrastrar ni flechas.
  5. **«Sinónimos»** — `AliasesInput`, `id=df-search_aliases`, 2 columnas; ayuda «Cómo la piden tus clientes por WhatsApp: «jean», «denim», «baggy». Sin tildes obligatorias.» (`:90-105`).
     - Componente `MC/ui/components/AliasesInput.tsx`:
       - Chips (Badge secondary) con botón X, `aria-label="Quitar {alias}"` (`:60`).
       - Input con placeholder «jean, denim, baggy…» si no hay ninguno, «+ agregar» si ya hay alguno, y `aria-label="Agregar sinónimo"` (`:76-77`).
       - Contador «{n} de 40» (`:82-84`).
       - Enter o coma agregan; al salir del campo (blur) también agrega; Retroceso con el campo vacío quita el último (`:42-49, :75`).
       - Normaliza a minúsculas, recorta a 60 caracteres, descarta duplicados en silencio y no deja pasar de 40 sin avisar (`:30-40`).
     - Validación del esquema: array de ≤40, cada uno de 1 a 60 caracteres (`category.config.tsx:26`). No tiene mensajes propios.
  6. **«Estado»** — solo al editar. Select `id=df-is_active`, placeholder «Estado», opciones «Activa» / «Inactiva» (`:108-129`).
     - Es la vía para mostrar de nuevo una categoría oculta.
     - Nota de copy: en el árbol se dice «Oculta» y en el formulario «Inactiva».
- Toasts de éxito (`CategoryForm.tsx:38, :41`): «Categoría actualizada correctamente» y «Categoría creada correctamente».
- Toast de error (`:49`): `errorMessage(err, …)` con fallback «No se pudo actualizar la categoría» o «No se pudo crear la categoría».
  - Los errores de validación del servidor se pintan en el campo que corresponde, vía `applyServerValidation` (`:46`).
- Al guardar: refresca el árbol y cierra el modal (`:43-44`).
- Payload (`category.config.tsx:135-157`):
  - Alta: omite los campos vacíos.
  - Edición: envía `parent_id: null` para raíz y `description: null` si está vacía.

### 1.4 Estados
- **Carga de ruta**: `TableSkeleton rows={8}` (`categories/loading.tsx:4`). Copia sr-only «Cargando listado…» y `aria-label="Cargando listado"` (`shared/components/features/loading/TableSkeleton.tsx:23, :62`).
  - Es un esqueleto de tabla, no de árbol.
- **Carga de datos**: no hay estado propio.
  - El árbol llega del provider. Mientras `categoryTree` está vacío, la página enseña el **estado vacío** (hay un parpadeo de «Aún no tienes categorías.» en la primera carga) (`page.tsx:212, :239`).
- **Vacío** (`:240-249`):
  - GlassGlyph `catalog`.
  - «Aún no tienes categorías.»
  - Con permiso, botón outline «Crear la primera» (Plus).
- **Error de carga**: no se muestra. El provider guarda el error y la página no lo lee: si falla, se ve el estado vacío.
- **Búsqueda sin coincidencias**: no hay mensaje; el árbol se queda en blanco bajo la cabecera.

### 1.5 Datos del DTO disponibles pero NO mostrados
DTO `CategoryListDto__schema0` (`core/api/schema.d.ts:10929-10947`):
- `description`: solo aparece dentro del formulario de edición; ni en el árbol ni en un tooltip.
- `position`: solo en el formulario.
- `taxonomy_code`: solo decide si la acción es «Ocultar» o «Eliminar»; el código no se muestra.
- `origin = "integration"`: se ve como «Propia» (icono Tag), sin distinción visual. Solo cambia su aria-label.
- `created_at` / `updated_at`: no se muestran.
- `search_aliases`: se ven como máximo 4 y solo en md+; en móvil no se ve ninguno.
- No existe dato de «nº de productos por categoría» ni «nº de hijas». El diálogo de eliminar avisa de la restricción, pero no dice cuántos hay.
- `PlatformTaxonomyResultDto` (`schema.d.ts:10922-10928`): `vertical` y `version` no se muestran; solo se usan created, adopted y updated.

---

### 2. TIPOS DE PRODUCTO — `/catalog/product-types`, `/create`, `/[id]`

### 2.1 Ruta, título, descripción
- **Listado** `CAT/product-types/page.tsx`:
  - H2 «Tipos de producto» (`:71`).
  - Descripción «Define atributos tipados por familia (material, talla, color…).» (`:73`).
- **Crear** `CAT/product-types/create/page.tsx`:
  - Enlace de volver (ArrowLeft) «Tipos de producto» → `/catalog/product-types` (`:22-28`).
  - H2 «Nuevo tipo de producto» (`:29`).
  - Descripción «Primero el nombre; después podrás definir sus atributos.» (`:31`).
  - El POST no acepta atributos: al crear hace `router.replace` al detalle (`:38-41`).
- **Detalle** `CAT/product-types/[id]/page.tsx`:
  - Mismo enlace de volver «Tipos de producto» (`:44-50`).
  - H2 con `{productType.name}`, o «Tipo de producto» mientras carga (`:51-53`).
  - Sin descripción.
  - Miga del id: «Tipo de producto» (`private-header.tsx:67`).

### 2.2 Presentación (listado)
- `DataTable` con `pagination={{ pageSize: 10 }}` dentro de una tarjeta `rounded-2xl` (`page.tsx:103`).
- Columnas (`MC/ui/tables/config/product-type.config.tsx:10-54`):
  1. «Nombre» — `sortable`, `alwaysVisible`, minWidth 180 (`:11`).
  2. «Descripción» — line-clamp-1 en gris; «—» si está vacía (`:12-19`).
  3. «Atributos» — Badge secondary con `attribute_count`, `sortable` (`:20-30`).
  4. «Ejes de variante» — número en gris: cantidad de atributos con `scope === "variant"` (`:31-38`).
  5. «Creado» — `formatShortDate(created_at)`, `sortable` (`:39-47`).
  6. Acciones — sin cabecera, `alwaysVisible` (`:48-53`).
- **Comportamiento real del DataTable** (a conservar o corregir a propósito):
  - **Ordenar no funciona**: las columnas marcadas `sortable` pintan la cabecera como texto plano, porque la página no pasa `onSortChange` (`shared/components/features/data-table/components/TableView.tsx:45`).
  - **No hay buscador**: sin `onSearchChange`, el modo es `"none"` (`data-table/index.tsx:235-236`).
  - **No hay controles de paginación**: el paginador solo se pinta con `onPageChange` (`index.tsx:541`). Con más de 10 tipos, **los que pasan del 10 no son alcanzables**.
  - Sí se pinta el pie «Página {p} de {tp} — {n} registros» (`index.tsx:206, :539`).
- Fila vacía del DataTable: «Sin resultados» (`index.tsx:207`; `TableView.tsx:70-71`).

### 2.3 Acciones, permisos, diálogos, toasts

**Listado**
- **«Nuevo tipo»** (Link a `/create`, Plus, redondo), solo con `catalog:manage` (`page.tsx:76-83`).
- **Por fila** (`MC/ui/tables/product-type.actions.tsx`): no se pinta nada sin `catalog:manage` (`:32`).
  - Trigger: MoreHorizontal con sr-only «Abrir menú de acciones» (`:59`).
  - Encabezado del menú «Acciones» (`:64`).
  - «Editar» (Pencil) → navega a `/catalog/product-types/{id}` (`:66-72`). No hay clic en la fila ni enlace en el nombre.
  - «Eliminar» (Trash, en rojo) (`:73-76`).
- **Confirmación de eliminar** (`:80-102`):
  - Título «Eliminar tipo de producto».
  - Descripción «¿Seguro que deseas eliminar “{nombre}”?».
  - Cuerpo «Solo puede eliminarse si ningún producto lo usa. Sus atributos se borran con él.»
  - Botones:
    - «Cancelar» (id `product-type-delete-cancel`).
    - «Eliminando...» mientras borra (tres puntos ASCII, a diferencia del «…» de otras pantallas) o «Eliminar» (destructive, id `product-type-delete-confirm`).
  - Ancho `sm:max-w-md`.
- **Toasts del listado** (vía CustomEvents, `page.tsx:47-63`):
  - Éxito: «Tipo de producto eliminado».
  - Error: el `detail.message` del evento, o «No se pudo completar la acción».
  - El mensaje de error nace en `errorMessage(err, "No se pudo eliminar el tipo de producto")` (`product-type.actions.tsx:46`).
  - Código conocido: `catalog/product_type_in_use` → «El tipo de producto está en uso por productos» (`error-messages.ts:164`).
- **Error de carga del listado**: toast «No se pudieron cargar los tipos de producto» (`page.tsx:37`).

**Formulario base (crear y detalle)** — `MC/ui/forms/ProductTypeForm.tsx`, config `MC/ui/forms/config/product-type.config.tsx`
- Va en una tarjeta `max-w-2xl rounded-2xl`, con rejilla de 1 columna en sm y 2 en md.
- Campos:
  1. **«Nombre»** — placeholder «Ropa», ayuda «Único por empresa (p. ej. Ropa, Calzado, Servicios de spa)», autofocus, maxLength 120 (`:22-27`). Validación: «Nombre requerido», «Máximo 120 caracteres» (`:9`).
  2. **«Descripción»** — textarea, placeholder «Qué clase de productos usa este tipo (opcional)», maxLength 500 (`:28-33`). Validación: «Máximo 500 caracteres» (`:10`).
- Botón interno de envío: «Crear tipo» (alta) o «Guardar tipo» (edición) (`ProductTypeForm.tsx:70`). Queda deshabilitado mientras envía o si el formulario es inválido (`dynamic-form.tsx:126`).
- Toasts:
  - Éxito: «Tipo de producto creado» o «Tipo de producto actualizado» (`:47-50`).
  - Error: `errorMessage(err, …)` con fallback «No se pudo crear el tipo» o «No se pudo actualizar el tipo» (`:54-57`); los errores del servidor van al campo.
- **Permiso**: el formulario base del **detalle no está protegido** con `catalog:manage`. Se pinta y se puede enviar sin permiso; solo el editor de atributos recibe `readOnly={!canManage}` (`[id]/page.tsx:65-87`). La ruta `/create` tampoco comprueba el permiso (solo se oculta el botón que lleva a ella).
- Al guardar en el detalle, se actualiza el título H2 y se refresca la caché.

### 2.4 Editor del attribute set (detalle) — `MC/ui/components/AttributeSetEditor.tsx`

**Contenedor y cabecera**
- `<section aria-label="Atributos del tipo de producto">` (`:171`).
- H3 «Atributos» + contador «({n}/50)» en gris tabular (`:174-179`). El máximo es `MAX_ATTRIBUTES_PER_TYPE = 50` (`MC/domain/product-type.ts:22`).
- Ayuda (`:180-182`): «Ámbito «Producto» describe la ficha; «Variante» define ejes de variación (color, talla…).»
- Botones de cabecera, ocultos si `readOnly` (`:184-199`):
  - «Añadir atributo» (outline, Plus): deshabilitado al llegar a 50. No hay mensaje que explique por qué.
  - «Guardar atributos»: dice «Guardando…» y se deshabilita mientras guarda.
- Estado local: nada se guarda hasta pulsar «Guardar atributos». No hay aviso de cambios sin guardar al salir de la página.

**Vacío** (`:202-205`)
- «Sin atributos. Añade el primero para tipar los productos de este tipo.»
- Caja con borde discontinuo.

**Cada atributo es una tarjeta `<li>`** (`:208-347`), con rejilla de 1, 2 (sm) o 4 (lg) columnas:
- **Reordenar**: flechas arriba y abajo (ghost, 6×6) (`:211-234`).
  - `aria-label`: «Subir {etiqueta|código|"atributo"}» y «Bajar {…}».
  - Deshabilitadas en los extremos o con `readOnly`.
  - No hay arrastrar.
  - La posición guardada es el índice en el array.
- **«Código»** (`:237-248`):
  - Input mono, `id=attr-code-{key}`, placeholder «material», maxLength 40.
  - Pasa a minúsculas mientras se escribe.
  - **Queda bloqueado (disabled) si el atributo ya existía** (`persisted`) o con `readOnly`.
- **«Etiqueta»** (`:249-259`): placeholder «Material», maxLength 120.
- **«Tipo»** (`:260-277`): Select con los 5 tipos (`SELECTABLE_ATTRIBUTE_TYPES`, `domain/product-type.ts:42-48`) y etiquetas de `ATTRIBUTE_TYPE_LABELS` (`:24-30`):
  - `text` → «Texto»
  - `number` → «Número»
  - `boolean` → «Sí / No»
  - `select` → «Selección»
  - `date` → «Fecha»
  - El tipo **sí** se puede cambiar en atributos que ya existen, sin aviso de lo que pasa con los valores guardados.
- **«Ámbito»** (`:278-295`): Select con «Producto» (`product`) y «Variante» (`variant`) (`ATTRIBUTE_SCOPE_LABELS`, `domain/product-type.ts:50-53`).
- **«Unidad»** — solo si el tipo es `number` (`:297-309`): placeholder «g, cm, ml…», maxLength 20.
  - Si se cambia a otro tipo, el valor se descarta al guardar (`:148` solo lo envía si tiene texto; para tipos no numéricos se sigue enviando si quedó escrito).
- **Checkbox «Requerido»** (`:311-320`): nativo, `accent-primary`.
- **«Opciones»** — solo si el tipo es `select`; ocupa el ancho completo (`:322-331`).
  - Usa `AttributeOptionsInput` (`MC/ui/components/AttributeOptionsInput.tsx:12-22`), que envuelve `OptionsInput` (`shared/components/features/options-input/OptionsInput.tsx`) con maxLength 120 por opción y sin tope de opciones.
  - Input con placeholder «Añadir opción…» y `aria-label="Nueva opción"` (`:25, :56-57`).
  - Botón «Añadir» (Plus), deshabilitado si el campo está vacío (`:67-76`).
  - Enter también agrega.
  - Deduplica sin distinguir mayúsculas, en silencio.
  - Chips redondos con X, `aria-label="Quitar opción {opción}"` (`:86`).
  - Las opciones no se pueden reordenar ni editar; solo quitar y volver a añadir.
  - La etiqueta «Opciones» no está asociada a un control (le falta `htmlFor`).
- **Eliminar atributo** (Trash2 rojo, oculto si `readOnly`) (`:334-345`):
  - `aria-label` «Eliminar {etiqueta|código|"atributo"}».
  - Lo quita del estado local sin confirmar en ese momento.

**Validación al guardar** (`:56-71`). Se muestra como toast de error; solo aparece el primer problema y no se marca el campo:
- «Todos los atributos necesitan un código»
- «El código “{code}” debe ir en minúsculas snake_case (a-z, 0-9, _)»
- «El código “{code}” está repetido»
- «El atributo “{code}” necesita una etiqueta»
- «El atributo “{label}” es de selección y necesita al menos una opción»

**Confirmación al quitar atributos que ya existían** (`:162-168, :352-374`):
- Título «Eliminar atributos existentes».
- Descripción «Se eliminarán: {códigos separados por coma}.»
- Cuerpo «Los valores que los productos tengan en esos atributos se borrarán de forma permanente.»
- Botones:
  - «Cancelar» (id `attrs-cancel`).
  - «Guardando…» o «Eliminar y guardar» (destructive, id `attrs-confirm`).
- Ancho `sm:max-w-md`.

**Toasts del editor**
- Éxito: «Atributos guardados correctamente» (`:152`).
- Error: `errorMessage(err, "No se pudieron guardar los atributos")` (`:155`).
  - Código relacionado: `catalog/attribute_invalid` → «Algún atributo tiene un valor inválido para su tipo» (`error-messages.ts:167`).

**Guardado**
- `PUT /catalog/product-types/:id/attributes` reemplaza el set completo (`product-type-service.adapter.ts:66-75`).
- Solo envía `options` si el tipo es `select`, y `unit` si tiene texto (`AttributeSetEditor.tsx:141-149`).

**Modo solo lectura** (`readOnly`, sin `catalog:manage`)
- Ve todos los campos deshabilitados, sin los botones de cabecera ni la papelera.
- Las flechas de orden siguen visibles, pero deshabilitadas.

### 2.5 Estados
- **Carga de ruta**:
  - Listado: `TableSkeleton rows={6}` (`product-types/loading.tsx:4`), con sr-only «Cargando listado…».
  - Crear: `FormSkeleton fields={2}` (`create/loading.tsx:4`), con sr-only «Cargando formulario…» y `aria-label="Cargando formulario"` (`FormSkeleton.tsx:20, :47`).
  - Detalle: `FormSkeleton fields={6}` (`[id]/loading.tsx:4`). Mientras llegan los datos se usa `FormSkeleton fields={4} showHeader={false}` (`[id]/page.tsx:60-61`).
- **Carga de datos del listado**: hasta que responde (`loaded`), el DataTable se pinta vacío con «Sin resultados», no un esqueleto (`page.tsx:65, :103`).
- **Vacío del listado** (`page.tsx:87-101`):
  - GlassGlyph `catalog`.
  - «Aún no tienes tipos de producto. Son opcionales, pero dan superpoderes a tus fichas.»
  - Con permiso, botón outline «Crear el primero» (Link a `/create`).
- **Error**:
  - Listado: toast «No se pudieron cargar los tipos de producto» (`:37`). Después queda el estado vacío, porque `loaded` se pone a true y no hay filas.
  - Detalle: caja centrada con `errorMessage(err, "No se pudo cargar el tipo de producto")` (`[id]/page.tsx:33, :56-59`). Un id inexistente da «El tipo de producto ya no existe» (`error-messages.ts:156`). No tiene botón de reintentar.
- **Vacío del attribute set**: ver §2.4.

### 2.6 Datos del DTO disponibles pero NO mostrados
`ProductTypeListDto` y `ProductTypeDto` (`schema.d.ts:11003-11053`):
- `updated_at`: no se muestra en ninguna vista.
- En el listado, `attributes[]` completo, del que solo se derivan 2 conteos: no se ven los nombres de los atributos, cuáles son requeridos, tipos, unidades ni opciones.
- Los atributos de ámbito `product` no tienen columna; solo sale el total.
- `attribute.id` y `attribute.position`: solo internos.
- No existe el dato «nº de productos que usan este tipo». El diálogo de eliminar avisa de la restricción sin decir cuántos.
- En el detalle no se muestran `created_at` ni `updated_at`.
- `description` solo sale en la tabla (1 línea) y en el formulario.

---

### 3. CATÁLOGOS — `/catalog/catalogs`

### 3.1 Ruta, título, descripción
- Archivo `CAT/catalogs/page.tsx`; loading `CAT/catalogs/loading.tsx`.
- H2 «Catálogos» (`page.tsx:85`).
- Descripción «Agrupa tus productos por catálogo (principal, temporadas, líneas).» (`:87`).
- El comentario del código promete «búsqueda/orden/paginación en cliente» (`:17-18`), pero **no hay ninguna de las tres** (ver 3.2).

### 3.2 Presentación
- `DataTable` con `pageSize 10` y `ref` (el ref no se usa) (`:105-110`), en una tarjeta `rounded-2xl`.
- Columnas (`MC/ui/tables/config/catalog.config.tsx:9-43`):
  1. «Nombre» — `sortable`, `alwaysVisible`, minWidth 180 (`:10`).
  2. «Código» — `<code>` mono xs sobre fondo `bg-muted`, `sortable` (`:11-19`).
  3. «Descripción» — line-clamp-1 en gris; «—» si está vacía (`:20-27`).
  4. «Creado» — `formatShortDate`, `sortable` (`:28-36`).
  5. Acciones — sin cabecera (`:37-42`).
- Mismas limitaciones del DataTable que en §2.2: el orden no funciona, no hay buscador ni paginador, pasado el 10.º no se llega, y el pie es «Página {p} de {tp} — {n} registros».
- Conteos y badges: ninguno. No hay nº de productos por catálogo.

### 3.3 Acciones, permisos, diálogos, toasts

**De página**
- **«Crear catálogo»** (Plus, redondo), solo con `catalog:manage` (`:90-101`): abre el modal vacío.

**Por fila** (`MC/ui/tables/catalog.actions.tsx`): no se pinta nada sin `catalog:manage` (`:30`).
- Trigger: MoreHorizontal con sr-only «Abrir menú de acciones» (`:55`).
- Encabezado del menú «Acciones» (`:60`).
- «Editar» (Pencil): emite `catalogs:edit:open` con los valores por defecto (`:62-81`) y la página abre el modal (`page.tsx:61-67`).
- «Eliminar» (Trash, en rojo) (`:82-85`).

**Confirmación de eliminar** (`:89-111`)
- Título «Eliminar catálogo».
- Descripción «¿Seguro que deseas eliminar “{nombre}”?».
- Cuerpo «Los productos del catálogo dejarán de estar disponibles para la IA y el equipo.»
- Botones:
  - «Cancelar» (id `catalog-delete-cancel`).
  - «Eliminando...» o «Eliminar» (destructive, id `catalog-delete-confirm`).
- Ancho `sm:max-w-md`.

**Toasts por eventos** (`page.tsx:52-77`)
- Éxito: «Catálogo eliminado correctamente».
- Error: `detail.message` o «No se pudo completar la acción». El origen es `errorMessage(err, "No se pudo eliminar el catálogo")` (`catalog.actions.tsx:42`).
- Error de carga: toast «No se pudieron cargar los catálogos» (`page.tsx:38`).

**Modal Crear/Editar** (`page.tsx:114-143`, formulario `MC/ui/forms/CatalogForm.tsx`, config `MC/ui/forms/config/catalog.config.tsx`)
- Título: «Editar catálogo» o «Crear catálogo».
- Descripción: «Actualiza la información del catálogo» (editar) o «Define un nuevo agrupador de productos» (alta).
- Botones:
  - «Cancelar» (id `catalog-cancel`).
  - «Guardar cambios» (editar) o «Guardar» (alta), id `catalog-save`; hace `requestSubmit()` de `#catalog-form`.
- Campos:
  1. **«Nombre»** — placeholder «Catálogo principal», autofocus, maxLength 120 (`catalog.config.tsx:33-37`). Validación: «Nombre requerido», «Máximo 120 caracteres» (`:13`).
  2. **«Código»** — mono, placeholder «principal», ayuda «Identificador único, en minúsculas (p. ej. temporada-2026)», maxLength 40 (`:38-43`).
     - Validación: «Código requerido», «Máximo 40 caracteres», «Solo minúsculas, números, guion y guion bajo» (regex `^[a-z0-9_-]+$`) (`:14-19`).
     - No pasa a minúsculas solo: si se escribe una mayúscula, sale el error.
     - Código duplicado: `catalog/duplicate_code` → «Ya existe un catálogo con ese código» (`error-messages.ts:160`).
     - El código **se puede cambiar al editar**, sin aviso.
  3. **«Descripción»** — textarea que ocupa 2 columnas en md, placeholder «Qué agrupa este catálogo (opcional)», maxLength 500 (`:44-50`). Validación: «Máximo 500 caracteres» (`:20`).
- Toasts (`CatalogForm.tsx:35, :38, :46`):
  - Éxito: «Catálogo actualizado correctamente» y «Catálogo creado correctamente».
  - Error: fallback «No se pudo actualizar el catálogo» o «No se pudo crear el catálogo»; los errores del servidor van al campo.
- Al guardar refresca la tabla local y la caché del provider (`page.tsx:47-50`), y cierra el modal.

### 3.4 Estados
- **Carga de ruta**: `TableSkeleton rows={6}` (`catalogs/loading.tsx:4`), con sr-only «Cargando listado…».
- **Carga de datos**: sin estado. La tabla muestra «Sin resultados» hasta que responde.
- **Vacío**: **no hay estado vacío propio**, ni glifo ni CTA; solo la fila «Sin resultados» del DataTable (`data-table/index.tsx:207`). Es distinto de Categorías y Tipos.
- **Error**: toast «No se pudieron cargar los catálogos» y luego «Sin resultados».

### 3.5 Datos del DTO disponibles pero NO mostrados
`CatalogListDto` y `CatalogDto` (`schema.d.ts:10888-10911`):
- `updated_at`: no se muestra.
- `id`: interno.
- No existe dato de nº de productos por catálogo ni de «catálogo por defecto/principal». Ni el DTO ni la UI marcan cuál es el principal.
- `getCatalogById` existe en el adaptador (`catalog-service.adapter.ts:94-96`), pero ninguna pantalla lo usa: no hay vista de detalle de catálogo.

---

### 4. Superficie pública consumida por otros módulos

Declarada en `MC/public.ts:15-40`. Es el único punto de entrada permitido para otros slices. No se encontró **ningún** import de `@/modules/catalog/...` fuera de `public` desde otros módulos: todos los consumidores externos pasan por `public`.

| Export | Consumidor | Uso |
|---|---|---|
| `VariantPicker`, `type VariantSelection` | `modules/marketing/ui/forms/config/promotion.config.tsx:8, :318-327` | Selector de variante en 2 pasos para la promoción «producto de regalo». |
| `listProducts` | `modules/scheduling/infrastructure/services/entity-names.cache.ts:2, :58` | `listProducts({ kind: "service", page_size: 100 })` para poner nombre al servicio de una cita. |
| `listProducts` | `modules/scheduling/ui/forms/AppointmentForm.tsx:9, :63` | `listProducts({ kind: "service", is_active: true, page_size: 100 })` para el selector de servicio de la cita. |
| `listCategoryTree`, `flattenCategoryTree`, `type CategoryTreeNodeDTO` | `modules/integrations/ui/components/detail/CollectionsTab.tsx:34-38, :86, :99-101` | Select de categoría DESTINO por colección de la tienda: aplana el árbol, filtra `is_active` y usa `{id, label, depth}`. Si falla la carga, usa un árbol vacío. |

Exports públicos **sin consumidor externo hoy**: `PRODUCT_KIND_LABELS`, `ProductDTO`, `ProductKind`, `ProductListItemDTO`, `ProductVariantDTO`, `ListProductsParams`, `variantLabel` y `getProductById`. Se usan dentro del propio catálogo, pero no desde fuera.

**Qué hay que respetar al rediseñar taxonomía y catálogos**
- `flattenCategoryTree(nodes)` debe seguir devolviendo `{id, label, depth, is_active}` en orden de pre-orden (`domain/category.ts:20-28`). Lo usan integraciones y también el select de padre y los filtros de producto.
- `listCategoryTree()` debe seguir devolviendo `{ data: CategoryTreeNodeDTO[] }` con `children` anidados (`category-service.adapter.ts:16-18`).
- Otras rutas fuera del módulo que apuntan a estas pantallas: solo las migas (`private-header.tsx:46-48, :67`) y el test de NavTabs (`shared/components/layout/__tests__/nav-tabs.test.tsx:13-14, :28`), que da por hechas las etiquetas «Categorías» y «Catálogos».

---

### 5. Resumen de huecos detectados (hoy; decidir si se conservan)

1. En Tipos y Catálogos, las columnas marcadas «sortable» no ordenan, no hay buscador y no hay paginador. Con más de 10 filas, las siguientes no se pueden ver.
2. Catálogos no tiene estado vacío propio.
3. Ninguna de las 3 pantallas enseña el error de carga del provider (Categorías cae al estado vacío). Tipos y Catálogos muestran «Sin resultados» mientras cargan.
4. El buscador del árbol de categorías no encuentra nodos dentro de padres contraídos.
5. En el detalle de tipo de producto, el formulario base y la ruta `/create` no comprueban `catalog:manage`.
6. Copy en inglés en los componentes compartidos: «Close», «Toggle», «Empty», «Tree». La miga muestra los slugs «categories», «catalogs» y «create».
7. Inconsistencias de copy:
   - «Oculta» (árbol) frente a «Inactiva» (formulario).
   - «Guardando…» al eliminar una categoría.
   - «Eliminando...» con tres puntos ASCII en Tipos y Catálogos.
8. En el árbol, las categorías de integración no se distinguen de las propias.

---

## D. Qué hace el rediseño con lo de hoy (canvas F0)

Canvas: `https://claude.ai/artifact/MNPgBLxo7STggSyHuivrjC` (copia en `docs/design/mockups/catalog-premium/` del
monorepo, medido con `audit.js`). Todo lo de A–C se conserva salvo lo marcado aquí.

### D.1 Huecos de hoy que se corrigen (no son funciones: son defectos)

| # | Hoy | En el rediseño | Tablero |
|---|---|---|---|
| 1 | El buscador de la tabla muestra un selector de campo que la página ignora | Un solo buscador (el mismo en tabla y tarjetas), con borrar | 1, 3 |
| 2 | El buscador de tarjetas solo busca con Enter y no se sincroniza con el de la tabla | Mismo buscador y mismo estado para las dos vistas | 1, 3 |
| 3 | Filtros, búsqueda y página no se guardan | Viven en la URL (`?q=&catalog_id=&…`): se comparten y sobreviven a volver | 1, 3 |
| 4 | El error tapa los filtros | Aviso en línea (`Alert` destructivo) con «Reintentar» y los filtros siguen a mano | 7 |
| 5 | «Sin resultados para esta búsqueda» aunque la causa sea un filtro | «Ningún producto con estos filtros» + chips de filtro activo + «Limpiar filtros» | 3, 7 |
| 6 | Sin indicador al cambiar de página/filtro con filas previas | Las filas viejas se atenúan (`aria-busy`) hasta que llega la respuesta | F2 |
| 7 | Paginación con aria-labels en inglés; «Close», «Toggle», «Empty», «Tree» en inglés; migas «categories», «catalogs», «create» | Todo en español (se corrige en los compartidos o en `private-header`) | todos |
| 8 | Tabla y tarjetas muestran datos distintos (stock solo en tabla; Shopify/duración solo en tarjetas) | Mismos datos en las dos: stock con su punto, etiqueta «Shopify», duración de servicios | 1, 3 |
| 9 | «Stock bajo» significa «alguna variante agotada» | Se dice literal: «1 variante agotada» | 1 |
| 10 | El estado vacío puede parpadear en el primer render | No se pinta vacío hasta que la primera carga termina | F2 |
| 11 | Esqueletos de tabla genérica en productos, árbol y tarjetas | Silueta con la forma real (miniatura + dos líneas + punto) | 7 |
| 12 | Crear no comprueba `catalog:manage` (ni `/product-types/create`, ni el formulario base del tipo) | Guarda de ruta: sin permiso, aviso de solo lectura y sin formulario | 7 |
| 13 | Crear y eliminar producto no avisan de éxito | «Producto creado» / «Producto eliminado» | F3 |
| 14 | Sin aviso de cambios sin guardar | Guarda `beforeunload` + aviso al navegar en Información, Atributos y el editor de atributos del tipo; en el tipo, barra de tinta «Guardar atributos» | 10 |
| 15 | La foto principal no se distingue | Etiqueta «Principal» en la primera; el aviso lo explica | 4 |
| 16 | «Regenerar» pisa lo que el usuario corrigió sin preguntar | Confirmación «¿Regenerar la búsqueda con IA?» solo si hay ediciones («Conservar los míos» / «Regenerar») | 7 |
| 17 | Crear sin catálogos: el select queda vacío sin explicación | Aviso con «Crear catálogo» | 7 |
| 18 | La cabecera de la ficha toma la categoría de `category_id` y la sección la efectiva (pueden discrepar) | Las dos muestran la efectiva | 4 |
| 19 | Placeholder de descripción, «Margen entre citas» y vista previa de imagen solo en crear | Iguales en crear y en la ficha | 4, 6 |
| 20 | Tipos y Catálogos: columnas «ordenables» que no ordenan, sin buscador, sin paginador (del 11.º en adelante no se ve) | Lista con buscador, orden real (segmentado) y paginación | 9, 11 |
| 21 | Catálogos sin estado vacío; errores de carga del provider nunca se muestran (Categorías cae al vacío) | Vacío propio en las tres; error en línea con reintento | 7 |
| 22 | El buscador del árbol no encuentra subcategorías de un padre contraído | Busca en todo el árbol y abre los ancestros de lo que encuentra | 8 |
| 23 | Categorías de la tienda conectada con el mismo icono que las propias | Icono y leyenda «De tu tienda» | 8 |
| 24 | «Oculta» (árbol) vs «Inactiva» (formulario); «Guardando…» al eliminar; «Eliminando...» con tres puntos | Un solo vocabulario: «Oculta / Visible para tu agente», «Eliminando…» | 8 |
| 25 | Acciones del árbol solo al pasar el ratón | En la fila (DS: acciones en la fila); la oculta ofrece «Mostrar» | 8 |
| 26 | `locked_fields` no se enseña: se deshabilita en bloque; `description` ni se consulta | Chips con candado de lo que manda la tienda; cada campo bloqueado dice «Lo manda Shopify»; se respeta `description` | 7 |

### D.2 Lo nuevo (cifras reales, ninguna inventada)

| Pieza | Datos | Origen |
|---|---|---|
| Ficha «En tu catálogo» (total, activos, productos/servicios) | conteos | **F1 servidor**: `GET /catalog/summary` |
| Ficha «Stock de los productos» (disponibles, agotados, con una variante agotada) | conteos | **F1**: mismo resumen |
| Ficha «Búsqueda con IA» (listos, por generar, fallidos, uso del mes) | `products, ready, pending, failed, monthly_used, monthly_cap` | ya existe: `GET /catalog/enrichment/stats` |
| Ficha «Clasificación» (con categoría, automáticas por confirmar, sin categoría) | `categorized, automatic, tenant_set, unresolved` | ya existe: `GET /catalog/classification/stats` |
| Isla «Lo próximo» del listado (sin fotos, agotados, sin categoría, sin búsqueda con IA) | conteos + filtro que abre cada uno | **F1**: resumen + filtros nuevos del listado (`has_images=false`, `stock_state=out`, `uncategorized=true`, `enrichment_status=failed`) |
| Precio como rango «$ 89.000 – $ 129.000» | `variants[].price_cents` | ya llega en el listado |
| SKU y nº de variantes en la fila | `variants[]` | ya llega |
| Nota de la categoría («automática · 92 % · por IA») en la tabla | `effective_category.source/confidence` + `effectiveCategoryNote` | ya existe |
| Isla de la ficha «Para que tu agente lo venda» | atributos requeridos vacíos, variantes sin foto, estado del enriquecimiento, stock por variante | derivado en el cliente del `ProductDto` (dominio puro) |
| Conteo de productos por categoría, por tipo y por catálogo | conteos agrupados | **F1**: `product_count` en los tres listados |
| «Taxonomía de tu tipo de negocio» | `vertical` | **F1**: exponerlo en el árbol (hoy solo llega al sembrar) |

Sin datos de servidor la ficha correspondiente no se pinta (DS §9.5: un 403 o un endpoint que falla no se confunde
con un cero; «No pudimos leer…» en la ficha).

### D.3 Lo que no cambia de comportamiento

Endpoints, payloads y reglas de guardado por sección (el backend fragmenta: Información, categoría efectiva al
instante, fotos, enriquecimiento, atributos, variantes, stock). La superficie pública (`public.ts`) no se toca.
