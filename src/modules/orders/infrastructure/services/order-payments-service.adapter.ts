import { http } from "@/core/services/http";
import type {
  OrderDTO,
  ReportPaymentDTO,
  ReviewPaymentDTO,
} from "@/modules/orders/domain/order";

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
