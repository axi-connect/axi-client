# Comercial premium — inventario de lo que hay hoy: lista de paridad

Regla del dueño (2026-09-26): el rediseño cambia cómo se ve, **nunca lo que la pantalla hace ni lo que dice**. Cada
vista se cierra marcando esta lista; la auditoría la usa igual. Inventario sacado del código de `modules/commercial`
sobre `9cb96f27` (no de memoria ni del canvas). Textos entre comillas = los de hoy (pueden pulirse, no desaparecer).
Al final: lo que el canvas pinta y hoy NO existe (se decide, no se inventa).

## 0. Transversal (no cambia, se conserva tal cual)
- [ ] Gates: sin `commercial:read` → «No tienes acceso a Comercial» / «Pídele a un administrador el permiso de lectura del módulo.»; sin capacidad `crm` (o 403 `no_plan`) → bloqueado «Comercial no está en tu plan» + «Tus agentes siguen atendiendo y vendiendo…» + «Ver planes» → `/billing`; mientras `useEntitlements` carga NO se pinta el bloqueado.
- [ ] Carga una sola vez (`goal.status === "idle"`), `cancelStaleRetry` al desmontar, tiempo real `useCommercialRealtime` (meta, plan, ritmo y propuestas con debounce), propuestas pedidas con meta y una vez por montaje.
- [ ] Rutas: `/comercial`, `/comercial/meta`, `/comercial/resultados/[key]` y `/comercial/acciones/[id]` con hoja interceptada (`@sheet`, `back`) y página dura (`replace` a `/comercial`); `default.tsx` monta la ruta detrás; `loading.tsx` con la silueta.
- [ ] Superficie pública intacta: `GoalProgressBlock` (Panel), `commercialProposalHref`/`isCommercialProposal` (cmo), `useGoalChip` (briefing de Axel), `useRouteRates` (Analítica), `COMMERCIAL_BREADCRUMBS`.
- [ ] Cada cifra lleva su procedencia (`SourceMark`: «según tu historia» · «lo dijiste tú» · «supuesto para {nicho}», con icono). Voz «progreso»: nunca un negativo ni un regaño (`copy.ts` entero, testeado).
- [ ] Violeta SOLO en «Axi propone» (D4). El coral no significa nunca «mal»; ritmo con `PACE_BADGES` (Adelantado, Al ritmo, Ritmo bajo ×2, Aprendiendo tu ritmo, Cumplida).

## 1. La ruta del mes (`/comercial`, `CommercialView`)
- [x] Estados de la vista: error de meta «No pude cargar la ruta» + detalle + «Reintentar»; silueta; sin meta; con meta y ritmo cargando (silueta sin cabecera); error de ritmo «No pude leer el ritmo» + «Reintentar» (`reloadPace`); aprendiendo; con ritmo.
- [x] Cabecera: «Tu ruta de {mes}»; entradilla `goalLead` «Meta del mes: $ X · la pusiste tú / la fijaste con Alba / la propuso axi el {día}»; sin meta «Sin meta todavía.»; «Cambiar meta» → `/comercial/meta` solo con `commercial:manage`. Moneda: la de la meta, si no la del tenant, si no COP. Mes del navegador solo para nombrar sin `today`.
- [x] Hero (`RouteHero`, región «La ruta del mes»): cifra vendida con conteo (`useEntrance` = un solo motor para cifra y línea, respeta reduced-motion); «de $ meta · N %»; badge de ritmo (`displayStatus`, meta cumplida gana a aprendiendo); frase única `paceHeadline` por estado.
- [x] Línea (`RouteLine`): tramo recorrido en gradiente con id por instancia; marcador hueco «hoy» (no en aprendiendo); prolongación punteada hasta 104 % con etiqueta «cierre ≈ $ X · N %» arriba a la derecha; bandera de meta; S1…Sn bajo la línea con la semana de hoy cediendo su sitio a «hoy» y holgura de 6 % (V7); pista al 50 % (≥ 3:1, fijado por test); etiqueta accesible con cifras («$ 18,9 M de $ 30.000.000, 63 % recorrido, 77 % esperado a hoy, proyección …»); variante `compact` (Panel).
- [x] Aprendiendo: aviso «Estamos aprendiendo tu ritmo.» + `learningLine` («Llevas N días hábiles de datos; con 3 empezamos a proyectar, y a los 30 días tus tasas reales reemplazan los supuestos por tipo de negocio.»); sin línea de ritmo.
- [x] Ritmo de la semana (`PaceLine`): «Ritmo · esta semana»: N ventas (verde si ≥ esperadas) · esperadas M · X al día; enlace entero al detalle de ventas con su etiqueta accesible; no se pinta si `weekProgress` es null; «hoy» y días hábiles los manda el servidor.
- [x] Resultados clave (`KeyResultList`): titular «Resultados clave» + «Objetivo: vender $ X en {mes}»; orden `KR_ORDER` (Ventas cerradas, Cotizaciones enviadas, Citas agendadas, Contactados, Conversaciones nuevas, Llamadas hechas) solo las que vienen; fila: etiqueta, `missingLine` («27 de 43 · faltan 16» / «· N por delante» / «· completo»), ritmo «Ritmo X al día · esperado Y» + procedencia (aprendiendo: solo procedencia), regla de avance, badge solo fuera de ritmo, chevron al pasar; cada fila → `/comercial/resultados/{key}`.
  - [x] Ventas: 2.ª línea «Mix sugerido: 45 % Limpieza · …» (top 3) o, aprendiendo, «Aún sin historia para medir el ritmo.».
  - [x] Llamadas: 2.ª línea «Contestadas N de M».
  - [x] Fila «Ticket promedio» tras Ventas (si el plan trae ticket): real + «plan $ X» (o solo el plan), procedencia · «últimos N días» · «N ventas», regla real/plan, enlace a `avg_ticket`.
