/**
 * Contrato de «Preparar entrega» (slice `delivery` del servidor), derivado del
 * schema generado. El dominio y la UI importan de aquí: si el contrato cambia,
 * el cambio queda en esta capa.
 *
 */
import type { Schemas } from "@/core/api/types";

export type OfferSelectionWire = Schemas["OfferSelectionDto"];
export type OfferQuoteWire = Schemas["OfferQuoteDto"];
export type TenantOfferResponseWire = Schemas["TenantOfferResponseDto"];
export type TenantOfferWire = NonNullable<TenantOfferResponseWire["offer"]>;
export type OfferCatalogWire = Schemas["OfferCatalogDto"];
export type BillingPeriod = OfferSelectionWire["billing_period"];

type ContextDto = Schemas["DeliveryContextDto"];

/** Un bloqueo; si se resuelve en el panel del tenant, trae `action: { kind: 'support', target }`. */
export type BlockerWire = ContextDto["blockers"][number];
export type BlockerCode = BlockerWire["code"];
export type SupportTarget = NonNullable<BlockerWire["action"]>["target"];

export type WarningWire = Schemas["DeliveryPreviewDto"]["warnings"][number];

export type DeliveryContextWire = ContextDto;

export type DeliverySummaryWire = NonNullable<ContextDto["latest_delivery"]>;
export type AdvisorWire = DeliverySummaryWire["advisor"];
export type DeliveryStatus = DeliverySummaryWire["status"];

/** Cada intento es por destinatario (`recipient_masked`); `team_failures` cuenta los de la copia que fallaron. */
export type DeliveryDetailWire = NonNullable<Schemas["DeliveryResponseDto"]["delivery"]>;
export type DeliveryAttemptWire = DeliveryDetailWire["attempts"][number];
export type DeliveryResponseWire = { delivery: DeliveryDetailWire | null };

/**
 * `DeliveryDraftDto`. `confirm_trial_shortening`: el reinicio que acorta la
 * prueba vigente solo pasa si el envío lo confirma (la vista previa va sin él).
 */
export type DeliveryDraftWire = Schemas["DeliveryDraftDto"];

export type CreateDeliveryWire = Schemas["CreateDeliveryDto"];

export type WelcomeKitPreviewWire = Schemas["DeliveryPreviewDto"]["kit_data"];
export type DeliveryPreviewWire = Schemas["DeliveryPreviewDto"];

export type DeliveryAcceptedWire = Schemas["DeliveryAcceptedDto"];
export type DeliveryResentWire = Schemas["DeliveryResentDto"];
