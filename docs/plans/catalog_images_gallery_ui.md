# Catálogo: galería única con foto principal — parte visual

> Estado: plan y mockup APROBADOS por la dueña el 2026-10-08 («perfecto, aprobado»): anillo en tinta, «Usar en variante…» múltiple con guardado por lotes, alta solo con la principal del producto. **Implementado y verificado en navegador real** (sección «QA real»).
> Plan maestro (decisiones D1–D14, servidor y verificación): `axi-server/docs/plans/catalog_images_gallery_plan.md`.
> Lienzo: https://claude.ai/artifact/KNneY11DdY9EByyxfN5zAN · fuentes en `docs/design/mockups/catalog-gallery/` (`python3 build.py`; con `AXI_NEXA_URL=/_blob/1c88901b655756f481eaa595133a8716` para los artboards del lienzo).

## Qué cambia en la UI

- Desaparece todo campo «Imagen (URL)»: `ProductForm`, `ProductBaseSection` y `VariantForm`.
- La sección **Fotos** de la ficha es la única entrada de imágenes: una galería con dos bandas («General · n de 10», «De una variante · n de 5»), filtro por variante, principal destacada y menú por foto (Hacer principal · Usar en variante… · Ver original · Borrar).
- La tabla de variantes muestra la principal de cada variante (atenuada si hereda la del producto) y abre un selector de la galería con «Subir foto para esta variante».
- Subida desde teléfono o PC: reducción en el navegador (borde 2048 px, JPEG 0,85), de a 3 en paralelo, progreso y reintento por foto.
- Alta: paso «Fotos» en `ProductForm`; las fotos se suben tras el `POST products`, con la principal elegida.
- Listado, tarjetas y cabecera pintan `primary_image` (la principal efectiva que sirve el servidor), no la columna heredada.

## Contrato que consume (servidor b6d71794)

- `ProductDto.primary_image {id, url} | null` (listado y detalle), `primary_image_id`, `variants[].primary_image_id`.
- `PUT /catalog/products/:id/primary-image {image_id}` y `PUT /catalog/variants/:id/primary-image {image_id | null}` → `ProductDto`.
- Subida multipart con `make_primary=true`.

## Implementación (rama feat/catalog-images-gallery)

- **Dominio** `domain/product-gallery.ts`: espejo de la principal efectiva del servidor (`effectivePrimaryImage`, `effectiveVariantPrimary`), marcas de variante (`variantsByPrimaryImage`, `compactVariantMark`), etiquetas en el orden de los ejes del tipo (`variantShortLabel(variant, axisOrder)`), «Usar en variante…» (`variantAssignments`, `backToProductTarget`, `variantGroupShortcuts`) y la reducción (`fitWithin`, `needsReencode`, `splitByRemaining`).
- **Transporte** `http.upload` (XHR, progreso real; mismo contrato de errores y señales que `post`).
- **Reducción** `infrastructure/services/image-preparation.ts`: `createImageBitmap` con orientación EXIF → canvas → JPEG 0,85 a 2048 px; costura `ImageCodec` para jsdom.
- **Cola** `infrastructure/stores/photo-upload-queue.ts` (store de módulo, sobrevive a la navegación del alta a la ficha) + hook `use-photo-uploads.ts` (re-pide el detalle con debounce y retira lo ya servido).
- **UI**: `ProductGalleryProvider` (estado compartido por «Fotos» y la tabla de variantes, monta los paneles una vez), `ProductPhotosSection`, `PhotoTile` (menú «···», anillo de tinta, píldora), `UploadTile`, `UseInVariantsPanel`, `VariantPhotoPicker` (aviso con «Deshacer»), `VariantPrimaryThumb`, `DraftPhotosField` (paso «Fotos» del alta), `AnchoredPanel` (popover ↔ hoja).
- Fuera: campo «Imagen (URL)» de `ProductForm`, `ProductBaseSection` y `VariantForm`; `groupProductImages`; la columna «Estado» de variantes (el lienzo no la tenía y la miniatura necesitaba el ancho: la inactiva se marca en la celda).

## QA real (2026-10-08, entorno propio :3200/:3201, base `axi_qa_galeria`)

Evidencia en `qa/evidencia/catalogo-imagenes/` (capturas `qa-*.png`, scripts en `qa/catalogo-imagenes/`).

- Alta con 3 fotos de celular de 8,3 MB (4032×3024): llegan al servidor en ~1,1 MB a 2048×1536 y la principal es la elegida en el formulario.
- **Hallazgo servidor (corregido, 46125a0a)**: las 3 subidas en paralelo quedaban con `position = 0` y el tope podía colarse → lock consultivo por producto + `max + 1`.
- **Hallazgos cliente (corregidos)**: etiquetas en orden alfabético de claves («Negro · L») → orden de los ejes; píldora larga y truncada → compacta en dos líneas («Blanco ·» / «S M L»); la isla contaba como «sin fotos propias» a variantes con principal elegida; `aria-disabled` de dnd-kit dejaba deshabilitado el menú de una banda sin arrastre; tabla de variantes desbordada.
- Verificado: «Usar en variante…» por lotes, selector + «Deshacer», filtro por variante, «Hacer principal» la pasa al frente, borrar la principal cae a la siguiente, la miniatura del listado conserva la URL entre recargas, claro/oscuro, 390 sin desborde horizontal, hoja inferior en el celular.

## Auditoría 2026-10-09 (audit-almacenamiento-&-galeria), arreglos

Informe: `qa/evidencia/auditoria/almacenamiento-galeria/INFORME.md`. Rama `fix/catalog-gallery-audit`.

- **C-1, drop duplicado.** `PhotoDropTile` corta la propagación. Antes, la sección volvía a encolar el mismo archivo.
- **C-3, espacio lleno.**
  - La cola se detiene con el primer 507: las fotos en espera no se intentan, quedan «Sin espacio» y no ofrecen «Reintentar» mientras siga lleno.
  - El aviso de storage sale una vez por lote.
  - Hay un aviso propio que distingue la empresa de la plataforma.
  - El botón «Subir», el estado vacío, el soltar sobre la sección y el selector de variante consultan `useStorageQuotaState` antes del primer 507.
- **C-7.**
  - Dentro del filtro de una variante, «Hacer principal» es de esa variante: «Hacer principal de M · Negro».
  - Las escrituras van secuenciadas: la respuesta vieja no pisa a la nueva.
  - «Hacer principal» aplica lo que guardó el servidor y, si algo falla, vuelve a pedir el detalle en vez de restaurar una copia vieja.
  - Las fotos fallidas o rotas se pueden borrar.
  - HEIC ya no se anuncia en los textos.
- **C-8, parte propia.**
  - «Deshacer» toma el valor vigente al elegir.
  - `http.upload` ya no se cuelga si el cuerpo no es JSON.
