# Borrado en captación — frontend

> Backend: `axi-server`, `3720ccb` → `97a2e7f` (otra sesión, completo y verde).
> Fase 0 aprobada por el dueño el 2026-08-31.
> Mockup: `docs/design/mockups/prospecting-delete.html` ·
> Artifact https://claude.ai/code/artifact/623c2ca5-f1ba-449d-833c-e36901d0bd76

---

## Contexto

El borrado de leads y búsquedas existe en el backend desde hoy y **solo se puede
usar con `curl`**. Lo que falta es la superficie, y la superficie es el trabajo
difícil: no hay papelera ni deshacer, así que **la confirmación es la única
barrera que existe**. Todo lo que sigue son decisiones sobre qué se lee en los
dos segundos antes de pulsar y en los dos de después.

Encaja dentro de la selección en lote que F5 acaba de construir: **no es una
barra nueva, es una acción más en la que ya hay.**

---

## Decisiones

### Del dueño, mirando el mockup

| # | Decisión |
|---|---|
| **D1** | **«Eliminar» vive SOLO en la barra de selección.** Nada en la fila y nada en el menú contextual. Un clic de más antes de algo irreversible no es fricción: es margen. Y un menú contextual aparece con clic derecho sin avisar, que es el peor sitio para un borrado. |
| **D2** | **UN solo diálogo, igual para 1 que para 300.** Sin escribir el número, sin fricción escalonada. Predecible por encima de defensivo. |
| **D3** | **Aviso al terminar; panel SOLO si hay algo que explicar.** Un panel obligatorio tras borrar tres filas sin novedad se aprende a cerrar sin leer, y entonces no se lee el que sí importa. |
| **D4** | **SIN el aviso de «puede volver y volver a costar».** Decisión explícita del dueño **y en contra de la recomendación**: se le puso delante en el diálogo con el argumento —borrar no suprime, y con una fuente de pago el mismo negocio se recompra— y se le preguntó dos veces. Eligió la versión corta con la información a la vista. **No es un olvido y no se cuela por otra pantalla**: la sesión del backend se comprometió a no marcarlo tampoco en el reporte de una búsqueda. Queda escrito en el docblock de `DeleteLeadsUseCase` y aquí. |

### Derivadas del mockup y del código

| # | Decisión |
|---|---|
| **D5** | **El destructivo va DE CONTORNO en la barra, y relleno solo en el diálogo.** Lo destapó renderizar el mockup: la regla «destructivo ≠ coral» se cumplía —coral de marca contra rojo semántico— y aun así «Promover» y «Eliminar» se leían **casi iguales**, porque a tamaño de botón los dos son un rectángulo rojo y una de las dos no se deshace. Dos botones contiguos que se parecen y hacen cosas opuestas es el error, no el matiz. El relleno rojo se reserva para el paso donde ya no compite con nada. Es tratamiento del slice: un borrado en otra vista sale de aquí. |
| **D6** | **El número de una búsqueda es el EXACTO, de la previa.** `new_count` y `found_count` de la tarjeta son históricos —dicen lo que la búsqueda trajo— y no se ajustan al borrar leads sueltos ni al promoverlos. Enseñar 184 y que el resultado diga 120 se lee como que se perdió algo. Se pidió `GET /prospecting/searches/deletion-preview` y la otra sesión lo entregó con un test que fija que la previa y el `leads_deleted` posterior coincidan. |
| **D7** | **El tope de la selección masiva baja a 500** (ya hecho, `045b6e7`): es lo que aguanta un lote del backend, así que **una confirmación es una petición es un resultado**. Trocear en dos deja dos resultados que fusionar y un fallo parcial que no se sabe contar. |
| **D8** | **Un lead que ya es contacto no se puede marcar.** La casilla sale **deshabilitada, no ausente**: quitarla descuadra la columna y no dice por qué. Consecuencia buena: en la selección de una página el `kept` es siempre vacío —no se puede marcar lo que sobrevive—, así que el panel de resultado solo aparece de verdad en el modo «todos los que cumplen». |
| **D9** | **Los contadores de una búsqueda NO se ajustan al borrar leads sueltos, y la etiqueta lo dice.** El informe dice lo que la búsqueda TRAJO: es histórico y es la única forma de explicar en qué se gastó el dinero. Si chirría, se arregla la etiqueta y no el número. |

---

## El contrato

```
DELETE /prospecting/leads/:id            → 204
POST   /prospecting/leads/delete         {lead_ids: uuid[1..500]}
                                         → 200 {deleted, kept[{lead_id, reason}], missing}
DELETE /prospecting/searches/:id         → 200 {deleted, leads_deleted, leads_kept, kept[]}
POST   /prospecting/searches/delete      {search_ids: uuid[1..50]} → 200 ídem
GET    /prospecting/searches/deletion-preview?search_ids=a,b
                                         → 200 {leads_to_delete, leads_kept, missing,
                                                by_search[{search_id, leads_to_delete, leads_kept}]}
```

