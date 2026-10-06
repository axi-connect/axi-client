import { Square } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { AssistantIslandListeningState as Listening } from "../types";

/**
 * La isla mientras el micrófono graba (forma E): la onda, «Te escucho» y el
 * reloj, con Detener y Cancelar. Es el espejo del compositor, no un segundo
 * grabador: las dos funciones son las del compositor. En una columna estrecha
 * los botones se esconden por CSS: ya están bajo el pulgar, en el compositor.
 */
export function AssistantIslandListening({ seconds, onStop, onCancel }: Listening) {
  return (
    <>
      <span className="assistant-wave" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="assistant-island__rec">
        Te escucho
        <span className="assistant-island__muted ml-1.5 font-medium tabular-nums">{formatSeconds(seconds)}</span>
      </span>
      <span className="flex-1" />
      <Button type="button" size="sm" variant="glass" className="assistant-island__rec-btn px-3" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="button" size="sm" variant="contrast" className="assistant-island__rec-btn rounded-full" onClick={onStop}>
        <Square aria-hidden="true" />
        Detener
      </Button>
    </>
  );
}

function formatSeconds(total: number): string {
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, "0")}`;
}
