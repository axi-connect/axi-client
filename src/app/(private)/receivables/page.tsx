import { ReceivablesView } from "@/modules/collections/ui/ReceivablesView";

/**
 * Cartera (F4 del programa Cobros).
 *
 * Vive FUERA de `/orders`, y no por gusto: el slot `@sheet` de pedidos lleva la
 * ruta interceptada `(.)[orderId]`, que casa con CUALQUIER hermano de ese
 * nivel — incluido un segmento estático. Con la Cartera dentro, pulsarla desde
 * el tablero abría un rail roto para un pedido llamado «receivables» y dejaba
 * el tablero debajo: la Cartera no llegaba a pintarse nunca.
 *
 * Comprobado en un spike con la aplicación levantada y el navegador de verdad,
 * porque leyendo el código no se ve. Probé también meter un segmento estático
 * dentro del propio slot y NO basta: en navegación soft la interceptación gana
 * igual. Aquí fuera, la Cartera se pinta sola y abrir una fila lleva al pedido
 * con su rail ya abierto, que es a donde el operador quería ir.
 */
export default function ReceivablesPage() {
  return <ReceivablesView />;
}
