import { http } from "@/core/services/http";
import type {
  CreatePaymentMethodDTO,
  PaymentMethodDTO,
  PaymentMethodsListDTO,
  UpdatePaymentMethodDTO,
} from "@/modules/payments/domain/payment-method";

/** Adapter HTTP del slice payments → `/payment-methods` (capacidad `sales`). */
export function listPaymentMethods(): Promise<PaymentMethodsListDTO> {
  return http.get<PaymentMethodsListDTO>("/payment-methods");
}

export function createPaymentMethod(dto: CreatePaymentMethodDTO): Promise<PaymentMethodDTO> {
  return http.post<PaymentMethodDTO>("/payment-methods", dto);
}

/** PATCH parcial: `null` borra un valor; una clave ausente lo conserva. */
export function updatePaymentMethod(
  id: string,
  dto: UpdatePaymentMethodDTO,
): Promise<PaymentMethodDTO> {
  return http.patch<PaymentMethodDTO>(`/payment-methods/${id}`, dto);
}

/** 204 sin body. */
export function deletePaymentMethod(id: string): Promise<void> {
  return http.delete<void>(`/payment-methods/${id}`);
}
