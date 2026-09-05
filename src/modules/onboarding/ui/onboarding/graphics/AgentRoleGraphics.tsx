import type { SVGProps } from "react";

import { cn } from "@/core/lib/utils";
import type { AgentTemplateRole } from "@/modules/onboarding/domain/agent-templates";

/**
 * Gráficos de las fichas de plantilla (paso «Agentes»), uno por rol. Mismo
 * lenguaje que los de nicho y los de la oferta: trazo monocromo en
 * `currentColor`, 1,5 px reales, sin hex, `aria-hidden`.
 */
type GraphicProps = Omit<SVGProps<SVGSVGElement>, "children">;

function frame(props: GraphicProps, children: React.ReactNode) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 120 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
      className={cn("block h-auto w-full overflow-visible [&_*]:[vector-effect:non-scaling-stroke]", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Ventas: la burbuja de chat y la etiqueta de precio. */
export function SalesGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <rect x="8" y="10" width="64" height="30" rx="12" />
      <path d="M22 40l-4 10 14-10" />
      <path d="M22 22h36M22 30h20" opacity={0.6} />
      <path d="M84 30l14-14h14v14L98 44z" opacity={0.8} />
      <circle cx="104" cy="24" r="2.5" fill="currentColor" stroke="none" />
    </>,
  );
}

/** Reservas: el calendario con la cita confirmada. */
export function BookingsGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <rect x="16" y="12" width="88" height="46" rx="8" />
      <path d="M16 26h88" opacity={0.5} />
      <path d="M34 6v10M86 6v10" opacity={0.7} />
      <path d="M48 42l8 8 16-16" strokeWidth={2} />
    </>,
  );
}

/** Atención: la diadema de soporte. */
export function SupportGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M24 40v-8a36 36 0 0 1 72 0v8" />
      <rect x="16" y="36" width="16" height="18" rx="6" />
      <rect x="88" y="36" width="16" height="18" rx="6" />
      <path d="M96 54c0 6-8 8-24 8" opacity={0.7} />
      <circle cx="60" cy="14" r="3" fill="currentColor" stroke="none" opacity={0.4} />
    </>,
  );
}

/** Captación: el radar que encuentra contactos. */
export function LeadsGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M60 58a24 24 0 1 1 24-24" opacity={0.8} />
      <path d="M60 58a38 38 0 1 1 38-38" opacity={0.45} />
      <path d="M60 34l30-24" />
      <circle cx="60" cy="34" r="4" fill="currentColor" stroke="none" />
      <circle cx="92" cy="44" r="3" fill="currentColor" stroke="none" opacity={0.7} />
      <circle cx="24" cy="18" r="3" fill="currentColor" stroke="none" opacity={0.5} />
    </>,
  );
}

export const ROLE_GRAPHICS: Record<AgentTemplateRole, (props: GraphicProps) => React.JSX.Element> = {
  ventas: SalesGraphic,
  reservas: BookingsGraphic,
  soporte: SupportGraphic,
  captacion: LeadsGraphic,
};
