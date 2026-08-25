# Plan de implementación — Módulo Facturación y pagos (frontend)

> **Plan vivo por fases (F0–F6).** Cada fase se aprueba antes de codificarse y cierra con su propio
> PR; al terminar se reporta y se espera (regla del proyecto: «gate por fase = aprobación explícita»).
>
> **Contrato del backend:** `axi-server/docs/billing_frontend_kb.md` (16 secciones), en la rama
> `feat/billing-wompi` de `axi-server` — **con `main` ya fusionado** (`d6b2aae`), **sin pushear**.
> Verificación de punta a punta: `axi-server/docs/runbooks/wompi_sandbox.md`.
> Reglas: `axi-client/docs/architecture.md` · Diseño: `docs/design/DESIGN.md` + `DESIGN-SYSTEM.md`.
>
> Estándar de diseño: legible y premium, glass solo en superficies flotantes (DESIGN-SYSTEM §5.2),
> radios generosos, `tabular-nums` en **toda** cifra, acento secundario del módulo = **ámbar**
> (el violeta queda exclusivo del `AiBadge`; nunca los dos acentos en la misma vista — DESIGN §3.1).
>
> Este plan se copia a `axi-client/docs/plans/billing_frontend_plan.md` al aprobarse.

---

## Contexto

El backend del módulo `billing` está completo (B0–B8): axi emite una factura por ciclo al tenant, la
cobra por Wompi, avisa antes del vencimiento, suspende si no se paga y reactiva al recibir el pago.
**No hay ni una línea de frontend** — el grep de `billing`, `wompi` y `payment_overdue` sobre
`axi-client/src` da cero resultados de dominio. Hoy el módulo es invisible:

- el tenant no puede ver su estado de cuenta ni pagar su factura;
- plataforma no puede publicar una tarifa, registrar una retención ni trabajar la cartera;
- y un tenant suspendido por mora recibe un `403 auth/payment_overdue` que el cliente **no
  distingue** de una suspensión manual, así que lo manda a «contacta a soporte» en vez de a pagar —
  exactamente la fricción que el backend diseñó ese código para evitar.

Este plan construye las **tres superficies** del KB, separadas a propósito:

| Superficie | Quién entra | Ruta del frontend | Capa de datos |
|---|---|---|---|
| **Tenant** | owner/admin de la empresa | `/billing` | `http` (BFF `/api/proxy`) + Zustand / `usePaginatedList` |
| **Plataforma** | `super_admin`, `billing_ops` | `/platform/billing` + tab en la ficha del tenant | `platformClient` (`openapi-fetch`) + TanStack Query |
| **Pública** | cualquiera con el enlace firmado, **sin sesión** | `/pay/:invoice_id/:token` y `/pay/return` | `http` con `authenticate: false` (directo al backend) |

> ⚠️ **No confundir con el módulo `payments`** (el tenant cobrándole a *sus* clientes finales). Otro
> módulo, otro prefijo (`/payments/*`, `/payment-methods`), otra pantalla. Mezclarlos en la UI sería un
> error grave: el dueño de una PyME vería «medios de pago» y no sabría si son los suyos o los de axi.

---

## 1. Estado de fases

| Fase | Contenido | Estado |
|---|---|---|
| **F0** | Mockup HTML navegable de alta fidelidad (Artifact privado) | ✅ **Aprobado** 2026-08-25 |
| **F1** | Fundaciones: `api:types`, slice `modules/billing` con `domain/` puro, adapter, `error-messages`, eventos WS, icono + nodo de sidebar, ruta `/billing` con **Resumen** | ✅ **Código completo** |
| **F2** | **Plataforma**: tarifas (vigencias + publicar), cartera (`overdue=true`), las tres acciones de factura, tab `Facturación` en la ficha del tenant | ⏳ |
| **F3** | **Facturas del tenant**: lista paginada + detalle en `DetailSheet` con líneas y desglose fiscal | ⏳ |
| **F4** | **Pago**: checkout de Wompi + `/pay/return` + confirmación por WS + resolver de campanita | ⏳ |
| **F5** | **Mora y suspensión**: banner escalado + tercera variante de `CompanySuspendedScreen` + **página pública `/pay/:id/:token`** | ⏳ |
| **F6** | Tests, `docs/modules/billing.md`, reindexado del grafo | ⏳ |

**Orden justificado.** F2 (plataforma) va **antes** que las vistas del tenant porque es la única forma
de crear el dato: sin una tarifa publicada, un plan asignado y un `billing_email` relleno no existe
ninguna factura que mirar, y F3–F5 serían inverificables salvo con SQL a mano. F4 depende de F3 (el
botón «Pagar» vive en la lista y el detalle). F5 depende de F4 porque la página pública reutiliza
íntegro el mismo camino de checkout.

**Ítem de sidebar:** solo la raíz `/billing`, sembrada en el backend (P1). Las cuatro vistas de la
sección van con `NavTabs`, no como hijos del menú.

---

## 2. Decisiones de diseño

1. **Slice único `src/modules/billing/`** con `domain/ + infrastructure/ + ui/` (sin `application/`:
   regla de escape sancionada, architecture §3.2). Las tres superficies comparten el `domain/` puro
   (estados, tonos, mora, etiquetas fiscales, dinero) y **no** comparten capa de datos: el tenant usa
   `http`, plataforma usa `platformClient`. Sin `public.ts` hasta que aparezca el primer consumidor.
2. **Vistas documentales** bajo `(private)/(content)/billing/*`, **sin** `data-app-view`: son listas,
   paneles y formularios que crecen. Cero riesgo del post-mortem del doble scroll.
