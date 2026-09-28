# Catálogo premium F4 — paridad de categorías, tipos de producto y catálogos

Contra la parte C de `catalog_premium_inventario.md`. Cada fila dice qué pasa con lo de hoy: **se conserva** (igual),
**cambia** (mismo fin con otra forma, y el motivo) o **se corrige** (era un defecto de la sección D.1). Nada se quita
sin decirlo.

Archivos:
- `app/(private)/(content)/catalog/`:
  - `layout.tsx`;
  - `categories/{page,loading}.tsx`;
  - `product-types/{page,loading,create/page,[id]/page}.tsx`;
  - `catalogs/{page,loading}.tsx`.
- `modules/catalog/`:
  - `domain/{category,local-list}.ts`;
  - `infrastructure/stores/catalog.context.tsx`;
  - `ui/components/{CategoryTree,LocalListParts,CatalogSectionSkeleton,AttributeSetEditor}.tsx`;
  - `ui/forms/config/category.config.tsx`.
- Se retiran, porque quedan sin uso:
  - `ui/components/CatalogShellHeader.tsx`;
  - `ui/tables/{catalog,product-type}.actions.tsx`;
  - `ui/tables/config/{catalog,product-type}.config.tsx`.

## C.0 Estructura común

| Hoy | En F4 |
|---|---|
| El layout pinta el h1 «Catálogo», la frase y las pestañas en todas las rutas | **Cambia**: cada vista lleva su encabezado. Las tres secciones usan `CatalogHeader` (antetítulo, h1 y pestañas con el total de productos). El detalle y el alta de un tipo llevan su enlace de vuelta y su h1. El layout queda solo con el provider. |
| Las cuatro pestañas (label «Secciones del catálogo») | Se conservan. |
| Migas: «categories», «catalogs», «create» | Ya corregidas en F3 («Categorías», «Catálogos», «Crear»). |
| El provider guarda `error`, pero ninguna vista lo lee | **Se corrige** (D.1 #21): `status` por recurso (cargando, listo o error). Cada vista pinta la silueta, el error con «Reintentar» o el vacío, sin confundirlos. Se conserva `error`. |
| X de cierre del modal con el texto «Close» | Sigue igual: es el `Dialog` compartido y queda para F5. |

## C.1 Categorías

| Hoy | En F4 |
|---|---|
| h2 «Categorías» y la frase de la taxonomía | La frase se conserva literal como descripción. El h1 pasa a «Cómo está ordenado lo que vendes». |
| «Actualizar taxonomía» y «Nueva categoría» (con `catalog:manage`), con sus avisos | Se conservan. |
| **Nuevo**: bento | Tres fichas. «Clasificación» (de `classification/stats`) enlaza a los sin categoría. «Tu árbol» muestra el total, las de plataforma, las tuyas y las de la tienda, y las ocultas. «Taxonomía de tu tipo de negocio» muestra el vertical de `enrichment/stats`. |
| `TreeView` compartido | **Cambia** a `CategoryTree`, propio del módulo. `TreeView` solo lo usaba esta vista y no admitía conteos, sinónimos, acciones en la fila ni buscar en ramas plegadas. Se conservan `role=tree`/`treeitem`, `aria-level`, `aria-expanded` y el teclado ↑/↓/→/←. El compartido queda sin consumidores y no se toca. |
| Leyenda Plataforma / Propia / Oculta | Se conserva y se completa con «De tu tienda». |
| Las categorías de la tienda llevan el mismo icono que las propias | **Se corrige** (D.1 #23): icono de tienda y aria-label «De la tienda conectada». |
| Sinónimos: los 4 primeros y «+N», solo desde `md` | **Cambia**: los 3 primeros y «+N» desde `sm`; en el celular viven en Editar. |
| Sin conteos | **Nuevo** (servidor F1): «N productos» por categoría efectiva. |
| Acciones en un menú que solo aparece al pasar el ratón | **Se corrige** (D.1 #25): las acciones van en la fila y se alcanzan con Tab. «Crear subcategoría» aparece si hay profundidad. «Editar» siempre. Luego «Ocultar» (taxonomía) o «Eliminar» (propias y de la tienda). |
| Mostrar de nuevo una oculta: solo desde Editar → Estado | **Se corrige** (D.1 #25): «Mostrar» en su fila, con el aviso «Categoría visible». Editar → «Visible para tu agente» sigue sirviendo. |
| Buscador «Buscar categoría…» que solo encuentra nodos visibles | **Se corrige** (D.1 #22): busca en todo el árbol, por nombre y por sinónimo, sin tildes. Despliega los ancestros de cada coincidencia, dice cuántas hay y ofrece «Borrar la búsqueda». Sin coincidencias: «Ninguna categoría coincide con «…».». |
| «Expandir todo» / «Contraer todo» | Se conservan (mientras se busca, el árbol ya va desplegado). |
| Diálogo ocultar/eliminar (títulos, descripciones y cuerpos literales) | Se conserva literal. **Se corrige** el botón: «Ocultando…» o «Eliminando…», en vez de «Guardando…». |
| Modal crear/editar (campos, validaciones, sinónimos, avisos) | Se conserva. **Cambia** el vocabulario (D.1 #24): «Estado» Activa/Inactiva pasa a «Visible para tu agente», con Visible/Oculta. |
| Vacío «Aún no tienes categorías.» y «Crear la primera» | Se conserva literal. **Se corrige** el parpadeo: no se pinta hasta que el árbol responde. |
| Error de carga: caía al vacío | **Se corrige** (D.1 #21): «No pudimos cargar tus categorías» con «Reintentar». |
| Carga: `TableSkeleton` | **Cambia** a una silueta con encabezado, bento y lista; dentro de la vista, filas escalonadas de árbol. |

## C.2 Tipos de producto

| Hoy | En F4 |
|---|---|
| h2 «Tipos de producto» y «Define atributos tipados por familia (material, talla, color…).» | La frase se conserva como descripción. El h1 pasa a «Lo que cada ficha debe decir». |
| «Nuevo tipo» (`catalog:manage`) | Se conserva. |
| `DataTable` sin buscador, con orden falso y sin paginador (los tipos del 11.º en adelante no se veían) | **Se corrige** (D.1 #20): lista con «Buscar tipo…» (nombre, descripción, atributos), orden real (Nombre, Atributos, Creado) y paginación de 10 con «N tipos · página x de y». |
| Columnas Nombre, Descripción, Atributos (número), Ejes de variante y Creado | Se conservan todos los datos. **Se completa**: los atributos se ven con su tipo, «variante» y «requerido» (4 y «+N»), y se añade «N productos» (servidor F1). |
| Editar solo desde el menú | **Cambia**: el nombre enlaza al tipo y «Editar» y «Eliminar» van en la fila. |
| Confirmación de eliminar (título, descripción y cuerpo literales) | Se conserva. **Nuevo**: si algún producto lo usa, dice cuántos y ofrece solo «Entendido», porque el backend lo rechazaría. «Eliminando...» pasa a «Eliminando…». |
| Avisos «Tipo de producto eliminado» y el error del servidor | Se conservan (ahora sin eventos `window`). |
| Vacío literal y «Crear el primero» | Se conserva. |
| Error: aviso flotante y luego «Sin resultados» | **Se corrige**: «No pudimos cargar tus tipos de producto» con «Reintentar». |
| **Crear**: volver, h2 «Nuevo tipo de producto», la frase y el formulario, sin comprobar permiso | Se conserva el texto como h1. **Se corrige** (D.1 #12): sin `catalog:manage` no se pinta el formulario y se explica. |
| **Detalle**: volver, h2 con el nombre, formulario base sin proteger y editor | **Cambia**: h1 con el nombre, y el antetítulo dice cuántos productos lo usan y cuántos atributos tiene. **Se corrige** (D.1 #12): sin permiso, nombre y descripción se leen, no se editan. El error ofrece «Reintentar» (antes no). |
| Editor de atributos (tipos, ámbitos, unidad, requerido, opciones, orden, código bloqueado, validaciones, confirmación y avisos) | Se conserva todo. |
| «Guardar atributos» siempre visible en la cabecera, sin aviso al salir | **Cambia** (D.1 #14): una barra en tinta aparece con cambios y dice cuáles («1 atributo nuevo»), con «Descartar» y «Guardar atributos». Salir por la vista o cerrar la pestaña pregunta. |
| «Añadir atributo» deshabilitado a los 50 sin explicación | **Se corrige**: `title` «Llegaste al máximo de 50 atributos». |

## C.3 Catálogos

| Hoy | En F4 |
|---|---|
| h2 «Catálogos» y «Agrupa tus productos por catálogo (principal, temporadas, líneas).» | La frase se conserva como descripción. El h1 pasa a «Tus productos, agrupados». |
| «Crear catálogo» (`catalog:manage`) y el modal crear/editar (campos, validaciones, textos) | Se conservan literales. |
| `DataTable` sin buscador, con orden falso y sin paginador | **Se corrige** (D.1 #20): «Buscar catálogo…» (nombre, código, descripción), orden Nombre/Productos/Creado y paginación de 10. |
| Columnas Nombre, Código (mono), Descripción y Creado | Se conservan. **Nuevo**: «N productos», que enlaza al listado filtrado por ese catálogo. |
| Acciones en un menú | **Cambia**: «Editar» y «Eliminar» en la fila. |
| Confirmación de eliminar (literal) | Se conserva; con productos dice cuántos dejarán de estar disponibles. «Eliminando...» pasa a «Eliminando…». |
| Avisos (creado, actualizado, eliminado, error) | Se conservan. |
| Sin estado vacío: la tabla decía «Sin resultados» | **Se corrige** (D.1 #21): «Aún no tienes catálogos. Crea uno para ubicar tus productos.» con «Crear el primero». |
| Error: aviso flotante y luego «Sin resultados» | **Se corrige**: «No pudimos cargar tus catálogos» con «Reintentar». |

## C.4 Superficie pública

`public.ts` no cambia. `flattenCategoryTree` sigue devolviendo `{id, label, depth, is_active}` en pre-orden, y los
nodos del árbol suman `product_count` (aditivo, del servidor F1).

## Pendiente fuera de F4

F5: el texto «Close» del `Dialog` compartido y los campos bloqueados por la tienda, uno por uno.
