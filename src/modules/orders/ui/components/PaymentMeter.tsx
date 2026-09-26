import { paymentProgress } from "@/modules/orders/domain/order";
import { cn } from "@/core/lib/utils";

/**
 * Cuánto lleva cobrado un pedido: un tramo por PAGO verificado, del ancho de su
 * importe, y el resto hueco. Así se ven dos abonos sin leer la lista.
 *
 * Se dibuja como UN elemento con degradado, sin hijos: un contenedor de cajas
 * vacías queda a merced de cómo cada entorno pinte un elemento sin contenido.
 */
export function PaymentMeter({
  order,
  className,
}: {
  order: Parameters<typeof paymentProgress>[0];
  className?: string;
}) {
  const { percent, segments } = paymentProgress(order);
  const stops: string[] = [];
  let at = 0;
  segments.forEach((width, index) => {
    if (index > 0) {
      stops.push(`var(--color-background) ${at}% ${at + 0.5}%`);
      at += 0.5;
    }
    const end = Math.min(100, at + width);
    stops.push(`var(--color-brand) ${at}% ${end}%`);
    at = end;
  });
  if (at < 100) stops.push(`var(--color-secondary) ${at}% 100%`);

  return (
    <div
      role="img"
      aria-label={`Cobrado el ${String(percent)} por ciento`}
      className={cn("h-1.5 overflow-hidden rounded-full", className)}
      style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }}
    />
  );
}
