# Módulo Facturación y pagos — la licencia de axi cobrada por Wompi

> **Doc del módulo (base de conocimiento para el agente ejecutor).** Parte A: contrato del backend
> que consume este slice. Parte B: anatomía y decisiones del frontend. Parte C: desviaciones reales
> del contrato, verificadas contra el código (no contra la KB). Parte D: lo que falta.
>
> **Estado (2026-08-25): F0–F5 implementadas** en la rama `feat/billing-frontend` — fundaciones y
> resumen, superficie de plataforma, facturas, pago por Wompi, y mora + pago sin sesión. Plan vivo con
> el estado de cada fase, las decisiones y los 44 hallazgos del contrato:
> `docs/plans/billing_frontend_plan.md`. Mockup aprobado (F0):
> <https://claude.ai/code/artifact/081f0547-f497-4e17-a2d1-197c4bbf7d71>
>
> Documentos rectores: `docs/architecture.md` (§3.2 anatomía, §3.3 dependencias, §5 naming, §16
> checklist), `docs/design/DESIGN.md`, `docs/design/DESIGN-SYSTEM.md`. Del backend:
> `axi-server/docs/billing_frontend_kb.md` (16 secciones) y
> `axi-server/docs/runbooks/wompi_sandbox.md` (verificación de punta a punta).
>
> **Qué es este módulo:** axi le cobra al tenant su licencia. Emite una factura por ciclo, la cobra
> por Wompi, avisa antes de que venza, suspende si no se paga y reactiva al recibir el pago.
>
> ⚠️ **No confundir con el módulo `payments`**, que es *el tenant cobrándole a sus clientes finales*
> (los métodos de pago manuales de su agente vendedor). Son dos módulos, dos prefijos (`/payments/*`
> vs `/billing/*`) y dos pantallas. Mezclarlos sería un error grave: el dueño de una PyME vería
> «medios de pago» y no sabría si son los suyos o los de axi.

---

## Parte A — Contrato del backend

### A.1 Acceso y las tres superficies

| Cosa | Valor |
|---|---|
| Permisos del tenant | `billing:read` (ver) · `billing:pay` (pagar una factura) · `billing:manage` (medios de pago y export de datos) |
| Quién los tiene | **owner** y **admin**. **Supervisor y operator NO tienen ninguno** — es dinero de la empresa, no operación del inbox |
| Roles de plataforma | `super_admin` y `billing_ops`. **`support` NO entra**: publicar una tarifa o anular una factura mueve dinero |
| Sidebar | Ítem raíz `Facturación → /billing`, icono `receipt` (mapeado en `core/lib/icons.ts`), sin hijos: las dos vistas son pestañas de la sección |
| WS | Namespace `/inbox`, room de la company. Eventos `billing.*` (§A.4) |

| Superficie | Quién entra | Ruta | Capa de datos |
|---|---|---|---|
| **Tenant** | owner/admin | `/billing`, `/billing/invoices` | `http` (BFF `/api/proxy`) + Zustand / `usePaginatedList` |
| **Plataforma** | `super_admin`, `billing_ops` | `/platform/billing`, `.../prices`, `/platform/tenants/:id/billing` | `platformClient` + TanStack Query |
| **Pública** | cualquiera con el enlace, **sin sesión** | `/pay/:invoice_id/:token`, `/pay/return` | `http` con `authenticate: false`, **directo al backend** |

### A.2 Entidades

- **Cuenta de facturación** — 1:1 con la empresa. Datos del contribuyente, correo y teléfono de cobro,
  interruptores de aviso, días de gracia, cobro automático. Nace sola al asignar un plan de pago, y el
  **`billing_email` nace vacío a propósito**.
- **Factura** — un ciclo cerrado, con consecutivo `AXI-000042`. Una vez emitida **no se edita ni se
  borra**: se anula y se emite otra. El consecutivo **no se reutiliza**.
- **Línea** — `subscription` (la cuota), `overage` (excedente por métrica), `adjustment` (suma) o
  `credit` (resta). **Los impuestos son por línea**, nunca globales.
