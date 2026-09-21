import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { AssistantMark } from "./AssistantMark";
import { AssistantMarkdown } from "./AssistantMarkdown";

interface AssistantBubbleProps {
  /** Nombre del asistente en la cabecera. */
  name: string;
  /** Cuerpo en el markdown mínimo del kit. Vacío = solo cabecera + `children`. */
  body: string;
  /** Cuántas fuentes leyó para responder; 0 = sin chip. */
  sourcesCount?: number;
  /** true = la respuesta se está escribiendo: cursor al final y «escribiendo…». */
  streaming?: boolean;
  /** true = nació en esta sesión: entra con `assistant-rise`. */
  fresh?: boolean;
  /** Lo que cuelga del mensaje: la pregunta, la línea «Anotado», extras del slice. */
  children?: ReactNode;
  className?: string;
}

/**
 * La tarjeta del asistente. Sólida, sin borde y con sombra flotante: es
 * contenido que se lee, y el cristal queda para lo que flota (DESIGN-SYSTEM
 * §5.2). Radio 20 con la esquina del lado del personaje a 6 px, como una
 * burbuja de Messages pero a ancho completo.
 *
 * Con pregunta, el cuerpo PUEDE venir vacío: en esos turnos la pregunta es el
 * mensaje, y pintar el renderer dejaría un hueco.
 */
export function AssistantBubble({
  name,
  body,
  sourcesCount = 0,
  streaming = false,
  fresh = false,
  children,
  className,
}: AssistantBubbleProps) {
  return (
    <div
      className={cn(
        "self-stretch overflow-hidden rounded-[20px] rounded-bl-[6px] bg-background shadow-float",
        fresh && "assistant-rise",
        className,
      )}
      // Sin aria-live a propósito mientras escribe: el `role="log"` del hilo
      // anuncia la respuesta FINAL; anunciar cada delta re-leería el texto entero.
      aria-busy={streaming || undefined}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <AssistantMark name={name} />
        {streaming ? <span className="text-[11px] text-muted-foreground/70">escribiendo…</span> : null}
        {sourcesCount > 0 ? (
          <span className="ml-auto rounded-full border border-border/60 px-2 py-px text-[10px] text-muted-foreground/80 tabular-nums">
            {sourcesCount} {sourcesCount === 1 ? "fuente" : "fuentes"}
          </span>
        ) : null}
      </div>
      {body === "" ? null : (
        <AssistantMarkdown
          text={body}
          caret={streaming}
          className={cn("px-4 pt-2 pb-3.5", streaming ? "text-muted-foreground" : "text-foreground")}
        />
      )}
      {children}
    </div>
  );
}
