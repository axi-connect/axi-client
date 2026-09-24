"use client";

/**
 * Burbuja de chat compartida por el detalle de un case y el simulacro: el
 * cliente a la izquierda (superficie neutra), el agente a la derecha (acento
 * suave), sistema/operador humano como chip centrado. Los «slots» (opciones
 * tocables, ubicación, indicador de escritura) los rellena quien la usa: la
 * burbuja no sabe de sesiones ni de cases.
 */
import { Check, CheckCheck, Clock, MapPin } from "lucide-react";
import { cn } from "@/core/lib/utils";

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export type BubbleSide = "customer" | "agent" | "system";

export function bubbleSideFor(message: {
  direction: "inbound" | "outbound";
  sender_type: "contact" | "ai_agent" | "user" | "system";
}): BubbleSide {
  if (message.sender_type === "system" || message.sender_type === "user") return "system";
  return message.direction === "outbound" ? "agent" : "customer";
}

type ChatBubbleProps = {
  side: BubbleSide;
  /** Etiqueta pequeña sobre el texto: «Cliente simulado», «Valentina · agente»… */
  sender: string;
  body: string | null;
  createdAt: string;
  /** Estado de entrega del saliente (ticks) o «queued» del optimista */
  status?: string;
  /** Contenido extra bajo el texto (opciones, ubicación, chips) */
  children?: React.ReactNode;
  className?: string;
};

export function ChatBubble({ side, sender, body, createdAt, status, children, className }: ChatBubbleProps) {
  if (side === "system") {
    return (
      <li className="flex justify-center">
        <span className="max-w-[85%] rounded-full border border-border bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground">
          {sender}: {body ?? ""}
        </span>
      </li>
    );
  }
  const isAgent = side === "agent";
  return (
    <li className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] min-w-0 rounded-2xl px-3.5 py-2.5",
          isAgent ? "rounded-br-md bg-accent" : "rounded-bl-md border border-border bg-background",
          className,
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sender}</p>
        {body && <p className="whitespace-pre-wrap break-words text-sm">{body}</p>}
        {children}
        <p className="mt-1 flex items-center justify-end gap-1 text-right text-[10px] text-muted-foreground tabular-nums">
          {TIME.format(new Date(createdAt))}
          <DeliveryTick status={status} agent={isAgent} />
        </p>
      </div>
    </li>
  );
}

function DeliveryTick({ status, agent }: { status?: string; agent: boolean }) {
  if (!status) return null;
  if (status === "queued") return <Clock aria-label="En cola" className="size-3" />;
  if (!agent) return null;
  if (status === "sent") return <Check aria-label="Enviado" className="size-3 text-info" />;
  if (status === "delivered" || status === "read") {
    return <CheckCheck aria-label="Entregado" className="size-3 text-info" />;
  }
  return null;
}

/** Punto de mapa dentro de la burbuja (entrante del cliente o sede del agente). */
export function LocationBubble({
  latitude,
  longitude,
  name,
  address,
}: {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}) {
  return (
    <div className="mt-1 grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2.5">
      <span className="grid size-11 place-items-center rounded-xl bg-secondary text-info">
        <MapPin aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium">{name ?? "Ubicación"}</p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
          {address ? ` · ${address}` : ""}
        </p>
      </div>
    </div>
  );
}

/** Tres puntos: el agente está en batching/turno. */
export function TypingBubble({ sender }: { sender: string }) {
  return (
    <li className="flex justify-end" aria-live="polite" aria-label={`${sender} está escribiendo`}>
      <div className="rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sender}</p>
        <span className="mt-1 inline-flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
              style={{ animationDelay: `${dot * 200}ms` }}
            />
          ))}
        </span>
      </div>
    </li>
  );
}
