# Catálogo: galería única con foto principal — parte visual

> Estado: plan APROBADO el 2026-10-08; **mockup pendiente de aprobación**.
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

## Abierto hasta la aprobación del mockup

- Anillo de la principal: tinta (propuesta, por continuidad) o coral (alternativa en el lienzo).
- «Usar en variante…» con selección múltiple: si se aprueba, el servidor suma un endpoint por lotes para no hacer N llamadas.
