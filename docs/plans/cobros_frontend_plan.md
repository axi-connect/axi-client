# Plan frontend — Programa «Cobros, documentos y TRM»

> Parte B (cliente) del plan maestro `axi-server/docs/plans/cobros_program.md` (aprobado 2026-09-16). Misma disciplina que el resto del proyecto: **mockup HTML navegable aprobado por el dueño antes de escribir UI**, servidor primero por contrato (`npm run api:types` tras cada fase del backend), un PR por fase a `main` desde el worktree `.claude/worktrees/cobros`. Todo lo técnico en inglés, la documentación en español; wire en `snake_case`.

## 1. Hallazgos del cliente que condicionan el diseño (verificados en `3fce465`)

- **Medios de pago** ya es un slice propio (`src/modules/payments/`) montado en `/settings/company/pagos` como pestaña de Mi empresa (`CompanySettingsNav` la muestra solo con `hasCapability("sales")`). El DTO no tiene moneda ni tasa. El seed de navegación apunta a `/settings/sales`, aliasado en `core/config/routes.ts::NAV_PATH_ALIASES`.
- **Pedidos** (`src/modules/orders/`): `OrderDto.payments[]` ya es un array con `amount_cents` por pago, pero nada suma `paid`/`outstanding`; `ORDER_TRANSITIONS`/`KANBAN_COLUMNS` no tienen estado parcial; `ReportPaymentDialog` es el único punto donde se registra un pago (monto opcional, prellenado con el total); `PaymentProofViewer` es el visor de archivo existente; **no hay `orders/public.ts`** (crm e inbox lo van a necesitar); no existe UI de creación manual de pedido.
- **Ficha del contacto** (`crm/contacts/[contactId]/page.tsx`): `ScorePanel`, `CopilotPanel`, `TagsEditor`, `ContactDealsCard`, `ContactTimeline` y el nuevo `ContactDataPanel` (CRM F1). No hay card de pedidos ni área de documentos. `ContactDealsCard` es la forma a clonar.
- **Rail del inbox**: `context-rail/registry.tsx` es el punto de extensión declarado («añadir un panel es añadir una entrada aquí»); no hay panel de pedidos/pagos.
- **Plantillas**: `marketing/ui/components/MessageTemplateField.tsx` (textarea + chips de variables + vista previa en burbuja) espeja `marketing/domain/template.ts`. No hay editor rich-text ni visor PDF. El único helper de descarga por blob es `platform/infrastructure/api/quality-report.ts`.
- **Entitlements**: `shared/auth/entitlements.{store,hooks}.ts` (`useEntitlements(): {loaded, hasCapability}`, fail-open, single-flight). Seis call sites (`sales`, `calls`). No existe noción de feature por tenant.
- **Tipo de negocio**: `onboarding/domain/niches.ts` (9 nichos) solo en el paso 1 del onboarding; el microcopy promete «Lo puedes cambiar después en Ajustes de empresa» pero `company.config.tsx` solo tiene `industry` texto libre. `onboarding/public.ts` no exporta `NICHES`.
- **Dinero**: `core/lib/format.ts::formatMoney(cents, currency='COP')` (es-CO, 193 usos; inserta espacio duro → nunca asertar literales) y `PriceInput`. Sin selector de moneda para el tenant. La TRM solo existe en `platform/` (parámetro versionado «una versión se sucede, no se edita»).
- **Catálogo**: `catalog/ui/components/ProductAttributesSection.tsx` decide el input con una cadena `if/else` por tipo y cae a texto libre para cualquier tipo desconocido → un atributo `date` renderizaría texto libre sin error (hallazgo del auditor). Hay que volverlo exhaustivo.
- **Design system**: `StatusBadge` exige un `StatusMap` en `domain/` (estados = superficie `secondary` + punto, nunca tinte); `StatTile`, `Timeline`, `FieldList`, `NavTabs`, `SegmentedControl`, `DetailSheet`, `DataTable` + `usePaginatedList` disponibles. `@testing-library/user-event` **no** está instalado (usar `fireEvent`).