- [x] Axi propone (`ActionList`): firma `AssistantMark`; cargando (silueta «Cargando lo que Axi propone»); error + «Reintentar»; vacío según ritmo (`noProposalsMessage`: «Estás al día…» / «Axi está buscando qué puede acelerar la ruta; las propuestas salen al cerrar el día.» / aprendiendo «Cuando conozcamos tu ritmo, te proponemos acciones.»); línea de solo lectura si no puede aprobar y hay pendientes (`NO_APPROVE_PERMISSION_MESSAGE` / `NO_CRM_AI_MESSAGE`; nada mientras cargan capacidades).
  - [x] Fila: título (enlace estirado al detalle, sin botón dentro de `<a>`); titular violeta `proposalHeadline` («+2 ventas estimadas · cubre el 13 % de lo que falta para volver al ritmo») solo pendiente; razón; vencimiento («Vence hoy/mañana/el sábado/en N días», «Venció»); «Ver»; «Aprobar» (aria «Aprobar: {título}», ocupado) → aprueba y abre el detalle; error «No se pudo aprobar».
  - [x] Decididas del mes (`approvedThisPeriod`, hasta 3): badge (Aprobada/Descartada/Vencida/Reemplazada), «Se aprobó el {fecha}» si esta sesión no tiene el resultado, «Ver» o «Ver qué quedó» (solo con resultado de esta sesión, C6); tono bajado.

**C1 — dónde quedó cada cosa** (verificado en código y render, 2026-09-27):
- Cabecera: kicker «Comercial · {mes} {año}», `goalLead`, «Cambiar meta» (manage), y «En vivo · hora» solo con el socket conectado (si no, «Actualizado hora», del `computed_at` del servidor).
- Hero: los mismos datos (`paceHeadline` con «N ventas al día» en negrita, píldora de ritmo, cifra con conteo) y, además, «N % del camino» y la franja Faltan · Quedan · A hoy deberías llevar · Si sigues así (`route-figures.ts`). La etiqueta «cierre ≈ …» sobre la línea pasa a la cuarta cifra de la franja; la etiqueta accesible de la línea sigue diciendo la proyección con su importe.
- Aprendiendo: la frase dice «Estamos aprendiendo tu ritmo…» y los dos hitos (`learningLine`) van en la franja, en vez del aviso aparte; no hay «hoy» ni proyección.
- «Ritmo · esta semana»: es la ficha `WeekTile` (N ventas de M esperadas, X al día, barras por día hábil, raya de lo esperado, enlace y etiqueta accesible iguales). Como antes, no aparece en aprendiendo ni sin puntos de la semana.
- Resultados clave → «Lo que hace falta» (`KeyResultGrid`): la misma cifra, ritmo, procedencia, mix y contestadas, y el mismo enlace por fila. El «Objetivo: vender $ X en {mes}» sigue en el subtítulo. La píldora sale ahora también «Al ritmo» (antes solo fuera de ritmo) y la barra marca dónde deberías ir hoy.
- Ticket: la fila pasa a ser la ficha `TicketTile` (real, plan, desvío y procedencia · días · ventas) y abre el mismo detalle.
- «Axi propone» → isla «Acciones recomendadas» (`RecommendedActions`): los mismos estados, textos de vacío, línea de solo lectura, «Aprobar» que abre el detalle y «Ver qué quedó» (C6). Las decididas del mes suman las **descartadas con su motivo** (`?status=rejected`); al rechazar, la fila pasa a descartada en vez de desaparecer. «Se aprobó el 22 de septiembre» se dice ahora «Aprobada el 22 sep».

