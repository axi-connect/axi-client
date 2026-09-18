import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";

interface AssistantMarkProps {
  /** El nombre del asistente. Sin nombre, solo el signo ✦. */
  name?: string;
  /** `sm` para pies y sellos de origen; `md` para cabeceras. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * La firma del asistente: el signo de IA (✦, violeta) y su nombre.
 *
 * Es la ÚNICA forma de decir «esto lo dijo o lo propuso la IA» en el kit y en
 * los slices que lo consumen: cabecera de cada tarjeta, eyebrow de la pregunta,
 * origen de un dato propuesto. Antes vivía inlineada en seis sitios con seis
 * tamaños distintos.
 */
export function AssistantMark({ name, size = "md", className }: AssistantMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground", className)}>
      <Sparkles className={cn("flex-none text-accent-violet", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" />
      {name}
    </span>
  );
}