- **Cargo** — un intento de cobro. Una factura puede tener varios, y cada uno estrena referencia.
- **Tarifa** (`billing_price`) — vigencia con importe y excedentes. **Se sucede, no se edita.**
- **Enlace público** — token opaco de un solo recurso que permite pagar UNA factura sin sesión.
  Caduca a los 7 días. Es la vía del tenant suspendido.

### A.3 Endpoints que consume el slice

**Tenant** (`/billing`) — ⚠️ los `POST` devuelven **201** y el `DELETE` **204**:

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/billing/summary` | read | Estado de cuenta + estimación del próximo cobro + `grace_days`/`oldest_due_at` |
| GET | `/billing/invoices?page=&page_size=` | read | **Solo pagina**: sin filtro por estado ni búsqueda |
| GET | `/billing/invoices/:id` | read | Con el desglose de líneas |
| POST | `/billing/invoices/:id/checkout-session` | pay | 201 · datos firmados para el checkout |
| POST | `/billing/invoices/:id/link` | pay | 201 · emite (o **rota**) el enlace público |
| GET | `/billing/payment-sources` | read | Colección completa, no pagina |
| POST | `/billing/payment-sources` | manage | 201 · recibe el token del widget |
| DELETE | `/billing/payment-sources/:id` | manage | 204 |
| GET | `/billing/acceptance-terms` | manage | Permalinks de habeas data, **efímeros: no se cachean** |
| GET | `/billing/data-export` | manage | Habeas data. **Se audita** cada llamada |

**Plataforma** (`/platform/...`):

| Método | Ruta | Notas |
|---|---|---|
| GET | `/platform/billing/invoices?company_id=&status=&overdue=&page=&page_size=` | **`overdue` viaja como string**. Trae `company_name` |
| POST | `.../invoices/:id/withholding` · `/void` · `/adjustments` | Las tres devuelven `InvoiceAdministrationDto` con el estado recalculado |
| GET / POST | `/platform/billing/prices` · `PATCH .../:id/active` | Histórico completo. **No hay PATCH del importe** |
| GET / PATCH | `/platform/tenants/:id/billing` · `PUT .../billing/cycle` | Cuenta de cobro, avisos, gracia y fecha de corte |

**Pública** — ⚠️ **fuera del OpenAPI** (`@ApiExcludeController`), tipos escritos a mano:

| Método | Ruta | Notas |
|---|---|---|
| GET | `/public/billing/invoices/:id/:token` | Vista mínima. `payable` es la única señal de pago |
| POST | `/public/billing/invoices/:id/:token/checkout` | Mismo `CheckoutSessionDto` del panel |

Throttle de las dos: **10 req/min por IP**, y el tracker es la IP del socket.

### A.4 Eventos WebSocket

| Evento | Cuándo | Qué hace el slice |
|---|---|---|
| `billing.invoice_issued` | Se emitió la factura del ciclo | Refresca el resumen + despacha `billing:invoice:changed` |
| `billing.payment_approved` | Se aplicó un pago | Ídem, y **resuelve la pantalla de confirmación**: trae `invoice_status`, así que distingue `paid` de `partially_paid` sin repreguntar |
| `billing.past_due` | La cuenta pasó a mora | Refresca el resumen (solo trae `company_id`) |

> El tenant **ya suspendido no recibe ninguno**: su socket está cerrado desde el servidor. El aviso de
> suspensión nunca se diseña como algo que llega por WS — para él existen el correo y el WhatsApp.

**Campanita:** los avisos escriben notificaciones con `type = billing.{kind}` y `invoice_id` en su
`data`, así que el clic abre ESA factura (`notification-target.ts`). Desde B9 (`ff56b2f`) los **nueve**
`kind` tienen emisor: `invoice_issued`, `due_soon_7`, `due_soon_3`, `due_today`, `past_due`,
`suspended`, `payment_receipt`, `payment_failed` y `source_expiring`. El resolver empareja por
**prefijo**, así que cubrió los cuatro nuevos sin tocar código; `source_expiring` no trae factura y
cae a `/billing`.

---

## Parte B — Anatomía del slice

```
src/modules/billing/
├── domain/                          # TS PURO + __tests__/ (98 tests)
│   ├── invoice.ts                   # DTOs, INVOICE_STATUS_MAP, isPayable, isOverdue, hasWithholding
│   ├── account.ts                   # dunningVariant, daysToSuspension, suspensionDate
│   ├── tax.ts                       # taxLabel («Excluido de IVA»), lineTaxNote, totalTaxCents
│   ├── money.ts                     # re-export de formatMoney + estimateLabel(null)
│   ├── checkout.ts                  # URL de Wompi, URL de retorno, backoff, outcomeFromStatus
│   ├── public-invoice.ts            # tipos A MANO de la vista pública + sus 3 códigos de error
│   └── events.ts                    # BILLING_INVOICE_CHANGED
├── infrastructure/
│   ├── services/billing-service.adapter.ts   # los 10 del tenant + los 2 públicos
│   ├── stores/billing.store.ts               # resumen, con deduplicación de la petición en vuelo
│   ├── realtime/use-billing-socket.ts        # los 3 eventos + re-sync en reconexión
│   └── hooks/                                # use-start-checkout · use-payment-confirmation
└── ui/
    ├── BillingNav.tsx  BillingSummaryView.tsx  InvoicesView.tsx
    ├── InvoiceDetail.tsx (presentacional)  InvoiceDetailRoute.tsx (adaptador de ruta)
    ├── DunningBanner.tsx                     # montado en (private)/layout.tsx
    ├── PaymentReturnView.tsx                 # dos caminos: con y sin sesión
    └── PublicInvoiceView.tsx                 # pago sin sesión

