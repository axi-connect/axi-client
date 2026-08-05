import type { ReactNode } from "react";

/**
 * Shell del panel de pedidos (F11): full-bleed acotado a la altura disponible
 * (patrón workspace). El slot @sheet renderiza el detalle como RAIL derecho
 * inline (mockup "Cart") vía la ruta interceptada /orders/[orderId] — URL
 * compartible, back cierra.
 *
 * `min-h-0 flex-1` en vez de `calc(100svh - alto del header)`: la altura la
 * reparte el flex del shell privado (DESIGN-SYSTEM §4.2).
 */
export default function OrdersLayout({
  children,
  sheet,
}: {
  children: ReactNode;
  sheet: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
    </div>
  );
}
