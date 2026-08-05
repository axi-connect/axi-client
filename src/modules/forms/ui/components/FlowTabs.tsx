"use client";

import { cn } from "@/core/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FLOW_LABELS, FORM_FLOWS, type FormFlow } from "@/modules/forms/domain/form";

/**
 * Selector de flujo como segmented control iOS.
 *
 * Son pestañas de cliente, no rutas: `GET /forms` trae los tres formularios en
 * una sola llamada y el editor mantiene un borrador por flujo en memoria, así
 * que cambiar de pestaña es instantáneo y nunca pierde cambios (y no hace falta
 * un guard de navegación, que el App Router no permite implementar bien).
 */
export function FlowTabs({
  flow,
  onFlowChange,
  counts,
  dirtyFlows,
  configured,
}: {
  flow: FormFlow;
  onFlowChange: (flow: FormFlow) => void;
  counts: Record<FormFlow, number>;
  dirtyFlows: ReadonlySet<FormFlow>;
  configured: Record<FormFlow, boolean>;
}) {
  return (
    <Tabs value={flow} onValueChange={(value) => onFlowChange(value as FormFlow)}>
      <TabsList className="h-10 w-full rounded-full p-1 sm:w-fit">
        {FORM_FLOWS.map((candidate) => (
          <TabsTrigger key={candidate} value={candidate} className="min-w-0 rounded-full px-4">
            <span className="truncate">{FLOW_LABELS[candidate]}</span>
            <span
              className={cn(
                "ml-1.5 shrink-0 text-xs tabular-nums text-muted-foreground",
                !configured[candidate] && "sr-only",
              )}
            >
              {configured[candidate] ? counts[candidate] : "Sin configurar"}
            </span>
            {dirtyFlows.has(candidate) && (
              <span
                className="ml-1 size-1.5 shrink-0 rounded-full bg-primary"
                aria-label="Con cambios sin guardar"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
