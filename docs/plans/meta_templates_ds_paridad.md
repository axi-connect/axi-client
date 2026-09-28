# Plantillas de Meta — paridad del rediseño (lienzo aprobado 2026-09-28)

Contra `meta_templates_ds_inventario.md`. **Se conserva** = igual; **cambia** = mismo fin, otra forma (con el motivo);
**se corrige** = era un defecto (sección D del inventario). Lienzo: https://claude.ai/artifact/WgRsVqXiDqG97Ga3QAyd96.

## A. Marco

| # | En el rediseño |
|---|---|
| A1–A2 | Se conservan. El h1 sigue siendo «Configuración» del layout compartido de las cuatro sub-secciones: el tablero dibuja «Plantillas de Meta», pero cambiarlo rompería el marco de Ajustes, Mensajes y Bajas (ya era así tras Marketing F1). El contador de rechazadas en la sub-pestaña del tablero **no se implementa**: exigiría pedir las plantillas desde el layout (servidor). |
| A3 | **Se corrige** (D5): `meta-templates/loading.tsx` propio, con la silueta de la vista (intro, tres fichas, isla, filas). |

## B. Vista

| # | En el rediseño |
|---|---|
| B1–B2 | Se conservan literales. «Sincronizar con Meta» también en el vacío (B19). |
| B3 | Se conserva. **Nuevo**: «N plantillas en su cuenta de WhatsApp Business». |
| B4–B5 | Se conservan literales. |
| B6 | Se conserva el sondeo (15 s, pestaña oculta, techo 80, guardia por canal). **Se corrige** (D4): al llegar al techo, «Lo próximo» dice «Sigue en revisión · la pantalla preguntó a Meta durante 20 minutos» con «Sincronizar con Meta». |
| B7 | Se conservan columnas, caption, `@container` y la fila rechazada tintada. **Nuevo**: la fila se señala al volver de «Ver la plantilla» o de «Lo próximo». |
| B8 | **Cambia** a `StatePill` (color en el punto). «Pendiente» → **«En revisión»** (D6, `HSM_APPROVAL_LABELS`, también en `whyUnusable`). |
| B9 | Se conservan las notas. **Cambia**: el motivo en prosa de Meta va firmado «Meta: …»; el enum traducido no (ya nombra a Meta). |
| B10 | **Cambia**: «Calidad media/baja» en vez del enum crudo («Calidad yellow»). |
| B11 | Se conserva. En una rechazada editable el botón es **«Corregir»** (D7) y abre el diálogo «Corregir «…»». La pista de bloqueo se muestra siempre que no se pueda editar. |
| B12–B14 | Se conservan literales. |
| B15–B19 | Se conservan literales («Ir a canales» ya es `Link`). |
| B20 | Se conserva (sin buscador: el endpoint devuelve todas). |
| **Nuevo** | Isla de cristal «Lo próximo» (una por pantalla, solo si hay algo): rechazadas por corregir, en revisión (con «Preguntando a Meta cada 15 s»), aprobadas con calidad en baja. |
| **Nuevo** | Sin `marketing:manage`: «Solo lectura» con la frase de quién las gestiona. |

## C. Diálogo

