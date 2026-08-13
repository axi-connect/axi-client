"use client"

import { cn } from "@/core/lib/utils"
import { AlertCircle, Bot, Check, CheckCheck, Clock, RotateCw, User } from "lucide-react"
import {
  extractInteractivePayload,
  extractInteractiveReply,
  isMediaContentType,
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
    return <AlertCircle className="size-3.5 text-destructive" aria-label="Falló el envío" />
  }
  if (message.delivery === "pending" || message.status === "queued") {
    return <Clock className="size-3.5 opacity-60" aria-label="Enviando" />
  }
  if (message.status === "read" || message.status === "delivered") {
    return <CheckCheck className={cn("size-3.5", message.status === "read" ? "text-info" : "opacity-60")} aria-label={message.status === "read" ? "Leído" : "Entregado"} />
  }
  return <Check className="size-3.5 opacity-60" aria-label="Enviado" />
}

export function MessageBubble({
  message,
  conversationId,
  onRetry,
}: {
  message: UiMessage
  conversationId: string
  onRetry?: (message: UiMessage) => void
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
      ? "text-white/70"
      : "text-muted-foreground"

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl text-sm",
          sticker
            ? "bg-transparent"
            : outbound
              ? "rounded-br-sm bg-brand text-white"
              : "rounded-bl-sm bg-muted text-foreground",
          media && edgeToEdge && !sticker ? "p-1" : sticker ? "p-0" : "px-3 py-2",
          failed && "opacity-70 ring-1 ring-destructive",
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
            <div className={cn("mb-1 text-[10px] uppercase tracking-wide", outbound ? "text-white/70" : "text-muted-foreground")}>
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
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            footerTone,
            media && edgeToEdge && !sticker && "px-2 pb-1",
          )}
        >
          {message.sender_type === "ai_agent" && <Bot className="size-3" aria-label="Enviado por IA" />}
          {message.sender_type === "user" && <User className="size-3" aria-label="Enviado por operador" />}
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <StatusIcon message={message} />
          {failed && onRetry && (
            <button
              onClick={() => onRetry(message)}
              className="ml-1 inline-flex items-center gap-0.5 underline"
              aria-label="Reintentar envío"
            >
              <RotateCw className="size-3" /> Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
