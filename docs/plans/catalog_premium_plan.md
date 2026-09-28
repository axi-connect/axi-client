# Catálogo premium — plan

Estado (2026-09-27): F0 aprobado por el dueño. F1 servidor certificado (axi-server `feat/catalog-premium` c9b984fb). F2 (listado) certificado. F3 (ficha y crear) certificado. F4 certificado. F5 (tienda conectada y cierre) implementado; en auditoría. Paridad: `docs/plans/catalog_premium_f{2,3,4,5}_paridad.md`; render: `docs/qa/catalog-premium/` del monorepo.
encargo del dueño. Mismo proceso que Llamadas, Marketing y Comercial.

- Inventario de paridad: `docs/plans/catalog_premium_inventario.md` (A listado, B ficha, C taxonomía, D qué cambia).
- Canvas: `https://claude.ai/artifact/MNPgBLxo7STggSyHuivrjC` · copia en `docs/design/mockups/catalog-premium/`
  del monorepo (`audit.js` + `capturas/`).

## Tableros

1 Productos (tabla, bento + isla «Lo próximo») · 2 en oscuro · 2b en el celular · 3 tarjetas con filtros activos ·
4 ficha (isla «Para que tu agente lo venda», fotos con principal, búsqueda con IA, variantes con ajuste de stock) ·
5 ficha en el celular · 6 crear en pasos plegables + «Antes de crear» + barra de tinta · 7 estados · 8 categorías
(árbol con conteos y origen, edición) · 9 tipos de producto · 10 un tipo: editor de atributos + barra de tinta ·
11 catálogos (+ diálogo de crear).

Una isla por pantalla: listado → «Lo próximo»; ficha → «Para que tu agente lo venda»; crear y tipo → la barra de
acción en tinta; categorías, tipos y catálogos → ninguna.

## Fases propuestas (cada una con gate del dueño)

- **F1 — servidor**: `GET /catalog/summary`; filtros del listado `has_images`, `stock_state`, `uncategorized`,
  `enrichment_status`; `product_count` en categorías, tipos y catálogos; `vertical` en el árbol. Tests + openapi.
- **F2 — listado**: bento + isla, búsqueda única, filtros en la URL con chips, tabla `@container`/tarjetas con los
  mismos datos, estados (D.1 1–11).
- **F3 — ficha y crear**: cabecera, isla de la ficha (dominio puro), fotos con principal, confirmación de regenerar,
  guardas de cambios sin guardar y de permiso, crear en pasos (D.1 12–19).
- **F4 — taxonomía**: árbol (búsqueda completa, origen, acciones en fila), tipos y catálogos como listas con
  buscador/orden/paginación, editor de atributos con barra de tinta (D.1 20–25).
- **F5 — tienda conectada y cierre**: `locked_fields` visibles campo a campo, copy en inglés de compartidos, migas.

## Verificación

F0: `audit.js` sobre los 12 tableros (sin desbordes; solo quedan truncados con `title`, textos sr-only y los
carruseles que scrollean dentro de sí). Por fase: verja barata mía (tsc/lint/jest acotados), render real 390 → 1440
claro y oscuro, y la auditoría de `audit-upgrade-design` (código, verjas, render, paridad contra este inventario).
