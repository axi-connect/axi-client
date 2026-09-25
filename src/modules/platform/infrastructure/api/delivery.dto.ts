/**
 * Contrato de «Preparar entrega» (slice `delivery` del servidor), derivado del
 * schema generado. El dominio y la UI importan de aquí: si el contrato cambia,
 * el cambio queda en esta capa.
 *
 * Lo marcado TEMPORAL son cambios del servidor en curso que aún no están en
 * `openapi.json` (bloqueos `already_paying` y `trial_shortens`, y
 * `confirm_trial_shortening` en el borrador). Al regenerar `schema.d.ts` con
 * ellos, las extensiones sobran y se borran.
 */
import type { Schemas } from "@/core/api/types";

export type OfferSelectionWire = Schemas["OfferSelectionDto"];
export type OfferQuoteWire = Schemas["OfferQuoteDto"];
export type TenantOfferResponseWire = Schemas["TenantOfferResponseDto"];
export type TenantOfferWire = NonNullable<TenantOfferResponseWire["offer"]>;
export type OfferCatalogWire = Schemas["OfferCatalogDto"];
export type BillingPeriod = OfferSelectionWire["billing_period"];

type ContextDto = Schemas["DeliveryContextDto"];

/** TEMPORAL hasta schema.d.ts: los dos bloqueos nuevos del servidor. */
export type BlockerCode =
  | ContextDto["blockers"][number]["code"]
  | "already_paying"
  | "trial_shortens";

export type BlockerWire = { code: BlockerCode; message: string };

export type WarningWire = Schemas["DeliveryPreviewDto"]["warnings"][number];

export type DeliveryContextWire = Omit<ContextDto, "blockers"> & { blockers: BlockerWire[] };

export type DeliverySummaryWire = NonNullable<ContextDto["latest_delivery"]>;
export type AdvisorWire = DeliverySummaryWire["advisor"];
export type DeliveryStatus = DeliverySummaryWire["status"];

export type DeliveryDetailWire = NonNullable<Schemas["DeliveryResponseDto"]["delivery"]>;
export type DeliveryAttemptWire = DeliveryDetailWire["attempts"][number];
export type DeliveryResponseWire = { delivery: DeliveryDetailWire | null };

/**
 * `DeliveryDraftDto` + TEMPORAL `confirm_trial_shortening`: el reinicio que
 * acorta la prueba vigente solo pasa si el borrador lo confirma.
 */
export type DeliveryDraftWire = Schemas["DeliveryDraftDto"] & { confirm_trial_shortening?: boolean };

export type CreateDeliveryWire = DeliveryDraftWire & { idempotency_key: string };

type PreviewDto = Schemas["DeliveryPreviewDto"];
export type WelcomeKitPreviewWire = PreviewDto["kit_data"];
export type DeliveryPreviewWire = Omit<PreviewDto, "blockers"> & { blockers: BlockerWire[] };

export type DeliveryAcceptedWire = Schemas["DeliveryAcceptedDto"];
export type DeliveryResentWire = Schemas["DeliveryResentDto"];
