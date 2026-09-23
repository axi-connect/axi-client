import type { ReactNode } from "react";

/**
 * Segmento de Comercial. Vive DENTRO del grupo `(content)`: la ruta del mes es
 * una vista documental (crece y la scrollea el panel), no de aplicación.
 *
 * El slot `@sheet` pinta el detalle de un resultado clave
 * (`/comercial/resultados/[key]`) y de una acción propuesta
 * (`/comercial/acciones/[id]`) como rutas interceptadas con `DetailSheet`: URL
 * compartible y el atrás del navegador cierra. El panel es un portal de
 * Radix: no necesita hueco en el flex (patrón de `billing/invoices`).
 */
export default function ComercialLayout({ children, sheet }: { children: ReactNode; sheet: ReactNode }) {
  return (
    <>
      {children}
      {sheet}
    </>
  );
}