## 2. Definir la meta (`/comercial/meta`, `GoalEditorView`)
- [ ] Estados: sin permiso de lectura; bloqueado; error «No pude cargar la meta» + «Reintentar»; silueta; sin `commercial:manage` → «Solo un administrador puede cambiar la meta» + «Volver a la ruta».
- [ ] Título «¿Cuánto quieres vender en {mes}?»; «El mes pasado: $ X · N ventas · ticket $ Y» o «Una cifra, un mes. Te decimos qué implica.».
- [ ] Aviso de mitad de mes (`midMonthLine`) cuando hay meta y ya hay ventas.
- [ ] Cifra grande `PriceInput` (sr-only «Meta del mes en {moneda}»), «{moneda} · {mes}»; valor inicial = meta actual o sugerida; tocar la cifra pasa el atajo a «Otra cifra».
- [ ] Atajos (solo con mes pasado): «Como el mes pasado», «+10 %», «+25 %», «Otra cifra».
- [ ] «Lo que implica»: vista previa con debounce 350 ms y aborto; filas Ventas necesarias (ticket $ X), Cotizaciones (≈, «N % de las cotizaciones se venden»), Citas agendadas, Contactados, Conversaciones nuevas, Llamadas («N % contestan»), cada una con procedencia y «N en D días»; vacío «Escribe una cifra y te decimos…»; error; calculando; plan incompleto → aviso «Falta tu ticket promedio para trazar la ruta… El ticket nunca se supone.» y «Falta el ticket» en cada fila; error al recalcular «lo de abajo es de la anterior».
- [ ] «Ajustar supuestos» (plegable): Ticket promedio (`PriceInput`, «Como tu historia»), «Cotización → venta (%)» (decimal con coma); nota «Lo que cambies aquí pasa a decir «lo dijiste tú»…».
- [ ] Guardar: validación «Escribe cuánto quieres vender.», error del servidor, toast «Meta puesta» / «Empezamos a medir el camino.», vuelve a `/comercial`; «Cancelar».

## 3. Detalle de un resultado (`KeyResultSheetRoute` + `KeyResultDetail`)
- [ ] Hoja `lg`, título del resultado, subtítulo «Resultado clave»; sin permiso; clave inexistente «Ese resultado no existe.»; sin meta «Aún no hay meta este mes…» + «Definir la meta» (manage); cargando; error; «Este resultado no está en tu ruta de este mes.».
- [ ] Cifra grande «27» + «de 43 · faltan 16» + badge fuera de ritmo; ticket: real o «—» + «plan $ X».
- [ ] Tendencia acumulada (solo ventas, no aprendiendo): real coral con relleno vs esperado punteado, corte en `today`, recharts diferido, etiqueta accesible, leyenda Real/Esperado.
- [ ] «El camino»: Recorrido (N unidad · %; llamadas «Contestadas…»); Donde deberías ir hoy («43 × 20 de 26 días hábiles»); Ritmo real; Ritmo necesario («Ya llegaste» / «X al día · N días hábiles» / «N hoy», con la cuenta); Proyección al cierre (con $ en ventas). Aprendiendo: solo Recorrido. Ticket: «Ticket real del mes» («sobre N ventas» / «Aún sin ventas este mes») y «Frente al plan».
- [ ] «De dónde sale»: tasas `KR_INPUTS` con procedencia, «últimos N días», «sobre N», «Corregir» → `/comercial/meta` (manage, aria «Corregir {tasa}»); «Días hábiles: N en {mes} · según tu horario de atención».
- [ ] «Mix sugerido» (ventas): categoría, «N ventas», «N % de tus ventas».
- [ ] Pie: «N acciones propuestas empujan este resultado» (violeta) + «Ver en el CRM» / «Ver en Analítica».

