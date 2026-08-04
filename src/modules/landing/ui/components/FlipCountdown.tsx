"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { FOUNDERS, countdownParts } from "@/modules/landing/ui/content/landing.content";

/** Placeholder previo a la hidratación: mismo ancho que dos dígitos. */
const PLACEHOLDER = "––";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Cuenta atrás split-flap del Programa Fundadores (§9).
 *
 * El reloj SOLO se lee tras montar: la home se prerenderiza estática, así que
 * cualquier cifra calculada en render quedaría congelada en la fecha del
 * deploy — además del mismatch de hidratación. Hasta entonces las fichas
 * muestran guiones con su tamaño final, así que no hay salto de layout.
 *
 * Las fichas van `aria-hidden`: un contador que cambia cada segundo es ruido
 * puro en un lector de pantalla. La información la da una frase `sr-only`
 * derivada solo de los días, y sin `aria-live` — se lee al recorrer la
 * sección, no se anuncia sola.
 */
export function FlipCountdown({
  deadline,
  deadlineLabel,
  className,
}: {
  deadline: string;
  /** Fecha ya formateada («31 de octubre»), para el pie y el texto accesible. */
  deadlineLabel: string;
  className?: string;
}) {
  const [parts, setParts] = useState<ReturnType<typeof countdownParts> | null>(null);

  useEffect(() => {
    const tick = () => setParts(countdownParts(deadline, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    // Las pestañas en segundo plano estrangulan los timers: al volver, la
    // cifra estaría desfasada hasta el siguiente tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadline]);

  const units = [
    { key: "days", label: FOUNDERS.units.days, value: parts && pad(parts.days) },
    { key: "hours", label: FOUNDERS.units.hours, value: parts && pad(parts.hours) },
    { key: "minutes", label: FOUNDERS.units.minutes, value: parts && pad(parts.minutes) },
    { key: "seconds", label: FOUNDERS.units.seconds, value: parts && pad(parts.seconds) },
  ];

  return (
    <div className={className}>
      <span className="sr-only">
        {parts
          ? `La oferta de fundadores cierra el ${deadlineLabel}; quedan ${parts.days} días.`
          : `La oferta de fundadores cierra el ${deadlineLabel}.`}
      </span>
      <div aria-hidden className="flex gap-1.5 md:gap-2">
        {units.map((unit) => (
          <FlipTile key={unit.key} value={unit.value} label={unit.label} />
        ))}
      </div>
    </div>
  );
}

/**
 * Ficha de tablero: cuatro capas, dos quietas y dos que giran sobre la costura.
 *
 * - estática arriba → valor NUEVO (queda al descubierto cuando la hoja se dobla)
 * - estática abajo  → valor VIEJO (la tapa la hoja que sube)
 * - hoja superior   → valor VIEJO, rotateX 0 → −90°
 * - hoja inferior   → valor NUEVO, rotateX 90° → 0°, con el retardo justo
 *
 * El glass es una desviación consciente de DESIGN-SYSTEM §5.2 (las superficies
 * de contenido son sólidas): aquí se aplica a fichas de dos dígitos, no a
 * texto, así que la regla de legibilidad que motiva §5.2 se respeta.
 */
export function FlipTile({
  value,
  label,
  tone = "time",
}: {
  /** `null` mientras no hay reloj (SSR / pre-hidratación). */
  value: string | null;
  label: string;
  tone?: "time" | "slots";
}) {
  const [display, setDisplay] = useState(value ?? PLACEHOLDER);
  const [incoming, setIncoming] = useState<string | null>(null);
  const primed = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (value === null) return;
    // El primer valor real sustituye al placeholder sin doblez: si no, todo el
    // panel giraría a la vez justo cuando la sección está entrando.
    if (!primed.current) {
      primed.current = true;
      setDisplay(value);
      return;
    }
    if (display === value || incoming === value) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    setIncoming(value);
  }, [value, display, incoming, reduced]);

  // Red de seguridad: si `animationend` no llega (ficha fuera de pantalla, o
  // las keyframes anuladas por una regla de usuario) las hojas se quedarían
  // montadas y la cifra congelada. Consolida algo después del doblez.
  useEffect(() => {
    if (incoming === null) return;
    const id = setTimeout(() => {
      setDisplay(incoming);
      setIncoming(null);
    }, 400);
    return () => clearTimeout(id);
  }, [incoming]);

  const digit = tone === "slots" ? "text-brand" : "text-accent-amber";
  const revealed = incoming ?? display;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* `glass-flat` y no `glass`: la ficha vive dentro de la tarjeta con
          tilt, y ahí el `backdrop-filter` se desatura y hunde el frame rate
          (ver globals.css). Mismo aspecto, sin el filtro que se rompe. */}
      <div className="glass-flat relative h-14 w-12 overflow-hidden rounded-xl [perspective:600px] md:h-16 md:w-16">
        <Half position="top" digit={digit}>
          {revealed}
        </Half>
        <Half position="bottom" digit={digit}>
          {display}
        </Half>

        {incoming !== null ? (
          <>
            <Half position="top" digit={digit} leaf>
              {display}
            </Half>
            <Half
              position="bottom"
              digit={digit}
              leaf
              onAnimationEnd={() => {
                setDisplay(incoming);
                setIncoming(null);
              }}
            >
              {incoming}
            </Half>
          </>
        ) : null}

        {/* Costura: parte del objeto, no del movimiento — permanece con
            reduced-motion. Por encima de las hojas para que el doblez se lea. */}
        <span className="bg-foreground/10 absolute inset-x-0 top-1/2 z-20 h-px" />
      </div>
      <span className="text-muted-foreground text-[0.625rem] font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * Mitad de ficha. El hijo mide el alto completo de la ficha (`h-[200%]`) con
 * el dígito centrado, y la mitad lo recorta: así arriba y abajo componen un
 * único número partido por la costura, sin cuadrar posiciones a mano.
 */
function Half({
  position,
  digit,
  leaf = false,
  children,
  onAnimationEnd,
}: {
  position: "top" | "bottom";
  digit: string;
  /** Hoja que gira (si no, mitad estática de fondo). */
  leaf?: boolean;
  children: string;
  onAnimationEnd?: () => void;
}) {
  const isTop = position === "top";

  return (
    <div
      onAnimationEnd={onAnimationEnd}
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden]",
        isTop ? "top-0 origin-bottom" : "bottom-0 origin-top",
        leaf && "bg-card z-10",
        leaf && (isTop ? "animate-flip-top" : "animate-flip-bottom"),
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 flex h-[200%] items-center justify-center font-mono text-xl font-semibold tabular-nums md:text-2xl",
          isTop ? "top-0" : "bottom-0",
          digit,
        )}
      >
        {children}
      </div>
    </div>
  );
}
