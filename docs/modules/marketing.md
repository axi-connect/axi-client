# Módulo Marketing — Recuperación de ventas, campañas y promociones

> **Doc del módulo (base de conocimiento para el agente ejecutor).** Parte A: contrato del backend
> que consume este slice. Parte B: anatomía y decisiones del frontend. Parte C: desviaciones reales
> del contrato, verificadas contra el código (no contra la KB).
>
> **Estado (2026-08-06): F1 implementada** — transversales, piezas compartidas y el Resumen
> `/marketing`, en la rama `feat/marketing-frontend`. Plan vivo con el estado de cada fase y los
> mockups aprobados: `docs/plans/marketing_frontend_plan.md`.
>
> Documentos rectores: `docs/architecture.md` (§3.2 anatomía, §3.3 dependencias, §5 naming, §16
> checklist), `docs/design/DESIGN.md` §3.1, `docs/design/DESIGN-SYSTEM.md`, `docs/design/LOADING.md`.
> Del backend: `axi-server/docs/plans/marketing_module_plan.md` (decisiones D1–D22) y
> `axi-server/docs/marketing_frontend_kb.md`.
>
> Concepto de producto: el valor de axi es **no dejar escapar a nadie**. Este módulo cubre lo que el
> agente no hacía: (1) recuperar ventas perdidas con reglas automáticas, (2) hablarle a toda la base
> con campañas, (3) un motor de cupones REAL (el descuento lo aplica el sistema al pedido, jamás el
> LLM) y (4) medir cuánto dinero produjo cada cosa.

---

## Parte A — Contrato del backend

### A.1 Acceso

| Cosa | Valor |
|---|---|
| Permisos | `marketing:read` (ver) / `marketing:manage` (crear, lanzar, configurar). Owner, admin y supervisor tienen ambos; **operador ninguno** |
| Sidebar | Ítem raíz `Marketing → /marketing`, icono `megaphone` (mapeado en `core/lib/icons.ts`), con 4 hijos que siembra cada fase |
| Prefijo | Todo bajo `/api/v1/marketing/...` |
| WS | Namespace `/inbox`, room de la company — **seis** eventos `marketing.*` (§A.4) |

### A.2 Entidades

- **Campaña**: envío masivo. Audiencia = segmento CRM **o** filtros ad-hoc (mismo DSL) **o** nada
  (= todos). Contenido = plantilla del tenant y/o HSM de Meta. Al lanzar, audiencia y contenido
  quedan **congelados**.
- **Automatización (regla de recuperación)**: trigger + delay + condiciones + promoción opcional +
  mensaje. **Nacen apagadas.** Entre reglas del mismo trigger gana la primera que coincide por
  `priority` (first-match-wins), y un episodio recibe como mucho UN mensaje.
- **Promoción**: `percent_discount` · `fixed_discount` · `gift_product` · `free_shipping`. Emite
  cupones que **vencen de verdad** server-side. Una sola promo por pedido; el descuento manual del
  operador gana.
- **Opt-out**: baja de comunicaciones comerciales, automática por keyword o manual. **Toda audiencia
  la excluye estructuralmente.**

### A.3 Endpoints (los que consume el slice)

| Recurso | Paginado | Notas |
|---|---|---|
| `GET/POST /marketing/campaigns` · `GET/PATCH/DELETE :id` | sí (`page`, `page_size`, `status`) | **el listado NO trae stats** |
| `POST :id/{preview-audience,launch,pause,resume,cancel}` | — | `preview-audience` exige campaña existente |
| `GET :id/stats` · `GET :id/recipients` | recipients sí | funnel completo + `skipped_by_reason` |
| `GET/POST /marketing/automations` · `GET/PATCH/DELETE :id` · `GET :id/metrics` | **no** | colección completa |
| `GET/POST /marketing/promotions` · `GET/PATCH/DELETE :id` · `GET :id/redemptions` | redemptions sí | |
| `GET/POST /marketing/templates` · `PATCH/DELETE :id` | **no** | |
| `GET /marketing/hsm-templates?channel_id=` · `POST /sync` · `POST` | **no** | `channel_id` obligatorio |
| `GET/POST /marketing/opt-outs` · `POST :id/revoke` | sí | |
| `GET/PUT /marketing/settings` | — | el PUT exige la sección COMPLETA |

