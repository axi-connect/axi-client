import type { SVGProps } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Gráficos de las fichas de nicho (paso «Negocio»; mockup «Onboarding Flow»
 * aprobado el 2026-09-05). Mismo lenguaje que los de la oferta: trazo
 * monocromo en `currentColor`, 1,5 px reales gracias a `non-scaling-stroke`,
 * sin hex. Son ilustración, no dato: van `aria-hidden` y el texto de la ficha
 * dice lo que el gráfico sugiere.
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

/** Restaurantes: el plato entre el tenedor y el cuchillo. */
export function RestaurantsGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <circle cx="60" cy="34" r="24" />
      <circle cx="60" cy="34" r="15" opacity={0.45} />
      <path d="M14 10v22M20 10v10a6 6 0 0 1-12 0V10M14 32v22" opacity={0.8} />
      <path d="M104 10c-5 4-6 12-6 18h8V10zM106 28v26" opacity={0.8} />
    </>,
  );
}

/** Retail y moda: la percha con su etiqueta. */
export function RetailGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M60 12a5 5 0 1 1 5-5" />
      <path d="M60 12v6L14 44h92L60 18" />
      <path d="M14 44v6h92v-6" opacity={0.4} />
      <rect x="82" y="8" width="26" height="16" rx="4" opacity={0.55} />
      <circle cx="89" cy="16" r="2" fill="currentColor" stroke="none" opacity={0.55} />
    </>,
  );
}

/** Hoteles y turismo: la cama y la llave de la habitación. */
export function HotelsGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M8 54V22h12v14h60v-6h22v24" />
      <path d="M8 44h94" opacity={0.5} />
      <rect x="26" y="26" width="22" height="10" rx="4" fill="currentColor" opacity={0.25} stroke="none" />
      <path d="M8 54v4M102 54v4" opacity={0.6} />
      <circle cx="104" cy="14" r="6" opacity={0.7} />
      <path d="M110 14h6l2 2-2 2h-6" opacity={0.7} />
    </>,
  );
}

/** Salud, belleza y citas: el calendario con la cita y el reloj. */
export function HealthGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <rect x="14" y="12" width="70" height="46" rx="8" />
      <path d="M14 26h70" opacity={0.5} />
      <path d="M30 6v10M68 6v10" opacity={0.7} />
      <path d="M49 48c-6-4-12-9-12-14a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 5-6 10-12 14z" fill="currentColor" opacity={0.3} stroke="none" />
      <circle cx="100" cy="40" r="12" opacity={0.7} />
      <path d="M100 33v7l5 3" opacity={0.7} />
    </>,
  );
}

/** Inmobiliarias: la casa y la llave. */
export function RealEstateGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M12 32 44 8l32 24" />
      <path d="M20 28v28h48V28" />
      <rect x="36" y="40" width="16" height="16" rx="2" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="94" cy="24" r="9" opacity={0.8} />
      <path d="M100 30l14 14M108 38l-4 4M112 42l-3 3" opacity={0.8} />
    </>,
  );
}

/** Educación y cursos: el birrete y el cuaderno. */
export function EducationGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M8 22 50 8l42 14-42 14z" />
      <path d="M24 28v14c0 6 12 10 26 10s26-4 26-10V28" opacity={0.7} />
      <path d="M92 22v16" opacity={0.6} />
      <rect x="82" y="40" width="30" height="18" rx="3" opacity={0.55} />
      <path d="M88 46h18M88 52h12" opacity={0.55} />
    </>,
  );
}

/** Servicios profesionales: el maletín y el documento. */
export function ProfessionalGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <rect x="12" y="20" width="64" height="38" rx="8" />
      <path d="M32 20v-6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v6" />
      <path d="M12 36h64" opacity={0.5} />
      <rect x="38" y="32" width="12" height="8" rx="2" fill="currentColor" opacity={0.3} stroke="none" />
      <path d="M88 14h24M88 22h24M88 30h16M88 38h20M88 46h12" opacity={0.6} />
    </>,
  );
}

/** Distribuidores B2B: las cajas apiladas que salen. */
export function DistributionGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <path d="M10 56V34l16-8 16 8v22z" />
      <path d="M42 56V34l16-8 16 8v22z" />
      <path d="M26 34V12l16-6 16 6v22" opacity={0.7} />
      <path d="M10 34l16 8 16-8M42 34l16 8 16-8" opacity={0.5} />
      <path d="M84 40h26M104 34l6 6-6 6" opacity={0.8} />
    </>,
  );
}

/** Otro tipo de negocio: los puntos suspensivos y el destello. */
export function OtherGraphic(props: GraphicProps) {
  return frame(
    props,
    <>
      <circle cx="34" cy="34" r="6" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="60" cy="34" r="6" fill="currentColor" stroke="none" opacity={0.7} />
      <circle cx="86" cy="34" r="6" fill="currentColor" stroke="none" />
      <path d="M100 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity={0.8} />
      <path d="M14 52l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" opacity={0.6} />
    </>,
  );
}

/** Por `code` del nicho; un nicho nuevo sin gráfico cae a «otro». */
const BY_CODE: Record<string, (props: GraphicProps) => React.JSX.Element> = {
  restaurants: RestaurantsGraphic,
  retail_fashion: RetailGraphic,
  hotels_tourism: HotelsGraphic,
  health_beauty: HealthGraphic,
  real_estate: RealEstateGraphic,
  education: EducationGraphic,
  professional_services: ProfessionalGraphic,
  b2b_distribution: DistributionGraphic,
  other: OtherGraphic,
};

export function nicheGraphic(code: string): (props: GraphicProps) => React.JSX.Element {
  return BY_CODE[code] ?? OtherGraphic;
}
