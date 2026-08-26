import type { ReactNode } from "react";

/**
 * Segmento de facturas. El slot `@sheet` renderiza el detalle como panel
 * lateral vía la ruta interceptada `/billing/invoices/[invoiceId]`: URL
 * compartible y el atrás del navegador cierra.
 *
 * No lleva `data-app-view`: es una vista documental (una tabla que crece y
 * scrollea el panel), y el sheet es un portal de Radix que no necesita hueco en
 * el flex.
 */
export default function BillingInvoicesLayout({
  children,
  sheet,
}: {
  children: ReactNode;
  sheet: ReactNode;
}) {
  return (
    <>
      {children}
      {sheet}
    </>
  );
}