src/modules/platform/                 # la superficie de plataforma NO es otro slice
├── domain/billing.ts                 # canVoidInvoice, isSettledAfter, mapas de estado, labels
├── infrastructure/api/hooks/use-billing.ts   # 8 hooks de TanStack Query
└── ui/features/billing/              # PortfolioView · PricesView · TenantBillingView ·
                                      #   InvoiceAdminSheet · PublishPriceSheet · BillingTabs
src/app/
├── (private)/(content)/billing/      # layout (nav) · page · invoices/{page,[id],@sheet}
├── platform/(admin)/billing/         # layout (tabs) · page · prices/
├── platform/(admin)/tenants/[tenantId]/billing/
└── pay/                              # PRIMER NIVEL, público: layout · return/ · [invoiceId]/[token]/
```

### B.1 Decisiones que gobiernan el slice

1. **Un solo slice, dos capas de datos.** El `domain/` puro se comparte entre las tres superficies; la
   capa de datos no: el tenant usa `http` (BFF) y plataforma `platformClient` + TanStack Query
   (architecture §8.1). La superficie de plataforma vive en `modules/platform` porque es *su* consola.
2. **Vistas documentales**, bajo `(content)` y **sin** `data-app-view`: son listas y formularios que
   crecen y hacen scrollear el panel.
3. **Checkout web por redirección, no el widget.** El widget se renderiza inyectando un
   `<script data-render="button">` dentro de un `<form>` —anti-patrón en React—, carga un tercero en la
   ruta y no aporta nada. Sin script externo tampoco hay que tocar CSP.
4. **La URL de retorno la pone el frontend** (`/pay/return?invoice=…[&token=…]`): el backend devuelve
   `redirect_url` siempre `null` y ese parámetro **no entra en la firma de integridad**.
5. **`/pay` es de primer nivel**, ni `(public)` ni `(private)`: mismo aislamiento que `/platform`. A
   ella llega gente sin sesión, incluido un tenant suspendido.
6. **La página pública llama al backend directo** (`authenticate: false`), no por el BFF: el throttle
   es por IP del socket, así que todo el tráfico por el servidor de Next compartiría un cupo de 10/min.
   Exige el origen del frontend en `CORS_ORIGINS`.
7. **`auth/payment_overdue` reutiliza la maquinaria de F15**: entra por `isSuspensionCode()` y solo
   añade una `variant` de copy. El backend lo devuelve en los tres puntos de bloqueo.
8. **Acento del módulo: ámbar.** El violeta queda para el `AiBadge`; nunca los dos en la misma vista.
   El coral es solo acción, y el banner de mora va en `warning` — el coral no significa peligro.

### B.2 Las cinco invariantes de negocio

Están en el `domain/` y con test propio, porque son donde este dominio se implementa mal:

1. **«Lo que falta» sale de `outstanding_cents`**, nunca de `total − paid`. Un cliente que practica
   ReteFuente gira menos que el total y le consigna el resto a la DIAN: es el caso B2B colombiano
   normal. Calcularlo a mano le muestra una deuda a quien pagó bien.
2. **`isPayable` exige saldo Y estado.** Una `partially_paid` con retención registrada tiene saldo
   cero y **no** es pagable. En la superficie pública la señal es `payable`, y no se deduce del status.
3. **Los impuestos van por línea.** Una misma factura lleva líneas excluidas y gravadas: sumar «un
   IVA de la factura» da un importe que no cuadra con ninguna.
4. **«Excluido de IVA», jamás «IVA 0 %».** Excluido, exento y gravado al 0 % son tres figuras
   distintas del Estatuto Tributario (Art. 476 num. 21 para la nube).
5. **`null` no es `0`.** `next_invoice_estimate_cents: null` es «no lo sabemos», y pintarlo como
   «$ 0» le promete al cliente una factura gratis. Igual con `oldest_due_at`: sin él, el banner avisa
   de la deuda **sin inventar un plazo**.

### B.3 Piezas compartidas que se reutilizan

`formatMoney`/`parseMoneyToCents`/`formatShortDate` (`core/lib/format.ts`) · `RelativeDate` ·
`DataTable` + `usePaginatedList` + `BasicPagination` · `DetailSheet` · `FieldList` · `StatTile` ·
`EmptyState` · `StatusBadge` + `StatusMap` · `TableSkeleton` · `NavTabs` · `PageHeader` ·
`ConfirmTyped` · `ProblemAlert` · `useAlert` · `useSocket`/`useSocketEvent` ·
`useAuth().hasPermission` · `notifications/public.ts#useSuppressToasts`.

