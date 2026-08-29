"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";

export interface ShowcaseTag {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/** Radio de la lente, en píxeles. */
const LENS_RADIUS = 46;
/** Cuántas filas se reparten las etiquetas. */
const ROWS = 3;

/**
 * Etiquetas que desfilan, y una lupa que revela lo que hay debajo.
 *
 * Es un bloque de PRESENTACIÓN reutilizable: la bandeja de captación lo usa
 * como estado vacío —donde las etiquetas son las categorías que de verdad se
 * pueden buscar— y la capa pública lo puede usar para enseñar capacidades. Por
 * eso recibe las etiquetas y los textos por prop y no sabe de qué producto
 * habla.
 *
 * Los iconos son de `lucide-react`, el sistema del repo. El componente de
 * referencia traía otra librería; dos juegos de iconos en la misma pantalla se
 * notan en el grosor del trazo antes de que nadie sepa por qué.
 *
 * Con `prefers-reduced-motion` las filas se quedan quietas y la lupa sigue
 * arrastrándose: el efecto es el mismo, sin el desfile.
 */
export function MagnifiedShowcase({
  title,
  description,
  tags,
  className,
}: {
  title: string;
  description: string;
  tags: readonly ShowcaseTag[];
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lensX = useMotionValue(0);
  const lensY = useMotionValue(0);

  // El recorte de la lente y su inverso: la capa de abajo se pinta apagada con
  // un agujero, y la de arriba solo dentro del agujero.
  const clip = useMotionTemplate`circle(${LENS_RADIUS}px at calc(50% + ${lensX}px) calc(50% + ${lensY}px))`;
  const hole = useMotionTemplate`radial-gradient(circle ${LENS_RADIUS}px at calc(50% + ${lensX}px) calc(50% + ${lensY}px), transparent 100%, black 100%)`;

  const rows = splitRows(tags, ROWS);

  return (
    <div
      className={cn(
        "border-border bg-card relative overflow-hidden rounded-2xl border p-2",
        className,
      )}
    >
      <div
        ref={stage}
        className="bg-muted/30 relative h-[190px] overflow-hidden rounded-xl sm:h-[220px]"
      >
        <motion.div
          className="flex h-full flex-col justify-center gap-3"
          style={{ WebkitMaskImage: hole, maskImage: hole }}
        >
          {rows.map((row, index) => (
            <TagRow key={`base-${String(index)}`} row={row} index={index} still={reduced === true} />
          ))}
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-3"
          style={{ clipPath: clip }}
        >
          {rows.map((row, index) => (
            <TagRow
              key={`lens-${String(index)}`}
              row={row}
              index={index}
              still={reduced === true}
              revealed
            />
          ))}
        </motion.div>

        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={stage}
          style={{ x: lensX, y: lensY }}
          className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
        >
          <span
            className="border-foreground/25 bg-background/10 block rounded-full border-2 shadow-lg backdrop-blur-[1px]"
            style={{ width: LENS_RADIUS * 2, height: LENS_RADIUS * 2 }}
          />
        </motion.div>

        {/* Difuminado lateral: las filas entran y salen en vez de cortarse. */}
        <div className="from-card pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent" />
        <div className="from-card pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent" />
      </div>

      <div className="px-4 pt-4 pb-5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TagRow({
  row,
  index,
  still,
  revealed = false,
}: {
  row: readonly ShowcaseTag[];
  index: number;
  still: boolean;
  revealed?: boolean;
}) {
  // Se triplica la fila para que el bucle no tenga costura visible.
  const loop = [...row, ...row, ...row];
  const forward = index % 2 === 0;

  return (
    <motion.div
      className="flex w-max gap-3"
      animate={still ? undefined : { x: forward ? ["0%", "-33.333%"] : ["-33.333%", "0%"] }}
      transition={{ duration: 28, ease: "linear", repeat: Infinity }}
    >
      {loop.map((tag, position) => {
        const Icon = tag.icon;
        return (
          <span
            key={`${tag.id}-${String(position)}`}
            className={cn(
              "flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap",
              revealed
                ? "border-accent/30 bg-background text-accent font-medium shadow-sm"
                : "border-border/50 bg-background/50 text-muted-foreground",
            )}
          >
            {Icon !== undefined && <Icon aria-hidden="true" className="size-3.5" />}
            {tag.label}
          </span>
        );
      })}
    </motion.div>
  );
}

/** Reparte las etiquetas en filas alternas para que el desfile no se alinee. */
function splitRows(tags: readonly ShowcaseTag[], rows: number): ShowcaseTag[][] {
  const out: ShowcaseTag[][] = Array.from({ length: rows }, () => []);
  tags.forEach((tag, index) => out[index % rows].push(tag));
  return out.filter((row) => row.length > 0);
}
