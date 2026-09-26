# Cobros premium: hotfix de diseño fase por fase

> Aprobado por la dueña el 2026-09-26 («aprobado, procede a implementar fase por fase»).
> Es un **hotfix de diseño** sobre `main`, después de fusionar Cobros. Se hace en una sola rama,
> `hotfix/cobros-premium`, que se borra al fusionar.
>
> Lienzos aprobados, uno por fase, con el criterio de la isla ya aplicado:
>
> | Fase | Lienzo |
> |---|---|
> | F1 Funciones | https://claude.ai/artifact/3puYSgKxoJS53b7vFLTxeM |
> | F2 Pagos, TRM y fecha del servicio | https://claude.ai/artifact/MWXrm93Cnsa6a44fiokx9S |
> | F3 El abono | https://claude.ai/artifact/9cvsL1QnvgWuoQKgCgGqdp |
> | F4 La cartera | https://claude.ai/artifact/6ZMt7Dwy9QFPrPD2LJrEaA |
> | F5 Recordatorios | https://claude.ai/artifact/YEMvewDyAfxuUcC6NxL16q |
>
> Las fuentes de los lienzos están en `docs/design/mockups/cobros-premium/f1…f5/` y la receta del cristal para mockups en `island-recipe.css`.

## 0. Reglas que mandan

- **Lenguaje:** el de DESIGN-SYSTEM §9.5–§9.8, con `BentoTile`, `StatePill`, `BentoFigure`, `BentoLink`, `InkIsland` y
  `Island`. Nada de estilos de isla escritos a mano.
- **La isla** (§9.5.1, criterio de la dueña):
  - Las islas de contenido van en cristal blanco (`InkIsland`, el aspecto por defecto).
  - Van en **tinta** (`material="ink"`):
    - las barras de acción pegadas abajo: «Cambios sin guardar»;
    - la franja-resumen del tablero de pedidos: «Por revisar».
  - Llevan brillo `ai` las islas que muestran lo que dice el agente: cotización y medios de pago. El resto lleva
    brillo de marca.
  - Dentro de una isla no se usa `text-background`. El botón fuerte es `contrast` y la acción secundaria es `glass`.
- **Continuidad:** el vocabulario aprobado de F4–F9 no se toca (la dueña rechazó en F9 una vuelta con cristal y coral en los diálogos):
  - diálogos sólidos, sin cristal;
  - el coral solo como acción;
  - el estado en el punto y el texto en `foreground`.
- **Una fase es un commit o una serie corta de commits.** Cada fase sigue estos pasos:
  1. Verjas.
  2. Render medido según §12: 390, 768, 1024, 1280 y 1440 px, en claro y oscuro, con datos largos.
  3. Avisar «listo P<N>» al auditor.
  4. Pasar a la siguiente fase.
- **Cada arreglo de lógica lleva un test de los dos signos.** Los componentes nuevos llevan su test de estados:
  cargando, vacío, error, 403 y la función apagada.
- **Datos:** no se inventa nada.
  - Lo que el lienzo muestra y el servidor no entrega queda fuera, o se agrega al servidor con su test (§6).
  - Las frases «del agente» de los lienzos son ilustrativas. En el producto se muestra el texto real que
    sale (plantilla o política), o no se muestra.

## 1. P1 · Funciones y tipo de negocio

| Pieza | Hoy | Queda |
|---|---|---|
| `companies/.../FeaturesTab.tsx` + `FeatureSwitchRow.tsx` | Lista de filas con interruptor | Rejilla bento. Arriba, una ficha ancha «Tu tipo de negocio» con `StatePill` «N de 4 encendidas» y `BentoLink`. Debajo, una `BentoTile` por función con icono, estado, origen, interruptor y un pie que dice lo configurado + «Ver en …» o «Configurar». A la derecha, la isla «Puesta en marcha de cobros»: N de M listas, tramos y lo que falta con su CTA |
| Función con dependencia apagada | Nota ámbar | `StatePill` «En espera» + pie «Se activa cuando enciendas …» + «Encenderlo» |
| Fijada por Axi | Candado y texto | Interruptor deshabilitado con candado + «Escribir a Axi» |
| Sin Ventas en el plan | Caja a mano | `Alert variant="warning"` + interruptores deshabilitados + «Ver mi plan» |
| `GeneralTab.tsx` (tipo de negocio) | Select | `radiogroup` de tarjetas. La isla «Al guardar» muestra qué funciones sugiere el tipo elegido. La barra de tinta «Cambios sin guardar» sustituye a los botones de la cabecera |
| `platform/.../TenantFeaturesView.tsx` | Tabla | Isla horizontal «Fijadas por la plataforma» con el último override, su motivo, quién y cuándo, y «Ver en Auditoría». Filas con la escalera tipo de negocio → tenant → plataforma y la que manda en tinta |
| Diálogo «Forzar» | `Modal` | Sólido: qué pasará, motivos rápidos y motivo obligatorio |