3. **`page.tsx` de 4–8 líneas** (server component, solo `metadata` + delegar) con su `loading.tsx`
   hermano; la lógica en una `*View` con `"use client"`. Patrón `marketing/campaigns`.
4. **Sub-navegación con `NavTabs`** (`shared/components/layout/nav-tabs.tsx`), filtrada por permiso en
   el módulo dueño — no en `NavTabs`, para que `shared/` no dependa del `AuthProvider` (patrón `CrmNav`).
5. **Checkout web de Wompi por redirección**, no el widget `<script>`:
   `https://checkout.wompi.co/p/?public-key=…&currency=…&amount-in-cents=…&reference=…&signature:integrity=…&redirect-url=…`.
   El widget se renderiza inyectando un `<script data-render="button">` dentro de un `<form>` —un
   anti-patrón en React—, obliga a cargar un tercero en la ruta y no aporta nada frente a una
   redirección. Sin script externo no hay que tocar CSP (hoy el proyecto **no tiene** ninguna;
   `next.config.ts` documenta la CSP objetivo para el día que se adopte) ni cabeceras de aislamiento.
6. **`redirect_url` lo pone el frontend.** El backend lo devuelve `null` (verificado, §3.1) y **no
   entra en la firma de integridad** —que cubre `reference + amount + currency [+ expiración]`—, así
   que fijarlo desde el cliente es seguro y no invalida nada.
7. **La página de retorno nunca dice «pago confirmado».** Dice «Estamos confirmando tu pago» y resuelve
   por el evento WS `billing.payment_approved` (que trae `invoice_status`, así que distingue `paid` de
   `partially_paid` sin repreguntar) o por backoff **con techo** sobre `GET /billing/invoices/:id`.
   Copy propio para PSE y efectivo: pueden tardar horas, y la pantalla lo dice en vez de girar.
8. **`/pay` es una ruta de primer nivel** (`src/app/pay/layout.tsx`), fuera de `(public)` y de
   `(private)` — aislamiento total, solo hereda el layout raíz. Es el mismo precedente de
   `src/app/platform/`. `noindex` + `DISALLOWED_PREFIXES`.
9. **La página pública llama al backend directo** (`http` con `authenticate: false`), no por el BFF ni
   por RSC. Razón dura: el throttle del endpoint público es **10 req/min por IP** y el tracker es
   `ip:${request.ip}` (`app_throttler.guard.ts`) — si el tráfico pasara por el servidor de Next, todos
   los pagadores del mundo compartirían un solo cupo de 10/min. A cambio exige el origen del frontend
   en `CORS_ORIGINS` del backend (P5).
10. **`auth/payment_overdue` reutiliza íntegra la maquinaria de F15**: se añade el code a
    `API_ERROR_CODES` y a `isSuspensionCode()` (`core/api/problem.ts`) y una tercera `variant` a
    `CompanySuspendedScreen`. Verificado que el backend lo devuelve en los **tres** puntos de bloqueo
    —login, refresh y el verifier del access token (`auth/application/suspension_reason.ts`)—, así que
    un solo cambio cubre todos los caminos sin tocar el proxy ni ningún slice.
11. **Estado local, sin caché global en el tenant**: `usePaginatedList` para la lista de facturas,
    store Zustand + `use-billing-socket.ts` para resumen y eventos, refresco por CustomEvents
    (`billing:*:success`). TanStack Query **solo** en `/platform` (architecture §8.1).
12. **Gating de plataforma por 403, no por rol en cliente.** `platform_role` no viaja en ningún DTO del
    OpenAPI y `PlatformGuard` es binario por diseño. Se pinta la sección y el 403 se traduce con
    `ProblemAlert`/`EmptyState` («Tu rol de plataforma no tiene acceso a facturación»). Coherente con
    «el guard es UX; la barrera real es el backend».
13. **Nada de PDF ni «factura electrónica».** El comprobante no existe como endpoint y el bloque fiscal
    DIAN no se llena: la UI dice **«comprobante»**, nunca «factura electrónica», y no pinta CUFE. La
    etiqueta fiscal es **«Excluido de IVA»**, jamás «IVA 0 %» (es incorrecto tributariamente).
14. **No se toca `/usage`.** Sigue en `UNIMPLEMENTED_NAV_PATHS`: es otro módulo pendiente. La función
    de «vista previa del consumo» la cumple `next_invoice_estimate_cents` dentro del resumen (KB §14).
15. **`useAlert().showModal` no se usa para confirmaciones no destructivas**: el `AlertProvider` inyecta
    un `children` fijo («Esta acción no se puede deshacer…») en todos los modales. Para anular una
    factura se usa `ConfirmTyped`; para el resto, `Dialog` directo.

---

## 3. Desviaciones del contrato, verificadas contra el código del backend

Todo lo de abajo se comprobó leyendo el código y el `openapi.json` del worktree, no el KB.

### 3.1 Del KB §5 (checkout)

1. **`redirect_url` llega SIEMPRE `null`**, en el panel y en la página pública.
   `CreateCheckoutSessionUseCase` llama a `createCheckoutSession({reference, amount_cents, currency})`
   sin `redirect_url` ni `expires_at`. El KB lo presenta como dato del servidor: no lo es. → decisión 6.
2. **`expiration_time` llega SIEMPRE `null`, y a propósito** (comentario del use case: entra en la
   firma y un desajuste produce un rechazo genérico que no dice cuál de los dos lados sobra). →
   **nunca** enviar `expiration-time` al checkout. La regla 3 del KB §5 queda vacía en la práctica.