## 2. Arquitectura de información y navegación

**Sidebar** (lo decide el seed `rbac_ui_module` del backend con el nuevo `feature_code`; el cliente solo resuelve paths):

- Grupo **Ventas**: Pedidos `/orders` · **Cartera `/orders/receivables`** (feature `collections`, `collections:read`) · Catálogo · Envíos · **Pagos `/settings/payments`** (renombra «Métodos de pago»; `payment_methods:read`).
- **Mi empresa** `/settings/company`: General (+ «Tipo de negocio») · Sucursales · **Funciones** `/settings/company/funciones`.
- Documentos **no** tienen ítem propio: viven en el pedido, el contacto y el rail del inbox; su editor es una pestaña del hub Pagos.
- `core/config/routes.ts`: quitar el alias `/settings/sales`; `next.config.ts`: redirect 308 `/settings/company/pagos → /settings/payments` (URL compartida hoy).

**Hub Pagos** `src/app/(private)/(content)/settings/payments/{layout,page,loading}.tsx` + sub-rutas reales `plan/`, `moneda/`, `documentos/` (patrón `CompanySettingsLayout` + `NavTabs`): **Medios** (mueve `PaymentMethodsTab`) · **Plan de pagos** (feature `payment_plans`; incluye cadencia de recordatorios en F5) · **Moneda y TRM** (`fx_quotes`) · **Documentos** (`documents`; `SegmentedControl` Contrato · Recibo · Estado de cuenta · Cuenta de cobro + ajustes de emisión/envío). Las pestañas se filtran con `useFeatures` y esperan a `loaded` (nunca pintar-y-quitar).

**Cartera** en `/orders/receivables` dentro de `src/app/(private)/orders/`: hereda `OrdersLayout` y su slot `@sheet`, así que una fila abre el mismo rail `/orders/[orderId]` interceptado (segmento estático gana al dinámico).

## 3. Slices a crear / extender

### `shared/auth/features.{store,hooks}.ts` (F1)
Espejo 1:1 de `entitlements.{store,hooks}.ts`: `useFeaturesStore` (`load(userId)` → `GET /me/features`, single-flight, reset por usuario), `hasFeatureIn(features, status, code)`, `useFeatures(): {loaded, hasFeature(code), featureSource(code)}`. **Fail-open** como entitlements: la garantía «Savage no ve planes» es del dato (el sidebar ya llega filtrado por `/me/navigation`) y el backend responde `403 features/feature_disabled`. `API_ERROR_CODES.featureDisabled` en `core/api/problem.ts` + mensaje en `core/lib/error-messages.ts`. Invalidación local al guardar en `FeaturesTab` o al cambiar el nicho.

### `companies` (extender, F1)
`ui/forms/config/company.config.tsx`: campo `niche_code` (Select con `NICHES` desde `onboarding/public`, que exporta `NICHES`/`nicheByCode`), `toUpdateCompanyDTO` lo envía. Nueva pestaña `/settings/company/funciones` → `ui/components/features/FeaturesTab.tsx` + `FeatureSwitchRow.tsx` (nombre, descripción, `Switch`, chip de origen «Por defecto del nicho» / «Activado por ti» / «Fijado por la plataforma» → deshabilitado con tooltip y `settings_hint`), `infrastructure/services/features-service.adapter.ts` (`PUT /features/:code`). `CompanySettingsNav.tsx`: General · Sucursales · Funciones (sale «Medios de pago»).

### `platform` (extender, F1)
`TenantTabs.tsx` + «Funciones» (`/platform/tenants/[tenantId]/features`), `ui/features/tenants/detail/TenantFeaturesView.tsx` (tabla feature → Heredar / Forzar ON / Forzar OFF + motivo; muestra lo que ve el tenant), `infrastructure/api/hooks/use-tenant-features.ts` (TanStack Query, `GET/PUT /platform/tenants/:id/features(/:code)`).

