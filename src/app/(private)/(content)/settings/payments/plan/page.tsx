import { PaymentPolicyTab } from "@/modules/collections/ui/components/PaymentPolicyTab";

export const metadata = { title: "Plan de pagos · Pagos" };

/** Pestaña «Plan de pagos» (`/collections/settings`, función `payment_plans`). */
export default function PaymentsPlanPage() {
  return <PaymentPolicyTab />;
}
