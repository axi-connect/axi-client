# Catálogo premium F5 — lo que manda la tienda conectada y cierre

Contra el inventario, la parte B §7.1 (bloqueos por `locked_fields`) y la parte D.1, puntos #26 y #7. **Se conserva**
quiere decir que queda igual, **cambia** que el fin es el mismo con otra forma, y **se corrige** que era un defecto.

## Qué permite el servidor en un producto espejado

Se verificó en `axi-server` antes de tocar la ficha:
- `PATCH /catalog/products/:id` se rechaza entero (`assertNotExternallyGoverned`, sin mirar qué campo cambia). Lo mismo
  pasa con los atributos (`set_product_attribute_values`) y con «Aplicar categoría» del enriquecimiento.
- `PUT /catalog/products/:id/category` **sí se acepta**: en un espejo escribe la clasificación y no el campo de la
  tienda (`set_product_category.use_case.ts`).
- Editar y regenerar la búsqueda con IA se acepta, porque lo generado es de Axi.

Por eso F5 no «desbloquea campo por campo» la ficha: el servidor no lo admite. Lo que hace es decir con precisión qué
manda la tienda y qué sí se edita aquí.

## Cambios

| Hoy | En F5 |
|---|---|
| Aviso «Este producto lo gobierna tu tienda conectada…» | Se conserva literal. **Nuevo**: la lista de lo que manda Shopify, uno por uno, con candado (Nombre, Descripción, Precio, Estado, Fotos, Variantes, Stock, Categoría de la tienda). Sale de `locked_fields` del backend y nunca se deriva en el cliente. Añade «Aquí sí puedes fijar su categoría y ajustar su búsqueda con IA.» |
| Información: toda la sección de lectura si `name` o `price` estaban bloqueados, y la categoría efectiva también | **Cambia**: la ficha sigue de lectura y sin «Guardar cambios», porque el servidor rechaza el PATCH. Ahora Nombre, Descripción y Precio dicen «Lo manda Shopify», y la sección explica qué se puede hacer. **Se corrige**: la categoría efectiva queda fuera del bloqueo y se puede Confirmar o Cambiar, porque el servidor lo acepta. |
| `description` estaba en el enum pero la UI no lo miraba | **Se corrige** (D.1 #26): tiene su «Lo manda Shopify». |
| Cabecera: sin Activar/Desactivar/Eliminar, sin explicación | Se conserva el ocultado. **Nuevo**: «El estado lo manda Shopify». |
| Fotos de lectura, sin explicación | **Nuevo**: «Las manda Shopify: se suben y ordenan en tu tienda». |
| Variantes y stock sin añadir, editar ni ajustar, sin explicación | **Nuevo**: «Las variantes y el stock los manda Shopify» (o solo uno de los dos, según `locked_fields`). |
| Isla «Para que tu agente lo venda» con acciones que aquí no se pueden hacer («Subir fotos», «Ajustar el stock», «Completar…») | **Se corrige**: con el campo bloqueado, la fila dice dónde se resuelve («súbelas en tu tienda conectada», «el stock lo manda tu tienda conectada») y la acción solo lleva a verlo («Ver las fotos», «Ver el stock», «Ver los atributos», «Ver el estado»). |
| `Dialog` compartido: el botón de cerrar se anuncia «Close» | **Se corrige** (D.1 #7): «Cerrar». Se ajustan sus dos tests (`dialog-focus*`). |

## Lo que no cambia

- Búsqueda con IA editable en un espejo, y «Aplicar categoría» bloqueado por `category`.
- Atributos de lectura en un espejo.
- Ocultado de acciones por `locked_fields`.
- El badge «Shopify» del listado.

## Pruebas

- `ProductBaseSection.test.tsx` (nuevo):
  - en un espejo: tres «Lo manda Shopify», sin «Guardar cambios», Nombre deshabilitado y «Confirmar» habilitado;
  - en un producto propio: sin avisos y con «Guardar cambios».
- `product-readiness.test.ts`: caso del producto de la tienda (textos y acciones «Ver…»).
- `dialog-focus.test.tsx` y `dialog-focus-menu.test.tsx`: el botón se llama «Cerrar».