### `payments` (extender, F2/F4/F5)
`domain/fx-settings.ts` (`FxSettingsDTO`: `settlement_currency`, `spread_bps`, `manual_rate?`, `show_indicative_quotes`; `FxRateDTO`), `domain/payment-policy.ts` (`PaymentPolicyDTO`: anticipo %, estrategia, nº cuotas, días antes del servicio, gracia, `reminder_days_before`, `overdue_reminder_days`, canales, plantillas), `infrastructure/services/payment-settings-service.adapter.ts` (`GET/PUT /fx/settings`, `GET /fx/rates/latest`, `GET/PUT /collections/settings`), `ui/components/PaymentsHubNav.tsx`, `ui/forms/FxSettingsForm.tsx` + `forms/config/fx-settings.config.tsx`, `ui/components/FxRateCard.tsx` («hoy a TRM 3.100,45 · Superfinanciera · vigente 16 sep», `StatTile`), `ui/forms/PaymentPolicyForm.tsx` + `forms/config/payment-policy.config.tsx` (cadencias como chips numéricos; plantillas con `TemplateTextField`). `public.ts` añade `PaymentsHubNav`, `useFxSettings`.

### `collections` (nuevo, F4/F5)
```
domain/payment-plan.ts        PaymentPlanDTO, InstallmentDTO, INSTALLMENT_STATUS_MAP (pending→neutral, due_soon→warning,
                              overdue→destructive, partially_paid→info, paid→success), planProgress(plan) → {paid_cents, balance_cents, pct, next_due}
domain/receivable.ts          ReceivableRow, ListReceivablesParams, RECEIVABLE_FILTERS (Todo · Al día · Por vencer · Vencido), agingBucket(days)
infrastructure/services/collections-service.adapter.ts   GET /collections/receivables(/stats), GET /collections/plans/:id | by-order/:order_id,
                              PUT …/schedule, POST …/promises, PATCH …/promises/:id, PATCH /collections/plans/:id, POST …/notes, POST …/reminders
infrastructure/stores/collections.store.ts               stats + realtimeVersion
infrastructure/realtime/use-collections-socket.ts        collections.plan_updated | installment_paid | reminder_updated
infrastructure/hooks/use-order-plan.ts
ui/ReceivablesView.tsx        tiles + filtros + tabla (usePaginatedList) + banner «N cambios nuevos»
ui/tables/receivables.config.tsx     Cliente · Pedido · Total · Pagado · Saldo · Próxima cuota · Vence · Mora · Estado · Último recordatorio · acciones
ui/components/{ReceivablesStatsTiles,ReceivablesFilters,PaymentPlanBlock,InstallmentList,PlanEditorDialog,
                RegisterInstallmentPaymentDialog,PaymentProgressChip,PromiseDialog,SendReminderDialog}.tsx
public.ts                     PaymentPlanBlock, PaymentProgressChip, RegisterInstallmentPaymentDialog, planProgress, INSTALLMENT_STATUS_MAP, useOrderPlan
```
`RegisterInstallmentPaymentDialog` es la evolución de `orders/ui/components/kanban/ReportPaymentDialog.tsx`: medio de pago, **monto obligatorio** (`PriceInput`, `parseMoneyToCents`), selector de cuota con «Sugerido: cuota 2 · $…», referencia. `ReceivablesStatsTiles`: Por cobrar · Vencido (`destructive`) · Próximos 7 días (`warning`) · Cobrado 30 d (`success`). Móvil: filas en cards.

