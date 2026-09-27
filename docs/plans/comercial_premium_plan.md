# Comercial premium — plan

Canvas aprobado (F0, 2026-09-25; luz verde 2026-09-27): https://claude.ai/artifact/JpZ7pzwdf8emGMH7WjLcZu, con copia en
`docs/design/mockups/comercial-premium/` del repo de docs. Lista de paridad: [comercial_premium_inventario.md](comercial_premium_inventario.md).
Rama `feat/comercial-premium` sobre `origin/main` 9cb96f27. Solo cliente: el contrato del servidor no cambia.

## Lenguaje
El del Panel y Marketing premium (DESIGN-SYSTEM §9.5):
- Cabecera con kicker «Comercial · {mes año}» y «En vivo» si el socket está conectado.
- El instrumento (la ruta) es una tarjeta grande con un brillo coral, y debajo va un bento.
- Una sola isla por pantalla, «Axi propone» (`InkIsland glow="ai"`, en el material por defecto).
- Estados con `StatePill` (punto de color, texto en foreground) en vez de badges tintados.
- Rejillas con container queries.
- Las listas siguen siendo listas, no tablas.

## C1 — La ruta del mes (`/comercial`)
- **Cabecera:** kicker, título, `goalLead`, «En vivo» y «Cambiar meta».
- **Hero `RouteHero`:**
  - Cifra de 88 px con conteo, procedencia y píldora de ritmo; la frase va con las ventas al día resaltadas.
  - `RouteLine` gana el tramo rayado de la brecha y la marca «Hoy · {día}».
  - Debajo, cuatro cifras: Faltan, Quedan, A hoy deberías llevar y Si sigues así (dominio `route-figures.ts`).
- **Bento:**
  - «Ritmo · esta semana» con barras diarias (dominio `weekBars`) y el enlace a Ventas.
  - «Ticket promedio» con real, plan y desvío.
  - Isla «Axi propone»:
    - Contador «N por decidir» y «La que más te acerca» (la primera pendiente, en grande, con «Ver el detalle» y «Aprobar»).
    - El resto de pendientes en filas.
    - «Semanas anteriores» con las aprobadas y las descartadas del mes, junto con su motivo.
    - La nota «Nada se envía sin tu aprobación».
- **«Lo que hace falta»:** los resultados clave en rejilla de dos columnas. Cada uno lleva su barra con la marca de «dónde deberías ir hoy», la píldora de ritmo y la procedencia. Se conservan la 2.ª línea (mix y contestadas) y la fila de ticket.
- **Estados:**
  - Sin meta: la invitación con la semilla.
  - Aprendiendo: sin marcador ni proyección, y con el aviso.
  - Al ritmo y adelantado: sus cifras.
  - Cumplida.
  - Errores y silueta nueva con la misma estructura.
- **Celular:** 390 px con una sola columna, y la isla va antes del ritmo, como en el canvas 7.
- **Limpieza:** se borran `LearningNotice`, `PaceLine` y `KeyResultRow` si quedan sin uso, con sus tests adaptados.

## C2 — Meta y hojas
- **Editor `/comercial/meta`:**
  - Rejilla de dos columnas: a la izquierda la cifra, los atajos y «Lo que implica»; a la derecha «Así queda tu mes» (ventas al día hábil, sobre el mes pasado, por semana y la frase de alcanzable).
  - «Ajustar supuestos» y guardar sin cambios de comportamiento.
- **Hoja de resultado:** kicker «Resultado clave · {mes}», cifra, tendencia con la leyenda «Real · N / Esperado · N a hoy / Si sigues así · N», y las listas sin cambios de datos.
- **Hoja de acción:** kicker «Axi propone · {tipo}» y las secciones con el mismo contenido.
  - El coste, la plantilla y «Ver lista» NO se pintan: no hay dato.

## Fuera
- La franja del Panel (`GoalProgressBlock`): ya está certificada con el Panel premium.
- El servidor.

## Verificación (una vez por fase)
- Pruebas: lint, tsc y jest acotados a `modules/commercial` más las de sus consumidores.
- Render con arnés Playwright a 1440, 1129×549, 768 y 390, en claro y oscuro, midiendo desbordes.
- Recorrido de la lista de paridad.