Del banner de trial se copió el patrón, no el código: `TrialCountdownBanner` es la referencia visual
(franja ámbar en el grupo pegado del layout privado) y `use-trial-status` la del cálculo de días.

---

## Parte C — Desviaciones y gotchas verificados contra el código

El listado completo y numerado (44 hallazgos) está en `docs/plans/billing_frontend_plan.md` §3. Los
que más duelen si se olvidan:

1. **`redirect_url` y `expiration_time` del checkout llegan SIEMPRE `null`.** El use case no los pasa,
   y la expiración se omite a propósito porque entra en la firma. **Nunca enviar `expiration-time`**.
2. **Los dos endpoints públicos no están en el OpenAPI.** Sus tipos van a mano en
   `domain/public-invoice.ts`, con un test que fija la forma — ningún generador detectaría un cambio.
3. **La línea del detalle del tenant no trae `tax_treatment`.** Solo `tax_cents`. Por eso la exclusión
   se declara **a nivel de documento** y `lineTaxNote()` devuelve `null` sin impuesto en vez de
   adivinar. `taxLabel()` sirve a plataforma, donde el tratamiento sí viaja.
4. **La query de Wompi no se arma con `URLSearchParams`**: percent-codificaría los dos puntos del
   nombre `signature:integrity`. Se construye a mano codificando solo los valores.
5. **`GET /platform/billing/prices` declaraba `plan_id` obligatorio** por un `@Query()` sin
   `@ApiQuery`. Arreglado en el backend (`964b4b4`), **pendiente de regenerar el OpenAPI**.