### `orders` (extender, F2/F3/F4/F8)
Crear **`orders/public.ts`** (`listOrders`, `getOrder`, `OrderStatusBadge`, `orderNumberLabel`, `ORDER_STATUS_LABELS`, tipos) para `crm`/`inbox`/`collections`. `domain/order.ts`: `service_date`, `payment_state`, `paid_cents`, `balance_cents`, `fx {base_currency, base_total_cents, rate, source, at}` en `OrderRow`; `formatOrderTotal(order)`. `OrderDetailRail`: total dual «US$ 7.000 ≈ $ 21.700.000 (TRM 3.100 del 12/03)» en cabecera y totales; «Pagado / Saldo»; sección **Plan de pago** (`PaymentPlanBlock` de `collections/public` con `hasFeature('payment_plans')`; sin plan → CTA «Crear plan de pago» si `canManage`); «Registrar pago» → «Registrar abono» cuando hay plan; sección **Documentos** (`DocumentsList order_id` + `IssueDocumentMenu`, feature `documents`); «Fecha del servicio» en Detalles. `PaymentReviewDialog`: monto obligatorio prellenado con el saldo + aviso de sobrepago. **Kanban sin columna nueva**: `OrderCard` pinta `PaymentProgressChip` («$1,2 M / $4,9 M · 2 de 4») cuando `balance_cents > 0`. `orders.store.ts` escucha `order.payment_verified` y `collections.installment_paid` para `refreshOrder`. `OrderTimeline`: `payment_state_changed`, `currency_frozen`, `service_date_set`. `OrderNotificationTemplatesForm`: renderiza `payment_received` (y la `checkout_link` hoy huérfana).

### `catalog` (extender, F2)
`ProductAttributesSection.tsx`: mapeo **exhaustivo** por `attribute.type` (`text | number | boolean | select | date`) con `<input type="date">` para `date`; sin fallback implícito. Formulario de variante: campo «Fecha de servicio» cuando el tipo de producto declara el eje `date`; deshabilitado con motivo en variantes gobernadas por integración.

### `documents` (nuevo, F7/F8/F9)
```
domain/document.ts     DocumentDTO, DocumentKind, DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_MAP, DELIVERY_STATUS_MAP, DELIVERY_SKIP_LABELS, isOutdated(doc, order)
domain/template.ts     espejo puro de la whitelist: DOCUMENT_TEMPLATE_VARIABLES[kind], TEMPLATE_VARIABLE_LABELS, invalidDocumentTemplateVariables, límites
domain/settings.ts
infrastructure/services/{documents,document-templates,document-settings}-service.adapter.ts
infrastructure/hooks/use-documents.ts               useDocuments({contact_id?|order_id?}) con version de realtime
infrastructure/lib/open-document-file.ts             GET /documents/:id/file → abre la presignada (patrón PaymentProofViewer)
infrastructure/realtime/use-documents-socket.ts      document.issued | failed | delivery_updated
ui/components/{DocumentsList,DocumentRow,SendDocumentDialog,IssueDocumentMenu,DocumentDeliveryStatus}.tsx
ui/components/templates/{DocumentTemplateEditor,ClauseListEditor,TemplatePreviewFrame,DocumentTemplatesNav}.tsx
ui/forms/DocumentSettingsForm.tsx + forms/config/document-settings.config.tsx
public.ts              DocumentsList, IssueDocumentMenu, SendDocumentDialog, DOCUMENT_KIND_LABELS, useDocuments, tipos
```
`DocumentTemplateEditor`: dos columnas — bloques (título, intro, cláusulas ordenables con subir/bajar/quitar/añadir sin librería DnD, nota de totales, firmas, pie, color de acento) | `TemplatePreviewFrame` (`<iframe sandbox="" srcDoc>` con marco de hoja A4 y zoom; `POST /document-templates/:kind/preview` con debounce 400 ms). «Restablecer al modelo de Axi». Aviso de variables inválidas antes del 422. `SendDocumentDialog`: radio WhatsApp/Email; email deshabilitado con motivo si el contacto no tiene correo; aviso de ventana de 24 h; 202 → chip «enviando…» hasta `document.delivery_updated`. `IssueDocumentMenu`: Contrato · Estado de cuenta · Cuenta de cobro (el recibo es automático).

### `shared/components/features/template-text-field/TemplateTextField.tsx` (F5)
Genérico extraído de `marketing/ui/components/MessageTemplateField.tsx` (`{value, onChange, variables, labels, maxLength, error, preview?}`), que pasa a componerlo. Lo usan plantillas de recordatorio (`payments`) y bloques de documento (`documents`).

