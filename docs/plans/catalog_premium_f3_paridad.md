# Catálogo premium F3 — paridad de la ficha y de crear

Contra `catalog_premium_inventario.md`, parte B. Cada fila dice qué pasa con lo de hoy: **se conserva** (igual),
**cambia** (mismo fin con otra forma, y el motivo) o **se corrige** (era un defecto de D.1). Nada se quita sin decirlo.

Archivos:
- Páginas: `app/(private)/(content)/catalog/products/{[id]/page,[id]/loading,create/page}.tsx`.
- Componentes (`modules/catalog/ui/components/`): `ProductDetailHeader`, `ProductReadinessIsland`,
  `ProductDetailSkeleton`, `ProductBaseSection`, `ProductAttributesSection`, `ProductPhotosSection`,
  `photos/{PhotoTile,SortablePhotoGallery}`, `ProductEnrichmentSection`, `VariantsTable` y `CatalogShellHeader`.
- Formularios (`modules/catalog/ui/forms/`): `ProductForm` y `FormStep`.
- Dominio y hooks: `domain/product-readiness.ts`, `ui/hooks/use-unsaved-guard.ts`.
- Compartido: `shared/components/layout/private-header.tsx` (migas).

## B.1 Rutas, cabecera y migas

| Hoy | En F3 |
|---|---|
| `/catalog/products/create` y `/catalog/products/[id]` con `?pending_attributes=1` | Se conservan. |
| Encima de las dos, h1 «Catálogo» con subtítulo y pestañas | **Cambia**: el h1 es de la vista. En la ficha es el nombre del producto y en crear, «Crear producto». Las pestañas no se pintan: las dos vistas tienen su enlace de vuelta, como en el canvas. |
| Crear no comprueba permisos | **Se corrige** (D.1 #12): sin `catalog:manage` no hay formulario. Se muestra el aviso «Puedes ver el catálogo, pero no cambiarlo» con qué pedir. |
| Miga «create» | **Se corrige** (D.1 #7): «Crear». Se añaden también «Categorías» y «Catálogos». |
| Crear: volver «Productos», h2 «Crear producto» y «Completa la ficha; las variantes y el stock se pueden ajustar después.» | Se conserva literal (como h1) con el antetítulo «Catálogo · nuevo». |
| Ficha: volver «Productos», visible también en carga y error | Se conserva. **Nuevo**: con cambios sin guardar, pregunta antes de salir. |
| Aviso de producto gobernado (texto literal y enlace a Integraciones) | Se conserva literal. **Cambia** de una caja teñida a mano a un `Alert` informativo. Los campos concretos que manda la tienda quedan para F5. |
| Cabecera: miniatura 96, nombre, badges Activo/Inactivo y Producto/Servicio | Se conserva. **Cambia** la forma: miniatura de 112, estado en `StatePill`, tipo como etiqueta, «N variantes» y «Shopify» si aplica. |
| Línea «{catálogo} · {categoría}» con la categoría de `category_id` | **Se corrige** (D.1 #18): usa la categoría **efectiva**, la misma de Información. |
| Precio `formatMoney` + moneda | **Cambia**: el rango de las variantes activas si difieren, más la moneda. |
| Servicios: «{n} min · buffer {b} min · requiere reserva» | Se conserva en la misma línea. |
| «Desactivar / Activar» («Guardando…») y «Eliminar», solo con `catalog:manage` y `status` libre | Se conservan con los mismos permisos. «Eliminar» pasa de rojo relleno a contorno rojo (destructivo ≠ coral). |

## B.2 Layout

| Hoy | En F3 |
|---|---|
| Crear: una columna con 5 secciones y pie «Cancelar / Crear producto» | **Cambia** a pasos plegables (DS §9.7): Qué vas a ofrecer · Datos básicos · Clasificación · Precio · Agendamiento (solo servicios) · Variantes. Van con el resumen «Antes de crear» y la barra de acción en tinta. Los campos, sus textos y validaciones son los mismos. Plegar no desmonta los campos, y al enviar con errores se abren los pasos que los tienen. |
| Ficha: 6 tarjetas apiladas, cada una con su guardado | **Cambia** a dos columnas (canvas tablero 4): Información, Atributos y Variantes a la izquierda; la isla y Fotos a la derecha; la búsqueda con IA debajo. En el celular van primero la isla y las fotos (tablero 5). Cada sección sigue guardando por su cuenta. |

## B.3 Campos

| Hoy | En F3 |
|---|---|
| Crear: todos los campos, placeholders, ayudas y validaciones (3.1–3.5) | Se conservan literales. «Qué vas a ofrecer» titula el paso 1 y su etiqueta queda para lector de pantalla. |
| Crear sin catálogos: select vacío sin explicación | **Se corrige** (D.1 #17): el aviso «Aún no tienes catálogos. Crea uno para ubicar tus productos.» con «Crear catálogo». |
| Ficha, Información: campos, validaciones, `fieldset disabled` sin permiso y «Guardar cambios» solo si hay cambios | Se conservan. |
| Ficha: sin placeholder de descripción, sin «45» ni «10», sin «Margen entre citas», sin vista previa de la imagen | **Se corrige** (D.1 #19): iguales que en crear. |
| Categoría efectiva (4 estados, Confirmar, Cambiar, ayudas, avisos) | Se conserva (sin cambios en `EffectiveCategoryField`). Ahora tiene su propia fila. |
| Atributos: visibilidad, «Atributos ({tipo})», « *» y unidad, inputs por tipo, validación y avisos | Se conservan. El aviso «Faltan atributos requeridos: …» **cambia** de texto ámbar (no pasa AA) a `Alert` de advertencia. |

## B.4 Fotos

| Hoy | En F3 |
|---|---|
| Galería del producto y por variante: contadores, límites, subir, errores, reordenar, tile por estado, borrar, lightbox y polling | Se conserva todo (componentes intactos salvo lo que sigue). |
| Banner educativo de una vez (localStorage) | Se conserva. «Descartar aviso» crece a 28 px. |
| La foto principal no se distingue | **Se corrige** (D.1 #15): la primera lleva «Principal». |
| — | Ancla `#fotos` (la usa «Subir fotos» de las tarjetas del listado y la isla). |

## B.5 Búsqueda con IA

| Hoy | En F3 |
|---|---|
| Estados, textos, botones, contenido editable, categoría sugerida y procedencia | Se conservan literales. |
| «Regenerar» reemplaza las ediciones sin preguntar | **Se corrige** (D.1 #16): con ediciones guardadas o a medias pregunta «¿Regenerar la búsqueda con IA?», con «Conservar los míos» o «Regenerar». Sin ediciones, regenera directo. |
| Sección teñida de violeta | **Cambia**: tarjeta de contenido con canto violeta; el violeta queda en el icono y en el estado. |
| Botón de quitar término de 16 px | Crece a 24 px. |

## B.6 Variantes

| Hoy | En F3 |
|---|---|
| Tabla (SKU con estrella, nombre, atributos, precio, estado, stock, acciones con permisos) | Se conserva. **Cambia**: nombre y atributos van en una celda y el estado se muestra como punto con texto. Así la tabla cabe en su columna, y si no, scrollea dentro de la tarjeta. |
| Modal de variante, eliminar, calendario de salidas, editor al crear y ajuste de stock | Se conservan. «Eliminando...» pasa a «Eliminando…». |

## B.7 Guardar, cancelar y eliminar

| Hoy | En F3 |
|---|---|
| Crear: sin aviso de éxito | **Se corrige** (D.1 #13): «Producto creado». |
| Eliminar desde la ficha: sin aviso | **Se corrige**: «Producto eliminado» antes de volver al listado. |
| Sin aviso de cambios sin guardar en ninguna pantalla | **Se corrige** (D.1 #14): Información, Atributos (ahora sabe si está sucio), búsqueda con IA y el formulario de crear avisan. Cerrar o recargar lo pregunta el navegador; «Productos» y «Cancelar» preguntan «¿Salir sin guardar?». |
| Cancelar en crear: `history.back()` sin confirmar | **Cambia**: vuelve a Productos y, con cambios, pregunta antes. |

## B.8 Estados

| Hoy | En F3 |
|---|---|
| Carga: `FormSkeleton` | **Cambia**: silueta con la forma de la ficha (cabecera, dos columnas y la isla). |
| Error o 404: caja con el mensaje y «Reintentar» | Se conserva el mensaje (`errorMessage`, «El producto ya no existe») con «Reintentar», ahora en un `Alert` destructivo con el titular «No pudimos abrir este producto». |
| Sin `catalog:manage`: lectura | Se conserva igual en cada sección. La isla informa, pero sin botones. |

## Lo nuevo de F3

- La isla «Para que tu agente lo venda» (`domain/product-readiness.ts`, dominio puro): inactivo, sin fotos, agotado o con una variante agotada, atributo requerido vacío, variante sin fotos propias y sin búsqueda con IA. Cada fila lleva el ancla de la sección que lo resuelve. Lo que ya está bien va en una línea, y sin pendientes dice «Lista para que tu agente la venda».
- Anclas `#ficha`, `#atributos`, `#fotos`, `#variantes` y `#busqueda-ia`.

## Pendiente fuera de F3

- Los campos bloqueados, uno por uno, llegan en F5.
- Categorías, tipos y catálogos son F4, incluida la guarda de `/catalog/product-types/create`.
