import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  OrderDTO,
  ReportPaymentDTO,
  ReviewPaymentDTO,
} from "@/modules/orders/domain/order";

export type PaymentMethodDTO = Schemas["PaymentMethodDto"];

/** Medios de pago del tenant (para el select de "Registrar pago"). */
export function listPaymentMethods(): Promise<Schemas["PaymentMethodsListDto"]> {
  return http.get<Schemas["PaymentMethodsListDto"]>("/payment-methods");
}

/** Pagos del pedido (F11): registrar reporte manual y verificar/rechazar. */
export function reportPayment(orderId: string, dto: ReportPaymentDTO): Promise<OrderDTO> {
  return http.post<OrderDTO>(`/orders/${orderId}/payments`, dto);
}

/** verify → pedido `paid`; reject → vuelve a confirmed|pending. */
export function reviewPayment(
  orderId: string,
  paymentId: string,
  dto: ReviewPaymentDTO,
): Promise<OrderDTO> {
  return http.patch<OrderDTO>(`/orders/${orderId}/payments/${paymentId}`, dto);
}

/** URL presignada del comprobante (TTL 5 min): re-pedir si expira. */
export function getPaymentProofUrl(
  orderId: string,
  paymentId: string,
): Promise<{ url: string; expires_in_seconds: number }> {
  return http.get<{ url: string; expires_in_seconds: number }>(
    `/orders/${orderId}/payments/${paymentId}/attachment`,
  );
}