3. **El `redirect_url` que el backend sí construye es para el link de cobranza**
   (`createPaymentLink`, modo `link` — el que viaja en los avisos de mora). Apuntaba a
   `${BILLING_PUBLIC_BASE_URL}/billing/return`, que lo abre un tenant **suspendido** y cuelga de una
   ruta privada cuyo guard lo mandaría al login. → **ya cambiado a `/pay/return`** (P0): un solo
   prefijo público, sin ambigüedad de layouts.
4. **`BILLING_PUBLIC_BASE_URL` debe apuntar al FRONTEND** (`:3001` en dev), no a la API: de ahí salen
   tanto `/pay/:id/:token` como la URL de retorno.

### 3.2 Endpoints que el KB anuncia y que no existen

5. **Los dos endpoints públicos NO están en el OpenAPI**: `PublicBillingController` es
   `@ApiExcludeController` («no es API de producto, es una página de pago»). → `schema.d.ts` no los
   tipa; sus dos tipos se escriben **a mano** en `domain/public-invoice.ts`, marcados como tal y con
   un test que los fija.
6. **No hay endpoint para marcar un medio de pago como predeterminado.** `payment-sources` solo expone
   `GET`, `POST` (201) y `DELETE` (204). El KB §13 sugiere el botón: no existe.
7. **El tenant no puede leer ni editar sus datos de facturación.** No existe `GET/PATCH
   /billing/account`; `legal_name`, `tax_id`, `billing_email` y `billing_phone` solo se editan desde
   `PATCH /platform/tenants/:id/billing`, y `GET /billing/summary` no los devuelve. Choca con la
   descripción del propio permiso (`billing:manage` = «…y cambiar los datos de facturación»,
   `security.seeder.ts`) y con que **`billing_email` nace vacío a propósito** — sin él no sale ningún
   aviso. → **decisión del usuario: no se construye esa pantalla en esta entrega y el hueco queda
   documentado** (§6). Los datos fiscales se gestionan 100 % desde plataforma (F2).
8. **`next_invoice_estimate_cents` es un entero suelto, sin desglose.** El KB §13 pide «la estimación
   con el desglose de excedentes»: el DTO no lo trae. → se pinta la cifra con su explicación en texto
   («cuota vigente + excedente acumulado del ciclo»), sin inventar líneas.

### 3.3 Detalles de contrato que cambian la UI

9. **`account_status` puede ser `null`** (tenant en trial, nunca tuvo cuenta de cobro). No es error:
    la pantalla funciona y muestra el estado de prueba, enlazando a `TrialStatusChip` /
    `use-trial-status.ts` que ya existen — no se duplica esa lógica.
10. **`next_invoice_estimate_cents: null` ⇒ «sin estimación disponible»**, nunca «$0»: cero es un dato
    y `null` es la ausencia de dato.
11. ~~**`grace_days` no lo ve el tenant**~~ — **RESUELTO en el backend (P0)**: `BillingSummaryDto`
    trae ya `grace_days` y `oldest_due_at`. La cuenta atrás es
    `grace_days − díasDesde(oldest_due_at)`, medida desde la deuda **más vieja** (la que dispara la
    suspensión), y `oldest_due_at: null` ⇒ no hay cuenta atrás que pintar.
12. **Paginación offset con envelope `{data, meta:{total,page,page_size}}`** en las dos listas de
    facturas → `usePaginatedList` aplica tal cual. **`GET /billing/invoices` no acepta `status` ni
    búsqueda** (solo `page`/`page_size`) → el filtro por estado va **en cliente**, sobre la página
    cargada, y se etiqueta como tal. `payment-sources` y `prices` devuelven `{data}` sin `meta`: no
    paginan.
13. **Las tres acciones de plataforma devuelven el mismo `InvoiceAdministrationDto`**
    (`invoice_id, status, total_cents, paid_cents, withholding_cents, outstanding_cents`) con el estado
    recalculado → se usa para refrescar la fila, no se repregunta.
14. **`overdue` viaja como `string` en el query** de `GET /platform/billing/invoices`, no como boolean.
15. **`AddAdjustmentDto.amount_cents` es `exclusiveMinimum: 0`**: siempre positivo, el signo lo pone
    `kind` (`credit` resta, `adjustment` suma). Un negativo da 422 → el formulario lo impide y el copy
    lo explica, o alguien escribirá un negativo.
16. **`RegisterWithholdingDto.withholding_cents` es un valor ABSOLUTO**, no un incremento. El
    formulario dice «Retención total practicada»; corregir un error es reenviarlo con la cifra buena.
17. **`billing.*` no está en el contrato de eventos WS del cliente.** Los tres eventos existen en el
    backend (`realtime_events.ts`) pero `core/realtime/events.ts` no los tipa → se añaden en F1.
18. **La notificación de campanita trae `invoice_id` en `data`** (payload de `billing.notice`), así que
    el deep-link es construible. `notificationTarget` no tiene familia `billing.` → se añade.
19. **No hay registry de icono por tipo de notificación**: `NotificationItem` no pinta icono y
    `NotificationToaster` usa un `<Bell>` fijo. → no se promete icono propio para los avisos de
    facturación; sería crear ese registry, y no está en el alcance.
20. **Tres tipos de campanita están documentados pero no tienen emisor** (`billing.payment_receipt`,
    `billing.payment_failed`, `billing.source_expiring`): plantilla escrita, ningún emisor. **No se
    construyen manejadores** — no llegarían nunca. Para «tu pago se aplicó» se usa el WS.
21. **El suspendido no recibe ningún evento WS** (su socket está cerrado). El aviso de suspensión no se
    diseña como algo que llega por WS.
