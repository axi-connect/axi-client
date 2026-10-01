import { useId } from "react";

import { cn } from "@/core/lib/utils";

export type Intent = "sell" | "grow" | "attend";

/** La intención de cada entrada del menú (`SITE_INTENTS[].id`). */
export const INTENT_OF = { vender: "sell", crecer: "grow", atender: "attend" } as const satisfies Record<string, Intent>;

/**
 * Los íconos de intención del nav (lienzo «Una foto basta», mesa «Íconos»,
 * aprobado por la dueña): cada intención lleva una pieza del isotipo en su
 * tesela de cristal, con su degradado y un halo de su color.
 *
 * - «Vender y cobrar»: un círculo completo y perfecto (pedido de la dueña:
 *   «sin imperfecciones»), no la cinta coral con su hueco.
 * - «Crecer»: la cinta ámbar del isotipo.
 * - «Atender»: la cinta violeta del isotipo.
 *
 * La misma pieza en la barra (`sm`, 24 px) y en el panel (`lg`, 44 px). La
 * tesela va por tokens (`site-nav.css`): en claro sale invertida sola.
 */
const ART: Record<Intent, { viewBox: string; from: string; to: string; path?: string }> = {
  sell: { viewBox: "0 0 24 24", from: "#FF8A7E", to: "#E65759" },
  grow: {
    viewBox: "160 118 256 262",
    from: "#FFD580",
    to: "#E39800",
    path: "M355.696 225.676C373.104 295.307 398.833 353.943 409.522 374.558C309.886 374.558 280.11 290.955 266.367 225.676C253.589 164.978 191.163 140.928 166.731 139.783C186.887 125.124 225.804 121.086 268.658 132.912C311.511 144.737 341.667 169.559 355.696 225.676Z",
  },
  attend: {
    viewBox: "156 120 258 258",
    from: "#C9A6FF",
    to: "#7A2EF0",
    path: "M270.948 257.743C300.724 150.09 349.97 127.185 408.377 127.186C383.182 159.252 341.953 337.444 292.708 360.815C238.652 386.468 181.619 371.122 161.005 358.524C196.507 366.541 247.824 341.346 270.948 257.743Z",
  },
};

export function IntentIcon({ intent, size = "sm", className }: { intent: Intent; size?: "sm" | "lg"; className?: string }) {
  // Un id por instancia: el mismo ícono sale en la barra y en el panel a la vez.
  const id = `intent-${useId()}`;
  const art = ART[intent];
  const glyph = size === "lg" ? 26 : 16;

  return (
    <span className={cn("intent-icon", className)} data-intent={intent} data-size={size} aria-hidden="true">
      <svg width={glyph} height={glyph} viewBox={art.viewBox}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={art.from} />
            <stop offset="1" stopColor={art.to} />
          </linearGradient>
        </defs>
        {art.path ? (
          <path d={art.path} fill={`url(#${id})`} />
        ) : (
          <circle cx="12" cy="12" r="7" fill="none" strokeWidth="4.2" stroke={`url(#${id})`} />
        )}
      </svg>
    </span>
  );
}
