import type { SVGProps } from "react";

import { cn } from "@/core/lib/utils";
import type { ModuleId } from "@/modules/landing/public";
import type { PackageCode } from "@/modules/onboarding/domain/signup-draft";

/**
 * Gráficos de capacidad de las fichas de la oferta (mockup v3 «Flow», aprobados
 * por el dueño el 2026-09-05: «me encantó los gráficos que tienen cada plan y
 * módulo»). Trazo monocromo en `currentColor`: sobre el campo son blancos, y
 * heredan el tono sin saber en qué tema están.
 *
 * Son ilustración, no dato: van `aria-hidden` y el texto de la ficha dice lo
 * que el gráfico sugiere. Nada de hex: el color viene siempre del contexto.
 */
type GraphicProps = Omit<SVGProps<SVGSVGElement>, "children">;

function frame(props: GraphicProps, viewBox: string, children: React.ReactNode) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
      // Los gráficos se dibujan a 160–200 unidades y se pintan a 128 px: sin
      // esto el trazo de 1,5 baja a ~1 px y se emborrona. Con el trazo no
      // escalable, la geometría escala y la línea se queda en 1,5 px reales.
      className={cn("block h-auto w-full overflow-visible [&_*]:[vector-effect:non-scaling-stroke]", className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Esencial: dos burbujas de chat, la segunda con el check de «resuelto». */
export function EsencialGraphic(props: GraphicProps) {
  return frame(
    props,
    "0 0 160 64",
    <g stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="72" height="26" rx="10" opacity={0.35} />
      <path d="M14 30 L10 40 L24 30" opacity={0.35} />
      <rect x="60" y="24" width="96" height="28" rx="12" />
      <path d="M140 52 L146 60 L132 52" />
      <path d="M98 38 l6 6 l12 -12" strokeWidth={2} />
    </g>,
  );
}

/** Crecimiento: barras ascendentes con la curva y el punto final encendido. */
export function CrecimientoGraphic(props: GraphicProps) {
  const bars = [10, 16, 14, 22, 26, 34, 40, 50];
  return frame(
    props,
    "0 0 176 60",
    <>
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 20} y={54 - h} width="10" height={h} rx="3" fill="currentColor" opacity={0.22 + 0.1 * i} />
      ))}
      <path d="M15 44 C 45 40, 70 34, 95 26 S 140 12, 165 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <circle cx="165" cy="6" r="4" fill="currentColor" />
      <circle cx="165" cy="6" r="8" fill="currentColor" opacity={0.25} />
    </>,
  );
}

/** Escala: tres líneas de equipo con sus personas. */
export function EscalaGraphic(props: GraphicProps) {
  const rows = [
    { y: 12, dots: [70, 110] },
    { y: 30, dots: [90, 130] },
    { y: 48, dots: [60, 100, 140] },
  ];
  return frame(
    props,
    "0 0 160 56",
    <g stroke="currentColor" strokeWidth={1.5}>
      {rows.map((row) => (
        <g key={row.y}>
          <circle cx="20" cy={row.y} r="6" />
          <line x1="34" y1={row.y} x2="150" y2={row.y} opacity={0.35} />
          {row.dots.map((x) => (
            <circle key={x} cx={x} cy={row.y} r="3" fill="currentColor" stroke="none" />
          ))}
        </g>
      ))}
    </g>,
  );
}

/** Free Trial: la pista de siete días, el primero ya cumplido. */
export function TrialGraphic(props: GraphicProps) {
  return frame(
    props,
    "0 0 204 40",
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <rect x={i * 30} y="8" width="24" height="24" rx="8" fill="currentColor" opacity={i === 0 ? 1 : 0.14} />
          {i === 0 ? (
            <path d="M7 20 l4 4 l7 -8" stroke="var(--sf-on-fg)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <text x={i * 30 + 12} y="24.5" textAnchor="middle" fontSize="10" fontWeight={600} fill="currentColor" className="font-body">
              {i + 1}
            </text>
          )}
        </g>
      ))}
      <text x="0" y="39.5" fontSize="8.5" letterSpacing=".08em" fill="currentColor" opacity={0.7} className="font-body">
        HOY
      </text>
      <text x="204" y="39.5" textAnchor="end" fontSize="8.5" letterSpacing=".08em" fill="currentColor" opacity={0.7} className="font-body">
        DÍA 7
      </text>
    </>,
  );
}

