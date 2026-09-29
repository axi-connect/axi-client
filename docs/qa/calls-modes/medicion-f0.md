# Medición del mockup F0 — Llamadas: modos y marcos (2026-09-29)

Fuente: `docs/design/mockups/calls-modes.build.py` → `calls-modes.html`. Medido con `medir.js` (Chromium
headless): 6 vistas × 375/768/1280 × claro/oscuro = 36 renders. Criterio: cero scroll horizontal de página, ningún
elemento fuera del viewport (ignorando lo recortado por un ancestro con `overflow`) y ningún texto `nowrap` cortado.

Resultado final: **36/36 sin hallazgos**. Capturas de muestra en `capturas/`.

Defectos encontrados y corregidos durante la medición:
1. La onda de la grabación (96 barras con `min-width:2px` + `gap:2px`) desbordaba 54 px en 375.
2. El marco del teléfono (390 px) desbordaba 15 px en 375; y dentro del marco, `.page` con `margin:0 auto` en un
   flex de columna quedaba a ancho de contenido y el frame recortaba el texto (en 375 y 768).
3. En las islas de tinta el texto gris era invisible: los tokens derivados (`--muted-foreground`, `--secondary`,
   `--border`) se resuelven en `:root` y la isla hereda el valor ya calculado — el mismo gotcha documentado en
   `globals.css` para `.surface-dark`. La isla del mockup los re-deriva; en el producto lo hace `.surface-dark`.
4. Colisión de clase `.next` entre la ruta de etapas y la isla «Lo próximo» (las etapas futuras se partían en dos
   líneas). Renombrada a `.nextup`.
5. La ruta de 7 etapas dentro de la isla del resumen (360 px) scrolleaba; ahora envuelve sin conectores.
6. «Este ciclo» estiraba con la fila del bento; el bento alinea arriba.
7. Filas de «Lo último que terminó» en 375: nombre · estado · duración en una fila de tres columnas.