22. **Los textos de los avisos vienen redactados del backend** (`notice_templates.ts`): `title` y `body`
    se pintan tal cual. Reescribirlos en el cliente haría que el correo y la campanita dijeran cosas
    distintas del mismo hecho.

### 3.4 Halladas al implementar F1

23. **La línea del detalle del tenant NO trae el tratamiento fiscal.** `InvoiceDetailDto.lines` expone
    `{kind, description, quantity, unit_amount_cents, amount_cents, tax_cents}` y **nada más**: ni
    `tax_treatment` ni `tax_rate_bps` (que sí viajan en las tarifas de plataforma y en el export de
    habeas data). Excluido, exento y gravado al 0 % dan los tres `tax_cents: 0` y son figuras
    tributarias distintas, así que **no se puede afirmar por línea** cuál aplica. → la exclusión de la
    licencia se declara **una vez a nivel de documento**, donde es cierta por ley, y `lineTaxNote()`
    devuelve `null` sin impuesto en vez de escribir «Excluido de IVA» adivinando. `taxLabel()` queda
    para la superficie de plataforma (F2), donde el tratamiento sí existe.
24. **F1 no monta la sub-navegación.** Una sola pestaña no es navegación, y añadir «Facturas» antes de
    F3 dejaría un ítem apuntando a un 404 — la regla del proyecto lo prohíbe. `BillingNav` entra en F3,
    cuando hay dos destinos reales.

---

## 4. Prerrequisitos del backend

### P0 — ✅ **HECHO** (`axi-server` `b710444`, rama `feat/billing-wompi`)

Los tres cambios que bloqueaban F1, con 415 tests de billing en verde:

| Cambio | Fichero | Estado |
|---|---|---|
| Nodo `rbac_ui_module` de `/billing` (`icon: 'receipt'`, `billing:read`) | `prisma/seeders/security.seeder.ts` | ✅ — **falta correr `seedRbac`** en la base de desarrollo y en producción |
| `redirect_url` → `${public_base_url}/pay/return` | `application/use_cases/charge_invoice.use_case.ts` | ✅ |
| `grace_days` y `oldest_due_at` en `BillingSummaryDto` | `presentation/dto/billing.dto.ts` + `queries/tenant_invoices.query.ts` + `oldestDueAt()` en `invoice_math.ts` | ✅ |

El nodo NO fija posición a mano: `flattenUiModuleTree` ordena a los hermanos por longitud de
etiqueta, y «Facturación» (11) cae entre «Analítica» (9) y «Configuración» (13) por sí solo. Las dos
verjas del spec del seeder (orden de raíces + inventario de códigos) quedaron actualizadas.

### P1 — ✅ **HECHO** (`schema.d.ts` regenerado, `tsc` limpio)

Requirió antes **fusionar `main` en `feat/billing-wompi`** (`9a0714a` + `d6b2aae`): la rama de billing
había salido antes de que aterrizara el módulo de **integraciones**, así que su OpenAPI *no era
superconjunto* del de `main` — le faltaban 11 paths y 17 schemas que el frontend **sí consume** (el
módulo de integraciones está fusionado en `axi-client` main). Generar los tipos solo desde billing
habría roto la compilación del cliente en silencio.

Verde tras el merge: **2340 unitarios** (235 suites) y **654 de integración/e2e** (72 suites).
Conflictos resueltos, los seis por unión —ambas ramas añadían a la misma lista—: `identity.prisma`,
`security.seeder.ts`, `app.module.ts`, `app.setup.ts`, `queue_names.ts` y `env.schema.ts`.

**Tres gotchas del merge, anotadas para la próxima:**

1. **`npm run openapi:generate` falla con `ERR_MODULE_NOT_FOUND` sobre `dist/`** después de un merge
   que añade módulos: el build incremental de nest deja `dist` a medias y el error apunta a un
   fichero de config que **sí existe** en `src`, así que despista. Hay que `rm -rf dist` antes.
2. **`prisma generate` es obligatorio tras el merge**: el schema trae campos nuevos
   (`governed_by_connection_id`) y el cliente generado se queda viejo, produciendo ~30 errores de
   typecheck que parecen del código y son del cliente Prisma.
3. **`openapi.json` es generado: se regenera, no se automergea.** Esta vez el automerge coincidió
   byte a byte con la regeneración, pero comprobarlo cuesta un `git diff` y confiarse cuesta un
   contrato falso.

### Pendientes que siguen abiertos

| # | Bloquea | Detalle |
|---|---|---|
| P2 | Ítem de menú visible | Correr **`seedRbac`** (nunca `npm run seed`: sobrescribe el formulario `order_intake` y el catálogo del tenant demo). Es del usuario, no del agente: toca su base de desarrollo. |
| P3 | Verificación real | Las tres cosas del KB §16: llaves `*_test_*` de Wompi, dominio verificado en Resend (SPF+DKIM) y plantilla HSM `utility` aprobada. Sin ellas se desarrolla con `BILLING_ENABLED=false`: la superficie responde y el adapter de correo queda inerte. |
| P4 | Despliegue | `BILLING_PUBLIC_BASE_URL` → origen del **frontend**; origen del frontend en `CORS_ORIGINS` del backend (decisión 9). |

## 5. Piezas existentes reutilizadas (no se reinventan)

