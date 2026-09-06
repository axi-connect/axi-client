# Plan — La cotización viaja con el alta y vuelve a la bienvenida (Tanda B del cliente)

> Estado: **hecha (2026-09-05)**; queda del dueño `next build`, suite completa, prueba contra el servidor de la rama B y merge. Rama `feat/signup-quote` (worktree `.claude/worktrees/feat-signup-quote`) desde `main` = `fa746d7` (registro y onboarding «Flow», catálogo público A3). Contrato del servidor: Tandas B1–B3 en `axi-server` `feat/pricing-tanda-b` (sin fusionar; OpenAPI `8bb51e5`, tipos del cliente `9755ca8` fusionados en esta rama), acordado con la sesión de precios el 2026-09-05. Antecedentes: `docs/plans/onboarding_flow_plan.md` §3.

## 1. Por qué

Desde la Tanda A3 el alta muestra el precio del catálogo público, pero el servidor no sabía qué tramo, periodo ni promoción vio el visitante: cotizaba a ciegas y la bienvenida no podía decir «tras la prueba pagas X». B1 amplía el DTO del alta y devuelve la cotización en los entitlements; B2 aclara el resultado de la promoción; B3 publica los tipos. El cliente cierra el círculo: manda lo que el visitante vio y lo repite en la bienvenida.

## 2. Contrato (servidor, B1–B2)

- `POST /onboarding/signups` → `offer: { kind, codes, volume_tier?, interval?, promotion_code? }`. Sin `volume_tier` el servidor usa `default_tier`. Si la promoción cerró, el alta **sigue a precio de lista** (B2 quitó el 409). Errores nuevos: `422 onboarding/volume_tier_invalid`, `422 onboarding/interval_invalid`. Sin precio publicado el alta sigue sin cotización.
- `GET /me/entitlements` → `quote: { amount_cents (por periodo: el mes, o los 11 meses del anual), list_amount_cents, currency, interval, volume_tier_code, volume_label, promotion_code, promotion_name, promotion_outcome: applied | not_requested | closed | not_applicable | null, expires_at } | null`.
- `GET /public/pricing` → `default_tier: string | null`.

## 3. Cambios (tres, acotados)

| Dónde | Qué |
|---|---|
| `domain/signup-draft.ts` · `toSignupPayload(draft, extras, catalog, now)` | `offer` gana `volume_tier` (= `offerAxes(selection, catalog).volume`, solo paquetes y nunca «max»), `interval` (= `period`) y `promotion_code` (= `catalog.promotion.code` solo si `promotionOpen(catalog, now)` y `promotionAppliesTo` la oferta). Sin catálogo no viaja ninguno: el servidor decide. Test de dominio para los cuatro casos. |
| `ui/signup/SignupFunnelView.tsx` | Pasa `catalog` a `toSignupPayload`; los 422 nuevos caen en el aviso sobre el botón con `messageForCode` (mensajes nuevos en `core/lib/error-messages.ts`, códigos en `core/api/problem.ts`). Sin reintentos: B2 no los necesita. |
| `domain/entitlements.ts` + `ui/onboarding/WelcomeView.tsx` | `quoteLine(entitlements, now)`: «Tras la prueba: $221.900/mes · 1.000 conversaciones al mes · pago mensual · Fundadores hasta el 31 de diciembre» (anual: total y «12 meses»); `promotion_outcome === "closed"` ⇒ «La promoción cerró mientras te registrabas; tu precio es $X». `null` ⇒ sin línea. La bienvenida la pinta bajo la pastilla de oferta; el mockup dejó el hueco. Test de dominio + contrato en `WelcomeView.test`. |

`schema.d.ts` se regeneró con `npm run api:types` desde el OpenAPI de B3 (commit `9755ca8` de la sesión de precios, base de esta rama); nunca se edita a mano. La fixture `catalog.fixture.ts` gana `default_tier` y `promotion_closed` para satisfacer el DTO; `catalogFromApi` sigue derivando el tramo por defecto (leerlo del API queda para la sesión de precios). Onboarding **no** construye pantallas de pago (B4 es de facturación).

## 4. Verificación

`npx tsc --noEmit`, `npx eslint <tocados>`, `npx jest src/modules/onboarding src/app/comenzar` en serie desde el worktree. Del dueño: `next build`, suite completa, y en `next dev` contra el servidor de la rama B: alta con `?plan=crecimiento&volumen=1000` → bienvenida con la línea de cotización; alta con promoción cerrada en el catálogo → la bienvenida lo dice.
