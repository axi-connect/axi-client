import { Info, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { journeyExplainerText, type JourneySwitches } from "@/modules/crm/domain/journey";
import { Callout } from "@/shared/components/ui/callout";

/**
 * La chispa en violeta: es el color de «lo que hace la IA» (DESIGN-SYSTEM §9),
 * y este aviso habla de que el agente puede mover la etapa. El `Callout`
 * pinta su icono en el tono del aviso; `cn` deja ganar la clase de color que
 * llega después. Con el agente apagado no hay IA de la que hablar: icono
 * neutro.
 */
function VioletSparkles({ className }: { className?: string }) {
  return <Sparkles aria-hidden className={cn(className, "text-accent-violet")} />;
}

/**
 * Qué mueve una etapa y por qué no da miedo: rastro, aviso y deshacer. Dice
 * la verdad según los interruptores del negocio (Q8): con todo apagado —como
 * nacen— no promete que nada se mueva solo.
 */
export function JourneyExplainer({ switches, className }: { switches: JourneySwitches; className?: string }) {
  const { lead, emphasis, tail } = journeyExplainerText(switches);
  return (
    <Callout tone="info" icon={switches.ai ? VioletSparkles : Info} className={cn("text-sm text-foreground", className)}>
      {lead}{" "}
      {emphasis !== null ? (
        <>
          <b className="font-medium">{emphasis}</b>{" "}
        </>
      ) : null}
      {tail}
    </Callout>
  );
}