| Pieza | Ruta |
|---|---|
| `formatMoney(cents, currency)` (`$ 45.000`, 0 decimales en COP), `parseMoneyToCents`, `formatShortDate` | `core/lib/format.ts` |
| `relativeTime` · `<RelativeDate iso/>` (relativo + absoluto en tooltip, `—` si null) | `core/lib/relative-time.ts`, `shared/components/ui/relative-date.tsx` |
| `DataTable` (filas planas de primitivos) + `usePaginatedList` + `buildListParams` + `BasicPagination` | `shared/components/features/data-table/`, `shared/api/`, `shared/components/ui/pagination/` |
| `DetailSheet` (con `fetchDetail`) · `FieldList` · `Timeline` · `StatTile` · `EmptyState` · `PriceInput` | `shared/components/features/` |
| `StatusBadge` + `StatusMap`/`StatusTone` (el mapa lo aporta el `domain/` del slice, sin React) | `shared/components/features/status-badge/` |
| `TableSkeleton` / `FormSkeleton` (anchos deterministas) · `BrandLoader` | `shared/components/features/loading/`, `shared/components/ui/` |
| `DynamicForm` + `createInputField`/`createCustomField` + `createZodResolver` · `Switch` | `shared/components/features/dynamic-form/`, `shared/components/ui/switch.tsx` |
| `NavTabs` · `PageHeader` | `shared/components/layout/` |
| `errorMessage`, `applyServerValidation`, `HttpError.is()`, `API_ERROR_CODES`, `ProblemDetails` | `core/lib/error-messages.ts`, `core/api/problem.ts` |
| `CompanySuspendedScreen` (polimórfica por `variant`) · `isSuspensionCode` · `COMPANY_SUSPENDED_EVENT` | `core/providers/`, `core/api/problem.ts` |
| `TrialCountdownBanner` (franja ámbar, `border-warning/30 bg-warning/10`, montada en el grupo pegado) · `TrialStatusChip` · `use-trial-status.ts` (cálculo de días) | `modules/companies/ui/components/`, `.../infrastructure/hooks/` |
| `useSocket` / `useSocketEvent` + el idiom de re-sync en reconexión (`wasConnectedRef`) | `core/realtime/`, patrón de `use-marketing-socket.ts` |
| `useAuth().hasPermission` (wildcard `resource:*`) · `useAlert().showAlert` (`StatusAlert`) | `shared/auth/auth.hooks.ts`, `core/providers/alert-provider.tsx` |
| `notificationTarget` · `suppressToasts(prefix)` del store de notificaciones | `modules/notifications/domain/`, `.../infrastructure/stores/` |
| `platformClient`, `platformKeys`, `query-client.ts`, `ProblemAlert`, `ConfirmTyped`, `TenantTabs`, `sortRows` | `modules/platform/` |
| `noindexMetadata()` · `DISALLOWED_PREFIXES` | `core/seo/metadata.ts`, `core/seo/routes.ts` |

---

## 6. Fuera de alcance — apuntado para próximas actualizaciones

Se documenta en `docs/modules/billing.md` §Pendientes y se referencia desde este plan. Nada de esto se
construye en esta entrega, y la UI **no lo insinúa** (ni botones deshabilitados ni «pronto»).

| Pendiente | Qué falta y por qué se aplaza |
|---|---|
| **Medios de pago y cobro automático** | Requiere el formulario propio de tarjeta con tokenización directa contra Wompi (`POST {host}/tokens/cards` con la llave pública; el PAN, el CVC y la fecha **jamás** tocan axi) + `GET /billing/acceptance-terms` con los dos permalinks visibles (Ley 1581/2012) + `POST /billing/payment-sources`. **Puerta de entrada: confirmar con el ejecutivo de Wompi que el comercio está habilitado para COF** — el cobro recurrente solo aplica a Visa/Mastercard con procesador RBM, y sin eso el débito automático falla siempre (KB §16). Mientras no exista, `has_payment_source` y `auto_charge` del summary se muestran como información de solo lectura. |
| **Datos de facturación editables por el tenant** | Falta `GET/PATCH /billing/account` bajo `billing:manage` (§3.2.7). Es lo que permitiría al dueño rellenar su propio `billing_email` —que nace vacío y sin el cual no sale ningún aviso— y corregir razón social o NIT sin abrir un ticket. El permiso ya lo promete en su descripción. Hoy se gestiona desde `/platform/tenants/:id/billing`. |
| **Comprobante descargable** | `GET /billing/invoices/:id/document` no está implementado (estaba en B7 y se dejó fuera). Sin él no hay «Descargar factura»; construirlo en el cliente a partir del detalle es una fase propia. |
| **Factura electrónica DIAN** | El bloque fiscal existe en el modelo pero no se expone ni se llena: no hay proveedor conectado. Es obligatoria para una S.A.S. aunque el servicio esté excluido de IVA (Res. 000165/2023), pero es trabajo de backend (un adapter del puerto `FISCAL_INVOICING`). |
| **Marcar un medio como predeterminado** | No existe el endpoint (§3.2.6). |
| **Desglose de la estimación del próximo cobro** | `next_invoice_estimate_cents` es un entero sin líneas (§3.2.8). |
| **Avisos `payment_receipt`, `payment_failed`, `source_expiring`** | Plantilla escrita, ningún emisor (§3.3.20). |
| **Reembolsos · multi-moneda · el módulo `payments` del tenant** | Fuera de alcance del backend a propósito. La vía del reembolso es la nota de crédito. |

---

## 7. Detalle por fase

### F0 — Mockup HTML navegable — ✅ **APROBADO 2026-08-25**

Artifact privado: <https://claude.ai/code/artifact/081f0547-f497-4e17-a2d1-197c4bbf7d71>