**«Configurada» (el pie de cada ficha y la isla)** se deriva en el cliente de lecturas que ya existen, pedidas solo
para las funciones encendidas:

| Función | Se lee de | Cuenta como configurada si |
|---|---|---|
| Plan de pagos | `GET /collections/settings` | `deposit_pct` + `installments_strategy`; el pie resume la política |
| Recordatorios | la misma lectura | hay al menos un día en la cadencia y un texto encendido |
| Moneda | `GET /fx/settings` | se cobra en COP con TRM o tasa manual vigente |
| Documentos | `GET /documents/settings` y tipos | hay una plantilla publicada para contrato o recibo |

Si una lectura falla, la ficha dice «No pudimos leer…» (§9.5, datos por rol) y la isla no cuenta esa función.

**Servidor (el único cambio de P1):** `GET /features` gana `niche_defaults: Record<niche_code, FeatureCode[]>`, leído
de `NICHE_FEATURE_DEFAULTS`, para la vista previa de «Al guardar» sin copiar el mapa al cliente.
- Test: el endpoint devuelve el mapa exacto del catálogo.
- Test de contrato: un nicho nuevo aparece sin tocar el cliente.

## 2. P2 · Pagos, Moneda y TRM, Medios, fecha del servicio

- **`FxSettingsTab` / `FxRateCard` / `FxSettingsForm`:**
  - Dos fichas: «TRM de hoy» y «Tu tasa». La segunda lleva `BentoFigure` y el ejemplo de US$ 3.500 en el pie.
  - Los ajustes van como filas con stepper para el ajuste en %, interruptores y select.
  - La isla `glow="ai"` es «Así cotiza el agente hoy»: dice la tasa que usa, cuándo se fija y la moneda de cobro.
    La burbuja muestra solo la cifra calculada, con el mismo cálculo que `sampleQuoteCents`, sin inventar el texto
    del agente.
  - Estados:
    - «Esperando la de hoy»: `StatePill` info + «Fijar una tasa manual».
    - «Sin actualizar desde…»: `StatePill` warning.
    - «Manual hasta …».
    - Función apagada: `FeatureDisabledState` en bento + «Ir a Funciones».
  - Barra de tinta «Cambios sin guardar».
- **`PaymentMethodsTab` / `PaymentMethodCard`:**
  - Una `BentoTile` por medio, con `StatePill` «Activo» o «Solo para ti» (`visible_to_ai`).
  - El número va en mono; titular e instrucciones, en filas.
  - La isla `glow="ai"` muestra «Lo que el agente comparte»: N de M medios y la lista de los que tienen
    `visible_to_ai`, con sus datos reales.
- **Catálogo › producto:**
  - Con un eje `date`, `VariantsTable` se presenta como «Salidas»: calendario con nodos por fecha y fichas por
    variante con la fecha grande, el precio y la barra de cupos (stock).
  - La isla «La fecha manda» sale del plan de pagos del tenant (`final_due_days_before_service`).
  - Sin eje `date`, la tabla queda como hoy.
- **Pedido:**
  - La ficha «Fecha del servicio» + la isla «La salida · N días», con saldo, pagado y falta.
  - El 422 `orders/mixed_service_dates` como `Alert variant="destructive"`, con «Quitar la del …».

## 3. P3 · El abono

