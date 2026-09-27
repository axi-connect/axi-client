"use client"

import { cn } from "@/core/lib/utils"
import { MessageTime } from "./timeline/MessageTime"
import { AlertCircle, Check, CheckCheck, Clock, RotateCw, Smartphone, Sparkles } from "lucide-react"
import {
  extractInteractivePayload,
  extractInteractiveReply,
  isMediaContentType,
  sentFromBusinessApp,
  type UiMessage,
} from "@/modules/inbox/domain/inbox"
import { InteractiveMessage, InteractiveReplyChip } from "./interactive"
import { MediaAttachment } from "./media"

/**
 * Burbuja de mensaje. Estados de entrega: pending (reloj) → sent (check) →
 * delivered/read (doble check) → failed (alerta + retry). El backend aún no
 * emite `conversation.message_status`, así que delivered/read son best-effort.
 * Media (F9): imagen/video/sticker van edge-to-edge (p-1); audio/documento/
 * ubicación con padding normal; sticker sin fondo de burbuja (patrón WhatsApp).
 */
function StatusIcon({ message }: { message: UiMessage }) {
  if (message.direction !== "outbound") return null
  if (message.delivery === "failed" || message.status === "failed") {
    return <AlertCircle className="size-3.5" aria-label="Falló el envío" />
  }
  if (message.delivery === "pending" || message.status === "queued") {
    return <Clock className="size-3.5 opacity-60" aria-label="Enviando" />
  }
  if (message.status === "read" || message.status === "delivered") {
    // Leído a opacidad plena y entregado atenuado: sin azul, que sobre la tinta no
    // se lee y además es best-effort (el backend no emite `message_status`).
    return <CheckCheck className={cn("size-3.5", message.status === "read" ? "opacity-100" : "opacity-60")} aria-label={message.status === "read" ? "Leído" : "Entregado"} />
  }
  return <Check className="size-3.5 opacity-60" aria-label="Enviado" />
}

export function MessageBubble({
  message,
  conversationId,
  onRetry,
  first = true,
  last = true,
  author = null,
}: {
  message: UiMessage
  conversationId: string
  onRetry?: (message: UiMessage) => void
  /** Primero de un grupo del mismo autor: lleva el autor arriba (F2). */
  first?: boolean
  /** Último del grupo: lleva la hora, el estado y la esquina de la cola. */
  last?: boolean
  /** «Axi», «Tú», «Desde el celular del negocio»…; `null` no pinta autor. */
  author?: string | null
}) {
  const outbound = message.direction === "outbound"
  const system = message.sender_type === "system" || message.content_type === "system"
  const failed = message.delivery === "failed" || message.status === "failed"
  const media = isMediaContentType(message.content_type)
  const sticker = message.content_type === "sticker"
  // Interactivo (§9.1): el cuerpo del mensaje ES el texto de la burbuja y las
  // opciones cuelgan debajo. Un payload inválido devuelve null y la burbuja
  // cae a texto plano — nunca se queda muda.
  const interactive = extractInteractivePayload(message.payload)
  // Entrante: el cliente tocó una opción en vez de escribir
  const reply = extractInteractiveReply(message.payload)
  // Imagen/video/sticker: media al borde de la burbuja; el texto va con padding propio
  const edgeToEdge = sticker || message.content_type === "image" || message.content_type === "video"

  if (system) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{message.body}</span>
      </div>
    )
  }

  const footerTone = sticker
    ? "text-muted-foreground"
    : outbound
      ? "text-background/75"
      : "text-muted-foreground"
  const fromApp = message.sender_type === "user" && sentFromBusinessApp(message.payload)

  return (
    <div className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
      {first && author !== null && (
        <p className="mb-1 flex items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground">
          {message.sender_type === "ai_agent" && <Sparkles aria-hidden className="size-3 text-accent-violet" />}
          {author}
        </p>
      )}
      <div
        className={cn(
          // Ancho por el hilo, con tope: en un chat ancho una línea de 75 % no se lee.
          "max-w-[min(75%,34rem)] rounded-2xl text-sm",
          // D1 (aprobada en el lienzo de F2): lo que sale va en TINTA; el coral queda
          // para las acciones (Enviar, Atender, Intervenir).
          sticker
            ? "bg-transparent"
            : outbound
              ? "bg-foreground text-background"
              : "border border-border bg-card text-foreground",
          last && !sticker && (outbound ? "rounded-br-md" : "rounded-bl-md"),
          media && edgeToEdge && !sticker ? "p-1" : sticker ? "p-0" : "px-3 py-2",
          failed && "opacity-80 ring-[1.5px] ring-destructive",
        )}
      >
        {media ? (
          <MediaAttachment message={message} conversationId={conversationId} outbound={outbound} />
        ) : reply ? (
          <InteractiveReplyChip reply={reply} outbound={outbound} />
        ) : (
          // Sin rama propia, un content_type nuevo se pinta con su nombre
          // crudo: es feo pero honesto, y es lo que delata que falta soporte
          message.content_type !== "text" && !interactive && (
            <div className={cn("mb-1 text-[10px] uppercase tracking-wide", outbound ? "text-background/70" : "text-muted-foreground")}>
              {message.content_type}
            </div>
          )
        )}
        {(!media || (message.body && message.body.length > 0)) && (
          <p className={cn("whitespace-pre-wrap break-words", media && edgeToEdge && "px-2 pt-1")}>
            {media ? message.body : (message.body ?? "(sin contenido)")}
          </p>
        )}
        {interactive && <InteractiveMessage interactive={interactive} outbound={outbound} />}
        {last && (
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10.5px]",
              footerTone,
              media && edgeToEdge && !sticker && "px-2 pb-1",
            )}
          >
            {fromApp && (
              // Coexistencia (F2 de WhatsApp): salió del celular del negocio, no de Axi
              <span className="inline-flex items-center gap-0.5" title="Enviado desde el celular">
                <Smartphone className="size-3" aria-label="Enviado desde el celular" />
                <span className="font-medium">Celular</span>
              </span>
            )}
            <MessageTime iso={message.created_at} />
            <StatusIcon message={message} />
          </div>
        )}
      </div>
      {failed && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-destructive" role="status">
          <AlertCircle aria-hidden className="size-3.5" />
          <span>No se envió</span>
          {onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              aria-label="Reintentar envío"
              className="inline-flex h-7 items-center gap-1 rounded-full border border-destructive/35 bg-card px-2.5 font-medium transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-destructive/40 focus-visible:outline-none"
            >
              <RotateCw aria-hidden className="size-3" /> Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
