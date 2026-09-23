import type { ReactNode } from "react";

/**
 * Segmento de Comercial. Vive DENTRO del grupo `(content)`: la ruta del mes es
 * una vista documental (crece y la scrollea el panel), no de aplicación.
 *
 * En F6 este layout gana el slot `@sheet` para el detalle de un resultado clave
 * (`/comercial/resultados/[key]`) y de una acción (`/comercial/acciones/[id]`)
 * como rutas interceptadas con `DetailSheet`: URL compartible, el back cierra.
 */
export default function ComercialLayout({ children }: { children: ReactNode }) {
  return children;
}