Códigos de error (`marketing/*`, 19) mapeados en `core/lib/error-messages.ts`.

### A.4 Eventos WebSocket

Declarados en `core/realtime/events.ts` con sus payloads. Los seis llevan `simulated`.

| Evento | Cuándo |
|---|---|
| `marketing.campaign_status_changed` | toda transición de campaña |
| `marketing.campaign_progress` | al terminar el fan-out (`audience_total`, `pending`) |
| `marketing.automation_triggered` | cada decisión de una regla (`sent` \| `skipped` + motivo) |
| `marketing.opt_out_created` | baja registrada |
| `marketing.promotion_redeemed` / `_reverted` | cupón aplicado / revertido por cancelación |

`delivered` y `read` **no tienen evento**: el backend los reconcilia por lotes cada 5 min (decisión
D6 del backend). Por eso el detalle de campaña combina WS + un polling lento.

---

## Parte B — Anatomía del slice

```
src/modules/marketing/
├── domain/                       # TS PURO + __tests__/
│   ├── enums.ts                  # uniones desde Schemas + labels ES
│   ├── campaign.ts               # DTOs + params de listado
│   ├── campaign-state.ts         # predicados de acción, campaignPollInterval, progreso
│   ├── campaign-draft.ts         # wizard: bloqueo por paso, payloads excluyentes, estimación
│   ├── automation.ts             # AutomationConditions + parseConditions defensivo, requiresHsm
│   ├── promotion.ts              # estado derivado, describePromotionKind, progreso de canjes
│   ├── template.ts               # espejo del renderer del backend + vista previa
│   ├── template-catalog.ts       # plantillas del tenant y HSM de Meta
│   ├── settings.ts               # defaults y rangos de la configuración
│   └── skip-reasons.ts           # 21 motivos + fallback crudo + desglose
├── infrastructure/
│   ├── services/                 # campaigns · automations · promotions · templates ·
│   │                             #   hsm-templates · opt-outs · marketing-settings
│   ├── stores/overview.store.ts  # Section<T> por bloque + topes de fan-out
│   └── realtime/use-marketing-socket.ts
└── ui/
    ├── MarketingOverviewView · CampaignsView · CampaignWizard · PromotionsView ·
    │   AutomationsView · MarketingSettingsView · TemplatesView · MetaTemplatesView · OptOutsView
    ├── components/               # LiveCampaignCard · RecoveryFeed · OverviewSkeleton ·
    │                             #   PromotionCard · RedemptionsSheet · AutomationCard ·
    │                             #   MessageTemplateField · MarketingSettingsNav
    └── forms/config/             # promotion.config · automation.config

src/app/(private)/(content)/marketing/
├── {page,loading}.tsx                Resumen
├── campaigns/{page,loading}.tsx + campaigns/new/page.tsx
├── promotions/{page,loading}.tsx
├── automations/{page,loading}.tsx
└── settings/{layout,page,loading}.tsx + templates/ + meta-templates/ + opt-outs/
```

**Reglas propias del slice:**

- El `domain/` no importa React ni `http`. Los mapas estado→tono usan los tipos de
  `shared/components/features/status-badge/types` (módulo sin React, a propósito).
- La UI nunca llama a `http`: pasa por un adapter del slice.
- Los montos son **centavos**: `formatMoney` siempre, nunca el entero crudo.
- Un estado o motivo desconocido del backend se muestra **crudo**, no traducido a la fuerza: tiene
  que verse raro para que lo mapeemos.
- El DSL de audiencia **no se reimplementa**: el constructor y su descripción humana son del CRM
  (`AudienceFilterBuilder` y `describeSegmentFilters` vía `crm/public.ts`). Un segundo builder sería
  un segundo sitio donde el DSL se puede desincronizar.

---

## Parte C — Desviaciones y gotchas

Están en `docs/plans/marketing_frontend_plan.md` §3, con las 13 verificadas contra el código. Las
tres que más condicionan el diseño:

1. `channel.template_status_changed` **no existe**: la pantalla de HSM no refresca por WS.
2. La lista de campañas **no trae stats**: prohibido el fan-out; el Resumen pide como mucho 5.
3. `preview-audience` es un POST sobre una campaña existente: el wizard crea el borrador en el paso 1.
