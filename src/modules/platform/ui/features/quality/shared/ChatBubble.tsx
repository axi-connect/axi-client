"use client";

/**
 * Burbuja de chat compartida por el detalle de un case y el simulacro: el
 * cliente a la izquierda (superficie neutra), el agente a la derecha (acento
 * suave), sistema/operador humano como chip centrado. Los «slots» (opciones
 * tocables, ubicación, indicador de escritura) los rellena quien la usa: la
 * burbuja no sabe de sesiones ni de cases.
 */
import { Captions, Check, CheckCheck, Clock, EyeOff, ImageOff, MapPin, ScanEye } from "lucide-react";
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
          "max-w-[85%] min-w-0 rounded-[18px] px-3.5 py-2.5",
          isAgent ? "rounded-br-md bg-accent" : "rounded-bl-md bg-muted",
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

/** Imagen o audio adjunto (URL presignada de 5 min; el polling la refresca). */
export function MediaBubble({
  attachment,
  alt,
}: {
  attachment: { mime_type: string; url: string | null; filename: string };
  alt: string;
}) {
  if (attachment.url === null) {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-3.5" />
        Adjunto no disponible
      </p>
    );
  }
  if (attachment.mime_type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera de storage, fuera del optimizador
      <img src={attachment.url} alt={alt} className="mt-1 block max-h-56 w-auto max-w-full rounded-xl object-cover" loading="lazy" />
    );
  }
  if (attachment.mime_type.startsWith("audio/")) {
    return (
      <audio controls preload="metadata" src={attachment.url} className="mt-1 w-56 max-w-full" aria-label={alt}>
        <track kind="captions" />
      </audio>
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline underline-offset-2">
      {attachment.filename}
    </a>
  );
}

/** Estado del reconocimiento de una foto: chip + candidatos con su score. */
export function RecognitionChip({
  label,
  tone,
  candidates,
  latencyMs,
  margin,
}: {
  label: string;
  tone: "ok" | "warn" | "off";
  candidates: { sku: string; name: string; score: number }[];
  latencyMs: number | null;
  margin: number | null;
}) {
  const Icon = tone === "warn" ? EyeOff : ScanEye;
  return (
    <div className="mt-2 rounded-xl border border-border bg-background px-2.5 py-2 text-xs">
      <p className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Icon aria-hidden="true" className={cn("size-3.5", tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-muted-foreground")} />
          {label}
        </span>
        {latencyMs !== null && (
          <span className="text-muted-foreground tabular-nums">{(latencyMs / 1000).toFixed(1).replace(".", ",")} s</span>
        )}
      </p>
      {candidates.length > 0 && (
        <ol className="mt-1.5 divide-y divide-border/60">
          {candidates.slice(0, 3).map((candidate, index) => (
            <li key={candidate.sku} className="flex items-center justify-between gap-2 py-1 tabular-nums">
              <span className="min-w-0 truncate">
                <span className="font-mono text-[11px]">{candidate.sku}</span> {candidate.name}
              </span>
              <span className={index === 0 ? "font-semibold" : "text-muted-foreground"}>{candidate.score.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
      {margin !== null && candidates.length > 1 && (
        <p className="mt-1 text-muted-foreground">margen {margin.toFixed(2)} · cobrado a plataforma</p>
      )}
    </div>
  );
}

/** Transcripción de una nota de voz (o su fallo). */
export function TranscriptionLine({ text, failed }: { text: string | null; failed: boolean }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 border-l-2 border-border pl-2 text-xs text-muted-foreground">
      <Captions aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{failed ? "No se pudo transcribir: el agente pedirá el mensaje por texto." : text ? `«${text}»` : "Transcribiendo…"}</span>
    </p>
  );
}
