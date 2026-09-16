import { PaymentMethodsTab } from "@/modules/payments/public";

export const metadata = { title: "Medios de pago · Pagos" };

/** Pestaña «Medios» del hub (`/payment-methods`, capacidad `sales`). */
export default function PaymentMethodsPage() {
  return <PaymentMethodsTab />;
}