### `crm` (extender, F4/F8)
`ui/components/contact-detail/ContactOrdersDocumentsCard.tsx` («Pedidos y documentos»: últimos pedidos con saldo vía `orders/public` + `DocumentsList contact_id` vía `documents/public`), montado bajo `ContactDealsCard` en `crm/contacts/[contactId]/page.tsx`.

### `inbox` (extender, F4/F8)
`context-rail/registry.tsx`: `ContextPanelDef` gana `feature?: string`; entrada `{id: 'orders', label: 'Pedidos y cobros', icon: ShoppingCart, permission: 'orders:read', feature: 'payment_plans', Panel: OrdersPanel}`; `panels/OrdersPanel.tsx` (pedido activo: saldo, próxima cuota, dual money, `PaymentPlanBlock` compacto, `DocumentsList` con enviar; consume solo barrels). El rail filtra por `useFeatures`.

### Transversales
`core/realtime/events.ts` (`InboxServerEvents`): `order.payment_verified`, `order.currency_frozen`, `collections.plan_updated | installment_paid | installment_overdue | reminder_updated`, `document.issued | failed | delivery_updated`. `notifications/domain/notification-target.ts`: familias `"collections."` → `/orders/{order_id}` o `/orders/receivables`; `"document."` → `/orders/{order_id}` o `/crm/contacts/{contact_id}`. `core/lib/format.ts::formatMoneyApprox(cents, currency, approx?: {currency, rate})` → `"US$ 3.500 ≈ $ 10.851.575"` (puro; la tasa siempre viene del snapshot del pedido, nunca de una global). `docs/architecture.md` §3.3: registrar los barrels nuevos (`orders`, `documents`, `collections`) y las ampliaciones (`onboarding`, `companies`).

## 4. Mockups de Fase 0 (`docs/design/mockups/`, convención `<name>.build.py` + `.html` + `.lucide.json`)

Light/dark, estados (cargando, vacío, error, 403 de capacidad/feature), móvil. DESIGN.md: coral única acción; violeta **o** ámbar como acento secundario, no ambos; badges = superficie `secondary` + punto; glass solo en flotantes; Poppins; AA.

| Fase | Mockup | Contenido |
|---|---|---|
| F1 | `company-settings-features.html` | «Tipo de negocio» en General; pestaña Funciones con origen y bloqueo por plataforma |
| F1 | `platform-tenant-features.html` | Overrides por tenant |
| F2/F4/F5 | `payments-hub.html` | Hub Pagos: Medios · Plan de pagos (+ recordatorios) · Moneda y TRM · Documentos; estados |
| F2 | `catalog-service-date.html` | Atributo tipo `date` en el editor de producto/variante, badge de fecha en la tabla de variantes, «Fecha del servicio» en el rail del pedido y el 422 de fechas mixtas |
| F3/F4/F8 | `order-rail-plan-documents.html` | Rail con Plan de pago, «Registrar abono», Documentos con enviar (WhatsApp/Email, ventana 24 h, enviando/fallido/omitido), total dual, «desactualizado» |
| F3 | `orders-kanban-progress-chip.html` | Tarjetas con chip de progreso; sin columna nueva |
| F4 | `receivables.html` | Cartera: tiles, filtro segmentado, tabla con mora y acciones, vacío, móvil en cards |
| F4 | `inbox-rail-orders-panel.html` | Panel «Pedidos y cobros» |
| F4/F8 | `contact-360-orders-documents.html` | Card «Pedidos y documentos» |
| F7 | `document-template-editor.html` | Editor por bloques + vista previa A4; cláusulas; variable inválida; ajustes de emisión/envío + bloque fiscal |

## 5. Tests por slice

