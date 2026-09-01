"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * El conjunto CERRADO de marcas.
 *
 * Es cerrado porque Tailwind v4 extrae las clases en compilación: una clase
 * calculada (`brand-${x}`) no existiría en el CSS final y la tarjeta saldría con
 * el resplandor de marca por defecto. Añadir una fuente nueva es añadir su
 * `--logo-*` y su `.brand-*` a `globals.css`, y su clave aquí.
 */
const BRAND_CLASSES = {
  whatsapp: "brand-whatsapp",
  instagram: "brand-instagram",
  messenger: "brand-messenger",
  shopify: "brand-shopify",
  mercadopago: "brand-mercadopago",
  salesforce: "brand-salesforce",
  hubspot: "brand-hubspot",
  osm: "brand-osm",
  maps: "brand-maps",
  serp: "brand-serp",
  /** Sin marca propia: hereda el coral. */
  neutral: "",
} as const;

export type ProviderBrand = keyof typeof BRAND_CLASSES;

export interface ProviderMetric {
  label: string;
  value: ReactNode;
  /**
   * Convierte la métrica en un consumo con barra.
   *
   * `used` sobre `total`; `total: null` significa «sin tope» y entonces no hay
   * barra que pintar — una barra al 0 % junto a «sin tope» se lee como «no has
   * gastado nada», que es lo contrario de lo que pasa.
   *
   * La barra existe porque un tope es una cifra que solo importa por su
   * DISTANCIA al techo: «312» no dice nada y «312 de 500» obliga a dividir.
   */
  meter?: { used: number; total: number | null };
}

/** El tono de un chip. `neutral` es el de siempre. */
export type ChipTone = "neutral" | "good" | "warn";

export interface ProviderChip {
  label: string;
  tone?: ChipTone;
}

