# Catálogo premium F2 — paridad del listado de productos

Contra `catalog_premium_inventario.md`, parte A (listado de `/catalog/products`). Cada fila dice qué pasa con lo de
hoy en el listado nuevo: **se conserva** (igual), **cambia** (mismo fin, otra forma, con el motivo) o **se corrige**
(era un defecto, D.1). Nada se quita sin decirlo.

Archivos: `modules/catalog/ui/products/*` (vista, bento, isla, tabla, celdas, estados), `ui/components/ProductGrid.tsx`,
`ui/components/ProductFilters.tsx`, `ui/components/CatalogNav.tsx`, `ui/components/CatalogShellHeader.tsx`,
`domain/product-list-query.ts`, `domain/catalog-summary.ts`, `domain/product.ts`,
`infrastructure/hooks/use-product-list.ts`, `infrastructure/hooks/use-catalog-overview.ts`,
`infrastructure/services/catalog-summary-service.adapter.ts`, `ui/tables/config/product.config.tsx`,
`ui/tables/product.actions.tsx`, `app/(private)/(content)/catalog/{layout,products/page,products/loading}.tsx`,
`shared/components/ui/pagination/core.tsx`.

## A.1 Ruta y cabecera

| Hoy | En F2 |
|---|---|
| `/catalog` redirige a `/catalog/products` | Se conserva (no se tocó). |
| `CatalogProvider` en el layout | Se conserva. |
| h1 «Catálogo» + «Administra tus productos, categorías, tipos de producto y catálogos.» (layout, todas las rutas) | **Cambia solo en el listado**: el h1 es de la vista, «Lo que vendes, listo para tu agente», con el antetítulo «Catálogo · N productos y servicios» (canvas tablero 1). Las demás rutas conservan el h1 y la frase literal (`CatalogShellHeader`) hasta F3/F4. |
| h2 «Productos» + «Tu catálogo completo: productos físicos y servicios agendables.» | La frase se conserva literal como descripción del encabezado. «Productos» sigue siendo la pestaña activa. |

## A.2 Navegación

| Hoy | En F2 |
|---|---|
| `NavTabs` «Secciones del catálogo»: Productos, Categorías, Tipos de producto y Catálogos, con sus iconos y el activo por prefijo | Se conserva. Va debajo del encabezado, como en Marketing. |
| Sin conteo | **Cambia**: Productos lleva el total (`summary.products.total`). Mientras no llega, no se pinta. |

## A.3 Acciones y permisos

| Hoy | En F2 |
|---|---|
| Conmutador «Cambiar vista», Tabla/Tarjetas, solo con iconos salvo el activo (`labels="active"`) | Se conserva igual, a la derecha de la barra del listado. |
| «Crear producto» solo con `catalog:manage` | Se conserva: en el encabezado y en el estado vacío. |
| Sin exportar, lote ni orden | Igual. No se agregó nada. |

## A.4 Filtros