- **Config (puros, sin render):** `fx-settings.config.test.ts`, `payment-policy.config.test.ts`, `document-settings.config.test.ts`, `company.config.test.ts` (gana `niche_code`).
- **Dominio:** `collections/domain/__tests__/payment-plan.test.ts` (`planProgress`, mapa de estados completo), `receivable.test.ts` (`agingBucket`), `documents/domain/__tests__/{document,template}.test.ts` (labels completos, `isOutdated`, whitelist por kind, inválidas), `core/lib/__tests__/format.test.ts` (`formatMoneyApprox`), `notification-target.test.ts` (familias nuevas), `orders/domain/__tests__/order-state.test.ts`.
- **Stores:** `features.store.test.ts` (single-flight, reset por usuario, fail-open — copia de los tests de entitlements), `collections.store.test.ts`, `orders.store.test.ts` (eventos nuevos).
- **Componentes:** `DocumentsList` (estados; Enviar solo con `documents:manage`), `SendDocumentDialog` (email deshabilitado sin correo), `PaymentPlanBlock`, `RegisterInstallmentPaymentDialog` (monto obligatorio), `PaymentReviewDialog` (monto), `FeaturesTab` (switch bloqueado), `CompanySettingsNav.test.tsx` (pestañas), `PaymentsHubNav` (pestañas por feature), `registry` (filtro por feature), `ReceivablesView` (tiles + tabla con `usePaginatedList`), `DocumentTemplateEditor` (preview debounced; iframe con `sandbox`), `ProductAttributesSection` (`date`).
- Ritual: `npx tsc --noEmit` · `npm run lint` · `npx jest` · `npm run build` + revisión light/dark contra DESIGN-SYSTEM §11 antes de cada PR; `api:types:check` verde.

## 6. Orden de fases (alineado con el backend)

| Fase cliente | Tras backend | Entrega |
|---|---|---|
| F1 | F1 | `useFeatures`, `FeaturesTab`, `niche_code`, overrides en platform, redirect y alias |
| F2 | F2 | Hub Pagos (mover Medios), Moneda y TRM, `formatMoneyApprox`, `ProductAttributesSection` con `date`, fecha del servicio en el rail |
| F3 | F3 | Monto obligatorio al verificar, dual money, `PaymentProgressChip`, `orders/public.ts`, `payment_received` |
| F4 | F4 | Slice `collections`: Plan de pagos (settings), `PaymentPlanBlock`, «Registrar abono», Cartera, panel del inbox, card del 360 |
| F5 | F5 | Recordatorios: cadencia y plantillas (`TemplateTextField`), estados en Cartera, envío manual |
| F7 | F7 | Slice `documents`: editor de plantillas con vista previa, ajustes |
| F8 | F8 | `DocumentsList` en rail/360/inbox, emisión manual, descarga |
| F9 | F9 | `SendDocumentDialog`, estados de entrega |

## 7. Decisiones tomadas (revisables)

- `useFeatures` fail-open (coherente con entitlements).
- Vista previa de documento **server-side** (el layout HTML/CSS de impresión es del servidor; espejar solo la whitelist evita divergencias). Sin «Descargar PDF de prueba» en v1.
- Cartera en `/orders/receivables`, no de primer nivel.
- Sin librería de drag-and-drop para las cláusulas (subir/bajar).
- Descarga de PDF por URL presignada en pestaña nueva, no fetch-blob.

## 8. Estado de ejecución

| Fase | Estado |
|---|---|
| Paso 0 (este documento) | 2026-09-16 |
| Etapa A · mockups | Publicados 2026-09-16 como lienzo de diseño (17 artboards, light/dark/móvil/estados): https://claude.ai/artifact/3k7tchLhmyG1t5d632HeEp — `company-settings-features`, `platform-tenant-features`, `payments-hub` (Medios + Moneda y TRM), `catalog-service-date`. Copia en `docs/design/mockups/` (kit compartido `_axi_mockup_kit.py`; cada `*.build.py` genera su `.html` + `.lucide.json` y exporta artboards con `AXI_MOCKUP_ARTBOARDS_DIR`). **Pendiente de aprobación del dueño antes de tocar UI.** |
| F1–F2 UI | Bloqueadas por la aprobación de los mockups |
| F3–F9 | Pendientes (cada una arranca con su mockup) |