Diez pantallas navegables con conmutador claro / oscuro / sistema, consumiendo la paleta real de
`globals.css` (cero hex inventados), los radios 8/12/16/20 y Poppins. El activo de pestañas es
`bg-accent` con icono coral, no coral sólido: blanco sobre `--axi-brand` da ~3.1:1 y no pasa AA en
12–13 px. Cada pantalla lleva la decisión que ilustra anotada encima.

Las tres que fijan lo que se implementa mal en este dominio: **AXI-000040 aparece «Pagada» con
«falta $ 0» aunque el pagado sea menor que el total** (retención), **los impuestos van por línea**
(tres excluidas y una gravada en la misma factura), y **el retorno del pago nunca dice «confirmado»**.

### F1 — Fundaciones + Resumen del tenant

**Precede:** P0 ✅ y P1 ✅ — F1 está desbloqueada.

**Nuevos**
- `modules/billing/domain/invoice.ts` — `InvoiceDTO = Schemas["InvoiceListDto"]["data"][number]`,
  `InvoiceDetailDTO`, `INVOICE_STATUS: StatusMap` (los 6 estados con `label`+`tone` del KB §3),
  `isPayable(invoice)`, `LINE_KIND_LABELS`.
- `modules/billing/domain/account.ts` — `AccountStatus`, `dunningVariant(summary)` → `none | past_due
  | cancelled | trial`, y `daysToSuspension(oldest_due_at, grace_days)` (patrón de `use-trial-status`).
- `modules/billing/domain/tax.ts` — `taxLabel(tax_treatment)` → **«Excluido de IVA»** / «IVA 19 %» /
  «Exento». Jamás «IVA 0 %».
- `modules/billing/domain/money.ts` — re-export de `formatMoney` (patrón `orders/domain/order.ts`) +
  `estimateLabel(cents | null)` que devuelve «sin estimación disponible» ante `null`.
- `modules/billing/domain/public-invoice.ts` — los dos tipos escritos a mano (§3.2.5).
- `modules/billing/infrastructure/services/billing-service.adapter.ts` — los 10 endpoints del tenant,
  con los códigos exactos (`POST` → 201, `DELETE` → 204).
- `modules/billing/infrastructure/stores/billing.store.ts` — resumen + mutaciones por evento WS.
- `modules/billing/infrastructure/realtime/use-billing-socket.ts` — los tres eventos + re-sync en
  reconexión con `wasConnectedRef` (los eventos emitidos con el socket caído se perdieron).
- `modules/billing/ui/BillingNav.tsx` · `modules/billing/ui/BillingSummaryView.tsx`.
- `src/app/(private)/(content)/billing/{layout,page,loading}.tsx`.
- `__tests__/` hermano de cada módulo de `domain/`.

**Modificados**
- `core/api/schema.d.ts` — regenerado (P1).
- `core/lib/icons.ts` — `"receipt": Receipt` (hoy no está; caería a `Circle`).
- `core/realtime/events.ts` — `billing.invoice_issued`, `billing.payment_approved`, `billing.past_due`
  en `InboxServerEvents`, con los payloads del KB §8.
- `core/lib/error-messages.ts` — bloque `billing/*` + `auth/payment_overdue` (textos del KB §12).
  **502/503 nunca dicen «tu pago falló»** («No pudimos confirmar el pago; recargamos el estado de la
  factura») y **no se ofrece reintentar**: un timeout puede llegar después de que la pasarela creara el
  cobro, y un reintento acabaría en un pago doble.

**Vista Resumen:** `PageHeader` + fila de `StatTile` con **la estimación del próximo cobro en
protagonista** (no una línea al pie: es la pieza que evita la factura sorpresa), saldo pendiente,
facturas abiertas y plan vigente. Estado de ciclo con `period_start/period_end`. `account_status ===
null` → estado de prueba, enlazando a lo que ya existe. Los cuatro estados obligatorios de vista:
cargando / vacío / error / datos.

**Aceptación:** `/billing` aparece en el sidebar con su icono, carga sin errores en claro y oscuro, y
un tenant en trial ve una pantalla coherente en vez de un error.

### F2 — Plataforma

**Nuevos**
- `src/app/platform/(admin)/billing/{page,loading}.tsx` — **Cartera**, `overdue=true` por defecto: es
  la pantalla de trabajo diario. La lista trae `company_name` (nadie llama a un uuid). Facets de
  estado/empresa + `DataTable` con paginación server.
- `src/app/platform/(admin)/billing/prices/{page,loading}.tsx` — **Tarifas**: línea de tiempo de
  vigencias por plan usando `is_current` e `is_active` (es lo que explica por qué una factura vieja
  dice otro importe) y **«Publicar nueva tarifa»**. **Nunca un importe editable en línea**: una tarifa
  se **sucede**, no se edita, porque una factura emitida debe conservar el precio con el que se vendió.
- `src/app/platform/(admin)/tenants/[tenantId]/billing/{page,loading}.tsx` + su feature view.
- Feature views bajo `modules/platform/ui/features/billing/` + hooks en
  `modules/platform/infrastructure/api/hooks/use-billing.ts`.

**Modificados**
- `modules/platform/domain/navigation.ts` — ítem `Facturación` → `/platform/billing`.
- `modules/platform/ui/components/PlatformSidebar.tsx` — `receipt` en su `NAV_ICONS` local.
- `modules/platform/infrastructure/api/query-keys.ts` — subárbol `billing.{prices, invoices, tenant}`
  con factories (nunca arrays ad-hoc).
- `modules/platform/ui/features/tenants/detail/TenantTabs.tsx` — pestaña `Facturación`.