6. **`AddAdjustmentDto` exige `tax_treatment` y `tax_rate_bps`** en el tipo generado aunque tengan
   default: `openapi-typescript` emite requerido lo que lleva `@default`.
7. **No existe endpoint para marcar un medio de pago como predeterminado**, ni para que el tenant lea
   o edite sus datos fiscales (§D).
8. **`Badge` no tiene variante `success`**: los estados verdes van por `StatusBadge` con el mapa en el
   `domain/`.
9. **El narrowing de un prop o un `useState` no sobrevive dentro de los callbacks.** Se resuelve
   partiendo el componente en guarda + cuerpo, o pasando el valor por parámetro — **nunca con `!`**,
   que funciona hoy y deja de avisar el día que la guarda se mueva.
10. **`formatMoney` mete un espacio DURO.** `getByText` lo normaliza, `textContent` no: las
    aserciones de importes se construyen con `formatMoney`, jamás con un literal `"$ 119.000"`.
11. **El `DetailSheet` real usa portal + framer-motion**: en tests se dobla y se prueba su contenido
    (mismo doble que `PlanFormSheet.test`). Y `@testing-library/user-event` **no está en el
    proyecto**: se usa `fireEvent`.
12. **Las suites pesadas de RHF dan timeout con el `load average` por encima de 6**, y cada corrida
    cae en una distinta. Todas pasan en aislamiento; `--maxWorkers=3` da un resultado legible.

---

## Parte D — Lo que NO existe (no lo esperes)

| Pendiente | Qué falta |
|---|---|
| **Medios de pago y cobro automático** | La superficie no se construyó. Requiere formulario propio de tarjeta con tokenización directa contra Wompi (**el PAN jamás toca axi**) + `acceptance-terms` visibles. **Puerta: confirmar con Wompi que el comercio está habilitado para COF** — el cobro recurrente solo aplica a Visa/Mastercard con procesador RBM, y sin eso el débito falla siempre |
| **Datos fiscales editables por el tenant** | Falta `GET/PATCH /billing/account`. Hoy el correo de cobro —que **nace vacío y sin él no sale ningún aviso**— solo lo rellena plataforma. La descripción del permiso `billing:manage` ya lo promete |
| **Comprobante descargable** | `GET /billing/invoices/:id/document` no está implementado |
| **Factura electrónica DIAN** | El bloque fiscal existe en el modelo pero no se expone ni se llena. **La UI no dice «factura electrónica» ni pinta CUFE**: legalmente todavía no lo es |
| **Marcar medio predeterminado · desglose de la estimación** | No hay endpoint / el DTO no lo trae |
| ~~Avisos sin emisor~~ | **Ya no aplica.** B9 (`ff56b2f`) encendió `payment_receipt`, `payment_failed` y `source_expiring`, y añadió `invoice_issued`. Los **nueve** `kind` tienen emisor, y el frontend los cubre sin cambios: el resolver empareja por prefijo |
| **Reembolsos · multi-moneda** | Fuera de alcance del backend a propósito. La vía del reembolso es la nota de crédito |

### Prerrequisitos operativos

1. **`seedRbac`** en desarrollo y producción, o el ítem del sidebar no aparece. **Nunca `npm run
   seed`**: sobrescribe el formulario `order_intake` y el catálogo del tenant demo.
2. **Llaves `*_test_*` de Wompi**, dominio verificado en Resend (SPF+DKIM) y plantilla HSM `utility`
   aprobada. Sin ellas se desarrolla con `BILLING_ENABLED=false`.
3. **`BILLING_PUBLIC_BASE_URL`** apuntando al **frontend**, y el origen del frontend en
   `CORS_ORIGINS` del backend.
4. **Nada de este camino ha tocado Wompi de verdad.** La firma, el nombre `signature:integrity` y el
   webhook solo se prueban contra el sandbox: el guion está en
   `axi-server/docs/runbooks/wompi_sandbox.md` (bloque B).