| Hoy | En F2 |
|---|---|
| 4 `Select`: catálogo, categoría (árbol con «— »), tipo y estado, con sus aria-labels, opciones y la opción «todos» literal | Se conservan con las mismas opciones y textos. Cambia solo la forma: triggers en píldora (`rounded-full`). |
| «Limpiar» (ghost, solo con filtros) | **Cambia** a «Limpiar filtros», en la fila de chips, junto a lo que limpia. Sigue sin borrar la búsqueda. |
| Filtros no persistidos | **Se corrige** (D.1 #3): viven en la URL. |
| Sin chips ni contador | **Nuevo**: un chip por filtro activo, cada uno con su «Quitar el filtro …», y el número de resultados. |
| — | **Nuevo** (servidor F1): `has_images`, `stock_state`, `uncategorized` y `enrichment_status`. Llegan desde la isla y se ven y se quitan como chips. |
| Categorías inactivas en el select | Se conserva igual (no es de F2). |

## A.5 Búsqueda y paginación

| Hoy | En F2 |
|---|---|
| 20 por página y `q` en el servidor | Se conserva (`PRODUCTS_PAGE_SIZE = 20`). |
| Tabla: debounce de 350 ms con «Limpiar». Tarjetas: buscador aparte, solo con Enter y sin limpiar | **Se corrige** (D.1 #1, #2): una sola búsqueda para las dos vistas, con debounce de 350 ms y el botón «Borrar la búsqueda». Placeholder «Buscar productos…» y aria-label «Buscar productos». |
| Selector de campo inerte («Seleccionar campo») | **Se quita**: no hacía nada, la página solo mandaba `q`. |
| Pie «Página p de tp — N registros» (tabla) y «… — N productos» (tarjetas) | Uno solo: «Página p de tp · N productos». |
| `BasicPagination` con aria-labels en inglés | **Se corrige** (D.1 #7) en el compartido: «Paginación», «Ir a la página anterior», «Ir a la página siguiente», «Más páginas». |
| — | Una página que ya no existe (`?page=99`) lleva a la última. |

## A.6 Tabla: columnas

| Hoy | En F2 |
|---|---|
| Miniatura (`ProductThumb` con el icono del tipo de respaldo, alt «Imagen de {nombre}») | Se conserva, dentro de la columna Producto. |
| «Nombre», enlace al detalle | Se conserva: columna «Producto», con enlace y `truncate` + `title`. |
| «Tipo», badge Producto/Servicio | **Cambia**: la línea bajo el nombre dice «Servicio · 60 min · requiere reserva». En un producto muestra su SKU y el número de variantes. |
| «Categoría» efectiva con destello «Categoría automática» | Se conserva y **se completa**: la nota «automática · 92 % · por IA» (`effectiveCategoryNote`). Sin categoría: «Sin categoría» con punto ámbar. |
| «Precio» base | **Cambia**: el rango de las variantes activas si difieren («$ 89.000 – $ 129.000»); si no, el precio. |
| «Stock» con punto y «Disponible / Stock bajo / Agotado / Sin control de stock / —» | Se conserva el punto. **Cambia** la etiqueta de «bajo» a lo que significa: «1 variante agotada» (D.1 #9). Los servicios dicen «no aplica». |
| «Fotos» con cámara y el tooltip de 0 fotos | Se conserva: «Sin fotos: tu agente no podrá mostrar este producto» como `title` y como texto para lector de pantalla. |
| «Estado» Activo/Inactivo (badge) | **Cambia** a `StatePill`: el color en el punto, el texto en foreground. |
| Menú de acciones | Se conserva (A.8). |
| Columnas que no caben → «Ver más» plegable | **Cambia** (DS «Tablas y scroll»): la tarjeta es `@container` y las columnas aparecen por el ancho de la tabla. En estrecho, precio, stock y estado suben a la primera columna. Si aun así no cabe, scrollea dentro de la tarjeta. |

## A.7 Tarjetas

| Hoy | En F2 |
|---|---|
| Toda la tarjeta enlaza (aria «Ver {nombre}»), imagen 4/3 con los mismos `sizes` | Se conserva. |
| Badges Servicio, Shopify, Inactivo y Agotado | Se conservan Servicio, Shopify e Inactivo. El agotado **pasa a la línea de stock**, que ahora dice lo mismo que la tabla (D.1 #8). |
| Contador de fotos abajo a la derecha | Se conserva. Sin fotos, la imagen dice «Sin fotos» y, con `catalog:manage`, «Subir fotos» (lleva a `#fotos` del detalle). |
| Nombre, línea (duración / categoría / variantes), precio y menú | Se conservan. El precio pasa a rango y **se añade** la línea de stock. |

## A.8 Acciones por fila

| Hoy | En F2 |
|---|---|
| Menú «Acciones»: «Ver producto» (sin permiso), «Editar» (`catalog:manage`, misma ruta) y «Eliminar» (`catalog:manage` y no gobernado) | Se conserva igual. |
| Disparador con sr-only «Abrir menú de acciones» | **Cambia** a aria-label «Acciones de {nombre}» (cada fila se distingue). |
| El menú se recortaría en una tabla con scroll | `DropdownMenuContent portal`. |
| Modal «Eliminar producto» (título, descripción, cuerpo, Cancelar/Eliminar, ids) | Se conserva literal. «Eliminando...» pasa a «Eliminando…». |
| Avisos «Producto eliminado correctamente» / error, eventos `products:delete:success` y `products:error` | Se conservan. Además, eliminar recarga las cifras del bento. |
| El popover de stock no está en el listado | Igual (sigue en el detalle, F3). |

## A.9 Estados

| Hoy | En F2 |
|---|---|
| `loading.tsx`: `TableSkeleton` genérico | **Se corrige** (D.1 #11): la silueta del encabezado, el bento con la isla y filas con miniatura y dos líneas. |
| Carga sin filas: `TableSkeleton` (también en tarjetas) | `ProductRowsSkeleton` con la forma real y `role=status` «Cargando productos». |
| Recarga con filas: ningún indicador | **Se corrige** (D.1 #6): las filas se atenúan y el cuerpo lleva `aria-busy`. |
| Vacío: `EmptyState` «Aún no tienes productos» (glifo, textos y CTA con permiso) | Se conserva literal. **Se corrige** el parpadeo (D.1 #10): no se pinta hasta la primera respuesta. |
| Sin resultados: «Sin resultados para esta búsqueda» también por filtros | **Se corrige** (D.1 #5): con filtros dice «Ningún producto con estos filtros» y ofrece «Limpiar filtros». Con búsqueda dice «Ningún producto coincide con «…»» y ofrece «Borrar la búsqueda». |
| Error: caja que tapa los filtros | **Se corrige** (D.1 #4): `Alert` destructivo «No pudimos cargar tus productos» con el mensaje de `errorMessage` y «Reintentar». Los filtros siguen visibles encima. |

## A.10 Persistencia

| Hoy | En F2 |
|---|---|
| `localStorage["catalog:products:view"]` sin try/catch | Se conserva la clave. **Se corrige**: lectura y escritura con try/catch; sin almacenamiento, la vista por defecto. |

## Lo nuevo de F2 (canvas tablero 1)

- Fichas, cada una con la procedencia de su cifra:
  - «En tu catálogo»: activos, productos, servicios e inactivos.
  - «Stock de los productos»: disponibles de físicos, agotados, con una variante agotada y sin control.
  - «Búsqueda con IA»: listos, por generar, fallidos y uso del mes.
  - «Clasificación»: con categoría, automáticas por confirmar, sin categoría y las que fijaste tú.
- Cada ficha tiene su silueta y su error con reintento; un error nunca se pinta como un cero.
- La isla «Lo próximo» (cristal): sin fotos, agotados, sin categoría y sin búsqueda con IA, cada fila con su filtro. Si no puede leer el resumen dice «No pudimos revisar tu catálogo», y sin pendientes dice «Todo listo para vender».

## Pendiente fuera de F2

La ficha y crear son F3. Categorías, tipos y catálogos son F4. Los campos bloqueados por la tienda son F5.