- **`OrderDetailRail` / `OrderBalanceBlock`:**
  - La ficha «Falta por cobrar», con el medidor cobrado / por revisar (rayado) y la ficha «Saldo vence».
  - La lista de pagos y «Lo que pasó» (`OrderTimeline`).
  - La isla:
    - con un pago `reported`: «Llegó un comprobante», con el comprobante, «Dice que pagó», «Si es cierto, falta» y
      el botón `contrast` «Revisar el pago»;
    - si no, «Lo próximo: el saldo».
  - Saldo cubierto: «Cobrado por completo» + la isla «Está al día» + «Enviar el estado de cuenta» si `documents` está
    encendida.
- **`PaymentReviewDialog`:**
  - Queda sólido, con el resumen «Cobrado después», «Falta» y «recibe el aviso».
  - Las tres variantes del lienzo (sin monto, pago de más con el excedente nombrado, rechazar con motivos rápidos)
    salen del comportamiento que ya existe.
- **`OrdersKanban` / `OrderCard`:**
  - La barra de cobro en la tarjeta y el `StatePill` del cobro.
  - La franja de **tinta** «Por revisar: N comprobantes · $ …», calculada con las tarjetas cargadas que tienen un pago
    reportado, con «Revisar el primero».
  - No hay columna nueva.
- **`OrderNotificationTemplatesForm`:**
  - Lista de avisos con interruptor y editor con tokens: `{{amount}}` y `{{balance}}` marcadas como «de este aviso».
  - La isla «Así le llega a …» se rellena con los datos del pedido de ejemplo, con la misma función de relleno que el
    servidor si existe; si no, sin isla.

## 4. P4 · La cartera

- **`ReceivablesView` / `ReceivableSectionList`:**
  - El hero en ficha: «Por cobrar», vencido, prometido, clientes y la barra vencido / por vencer / al día. Lo lee de
    `ReceivablesStatsDto`.
  - Secciones con el total de cada una.
  - Filas con el punto de la prisa del dinero, el icono del servicio o de la promesa, el estado en texto, el monto,
    «Escribir» y «…».
  - La isla «Escribe primero a» es la primera fila del orden:
    - el monto, la frase del porqué y «Venció hace N días»;
    - el «Último aviso», de `last_reminder`;
    - «Escribirle» (`contrast`) y «Anotar promesa» (`glass`).
    - «Respondió» queda **fuera**: el servidor no lo entrega.
  - En el celular, los resúmenes van en piezas `nowrap`. Eso cierra el bajo de la QA «#0004 · sale el…».
- **`PaymentPlanBlock`:**
  - Las tres cifras, el calendario vertical con el riel y la nota del equipo al pie.
  - La isla «Lo próximo: cuota N», con sus avisos (`last_reminder`).
  - Arreglar aquí el bajo de las dos filas «Saldo» después de reprogramar: una sola fila «Saldo», la última.
- **`RegisterInstallmentPayment`, `RescheduleDialog` y `PromiseDialog`:**
  - Registrar abono: chips «La cuota», «Otro monto» y «Todo», y el reparto FIFO por cuota a la vista, calculado
    con la lógica de asignación pura que ya existe o que se extrae.
  - Reprogramar: segmentado de 1, 2 o 3 cuotas, la suma que cuadra en vivo y el descuadre que bloquea el guardado.
- **`PaymentPolicyTab`:**
  - Filas con stepper y segmentados.
  - La isla «El calendario que produce» para una salida de ejemplo, con `sampleServiceDate` y la misma lógica de
    calendario que ya usa la pestaña.
  - Barra de tinta «Cambios sin guardar».

## 5. P5 · Recordatorios

- **`RemindersTab` / `ReminderCadenceRow`:**
  - Chips de días antes y después, y «Callar si promete pagar».
  - «Qué decimos»: tres filas con interruptor y el texto resumido.
  - El `Alert warning` de la plantilla HSM que falta, justo donde se decide.
  - La isla «Así le escribimos» es la conversación: `ReminderThread` rellenado para una cuota de ejemplo. Un texto
    apagado deja un hueco punteado, y arriba va el conteo «N mensajes como mucho».
- **Editor de texto:**
  - Tokens, variables del servidor (`available_variables`) y la desconocida marcada.
  - Guardar se bloquea mientras quede una variable desconocida.
  - La isla con la vista previa.
