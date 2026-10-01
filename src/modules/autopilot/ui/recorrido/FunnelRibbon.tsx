import { useId } from "react";

/**
 * La cinta de embudo de una salida (ficha del piloto): encontradas →
 * calificadas → contactadas, que se adelgaza como el mapa. El grosor es su
 * parte de la salida más ancha de la lista, así se comparan sin abrirlas; un
 * cero sigue viéndose como un hilo.
 */
export function FunnelRibbon({ found, qualified, contacted, widest }: { found: number; qualified: number; contacted: number; widest: number }) {
  const gradient = useId();
  const h = 16;
  const y = h / 2;
  const half = (value: number) => Math.max(1.2, (value / Math.max(1, widest)) * 6.5);
  const [f, q, c] = [half(found), half(qualified), half(contacted)];
  const x1 = 110;
  const x2 = 220;
  const d = [
    `M0 ${String(y - f)}`,
    `C${String(x1 * 0.6)} ${String(y - f)} ${String(x1 * 0.6)} ${String(y - q)} ${String(x1)} ${String(y - q)}`,
    `L${String(x2)} ${String(y - q)}`,
    `C${String(x2 + 40)} ${String(y - q)} ${String(x2 + 40)} ${String(y - c)} 330 ${String(y - c)}`,
    `L330 ${String(y + c)}`,
    `C${String(x2 + 40)} ${String(y + c)} ${String(x2 + 40)} ${String(y + q)} ${String(x2)} ${String(y + q)}`,
    `L${String(x1)} ${String(y + q)}`,
    `C${String(x1 * 0.6)} ${String(y + q)} ${String(x1 * 0.6)} ${String(y + f)} 0 ${String(y + f)} Z`,
  ].join(" ");
  return (
    <svg data-ribbon aria-hidden viewBox={`0 0 330 ${String(h)}`} preserveAspectRatio="none" className="block h-4 w-full">
      <defs>
        <linearGradient id={gradient} x1="0" x2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--foreground) 30%, transparent)" />
          <stop offset="0.55" stopColor="var(--axi-brand)" />
          <stop offset="1" stopColor="var(--axi-brand-2)" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${gradient})`} />
    </svg>
  );
}