export interface ProviderCardProps {
  brand?: ProviderBrand;
  /** El glifo. La placa la pone la tarjeta; el logo, quien la usa. */
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Estado, ya construido: cada módulo conserva su propio semáforo. */
  badge?: ReactNode;
  /** Una frase de qué hace o qué trae. */
  body?: ReactNode;
  metrics?: readonly ProviderMetric[];
  /**
   * Capacidades o canales. Las cadenas sueltas se pintan neutras: la forma
   * corta existe porque la mayoría de las tarjetas no necesitan tono.
   */
  chips?: readonly (string | ProviderChip)[];
  /** Atribución de licencia, aviso de plan. */
  footnote?: ReactNode;
  /** Fuerza el resplandor al destructivo, por encima de `brand`. */
  faulted?: boolean;
  href?: string;
  onClick?: () => void;
  /** Marca de selección: enciende el cometa, más lento que en hover. */
  selected?: boolean;
  /**
   * Presente, sin interacción **y apagada**: hoja de ruta, fuente que la
   * plataforma no ha encendido. Atenúa la tarjeta, y eso es lo que comunica.
   *
   * NO es «esta tarjeta no se puede pulsar». Para eso está `static`, y
   * confundirlos hizo que la vitrina de fuentes pintara OpenStreetMap —gratis y
   * activa— exactamente igual que una fuente apagada: se pasaba `inert` a las
   * tres tarjetas solo porque ninguna era clicable.
   */
  inert?: boolean;
  /**
   * Solo muestra: ni enlace, ni botón, ni foco — pero **a plena opacidad**.
   *
   * Es la mayoría de las vitrinas: informan de algo que está funcionando y no
   * hay nada que pulsar. Atenuar eso le dice al dueño que su fuente está
   * apagada cuando no lo está.
   */
  static?: boolean;
  /**
   * Está en el grupo de selección pero no se puede elegir todavía.
   *
   * Distinto de `inert`: aquello es una tarjeta que solo muestra, esto es una
   * opción visible y vetada. La diferencia importa para quien navega con lector
   * de pantalla — un `radiogroup` de cuatro con una deshabilitada no es lo
   * mismo que uno de tres.
   */
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const SURFACE =
  "channel-surface flex w-full flex-col gap-3.5 rounded-lg border border-border bg-background p-4 text-left";
const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * La tarjeta premium de un proveedor, canal o fuente.
 *
 * El tratamiento —el resplandor anclado a la esquina del logo, el cometa que
 * recorre el borde, las clases `brand-*`— vive en `globals.css` y esto lo
 * consume; no lo reimplementa. Lo que aporta el componente es que **deje de
 * estar copiado**: la misma cadena de clases y la misma cabecera estaban
 * escritas cuatro veces, así que cambiar el tratamiento eran cuatro ediciones y
 * una oportunidad de que se desincronizaran.
 *
 * El elemento que renderiza sale de las props y no de un parámetro `as`: con
 * `href` es un enlace, con `onClick` un botón —y `role="radio"` si además está
 * en un grupo de selección—, y sin ninguno de los dos, un `div` inerte. Que la
 * hoja de ruta se vea como producto y no como un hueco punteado es deliberado:
 * conserva la superficie de marca y pierde solo la interacción.
 */
export function ProviderCard({
  brand = "neutral",
  icon,
  title,
  subtitle,
  badge,
  body,
  metrics,
  chips,
  footnote,
  faulted = false,
  href,
  onClick,
  selected,
  inert = false,
  static: isStatic = false,
  disabled = false,
  ariaLabel,
  className,
}: ProviderCardProps) {
  // Sin interacción por cualquiera de los dos motivos; atenuada solo por uno.
  const passive = inert || isStatic;
  const surface = cn(
    SURFACE,
    faulted ? "brand-fault" : BRAND_CLASSES[brand],
    (inert || disabled) && "opacity-70",
    disabled && "cursor-not-allowed",
    !passive && FOCUS,
    className,
  );

  const content = (
    <>
      <div className="relative flex items-start gap-3">
        <span className="channel-logo-plate grid size-10 shrink-0 place-items-center rounded-md">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">{title}</span>
          {subtitle !== undefined && (
            <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
          )}
        </span>
        {badge}
      </div>

      {body !== undefined && <p className="text-muted-foreground relative text-sm">{body}</p>}

      {metrics !== undefined && metrics.length > 0 && (
        <dl
          className={cn(
            "relative gap-y-2.5",
            // Con barras, cada métrica necesita su propio ancho o la barra no
            // se puede comparar con la de al lado. Sin barras, el flujo suelto
            // aprovecha mejor una tarjeta estrecha.
            metrics.some((metric) => metric.meter !== undefined)
              ? "grid grid-cols-2 gap-x-4"
              : "flex flex-wrap gap-x-6",
          )}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="flex min-w-0 flex-col">
              <dt className="text-muted-foreground text-xs">{metric.label}</dt>
              <dd className="text-[13px] font-medium tabular-nums">{metric.value}</dd>
              {metric.meter !== undefined && metric.meter.total !== null && (
                <MeterBar used={metric.meter.used} total={metric.meter.total} />
              )}
            </div>
          ))}
        </dl>
      )}

      {chips !== undefined && chips.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const { label, tone = "neutral" } =
              typeof chip === "string" ? { label: chip, tone: "neutral" as const } : chip;
            return (
              <span
                key={label}
                className={cn("rounded-full px-2 py-0.5 text-xs", CHIP_TONES[tone])}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {footnote !== undefined && (
        <p className="text-muted-foreground relative mt-auto text-xs">{footnote}</p>
      )}
    </>
  );

  if (passive) {
    return (
      // `aria-disabled` solo cuando de verdad está apagada: anunciar como
      // deshabilitada una tarjeta que solo informa es el mismo error que
      // atenuarla, pero para quien usa lector de pantalla.
      <div {...(inert ? { "aria-disabled": true as const } : {})} className={surface}>
        {content}
      </div>
    );
  }

  if (href !== undefined) {
    return (
      <Link href={href} aria-label={ariaLabel} className={surface}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      // `role="radio"` solo cuando hay selección de por medio: un botón suelto
      // que se anuncia como radio le miente al lector de pantalla sobre que
      // pertenece a un grupo.
      {...(selected === undefined ? {} : { role: "radio", "aria-checked": selected })}
      data-selected={selected === true ? "true" : undefined}
      className={surface}
    >
      {selected === true && (
        <span className="absolute top-3 right-3 z-10 grid size-5.5 place-items-center rounded-full bg-[var(--ch-glow)] text-background">
          <CheckGlyph />
        </span>
      )}
      {content}
    </button>
  );
}

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  good: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
};

/**
 * La barra de consumo de un tope.
 *
 * Ámbar a partir del 80 %: es donde deja de ser información y pasa a ser un
 * aviso — al proveedor le quedan días, no semanas, antes de salirse de la
 * cascada solo.
 */
function MeterBar({ used, total }: { used: number; total: number }) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  return (
    <span
      role="meter"
      aria-valuenow={used}
      aria-valuemin={0}
      aria-valuemax={total}
      className="bg-secondary mt-1.5 block h-1 w-full overflow-hidden rounded-full"
    >
      <span
        className={cn("block h-full rounded-full", pct >= 80 ? "bg-warning" : "bg-accent")}
        style={{ width: `${String(pct)}%` }}
      />
    </span>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/** La rejilla estándar de tarjetas. Estaba copiada en cinco vistas. */
export function ProviderCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
      {children}
    </div>
  );
}
