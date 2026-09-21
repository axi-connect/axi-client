import { http } from "@/core/services/http";
import type { CollectionsSettingsDTO } from "@/modules/collections/domain/reminder";
import type {
  CollectionsPolicyDTO,
  PlanDetailDTO,
  PlanPreviewDTO,
} from "@/modules/collections/domain/payment-plan";
import type { ReceivablesStatsDTO } from "@/modules/collections/domain/receivable";
import type { Schemas } from "@/core/api/types";

export type ReceivablesListDTO = Schemas["ReceivablesListDto"];
export type PlanRemindersDTO = Schemas["PlanRemindersDto"];

/**
 * Adapter del slice `collections` (`/collections/*`, capacidad `sales` +
 * función `collections`). Sin la función el backend responde 403
 * `features/feature_disabled` — y la vista lo explica en vez de romperse.
 */
export function listReceivables(params: {
  travelled?: boolean;
  bucket?: string;
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<ReceivablesListDTO> {
  const query = new URLSearchParams();
  if (params.travelled === true) query.set("travelled", "true");
  if (params.bucket !== undefined) query.set("bucket", params.bucket);
  if (params.q !== undefined && params.q !== "") query.set("q", params.q);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.page_size !== undefined)
    query.set("page_size", String(params.page_size));
  const suffix = query.toString();
  return http.get<ReceivablesListDTO>(
    `/collections/receivables${suffix === "" ? "" : `?${suffix}`}`,
  );
}

export function getReceivablesStats(): Promise<ReceivablesStatsDTO> {
  return http.get<ReceivablesStatsDTO>("/collections/receivables/stats");
}

/** El plan de un pedido; 404 `collections/plan_not_found` si no tiene. */
export function getPlanByOrder(orderId: string): Promise<PlanDetailDTO> {
  return http.get<PlanDetailDTO>(`/collections/plans/by-order/${orderId}`);
}

/**
 * La política MÁS `available_variables`, que es de solo lectura y viaja por el
 * wire para que el cliente no tenga que espejar la lista del renderizador.
 */
export function getCollectionsPolicy(): Promise<CollectionsSettingsDTO> {
  return http.get<CollectionsSettingsDTO>("/collections/settings");
}

export function saveCollectionsPolicy(
  policy: CollectionsPolicyDTO,
): Promise<CollectionsPolicyDTO> {
  return http.put<CollectionsPolicyDTO>("/collections/settings", policy);
}

/** El calendario que produciría la política de hoy; puro, no escribe nada. */
export function previewPlan(input: {
  total_cents: number;
  service_date?: string | null;
}): Promise<PlanPreviewDTO> {
  return http.post<PlanPreviewDTO>("/collections/plans/preview", input);
}

/** 409 `collections/schedule_mismatch` con las dos cifras si no cuadra. */
export function reschedulePlan(
  planId: string,
  installments: { due_at: string; amount_cents: number }[],
): Promise<{ plan_id: string }> {
  return http.put<{ plan_id: string }>(
    `/collections/plans/${planId}/schedule`,
    { installments },
  );
}

export function recordPromise(
  planId: string,
  promise: { promised_at: string; amount_cents?: number; note?: string },
): Promise<{ plan_id: string }> {
  return http.post<{ plan_id: string }>(
    `/collections/plans/${planId}/promises`,
    promise,
  );
}

/** El historial de avisos del plan, los OMITIDOS incluidos (F5). */
export function getPlanReminders(planId: string): Promise<PlanRemindersDTO> {
  return http.get<PlanRemindersDTO>(`/collections/plans/${planId}/reminders`);
}

/**
 * Escribirle a alguien AHORA, saltándose la cadencia.
 *
 * Devuelve `skipped` cuando el servidor decide no mandarlo (no hay cuota que
 * cobrar, el correo no está configurado…): no es un error de red y la pantalla
 * tiene que poder decir cuál de las dos cosas pasó.
 */
export function sendReminder(
  planId: string,
  input: {
    installment_id?: string;
    channel: "whatsapp" | "email";
    body?: string;
  },
): Promise<{ plan_id: string; outcome: "queued" | "skipped" }> {
  return http.post<{ plan_id: string; outcome: "queued" | "skipped" }>(
    `/collections/plans/${planId}/reminders`,
    input,
  );
}
