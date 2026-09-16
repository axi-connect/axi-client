import type { ReactNode } from "react";

import { PaymentsHubNav } from "@/modules/payments/public";

/**
 * Shell del hub Pagos (Ventas): cabecera + pestañas por sub-ruta — Medios ·
 * Plan de pagos · Moneda y TRM · Documentos, filtradas por función del tenant.
 * Sustituye a la pestaña «Medios de pago» de Mi empresa (F2 Cobros).
 */
export default function PaymentsHubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cómo te pagan tus clientes: medios, plan de pagos, moneda y documentos.
        </p>
      </header>
      <PaymentsHubNav />
      {children}
    </div>
  );
}
