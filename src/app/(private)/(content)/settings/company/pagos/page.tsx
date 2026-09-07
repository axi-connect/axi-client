import { PaymentMethodsTab } from "@/modules/payments/public"

export const metadata = { title: "Medios de pago · Mi empresa" }

/** Pestaña «Medios de pago» (`/payment-methods`, capacidad `sales`). */
export default function CompanyPaymentsPage() {
  return <PaymentMethodsTab />
}
