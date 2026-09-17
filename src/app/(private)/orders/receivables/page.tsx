import { ReceivablesView } from "@/modules/collections/ui/ReceivablesView";

/**
 * Cartera (F4 del programa Cobros).
 *
 * Vive DENTRO de `/orders` y no como sección propia para heredar su shell y su
 * rail: desde una fila se abre el pedido en el mismo sitio donde se abre desde
 * el tablero. El segmento estático gana al dinámico `[orderId]`, así que
 * `/orders/receivables` no se confunde con un pedido llamado «receivables».
 */
export default function ReceivablesPage() {
  return <ReceivablesView />;
}
