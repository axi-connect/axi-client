import type { ReactNode } from "react";

/**
 * Shell del panel de pedidos (F11): full-bleed acotado al viewport (patrón
 * workspace, 52px = PrivateHeader). El slot @sheet renderiza el detalle como
 * RAIL derecho inline (mockup "Cart") vía la ruta interceptada
 * /orders/[orderId] — URL compartible, back cierra.
 */
export default function OrdersLayout({
  children,
  sheet,
}: {
  children: ReactNode;
  sheet: ReactNode;
}) {
  return (
    <div className="flex w-full h-[calc(100svh-52px)] min-h-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
    </div>
  );
}
