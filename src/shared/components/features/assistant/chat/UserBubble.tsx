import { AlertTriangle, Mic, RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";

interface UserBubbleProps {
  body: string;
  /** Enviado y aún sin confirmar por el servidor. */
  pending?: boolean;
  /** Mensaje de error si el envío falló; con él aparece «Reintentar». */
  failed?: string | null;
  /** true = se dictó por voz: lleva el pie «Dictado». */
  voice?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  /** true = nació en esta sesión: entra con `assistant-rise`. */
  fresh?: boolean;
  className?: string;
}

/**
 * La burbuja del humano (el dueño en /cmo, el cliente en /configurar): coral
 * degradado, como el azul de Messages. El coral es la voz de la persona; el
 * violeta queda para la IA.
 *
 * El texto se pinta LITERAL, con sus saltos de línea. Un envío pendiente se
 * atenúa; uno fallido conserva el texto (el turno tarda decenas de segundos y
 * perderlo sería perder lo que la persona escribió) y ofrece reintentar.
 */
export function UserBubble({
  body,
  pending = false,
  failed = null,
  voice = false,
  onRetry,
  retryLabel = "Reintentar",
  fresh = false,
  className,
}: UserBubbleProps) {
  return (
    <div className={cn("flex flex-col items-end gap-1.5", fresh && "assistant-rise", className)}>
      <div
        className={cn(
          "assistant-bubble-user max-w-[82%] rounded-[20px] rounded-br-[6px] px-4 py-2.5",
          "text-[15px] leading-normal whitespace-pre-wrap",
          pending && "opacity-60",
          failed !== null && "ring-2 ring-destructive/40",
        )}
      >
        {body}
      </div>
      {failed !== null ? (
        <div className="flex items-center gap-2 pr-1 text-[11.5px] text-destructive">
          <AlertTriangle className="size-3.5 flex-none" aria-hidden="true" />
          <span>{failed}</span>
          {onRetry === undefined ? null : (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
        </div>
      ) : voice ? (
        <span className="inline-flex items-center gap-1 pr-1 text-[11.5px] text-muted-foreground">
          <Mic className="size-3" aria-hidden="true" />
          Dictado
        </span>
      ) : null}
    </div>
  );
}