**Detalle de factura con las tres acciones:**
- **Retención** — «Retención total practicada» (valor absoluto, §3.3.16). 409 si supera el total.
- **Anular** — `ConfirmTyped` + motivo obligatorio (queda escrito). Deshabilitado si hay pagos
  aplicados (409: para eso está la nota de crédito). El consecutivo **no se reutiliza**: la factura
  anulada sigue en la lista con su número.
- **Ajuste / nota de crédito** — `amount_cents` siempre positivo, el signo lo pone `kind` (§3.3.15).

Tras cualquiera de las tres, la fila se refresca con el `InvoiceAdministrationDto` devuelto, y si la
factura queda saldada y el tenant no debe nada más el backend reactiva solo: **hay que decírselo al
operador** — «Factura saldada. El servicio de ACME se reactivó.»

**Ficha del tenant:** `TenantBillingViewDto` completo — datos del contribuyente (**aquí se rellena
`billing_email`, que nace vacío**), tres `Switch` de aviso (`notify_email`, `notify_whatsapp`,
`notify_in_app`, con la nota de que WhatsApp queda apagado sin HSM aprobada y el backend lo registra
`failed` a propósito), `grace_days`, `payment_terms_days`, `auto_charge` y la fecha de corte
(`PUT .../billing/cycle`).

**Formulario de tarifa:** `interval`, `amount_cents` (`PriceInput`), `tax_treatment`, `effective_from`
y `overage_rates[]` con `metric` (los 11 del enum), `unit_size` (el bloque facturable: 1.000.000
tokens, 1.000 caracteres…), `amount_cents_per_unit` e `included_quantity` (`null` = tomar el tope del
plan del tenant). 409 `billing/price_vigency_overlap` → «Ya hay una tarifa que empieza en esa fecha o
después».

**Aceptación:** se puede publicar una tarifa, asignar el plan, rellenar el correo de cobro y ver la
factura emitida en la cartera — es decir, F3 pasa a ser verificable con datos reales.

### F3 — Facturas del tenant

- `/billing/invoices`: `DataTable` + `usePaginatedList` (offset), filtro de estado **en cliente**
  (§3.3.12) etiquetado como tal, badges desde `INVOICE_STATUS`, fechas con `<RelativeDate>`, botón
  **Pagar** solo si `isPayable()`.
- Detalle en `DetailSheet` (ruta interceptada `@sheet/(.)invoices/[invoiceId]`, patrón de `orders`):
  `FieldList` con la cabecera y las líneas con `kind`, `quantity`, `unit_amount_cents`, `amount_cents`
  y **`tax_cents` por línea** — nunca un IVA global, porque una misma factura puede llevar una línea
  excluida y otra gravada.
- **«Retención en la fuente» como línea propia** cuando `withholding_cents > 0`, no escondida.
- **`outstanding_cents` es la única fuente de «lo que falta»**; jamás `total − paid`. Un cliente que
  practica ReteFuente gira menos que el total y le paga el resto a la DIAN: calcularlo a mano le
  mostraría una deuda a alguien que pagó bien. Eso es lo normal en B2B colombiano, no una excepción.
- «Emitir enlace de pago» (`POST .../link`, 201) con aviso explícito de que **invalida el anterior**
  (el contador puede tener el viejo abierto) y de que caduca a los 7 días.
- `suppressToasts("billing.")` mientras la vista está montada: el badge y la lista de la campanita se
  siguen actualizando, pero no salta un toast de algo que el usuario está mirando.

### F4 — Pago

- `POST .../checkout-session` (201) → se arma la URL del checkout web (decisión 5) con `redirect-url`
  propio y **sin** `expiration-time` (§3.1.2) ni `tax-in-cents:vat` (la licencia va excluida de IVA;
  declarar un IVA que no existe es un problema tributario, no un detalle de formulario).
- **La firma viene del servidor y nunca se calcula en el navegador.** Si algún día falta en la
  respuesta es un bug del backend: no se genera en el cliente. Y no se toca `amount_in_cents`,
  `currency` ni `reference` — la firma cubre exactamente esos tres valores.
- `src/app/pay/return/page.tsx` (pública, decisión 8): «Estamos confirmando tu pago» → resuelve por
  `billing.payment_approved` o backoff con techo. Copy propio para PSE/efectivo.
- `modules/notifications/domain/notification-target.ts`: familia `"billing."` →
  `/billing/invoices/${invoice_id}` (y `/billing` si no viene el id).
- El resto del panel escucha `billing.past_due` y `billing.invoice_issued` para refrescar el resumen.

**Aceptación:** el runbook §B.2 completo — pagar con `4242 4242 4242 4242`, volver al retorno, y ver
la factura pasar a `paid` sin tocar nada más; y con `4111 1111 1111 1111` no ver nunca «pagado».

### F5 — Mora, suspensión y pago sin sesión

- **Banner de mora** en el grupo pegado de `(private)/layout.tsx`, patrón `TrialCountdownBanner`
  (`border-warning/30 bg-warning/10`, `role="alert"`): ámbar, persistente, con el saldo, la cuenta
  atrás (habilitada por P3) y «Pagar ahora». **El panel sigue operativo** en `past_due` — el banner no
  bloquea nada.
- **`auth/payment_overdue`**: entrada en `API_ERROR_CODES`, alta en `isSuspensionCode()`, tercera
  `variant` en `CompanySuspendedScreen` — «Tu servicio está suspendido por un pago pendiente. Te
  enviamos el enlace de pago por correo y WhatsApp; en cuanto se registre el pago, el servicio se
  reactiva solo.» **Sin regañar** (quien lo lee ya tiene el problema) y **sin ofrecer un enlace `/pay`
  desde ahí**: sin sesión no hay forma de emitirlo, y el aviso de cobranza lleva el link de Wompi
  directamente. CTA a soporte por WhatsApp (`salesWhatsAppUrl`).
