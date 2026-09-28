import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { islandClassName } from "@/shared/components/features/island";

/** El brillo del estado: `ai` (el de siempre), `warning` (cuota), `success` (listo), `neutral` (sin brillo). */
export type AssistantIslandTone = "ai" | "warning" | "success" | "neutral";

/**
 * La isla fija de las pantallas sin chat —bloqueo, cierre, carga—: el mismo
 * material que el escenario L de `AssistantDock`, con un personaje QUIETO
 * dentro. El estado lo dice el brillo, no la forma (lienzo 2026-09-28).
 * Sin estado ni efectos: sirve en Server Components.
 */
export function AssistantIslandStage({
  tone = "ai",
  children,
  className,
}: {
  tone?: AssistantIslandTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(islandClassName({ material: "ink", glow: "none" }), "assistant-island-stage", className)}
      data-tone={tone === "ai" ? undefined : tone}
    >
      {children}
    </div>
  );
}