/** Llamadas: la onda de voz. */
export function CallsGraphic(props: GraphicProps) {
  const bars = [8, 18, 30, 44, 26, 52, 36, 20, 42, 28, 14, 34, 48, 22, 10, 30, 40, 18, 8];
  return frame(
    props,
    "0 0 180 56",
    <>
      {bars.map((h, i) => (
        <rect key={i} x={6 + i * 9} y={(56 - h) / 2} width="4" height={h} rx="2" fill="currentColor" opacity={0.35 + 0.65 * (h / 52)} />
      ))}
    </>,
  );
}

/** Captación: dos pines sobre una retícula; las ondas del radar quedan en el suelo, bajo la punta del pin. */
export function LeadsGraphic(props: GraphicProps) {
  return frame(
    props,
    "0 0 160 64",
    <>
      {Array.from({ length: 21 }, (_, k) => (
        <circle key={k} cx={8 + (k % 7) * 24} cy={10 + Math.floor(k / 7) * 20} r="1.5" fill="currentColor" opacity={0.28} />
      ))}
      <ellipse cx="56" cy="54" rx="24" ry="6" stroke="currentColor" strokeWidth={1.5} opacity={0.3} />
      <ellipse cx="56" cy="54" rx="12" ry="3" stroke="currentColor" strokeWidth={1.5} opacity={0.55} />
      <path d="M56 54 c-9 -8 -14 -14 -14 -22 a14 14 0 1 1 28 0 c0 8 -5 14 -14 22z" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.22} />
      <circle cx="56" cy="32" r="5" fill="currentColor" />
      <g opacity={0.6}>
        <ellipse cx="120" cy="54" rx="10" ry="2.5" stroke="currentColor" strokeWidth={1.5} opacity={0.6} />
        <path d="M120 54 c-6 -5.5 -9 -9.5 -9 -15 a9 9 0 1 1 18 0 c0 5.5 -3 9.5 -9 15z" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.18} />
        <circle cx="120" cy="39" r="3" fill="currentColor" />
      </g>
    </>,
  );
}

/** CRM: contactos que entran por arriba y bajan por el embudo en tres tramos. */
export function CrmGraphic(props: GraphicProps) {
  return frame(
    props,
    "0 0 160 64",
    <>
      {[28, 52, 80, 108, 132].map((x, i) => (
        <circle key={x} cx={x} cy="8" r="3.5" fill="currentColor" opacity={0.45 + 0.1 * (i % 3)} />
      ))}
      <g stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
        <path d="M10 20 H150 L124 34 H36 Z" fill="currentColor" fillOpacity={0.12} />
        <path d="M36 38 H124 L106 50 H54 Z" fill="currentColor" fillOpacity={0.22} />
        <path d="M54 54 H106 L96 62 H64 Z" fill="currentColor" stroke="none" />
      </g>
    </>,
  );
}

/** Agenda: el mes en celdas, con una cita marcada. */
export function SchedulingGraphic(props: GraphicProps) {
  return frame(
    props,
    "0 0 180 56",
    <>
      {Array.from({ length: 28 }, (_, k) => {
        const r = Math.floor(k / 7);
        const c = k % 7;
        const x = 8 + c * 24;
        const y = 4 + r * 13;
        const selected = r === 1 && c === 3;
        return selected ? (
          <g key={k}>
            <rect x={x - 3} y={y - 3} width="22" height="15" rx="5" stroke="currentColor" strokeWidth={1.5} />
            <rect x={x} y={y} width="16" height="9" rx="3" fill="currentColor" />
          </g>
        ) : (
          <rect key={k} x={x} y={y} width="16" height="9" rx="3" fill="currentColor" opacity={0.18} />
        );
      })}
    </>,
  );
}

/** Diccionario cerrado: un gráfico por oferta. */
export const PACKAGE_GRAPHICS: Record<PackageCode, (props: GraphicProps) => React.JSX.Element> = {
  free_trial: TrialGraphic,
  esencial: EsencialGraphic,
  crecimiento: CrecimientoGraphic,
  escala: EscalaGraphic,
};

export const MODULE_GRAPHICS: Record<ModuleId, (props: GraphicProps) => React.JSX.Element> = {
  calls: CallsGraphic,
  leads: LeadsGraphic,
  crm: CrmGraphic,
  scheduling: SchedulingGraphic,
};
