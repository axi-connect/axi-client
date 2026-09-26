import { RemindersTab } from "@/modules/collections/ui/components/RemindersTab";

export const metadata = { title: "Recordatorios · Pagos" };

/**
 * Pestaña «Recordatorios» (`/collections/settings`, función `collections`).
 *
 * Aparte de «Plan de pagos» a propósito: ahí se decide el TRATO, que cada
 * pedido congela al confirmarlo, y aquí la OPERACIÓN, que se lee viva en cada
 * envío y alcanza también a los clientes que ya deben.
 */
export default function PaymentsRemindersPage() {
  return <RemindersTab />;
}
