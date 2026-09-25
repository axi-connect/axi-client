/**
 * Llamadas de «Preparar entrega» sobre el `platformClient` tipado (Bearer,
 * 401 → re-login, HttpError RFC 7807). El middleware lanza en `!ok`, así que
 * `data` siempre existe al volver.
 */
import { platformClient } from "./platform-client";
import type {
  CreateDeliveryWire,
  DeliveryContextWire,
  DeliveryDraftWire,
  DeliveryPreviewWire,
  DeliveryResponseWire,
  OfferSelectionWire,
} from "./delivery.dto";

const path = (id: string) => ({ params: { path: { id } } });

export const deliveryApi = {
  async context(tenantId: string, signal?: AbortSignal): Promise<DeliveryContextWire> {
    const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/delivery/context", {
      ...path(tenantId),
      signal,
    });
    return data!;
  },

  async latest(tenantId: string, signal?: AbortSignal): Promise<DeliveryResponseWire> {
    const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/delivery", {
      ...path(tenantId),
      signal,
    });
    return data!;
  },

  async preview(tenantId: string, draft: DeliveryDraftWire, signal?: AbortSignal): Promise<DeliveryPreviewWire> {
    const { data } = await platformClient.POST("/api/v1/platform/tenants/{id}/delivery/preview", {
      ...path(tenantId),
      body: draft,
      signal,
    });
    return data!;
  },

  async create(tenantId: string, body: CreateDeliveryWire) {
    const { data } = await platformClient.POST("/api/v1/platform/tenants/{id}/delivery", {
      ...path(tenantId),
      body,
    });
    return data!;
  },

  async resend(tenantId: string, deliveryId: string) {
    const { data } = await platformClient.POST("/api/v1/platform/tenants/{id}/delivery/{deliveryId}/resend", {
      params: { path: { id: tenantId, deliveryId } },
    });
    return data!;
  },

  async offerCatalog(signal?: AbortSignal) {
    const { data } = await platformClient.GET("/api/v1/platform/offer-catalog", { signal });
    return data!;
  },

  async offerPreview(tenantId: string, selection: OfferSelectionWire, signal?: AbortSignal) {
    const { data } = await platformClient.POST("/api/v1/platform/tenants/{id}/offer/preview", {
      ...path(tenantId),
      body: selection,
      signal,
    });
    return data!;
  },
};