## 4. Detalle de una acción (`ActionSheetRoute` + `ActionDetail`)
- [ ] Estados: sin permiso; cargando; 404 «Esta acción ya no está» / «Venció o alguien de tu equipo la decidió.» + «Volver a la ruta»; error + «Reintentar»; 409/403 → relectura sin silueta (C4).
- [ ] Cabecera: tipo (Lote de seguimiento/Secuencia), estado o vencimiento, titular violeta, «La cuenta: {basis}» + procedencia.
- [ ] Resultado de aprobar (`approvalLines`): aplicado / fallido en contactos, `NOTHING_APPLIED_NOTE`, «No había nada que encender…»; aprobada sin resultado: «Se aprobó el {fecha}.» + dónde seguirla; rechazada: «Anotado. Axi no vuelve a proponerlo esta semana.» + motivo.
- [ ] «Por qué ahora»: razón + evidencias (etiqueta, valor, procedencia o «según tu ruta»).
- [ ] «Qué va a pasar» / «Lo que se aprobó»: Contactos (+ nota de bajas; aprobada «Ver en Tareas/Secuencias»), Canal, Cuándo/Arranque («mañana a las 9:00» / fecha · N por hora, «Dentro de tu horario · respeta las horas de silencio.»), Quién (agente activo/asignado, «Objetivo: …»).
- [ ] «Qué puede salir mal» (riesgos) y «Después» (`AFTER_APPROVAL_NOTE` / `AFTER_APPROVED_NOTE`).
- [ ] Pie: pendiente → nota de rechazo + «Rechazar» + «Aprobar»; rechazar → «¿Por qué no?» con `REJECT_REASONS`, «Otro motivo…» (≥ 8 car., 300 máx., «Escríbelo como una regla…»), «Volver»/«Rechazar»; solo lectura → la línea; aprobada → «Ver en Tareas/Secuencias».

## 5. Franja del Panel (`GoalProgressBlock`) y chip de Axel
- [ ] Ya rediseñada y certificada con el Panel premium (2026-09-26): «Tu meta de {mes}», cifra, «de $ · %», badge, frase, línea, «Ventas: 27 de 43 · faltan 16», «Ver la ruta»; sin meta (manage) la invitación «Ponle una meta al mes…» / «Definir la meta»; nunca bloquea ni pinta errores. **No se toca en este upgrade** (el canvas 6 es anterior al Panel certificado); solo hereda los cambios de `RouteLine` sin romper `compact`.

## Lo que el canvas pinta y hoy NO existe — decisión por punto
| Del canvas | ¿Hay dato? | Decisión propuesta |
|---|---|---|
| Barras diarias de la semana (L…S) con línea de lo esperado | Sí: `pace.series` acumulada → diferencias por día | Se construye (dominio puro + test). |
| Tramo rayado de la brecha real ↔ esperado | Sí: `expected_revenue_cents` | Se construye en `RouteLine` (no en `compact`). |
| Cuatro cifras bajo la línea: Faltan (+ ventas) · Quedan (días hábiles, hasta el {día}) · A hoy deberías llevar (+ por detrás/delante) · Si sigues así | Sí (`gap`, `business_days_left`, `period_end`, `expected_revenue_cents`, proyección) | Se construye; aprendiendo solo Faltan y Quedan. |
| «En vivo · 10:42 a. m.» | Socket conectado + hora del último refresco | Solo si el realtime expone la conexión; si no, se omite (no se finge). |
| Isla con «La que más te acerca» + «Semanas anteriores» (aprobadas **y descartadas** con su motivo) | Aprobadas del mes sí; descartadas: `GET /commercial/proposals?status=rejected` existe | Se añade la carga de rechazadas del mes (cliente, sin servidor). |
| Coste estimado «≈ US$ 0,03 · 36 plantillas utility», plantilla «Retomar cotización» y «Ver lista» de contactos en la acción | No en el contrato | **No se pinta** (sería inventado). Queda como petición de servidor. |
| «Así queda tu mes» en el editor (ventas al día hábil, sobre el mes pasado, por semana, frase de alcanzable) | Sí (`needed_sales`, días hábiles del ritmo, semilla) | Se construye desde datos del preview. |
| KR «Llamadas contestadas» en vez de «Llamadas hechas» | El KR es de llamadas hechas; contestadas es la 2.ª línea | Se conserva «Llamadas hechas» + «Contestadas N de M» (el canvas lo simplificó). |
| Mix sugerido fuera de la lista principal | Existe (2.ª línea de Ventas) | Se conserva en la ficha de Ventas. |