Permiso **`leads:delete`** en las cinco. Errores: `404 prospecting/lead_not_found`,
**`409 prospecting/lead_not_deletable`** («ya es un contacto del CRM»),
`404 prospecting/search_not_found`.

**`missing` es un NÚMERO y no una lista**, a propósito: después de un `deleteMany`
no se puede saber cuál de los ausentes lo borramos nosotros, y dar ids sería
inventarse el detalle. La propiedad que sí se cumple y que hace legible el
informe: **`deleted + kept.length + missing` cuadra siempre con lo enviado.**

Sin `search_ids`, la previa devuelve **400 y no ceros**: un diálogo destructivo
que enseñe «0 leads» porque el parámetro se armó mal es peor que uno que no abra.

---

## Implementación

### 1. Tipos y adapter
`src/core/api/schema.d.ts` (regenerar) y
`infrastructure/services/prospecting-service.adapter.ts`:

```ts
deleteLead(id)                    // 204
deleteLeads(lead_ids)             // DeleteLeadsResultDTO
deleteSearch(id)                  // DeleteSearchesResultDTO
deleteSearches(search_ids)        // ídem
previewSearchDeletion(search_ids) // DeletionPreviewDTO — CSV, como el resto
```

### 2. `ui/components/DeleteResultSheet.tsx`
El panel de D3, sobre `DetailSheet`. Recibe el resultado y **decide si merece
abrirse**: `kept.length > 0 || missing > 0`. Si no, la vista solo lanza el aviso.
La cuenta se pinta como `deleted de asked`, y el `missing` con su explicación
—pudo borrarlos otra persona, o la puerta de admisión de una búsqueda—.

### 3. `ui/LeadsInboxView.tsx`
- «Eliminar N» en `selection.actions`, con el tratamiento de contorno (D5) y solo
  con `leads:delete`.
- El diálogo por `showModal`, con el número, «no se puede deshacer» y —solo en
  modo «todos»— cuántos sobreviven.
- Tras borrar: `refresh()`, tirar la selección, y aviso o panel según D3. Los
  `stats` del embudo se recargan, no se estiman: borrar mueve varios pasos a la
  vez y restar a mano acabaría en un embudo que no suma.

### 4. `ui/components/SearchRun.tsx` y `ui/SearchesView.tsx`
- «Eliminar» en la tarjeta, de contorno.
- Al pulsar: `previewSearchDeletion([id])` y **el diálogo abre con el número
  cargado**, no con un `—` que luego cambia. Mientras carga, el botón muestra su
  propio estado; si la previa falla, se dice y **no se ofrece borrar a ciegas**.
- Si la búsqueda está viva, el diálogo lo avisa en ámbar: se está deteniendo algo
  que corre. Es efecto colateral, no peligro, así que no es rojo.
- La etiqueta histórica de los contadores (D9).

### 5. Permisos
`leads:delete` ya lo respeta la tabla sin nada especial: la casilla se ofrece
solo si sirve para alguna acción que el usuario puede hacer, así que un
supervisor no ve ni casilla ni botón.

---

## Verificación

**Tests que son el contrato:**

1. **Sin `leads:delete` no hay botón** — ni en la barra ni en la tarjeta.
2. **El diálogo dice el número real** en los dos modos, y en «todos» además
   cuántos sobreviven.
3. **Nada se borra sin confirmar**: cancelar no llama al adapter.
4. **Con todo limpio sale el aviso y NO el panel**; con `kept` o `missing`, el
   panel.
5. **`deleted + kept + missing` se pinta cuadrado** con lo enviado.
6. **La previa falla → no se ofrece borrar**, en vez de abrir con un cero.
7. Un lead ya promovido **ofrece la casilla deshabilitada**, no la esconde.

**Manual, que es la que cierra esto** (la levanta el dueño): borrar uno, borrar
la página, borrar «todos los que cumplen» con algún promovido dentro para ver el
panel, y borrar una búsqueda viva para ver el aviso ámbar y que el número de la
confirmación coincida con el del resultado.

---

## Fuera de alcance, decidido en contra

Papelera o deshacer · suprimir al borrar · **borrado por filtro** (un filtro mal
calculado en el cliente se lleva la base; por eso el modo «todos los que cumplen»
materializa ids contra `/leads/ids` **antes** de actuar, y lo que llega al
backend son ids que alguien vio) · borrar contactos del CRM.

Y **el aviso de recompra** (D4), que es lo único de esta lista descartado por el
dueño en contra de la recomendación.
