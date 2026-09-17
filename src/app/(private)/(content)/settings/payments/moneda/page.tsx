import { FxSettingsTab } from "@/modules/payments/public";

export const metadata = { title: "Moneda y TRM · Pagos" };

/** Pestaña «Moneda y TRM» (`/fx/*`, capacidad `sales` + función `fx_quotes`). */
export default function PaymentsCurrencyPage() {
  return <FxSettingsTab />;
}
