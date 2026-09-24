import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Callout } from "@/shared/components/ui/callout";

/**
 * La chispa en violeta: es el color de «lo que hace la IA» (DESIGN-SYSTEM §9),
 * y este aviso habla precisamente de que el agente puede mover la etapa. El
 * `Callout` pinta su icono en el tono del aviso; `cn` deja ganar la clase de
 * color que llega después.
 */
function VioletSparkles({ className }: { className?: string }) {
  return <Sparkles aria-hidden className={cn(className, "text-accent-violet")} />;
}

/** Qué mueve una etapa y por qué no da miedo: rastro, aviso y deshacer. */
export function JourneyExplainer({ className }: { className?: string }) {
  return (
    <Callout tone="info" icon={VioletSparkles} className={cn("text-sm text-foreground", className)}>
      Cada etapa se mueve sola con sus eventos (una cita agendada, una cotización enviada).{" "}
      <b className="font-medium">El agente también puede moverla por su criterio.</b> Todo queda en
      el historial del contacto y se puede deshacer con un clic.
    </Callout>
  );
}