- **`SendReminderDialog`:** sólido. Muestra «toca el texto …» por la fecha de la cuota, el texto editable solo para
  esa vez y las dos tarjetas de canal (patrón F9).
- **`ReminderHistory`:** eventos con su icono y su `StatePill` (salió, no salió o falló) y la razón en negrita. La
  isla «Lo próximo».

## 6. Servidor

| Cambio | Fase | Test |
|---|---|---|
| `niche_defaults` en `GET /features` | P1 | spec del query + OpenAPI regenerado + `api:types` |

Nada más: el resto sale de lecturas que ya existen. Si al implementar aparece otra falta, se escribe aquí antes de
codificar.

## 7. Verificación por fase

- **Cliente:** `NODE_OPTIONS=--max-old-space-size=3072 npx tsc`, lint, jest de los slices tocados y `next build`, uno
  a la vez.
- **Servidor** (solo en P1): `npm run typecheck`, lint, unit del slice `features` y `openapi:generate`.
- **Render §12:** arnés Playwright con respuestas reales y reloj fijo, en los cinco anchos y los dos temas, con datos
  largos. El informe de detectores va adjunto al «listo P<N>».
- Al final de las cinco fases:
  1. La batería completa del auditor.
  2. El humo de la QA en el navegador.
  3. El OK de la dueña.
  4. Fusionar el hotfix a `main` y borrar la rama.

## 8. Fuera de alcance

- Nada nuevo del agente F6, WhatsApp Web para medios ni `delivered`.
- El 422 repetido de `GET /attachment` (un bajo del auditor) se arregla en P3, porque toca el mismo rail: no pedir el
  comprobante si el pago no lo tiene. Lleva su test de los dos signos.

## 9. Estado de la implementación (2026-09-26)

Las cinco fases están implementadas en `hotfix/cobros-premium`. Los tests que ya existían en Cobros siguen verdes **sin
tocarlos**; cada pieza nueva de lógica lleva su test de los dos signos.

### Decisiones al implementar, contra el lienzo

Todas salen de lo que el servidor entrega de verdad o de las reglas de §0.

- **P4 · Cartera:**
  - La isla «Escribe primero a» **no aparece si todos van al día**. No se promueve a alguien que no debe nada todavía.
  - La cifra de la isla es **lo vencido** si lo hay, con «debe $ X en total» al lado; si no hay nada vencido, es el
    saldo.
  - Los conteos del resumen son «Pedidos en mora» y «Clientes en mora» (`ReceivablesStatsDto`) y solo acompañan a
    «Te deben». Con un filtro puesto contarían otra cosa que la cifra.
  - La barra tiene dos tramos, vencido y lo demás. El servidor no da «por vencer» como cifra.
  - El total de cada sección se muestra solo si tiene más de una fila.
- **P4 · Plan de pagos en el pedido:**
  - Las tres cifras no se repiten, porque ya las dice el bloque de cobro que va justo encima.
  - «Lo próximo» es isla **solo si el rail no muestra ya la del comprobante por revisar**; si la muestra, baja a ficha.
    Hay una isla por pantalla.
  - La acción de la isla es «Registrar el abono» y abre el diálogo del rail.
  - La isla «Lo próximo» de P5 (historial de avisos) es esta misma. No se pinta una segunda.
- **P4 · Registrar abono:** los atajos y el reparto aparecen solo con plan (lo pasa el rail); en el kanban el diálogo es
  el de siempre. El reparto usa `allocationPreview`, que copia la regla `allocateFifo` del servidor (por `seq`, cada
  cuota hasta lo que le falta).
- **P4 · Política:**
  - `POST /collections/plans/preview` calcula con la política **guardada**. Mientras haya cambios, la isla lo dice («guarda
    para ver el de tus cambios») en vez de prometer que se mueve con el borrador.
  - La venta de ejemplo pasa de $ 108.500 (un error de unidades) a $ 14.000.000.
  - La fila «Qué dice el agente» del lienzo no se implementa: la frase era ilustrativa.
