# Comercial C3 — la ruta como navegación

- **Canvas aprobado por el dueño (2026-09-27):** https://claude.ai/artifact/FumpQm7AXWNvu4mvfgpRqt. El generador y el medidor están en `docs/design/mockups/comercial-ruta/`, en el repo de docs.
- **Rama:** `feat/comercial-ruta`, sobre `feat/comercial-premium` (e543eabd; C1 y C2 certificadas, aún sin fusionar).
- **Alcance:** solo cliente; el contrato no cambia.
- **Paridad:** se sigue marcando en [comercial_premium_inventario.md](comercial_premium_inventario.md). Esta fase reemplaza el instrumento de C1 y el editor de C2, así que cada punto de esas secciones tiene aquí su nuevo sitio.

## C3a — `/comercial`: el mapa
El `RouteHero` (cifra, línea y franja) se sustituye por `RouteMap`. `RouteLine` se queda intacta para la franja del Panel.

### El mapa
- Un plano neutro (manzanas en un `<pattern>`) y la carretera: una curva fija en un `viewBox`.
  - Las marcas salen de un dominio puro (`domain/route-map.ts`: muestreo de Bézier y punto por fracción).
  - Las etiquetas son HTML en %, sobre una caja con el mismo `aspect-ratio` que el `viewBox`.
  - Hay dos trazados: ancho (deja libre la franja del panel) y estrecho (para cuando el mapa va solo arriba).
- **Recorrido:** coral hasta «Vas aquí» (vendido / meta), con la cifra y el %.
- **Tramo lento:** en ámbar hasta «Deberías ir en» (esperado), con «vas $ X por debajo» o «por encima».
- **Proyección:** en tinta hasta «Si sigues así llegas a» (proyección / meta; si pasa de la meta se dice su %).
- **Lo que falta:** punteado.
- **Hitos:** la salida («1 sep»), las semanas ya recorridas como hitos (S1…) y la bandera «Meta · $ X · {último día hábil}».
- **Aprendiendo:** sin tramo lento ni proyección.
- **Cumplida:** toda la carretera en coral y la bandera alcanzada.

### El panel de navegación (la isla)
- **Destino:** la meta, `goalLead` y «Cambiar», que lleva a `/comercial/meta` (solo con manage).
- **Ritmo:** píldora de ritmo, «N días hábiles · hasta el {día}», y la frase `paceHeadline` con lo accionable en negrita.
- **Indicaciones de hoy** (dominio `todaySteps`): por cada resultado clave, lo que falta dividido entre los días que quedan, redondeado hacia arriba. Van con la tasa que lo explica, «faltan N» y el estado; hasta 4, las de ritmo bajo primero. En aprendiendo no hay indicaciones: va `learningLine`.
- **Rutas · las prepara Axi:**
  - La ruta actual y las acciones pendientes. Llegada con la ruta = proyección + ventas estimadas × ticket del plan, redondeada y con «≈».
  - Elegir una la previsualiza en el mapa y en la llegada estimada.
  - «Tomar esta ruta · aprobar» usa el mismo `onApprove` que abre el detalle. «Ver el detalle» enlaza a la hoja.
  - Sin permiso: la línea de solo lectura. Cargando, error con reintento y vacío según el ritmo: los mismos textos de hoy.

### La llegada estimada
- Una tarjeta con el % de llegada, el dinero, la barra (recorrido + lo que suma la ruta elegida) y «faltan N ventas».
- La nota dice cuánto te queda o qué cambia la ruta elegida.

### Bajo el mapa, sin cambios de datos
- `WeekTile`, `TicketTile` y `KeyResultGrid`.
- Una ficha nueva, «Decididas este mes»: las aprobadas y descartadas con su motivo y «Ver qué quedó». Sale de `RecommendedActions`, que desaparece porque su contenido pendiente vive ahora en el panel.

### En estrecho (por debajo de `@4xl`)
- El mapa estrecho va arriba, sin paneles encima.
- Debajo, la llegada estimada y el panel como tarjeta, en el orden del canvas 3.

## C3b — `/comercial/meta`: fijar el destino
- **El mapa del destino:** la salida (hoy), las paradas del embudo al revés (conversaciones → contactados → citas → cotizaciones → ventas) con sus cifras de la vista previa, y la bandera con la meta tecleada.
- **La isla (buscador del destino):** título, el mes pasado, la cifra, los atajos y el alza. El aviso de mitad de mes va encima.
- **«Así queda tu viaje»:** velocidad, duración, por semana, sobre el mes pasado y lo alcanzable; hoy es «Así queda tu mes».
- **Lo que se conserva debajo, sin cambiar sus reglas:** «Lo que implica» con tasas, procedencias y todos sus estados, «Ajustar supuestos» y Guardar / Cancelar.

## Verificación, una vez por fase
- Tests: dominio (`route-map`, `todaySteps`, llegada con ruta) y componentes. Jest acotado a `src/modules/commercial`.
- Render con el arnés de `docs/qa/comercial-premium`:
  - 1440 / 1129 / 768 / 390, en claro y oscuro.
  - Estados: ritmo bajo, al ritmo, adelantada, cumplida, aprendiendo, sin propuestas, solo lectura, extremos y mínima.
  - Con una ruta elegida, se miden los solapes de etiquetas.
