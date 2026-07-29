"use client";

import Image from "next/image";

import { cn } from "@/core/lib/utils";
import { MASCOTS } from "@/modules/landing/ui/content/landing.content";

type MascotVariant = keyof typeof MASCOTS;

/**
 * Mascota de la plataforma (Lumo/Nova) flotando con suavidad.
 * El vaivén (`animate-mascot-bob`) es CSS puro — corre en el compositor y se
 * desactiva con `prefers-reduced-motion` desde `globals.css`.
 */
export function AgentMascot({
  variant,
  width,
  bob = "default",
  square = false,
  className,
  priority = false,
}: {
  variant: MascotVariant;
  /** Ancho de render en px (la fuente es cuadrada 1080×1080). */
  width: number;
  /** Velocidad del vaivén; "none" para usos estáticos (avatares). */
  bob?: "default" | "slow" | "none";
  /** Modo avatar: la clase controla ambas dimensiones (object-cover). */
  square?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const mascot = MASCOTS[variant];
  return (
    <Image
      src={mascot.src}
      alt={mascot.alt}
      width={width}
      height={width}
      priority={priority}
      className={cn(
        "pointer-events-none select-none drop-shadow-[0_24px_36px_rgb(0_0_0/0.35)]",
        bob === "default" && "animate-mascot-bob",
        bob === "slow" && "animate-mascot-bob animate-mascot-bob-slow",
        className,
      )}
      style={square ? undefined : { width, height: "auto" }}
    />
  );
}
