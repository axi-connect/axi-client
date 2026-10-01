import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";

/**
 * Axi en el mapa: el `BrandMark` en una moneda (Rutas de captación, en lugar
 * del avión). Late solo mientras la salida corre —indica que el servidor
 * trabaja (DESIGN-SYSTEM §6)— y con movimiento reducido no late.
 */
export function AxiCoin({ size = 36, live = false, paused = false, className, style }: {
  size?: number;
  live?: boolean;
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      data-axi={live ? "live" : paused ? "paused" : "still"}
      className={cn(
        // El disco se ve por su filo y su sombra (el fondo es el de la tarjeta). La sombra como `rgba(…)` con comas:
        // `rgb(0_0_0/0.25)` no generaba la clase y la moneda quedaba en un α suelto.
        "bg-background ring-border relative grid place-items-center rounded-full shadow-[0_6px_18px_-4px_rgba(0,0,0,0.25)] ring-1",
        paused && "shadow-[0_0_0_6px_color-mix(in_srgb,var(--foreground)_8%,transparent)]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      {/* El pulso de marca de siempre (`brand-pulse`, el del BrandLoader): solo transform y opacity. */}
      <BrandMark className={cn(live && "animate-brand-pulse motion-reduce:animate-none")} style={{ width: size * 0.66, height: size * 0.66 }} />
    </span>
  );
}