- **`src/app/pay/layout.tsx`** + **`src/app/pay/[invoiceId]/[token]/page.tsx`**: sin layout de app, sin
  enlaces al panel, sin datos del tenant que la API no dé (quien tiene el enlace puede ser el contador
  externo, o alguien a quien se lo reenviaron). **`payable` es la única señal** que habilita el botón —
  una factura `partially_paid` con retención registrada tiene saldo cero y **no** es pagable, así que
  no se deduce del `status`. `amount_cents` aquí es lo que falta, no el total.
- Errores de la página pública: **410** `billing/link_expired` («Este enlace caducó» + cómo pedir otro;
  no es culpa del usuario), **401** mensaje genérico (no confirmar si la factura existe), **409**
  `billing/invoice_not_payable` («Esta factura ya está pagada» — con alivio, no con error). **Sin
  reintento en bucle**: el throttle es 10 req/min por IP y es estricto a propósito.
- `PUBLIC_PATHS += "/pay"` (`core/config/routes.ts`). **Segundo guard, fácil de olvidar:** el
  `AuthProvider` hidrata en todo el árbol y su `redirectToLogin()` solo se salva por `isPublicPath` —
  sin el registro, el cliente redirige al login aunque el middleware no lo haga.
- `noindexMetadata()` en el layout de `/pay` + prefijo en `DISALLOWED_PREFIXES` (`core/seo/routes.ts`),
  y **no** listarla en `INDEXABLE_ROUTES`.

**Aceptación:** el runbook §B.5 completo — mora → suspensión → login que da 403 `payment_overdue` y
lleva a la pantalla de pago (no a la de soporte) → pago por el enlace público desde una ventana de
incógnito → el tenant vuelve a entrar sin que nadie toque nada.

### F6 — Tests, documentación y grafo

- **Unit (Jest + Testing Library)**, con prioridad al `domain/` puro: máquina de estados de la factura,
  `isPayable`, `dunningVariant`, `daysToSuspension`, `outstanding` con retención, `taxLabel`,
  `estimateLabel(null)`, resolver de campanita, tipos a mano de la vista pública.
- **No-regresión de F15**: `isSuspensionCode('auth/payment_overdue') === true`, y que un 403 de RBAC
  (`rbac/permission_denied`) **no** dispare la pantalla bloqueante.
- `docs/modules/billing.md` con el formato de `marketing.md` (contrato / anatomía del slice /
  desviaciones y gotchas) e incluyendo §6 de este plan como «Pendientes».
- Copiar este plan a `axi-client/docs/plans/billing_frontend_plan.md`.
- Reindexar el grafo `codebase-memory` del proyecto `axi-client`.

---

## 8. Rendimiento (requisitos, no aspiraciones)

1. **Cero fan-out**: el Resumen pide `summary` + primera página de facturas. Nada por fila.
2. **Sin polling en el tenant**: la confirmación del pago va por WS; el backoff sobre
   `GET /billing/invoices/:id` es **solo** el fallback de la pantalla de retorno, con techo (~60 s) y
   parada explícita — no un spinner infinito.
3. **WS dirigido**: cada evento muta el store; nada refetchea la lista completa salvo la reconexión.
4. **Polling de plataforma derivado del estado**, con las funciones puras de
   `platform/domain/polling.ts`; la cartera no se repregunta sola.
5. **`extraParams` de `usePaginatedList` siempre memoizado** (depende de la referencia: sin `useMemo`
   entra en bucle de fetch) y **reset explícito a página 1** al cambiar filtros — el hook no lo hace
   pese a lo que promete su JSDoc.
6. **Sin `data-app-view`**: el shell no cambia de modo de scroll.
7. `"use client"` solo en las `*View`; las `page.tsx` son server components.
8. **Cero librerías nuevas**: sin charts, sin script de Wompi, sin cliente HTTP adicional.

## 9. Verificación por fase

- `npx tsc --noEmit` · `npx eslint <lo tocado>` · `npm test` · `npx next build`.
- `npm run api:types:check` solo tendrá sentido tras mergear el backend a main (P1).
- **Visual**: claro, oscuro y ancho móvil, con guard automático de desbordamiento horizontal (receta de
  chromium sin sudo en WSL de `docs/`). Trampa conocida: `npm`/`npx` desde un worktree con
  `node_modules` symlinkeado **vacía** el del checkout principal → este worktree tiene su **propia
  copia** (945 MB, como los de marketing y scheduling) y los binarios se invocan desde
  `node_modules/.bin`.
- **`npm run build` en un worktree exige `.env.local`**, que no está versionado: hay que copiarlo del
  checkout principal. Sin él el build muere en `Failed to collect page data for /api/auth/refresh` por
  un `NEXT_PUBLIC_SALES_WHATSAPP` ausente — un error que no nombra la variable en la línea que
  importa y que no tiene nada que ver con lo que estés tocando.
- **De punta a punta**: `axi-server/docs/runbooks/wompi_sandbox.md`, bloque B — tarjetas
  `4242…4242` (aprueba) / `4111…1111` (rechaza), PSE bancos `"1"`/`"2"`, Nequi `3991111111`/`3992222222`,
  y los caminos que no son un pago (retención, anulación, nota de crédito).
- **El usuario compila y levanta él**: nunca se arranca en modo dev ni se matan sus servidores; se le
  entregan los comandos.
