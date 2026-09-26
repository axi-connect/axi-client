# Avisos de Cobros al contrato de sileo (DESIGN-SYSTEM §9.4) — plan

> Encargo del dueño (2026-09-24): «modificar todas las notificaciones de esta implementación por las que
> dicta el DESIGN SYSTEM, notificaciones con sileo, para centralizar las alertas».
> Redacta: `audit-agent` (auditor). Implementa: `upgrade-feats-product`. Base: el merge de `origin/main`
> en `feat/cobros-etapa-b-pagos-y-cobranza` (cliente `68df389`, servidor `ce7f284a`).
> Contrato de referencia: `docs/design/DESIGN-SYSTEM.md` §9.4 y `docs/plans/notificaciones_sileo_plan.md`.

## 0. Qué hizo ya el merge y qué NO

`main` trajo el núcleo: `src/core/notifications/` (única pieza que importa `sileo`; lo impide
`no-restricted-imports`), `AlertProvider.showAlert` → `notify.fromAlert`, y borró `ui/notice.tsx`
(`StatusAlert`) y `floating-alert.tsx`. **Todo `showAlert` de Cobros ya se pinta con la píldora de sileo**:
la centralización técnica está hecha por construcción.

Para que el merge compilara hice solo lo mecánico, sin rediseñar:
- siete `open: true` fuera (`AppAlert` ya no lo tiene): `ReceivablesView`, `PaymentPolicyTab`,
  `RemindersTab`, `SendReminderDialog`;
- los dos `StatusAlert` en línea de `DocumentTemplateEditor` → `<Alert variant="warning|destructive">`,
  como hizo `main` con los suyos.

Lo que falta —y es este plan— es que **lo que dicen** los avisos de Cobros cumpla el contrato: hoy la
píldora los recorta, les pone un título genérico o los cierra antes de tiempo, y hay avisos en línea hechos
a mano que el DS retiró. Nada de esto se ve en un test; se ve en pantalla.

## 1. Las reglas, en concreto para Cobros

**R1 · Título ≤ 34 caracteres (`PILL_MAX`), en pasado o estado, sin punto.** Lo variable (número del
documento, canal, cifra) va a `description`. No confíes en que el adaptador lo parta: el corte automático
por «:»/«—» existe para lo heredado; el código de Cobros lo escribe bien de origen.

| Sitio | Hoy | Propuesta (título · description) |
|---|---|---|
| `documents/.../list/SendDocumentDialog.tsx:173` | «Contrato CTR-2026-0007 en camino por WhatsApp» | «{Tipo} en camino» · «{número} por {canal}. Te avisamos aquí si no sale.» |
| `documents/.../list/DocumentsList.tsx:90` | «{tipo} {número} en camino» | ídem |
| `documents/.../list/IssueDocumentMenu.tsx:75` | «{label} {número} en camino» | «{Tipo} en preparación» · «{número}: aparece en la lista cuando esté listo.» |
| `documents/.../list/IssueDocumentMenu.tsx:67` | «{label} ya existe: {número}» | «{Tipo} ya emitido» · «Es el {número}; ábrelo desde la lista.» |
| `documents/.../templates/DocumentTemplateEditor.tsx:131` | «{tipo} guardado · versión N» | «Plantilla guardada» · «{tipo} · versión N» |
| `orders/.../detail/PaymentReviewDialog.tsx:112` | «Abono verificado: faltan $ X» / «Pago verificado: pedido cobrado» | «Abono verificado» · «Faltan $ X para completar el pedido.» / «Pago verificado» · «El pedido quedó pagado.» |
| `orders/.../detail/PaymentReviewDialog.tsx:125` | «No se pudo completar la verificación» (36) | «No se pudo verificar» · `errorMessage(err)` (el caso `stale` ya cabe) |
| `orders/ui/forms/OrderNotificationTemplatesForm.tsx:73` | «No se pudieron guardar las plantillas» (37) | «No se pudieron guardar» · «Las plantillas siguen como estaban.» + `errorMessage` |
| `collections/ui/ReceivablesView.tsx:120` | «No se pudo traer el resto de la cartera» (39) | ver R6: es una **carga**, no una acción → estado en línea, no aviso |

Con plantillas de texto el largo depende del dato: el test (§3) lo mide con el **peor caso real**
(«Cuenta de cobro», número `JX-2026-000100`, «WhatsApp»), no con «Recibo».

**R2 · El mensaje del servidor nunca es el título.** Hoy van en el título (`title: errorMessage(err, …)`):
`DocumentsList.tsx:78` y `:98`, `IssueDocumentMenu.tsx:84`, `SendDocumentDialog.tsx:199`,
`DocumentSettingsForm.tsx:93`, `FxSettingsTab.tsx:69` y el de `crm/contacts/[contactId]/page.tsx:91` si es
de Cobros (si es de `main`, no lo toques). Título fijo por acción («No se pudo abrir el PDF», «No se pudo
regenerar», «No se pudo emitir», «No se pudo enviar», «No se pudo guardar») y `description: errorMessage(err)`.

**R3 · La duración la pone el tono, no cada pantalla.** Fuera todos los `autoCloseMs` de Cobros (13
llamadas: 3000/3500/4000 ms). El DS: éxito 4 s · info 5 s · advertencia 7 s · error 8 s · con botón ∞. Un
`autoCloseMs` que se quede necesita un comentario con el porqué.