- **P5 · Recordatorios:**
  - El hilo se construye con la cadencia real (`reminderThread`), un mensaje por desfase y con la misma elección de
    texto que el servidor. Antes eran tres mensajes fijos.
  - «Guardar recordatorios» sigue siempre visible, igual que en Moneda (P2), y no va en una barra de tinta: los tests
    existentes lo exigen presente y activo.
- **P5 · Envío manual:** no hay `send-options` para recordatorios, así que las tarjetas de canal no dicen «escribió hace
  2 h». Si el aviso no puede salir, el servidor responde `skipped` y el diálogo lo dice. El botón es «Enviar ahora por
  WhatsApp/Correo».
- **Arreglos que venían de la QA:**
  - Una sola fila «Saldo final» tras reprogramar (`planInstallmentLabel`, cliente).
  - Las piezas del subtítulo de la cartera no se parten a 390 px.
  - No se pide `GET /attachment` si el pago no tiene comprobante (P3).

### Fuera del hotfix, anotado

- La X de cierre del `Dialog` global mide 16 px y su texto accesible está en inglés («Close»). Es de todos los diálogos
  de la app: no se toca en un hotfix de Cobros.

### Render

- Arnés en `/root/axi/qa/premium/cobros-render.mjs`: `node cobros-render.mjs p1 … p5`.
- Capturas e informes en `/root/axi/qa/premium/cobros/`.
- Entorno:
  - API `:3110` con la base `axi_render_cobros`;
  - cliente `:3200`.

### Ronda 2 del auditor (2026-09-26)

Hallazgos en `/root/axi/qa/premium/HALLAZGOS-P1-P5-codigo.md`.

**Medios, arreglados:**

- **M1.** Con el día 0 en las dos cadencias sale un solo aviso, `due_today`, como en `reminderStage`.
- **M2.** La plantilla aprobada se busca para cada texto y cuenta solo si WhatsApp está encendido. El aviso va junto
  al mensaje: «por WhatsApp no sale», no «no sale». La isla cuenta avisos y dice si cada uno sale por los dos canales.
- **M3.** La vista previa de los avisos del pedido rellena como `renderTemplate`:
  - el número va sin formato;
  - acepta espacios dentro de las llaves;
  - importe y saldo solo en el abono.
- **M4.** Nuevo `collections/public.ts`. El rail consume por él.
- **M5.** Fuera `cobros-setup.adapter`. Funciones lee los ajustes por los barrels de collections, payments y documents.
- **M6.** El plan del rail va atado a su pedido (`planFor` y `key` en el bloque).

**Bajos, arreglados:**

- **B7.** «Venció…» durante la gracia.
- **B8.** Los cupos del calendario siguen la misma regla que la tabla (`available`/umbral). Los servicios no muestran
  cupos.
- **B9.** La isla y «Verificar pago» comparten `pendingProofs`. No se resta un reporte en otra moneda.
- **B10.** `splitSchedule` sale del calendario original y reparte las fechas.
- **B11.** La franja cuenta lo que hay en las columnas (`boardOrders`).
- **B12.** `useRadioGroup`: un solo tabulador y flechas en el tipo de negocio y en el canal. «Fijada» vuelve a
  decirse con texto.
- **B13 (en parte).** La isla usa `orderNumberLabel` de `orders/public`.
- **B14 (en parte).** Una tasa manual vencida dice «la manual venció».

**Anotados, sin arreglar en este hotfix:**

- **B13.** `initialsOf` es la quinta copia de un helper de iniciales. Unificarlo en `shared/` toca las otras cuatro
  (llamadas, plataforma…), fuera de Cobros.
- **B14.** «Documentos» se da por configurado con la razón social del emisor, no con «plantilla publicada». Los
  ajustes de documentos no dicen si hay una plantilla publicada por tipo; eso es un cambio de servidor.

**Lo que aprobó la dueña en los lienzos:**

- La elección de **correo** en el envío manual está en el lienzo F5 («Enviar»: radiogroup «Por dónde» con WhatsApp y
  Correo) y en el §5 de este plan («las dos tarjetas de canal»).
- En «Registrar abono», el monto que se propone es la **cuota** (lienzo F4 «Abono», el chip «La cuota» elegido por
  defecto).
