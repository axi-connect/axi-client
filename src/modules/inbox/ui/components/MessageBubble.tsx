"use client"

import { cn } from "@/core/lib/utils"
import { AlertCircle, Bot, Check, CheckCheck, Clock, RotateCw, User } from "lucide-react"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

/**
 * Burbuja de mensaje. Estados de entrega: pending (reloj) → sent (check) →
 * delivered/read (doble check) → failed (alerta + retry). El backend aún no
 * emite `conversation.message_status`, así que delivered/read son best-effort.
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
    return <CheckCheck className={cn("size-3.5", message.status === "read" ? "text-blue-400" : "opacity-60")} aria-label={message.status === "read" ? "Leído" : "Entregado"} />
  }
  return <Check className="size-3.5 opacity-60" aria-label="Enviado" />
}

export function MessageBubble({ message, onRetry }: { message: UiMessage; onRetry?: (message: UiMessage) => void }) {
  const outbound = message.direction === "outbound"
  const system = message.sender_type === "system" || message.content_type === "system"
  const failed = message.delivery === "failed" || message.status === "failed"

  if (system) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{message.body}</span>
      </div>
    )
  }

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          outbound
            ? "rounded-br-sm bg-brand text-white"
            : "rounded-bl-sm bg-muted text-foreground",
          failed && "opacity-70 ring-1 ring-destructive",
        )}
      >
        {message.content_type !== "text" && (
          <div className={cn("mb-1 text-[10px] uppercase tracking-wide", outbound ? "text-white/70" : "text-muted-foreground")}>
            {message.content_type}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.body ?? "(sin contenido)"}</p>
        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", outbound ? "text-white/70" : "text-muted-foreground")}>
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
