"use client";

import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { fade } from "@/core/styles/motion";
import { describeFilters, type FilterSchema, type FilterValues } from "./filter-schema";

/**
 * Lo que está filtrado, FUERA de la hoja y removible de un clic.
 *
 * Va fuera a propósito: un filtro que solo se ve abriendo el panel que lo puso
 * es un filtro invisible, y una lista corta sin explicación se lee como «no hay
 * datos». Es la doctrina que dejó escrita `ContactFilters` —*el estado no se
 * esconde*— y que `AdvancedSearchOptions` ya repite en su pliegue.
 *
 * La etiqueta la deriva `describeFilters` del esquema. Ningún consumidor
 * escribe «Ciudad: X» a mano: en cuanto lo hace, el chip y el filtro pueden
 * decir cosas distintas y el usuario cree lo que lee.
 */
export function FilterChips({
  schema,
  values,
  onRemove,
  onClearAll,
  className,
}: {
  schema: FilterSchema;
  values: FilterValues;
  /** Quita UN filtro. El consumidor aplica: quitar un chip filtra al instante. */
  onRemove: (key: string) => void;
  /** Sin él no se pinta el «Limpiar todo». */
  onClearAll?: () => void;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const chips = describeFilters(schema, values);

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <motion.span
          key={chip.key}
          // Solo entrada, sin `AnimatePresence`: al quitar un chip la lista se
          // recoloca en el mismo frame y una salida diferida deja el chip
          // clicable un instante después de haberlo quitado.
          initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade.fast}
          className="border-border-soft bg-secondary/60 text-foreground inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-2.5 text-xs font-medium"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Quitar filtro: ${chip.label}`}
            onClick={() => onRemove(chip.key)}
            className="text-muted-foreground hover:bg-foreground/8 hover:text-foreground inline-flex size-5 cursor-pointer items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </motion.span>
      ))}

      {onClearAll && chips.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md px-1.5 py-1 text-xs font-medium underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          Limpiar todo
        </button>
      ) : null}
    </div>
  );
}