| # | En el rediseño |
|---|---|
| C1 | Se conservan títulos y descripciones; «Corregir «…»» para una rechazada. **Cambia** a dos columnas (`sm:max-w-5xl`): formulario y «Así se verá». |
| C2 | **Cambia**: barra de tinta con el costo de la categoría, «Cancelar» (cristal) y el envío con spinner. Se conserva la guarda de doble envío. |
| C3 | Se conserva (tarjeta elegida marcada). |
| C4–C8 | Se conservan literales, ahora en el paso 4 «Cabecera, pie y botones». El aviso de escritorio pasa a `Alert` de advertencia. |
| C9 | Se conserva, en el paso 1 «Nombre e idioma» (plegado al editar, con «fijos»). |
| C10 | **Se corrige** (D5): `Select` del sistema. |
| C11 | Se conserva. **Nuevo**: al editar una aprobada, las otras categorías se deshabilitan y se explica por qué. |
| C12 | **Se corrige** (D5): `Textarea` del sistema. Se conservan chip, contador, reglas y errores. |
| C13 | Se conserva. |
| C14 | **Se corrige** (D3): la previa muestra cabecera, cuerpo, pie y botones (dos visibles y «Ver todas las opciones» con más de tres) con los colores de WhatsApp (`.wa-preview`, globals.css). En el celular, plegable arriba. |
| C15 | Se conserva «Qué pasa al enviar» (con «En revisión»). El costo pasa a la barra. |
| C16–C17 | Se conservan. Un error abre el paso donde está y el paso lo dice («Hay algo que corregir»). |
| C18 | Se conservan los avisos de éxito. **Se corrige** (D1–D2): el error se dice DENTRO del formulario y se queda: ya existe aquí («Ver la plantilla» / «Usar …_v2»), Meta ya la tiene («Sincronizar»), Meta no la aceptó (su detalle y la referencia `fbtrace_id` copiable), no la aceptaría (4xx) y **sin respuesta**: no deja reenviar hasta «Actualizar la lista»; si llegó, cierra y lo dice. |
| **Nuevo** | Corregir una rechazada: «Por qué la rechazó Meta» arriba y el texto «Antes» en la columna de la previa cuando se cambia. |

## Compartido

- `shared/ui/dialog.tsx`: la X de cierre tenía 16 px de objetivo; ahora 32 px (`after:-inset-2`), sin moverla.

## Verificación

- Arnés `docs/qa/meta-templates-premium/arnes` (13 escenarios): base, largos, error, vacío, sin Cloud, solo lectura, nueva, piezas, corregir, existe, existe en Meta, rechazo y sin respuesta; 1440/1024/768/390, claro y oscuro. Sin desbordes; a 390 px la tabla scrollea 7 px dentro de su tarjeta.
- Jest: `meta-template-view.test.ts` (nuevo), `MetaTemplatesView.test.tsx` (+3) y `CreateHsmTemplateModal.test.tsx` (+5).

## Segundo incidente (2026-09-28 p. m.): nombre reservado tras borrar y rechazos de Meta

Servidor `d2dfe902` + cliente (este commit). Contra `docs/incidents/2026-09-28-plantilla-hsm-nombre-bloqueado-tras-borrarla-en-meta.md`.

| Antes | Ahora |
|---|---|
| Recrear una borrada: 502 «Meta rechazó la operación: Invalid parameter» | 409 `channels/template_name_locked`: «Meta tiene reservado «x» (es_CO) hasta el 28 oct», con «Usar x_v2» y el foco en el nombre. Con el borrado hecho desde axi, la fecha es exacta y no se llama a Meta; si se borró en el Business Manager, la fecha es estimada y se dice. |
| Cualquier rechazo de contenido de Meta: el mismo 502 con «Invalid parameter» | 422 `channels/template_rejected`: motivo en español (cabecera, texto, pie, variables, tope de 250…), lo que dijo Meta y «Ir a corregirlo», que abre el paso. |
| El 502 se leía como rechazo | «No pudimos hablar con Meta»: solo lo infra (5xx, red, credenciales) llega ahí. |
| Aviso de borrado con el bloqueo de 30 días solo en aprobadas | En todas salvo la rechazada (que «queda libre al momento»). |
| Sincronizar: solo cuántas trajo | También cuántas retiró porque Meta ya no las lista (`removed`). |
| «Preguntando a Meta cada 15 s» | «Comprobando cada 15 s si Meta ya decidió»: el sondeo lee nuestra base, no llama a Meta. |

Escenarios nuevos del arnés: `reservado` (409 con fecha) y `formato` (422 cabecera), a 1440 y 390, claro y oscuro, sin desbordes.