**R4 · Un botón como mucho, con verbo; y entonces no se cierra solo.** Candidato claro: el aviso de
envío en curso de F9 no ofrecía «Ver chat» (desviación declarada); si algún aviso de Cobros gana acción
(«Ver», «Reintentar»), una sola.

**R5 · `notify.promise` solo donde el guardado tarda > ~1 s, MEDIDO.** Candidatos: guardar plantilla
(`DocumentTemplateEditor`), `PaymentPolicyTab`, `RemindersTab`, `DocumentSettingsForm`, `FxSettingsTab`.
Mide el p95 en el entorno de QA (`http://localhost:3101`, pide la medición a `audit-agent`) antes de
convertir nada: por debajo de 1 s se queda como está. Nunca «Guardando» + «Guardado» como dos avisos.
Emitir un documento **no** es candidato: la fila ya lleva su barra de progreso y el WS la cierra.

> **Medido (2026-09-24, `audit-agent`, 20 guardados por endpoint en una instancia desechable):**
> `PUT /fx/settings` p50 18 ms · p95 21 ms; `PUT /collections/settings` (PaymentPolicyTab y RemindersTab)
> p50 20 ms · p95 34 ms; `PUT /documents/settings` p50 99 ms · p95 257 ms; `PUT /document-templates/contract`
> p50 34 ms · p95 40 ms. Todo muy por debajo de 1 s incluso con la latencia de producción:
> **ninguna pantalla de Cobros va a `notify.promise`.** Se queda `showAlert` al terminar.

**R6 · Estados que duran = `<Alert variant>` en línea; nunca un aviso, nunca una caja teñida a mano.**
- `SendDocumentDialog.tsx:448` — la función local `Notice` (`bg-secondary/60`, icono teñido) → `Alert`
  (`ok→success`, `info→info`, `warn→warning`), conservando el enlace «Configurar plantilla».
- `collections/ui/components/RemindersTab.tsx:219` — `border-warning/30 bg-warning/5` (la receta exacta que
  el DS retiró) → `<Alert variant="warning">`.
- `orders/ui/forms/OrderNotificationTemplatesForm.tsx:84` — error de carga en un `<p>` rojo →
  `<Alert variant="destructive">` con «Reintentar».
- `ReceivablesView.tsx:120` — fallar al traer la página siguiente es un estado de la lista: `Alert` al pie
  con «Reintentar», no una píldora que se va a los 8 s y deja la lista corta sin decirlo.
- **No son avisos, no los toques por §9.4:** el motivo de cancelación citado en `OrderDetailRail.tsx:455`
  (es un dato) y las pastillas de estado (`DocumentRow`, `ReminderHistory`, `OrderDetailRail:313-315`,
  `BlockList`). Pero **sí revisa su contraste (§10)**: `bg-warning/15 text-warning` y `bg-success/15
  text-success` ponen el color en el texto, y el DS midió ~3:1 para ámbar y verde claros. La receta es el
  color en el icono y el texto en `foreground`. Mídelo en claro y oscuro; arregla lo que no llegue a 4,5:1.

**R7 · Una decisión que bloquea = `showModal`.** El «Restablecer al modelo de Axi» de
`DocumentTemplateEditor.tsx:316` confirma con un `Dialog` propio → `showModal`, como el resto del panel.
Cualquier otra confirmación de Cobros que encuentres, igual.

**R8 · Nada de avisos por cargar.** Un GET que carga la vista no avisa si sale bien; si falla, la vista
pinta su error. Revisa que ningún hook de Cobros (`use-documents`, `use-order-plan`, sockets) dispare
`showAlert` al cargar o al reconectar.

## 2. Orden y entregas

Un commit por slice, en este orden (el de más avisos primero): `documents` → `orders` (lo de Cobros) →
`collections` → `payments`. Cada commit deja verde su parte. Al final, «listo avisos» con el SHA a
`audit-agent`. **Sin push a main.**

## 3. Cómo se prueba (lo que pediré ver)

1. **Un test de contrato por llamada de Cobros**, no solo el render: el `showAlert` que dispara cada flujo
   (mockeado) se comprueba con un ayudante compartido —p. ej. `expectAlertContract(call)` en
   `src/core/notifications/testing.ts`— que falla si `title.length > PILL_MAX`, si hay `autoCloseMs` sin
   justificar o si el título contiene el texto de un error del servidor. Úsalo con el peor caso real de R1.
2. **Los dos signos**: para cada título acortado, un caso que falle si vuelve el largo (p. ej. «Cuenta de
   cobro JX-2026-000100 en camino por WhatsApp» debe dar `false` en el ayudante).
3. Verjas: `tsc` (solo el preexistente), `next lint` 0, jest completo, `next build`.
4. **Verificación visual real**: la hace la QA en navegador (`audit-agent-real-QA`) sobre tu SHA, en claro,
   oscuro y 390 px: cada aviso de Cobros disparado de verdad, con captura de la píldora abierta y de su
   cuerpo expandido. Un aviso que la píldora recorte o titule «Listo» a secas es un hallazgo.

## 4. Fuera de alcance

- Avisos de módulos que no son de Cobros (los migró `main`).
- `notify.promise` en pantallas no medidas (R5).
- Los hallazgos Bajos de la QA de F1–F2 (migas, pestañas en móvil, chip de origen, placeholder) van en su
  propio commit, después de este plan.
