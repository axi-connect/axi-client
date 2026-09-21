"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/core/lib/utils";

interface AssistantDockProps {
  /** Nombre del asistente; aparece al acoplarse la barra. */
  title: string;
  /** La única instancia viva del avatar (un `*HeroAvatar` del slice). */
  hero: ReactNode;
  /** Texto secundario junto al nombre: la fecha en Axel, la empresa en Alba. */
  meta?: ReactNode;
  className?: string;
}

/**
 * La barra del asistente: sticky, transparente en reposo y cristal al acoplarse.
 *
 * Aquí vive **la única instancia viva del avatar**. En estado hero cuelga de la
 * barra a tamaño completo, centrado; al bajar (`data-docked` en la raíz del
 * chat, lo pone `useDockedHero`) el CSS lo lleva a la esquina a 40 px con un
 * `transform` y encienden por `opacity` el cristal, el nombre y la meta. Ni un
 * segundo componente ni un solo render de React: el rig, la mirada y la
 * respiración componen con el `transform` del contenedor.
 */
export function AssistantDock({ title, hero, meta, className }: AssistantDockProps) {
  return (
    <header className={cn("assistant-dock", className)}>
      <div className="assistant-dock__bar">
        <div className="assistant-dock__hero">{hero}</div>
        <span className="assistant-dock__title font-heading" aria-hidden="true">
          {title}
        </span>
        {meta === null || meta === undefined ? null : (
          <span className="assistant-dock__meta" aria-hidden="true">
            {meta}
          </span>
        )}
      </div>
    </header>
  );
}

/**
 * «mié 15 sep». Se calcula DESPUÉS de montar y no en el render: servidor y
 * navegador pueden estar en husos distintos, y una fecha formateada en el HTML
 * del servidor que no coincide con la del cliente es un error de hidratación.
 */
export function useTodayLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" })
        .format(new Date())
        .replace(" de ", " ")
        .replace(/\./g, ""),
    );
  }, []);
  return label;
}
