"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, SendHorizonal } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import type { ConversationDTO, SendInput } from "@/modules/inbox/domain/inbox"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useUploadQueue } from "@/modules/inbox/infrastructure/hooks/use-upload-queue"
import { useVoiceRecorder } from "@/modules/inbox/infrastructure/hooks/use-voice-recorder"
import {
  sendMessageRest,
  uploadConversationFile,
} from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"
import { AttachmentPicker } from "./AttachmentPicker"
import { AttachmentTray } from "./AttachmentTray"
import { QuickActionsMenu } from "./QuickActionsMenu"
import { VoiceRecorderBar } from "./VoiceRecorderBar"

/**
 * Composer del inbox (W3): texto + adjuntos (📎, N archivos = N mensajes,
 * caption en el primero) + nota de voz (🎤, MediaRecorder → upload con
 * voice_note → media). Typing con debounce. Deshabilitado si la IA atiende
 * (`ai_active`) o la conversación no está abierta. El envío vive en
 * use-send-message (WS primario, REST fallback).
 */
const TYPING_IDLE_MS = 2_500

export function Composer({
  conversation,
  commands,
  socketConnected,
  onSend,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
  socketConnected: boolean
  onSend: (input: SendInput) => Promise<void>
}) {
  const { showAlert } = useAlert()
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingVoice, setSendingVoice] = useState(false)
  const typingRef = useRef<{ active: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    active: false,
    timer: null,
  })

  const uploads = useUploadQueue(conversation.id)
  const recorder = useVoiceRecorder()

  const canWrite = conversation.status === "open" && conversation.mode === "human_active"
  const hasAttachments = uploads.attachments.length > 0
  const canSubmit =
    canWrite && !sending && (hasAttachments ? uploads.allUploaded : body.trim().length > 0)
  const showMic =
    recorder.supported && recorder.status !== "denied" && !hasAttachments && body.trim().length === 0

  const stopTyping = useCallback(() => {
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer)
    if (typingRef.current.active) {
      typingRef.current.active = false
      void commands.typing(conversation.id, false)
    }
  }, [commands, conversation.id])

  // Al desmontar o cambiar de conversación, apaga el typing.
  useEffect(() => stopTyping, [stopTyping])

  const handleTyping = (value: string) => {
    setBody(value)
    if (!canWrite || !socketConnected) return
    if (!typingRef.current.active) {
      typingRef.current.active = true
      void commands.typing(conversation.id, true)
    }
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer)
    typingRef.current.timer = setTimeout(() => {
      typingRef.current.active = false
      void commands.typing(conversation.id, false)
    }, TYPING_IDLE_MS)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSending(true)
    stopTyping()
    const text = body.trim()
    setBody("")
    try {
      if (hasAttachments) {
        // Un mensaje por archivo (patrón WhatsApp Web); caption en el primero
        const ready = uploads.attachments.filter((a) => a.status === "uploaded" && a.upload_id)
        uploads.clear()
        for (const [index, attachment] of ready.entries()) {
          await onSend({
            kind: "media",
            upload_id: attachment.upload_id as string,
            caption: index === 0 && text ? text : undefined,
            media_kind: attachment.kind,
            voice_note: attachment.voice_note,
            preview: {
              object_url: attachment.object_url,
              mime_type: attachment.mime_type,
              filename: attachment.file_name,
              size_bytes: attachment.size_bytes,
            },
          })
        }
      } else {
        await onSend({ kind: "text", body: text })
      }
    } finally {
      setSending(false)
    }
  }

  const handleSendVoice = async () => {
    const voice = recorder.recording
    if (!voice || sendingVoice) return
    setSendingVoice(true)
    try {
      const extension = voice.mime_type.includes("mp4") ? "m4a" : "webm"
      const filename = `nota-de-voz-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.${extension}`
      const upload = await uploadConversationFile(conversation.id, voice.blob, {
        filename,
        voiceNote: true,
      })
      await onSend({
        kind: "media",
        upload_id: upload.id,
        media_kind: "audio",
        voice_note: true,
        preview: {
          object_url: voice.object_url,
          mime_type: voice.mime_type,
          filename,
          size_bytes: voice.blob.size,
        },
      })
      recorder.reset()
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo enviar la nota de voz"),
        open: true,
      })
    } finally {
      setSendingVoice(false)
    }
  }

  /**
   * Acción rápida (W4): mismo pipeline de envío (`type=quick_action`).
   * El 202/ack trae el PRIMER mensaje; los demás (recurso multi-archivo)
   * llegan por `conversation.message_sent` → refresh del timeline.
   */
  const handleQuickAction = async (action: QuickActionDTO) => {
    const dto = { type: "quick_action" as const, quick_action_id: action.id }
    if (socketConnected) {
      const ack = await commands.sendMessage({ conversation_id: conversation.id, ...dto })
      if (!ack.ok) throw new Error(ack.error.message || "No se pudo enviar la acción")
    } else {
      await sendMessageRest(conversation.id, dto)
    }
    // Los mensajes reales llegan por WS; el re-fetch garantiza orden completo
    await useInboxStore.getState().fetchMessages(conversation.id)
  }

  const recording = recorder.status === "recording" || recorder.status === "preview"

  return (
    <div className="border-t border-border bg-background p-3">
      {!canWrite && (
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {conversation.status !== "open"
            ? "La conversación está cerrada."
            : conversation.mode === "ai_active"
              ? "La IA está atendiendo: usa “Intervenir” para responder tú."
              : "Toma la conversación (“Atender”) para responder."}
        </p>
      )}

      {recording ? (
        <VoiceRecorderBar recorder={recorder} sending={sendingVoice} onSend={() => void handleSendVoice()} />
      ) : (
        <>
          <AttachmentTray
            attachments={uploads.attachments}
            onRemove={uploads.remove}
            onRetry={uploads.retryUpload}
          />
          <div className="flex items-end gap-1.5">
            <AttachmentPicker disabled={!canWrite || sending} onFiles={uploads.add} />
            <QuickActionsMenu
              disabled={!canWrite || sending}
              contactName={conversation.contact.full_name || conversation.contact.phone || "el contacto"}
              onExecute={handleQuickAction}
            />
            <textarea
              value={body}
              disabled={!canWrite || sending}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
              rows={1}
              placeholder={
                !canWrite
                  ? "No disponible"
                  : hasAttachments
                    ? "Añade un comentario… (irá con el primer archivo)"
                    : "Escribe un mensaje… (Enter para enviar)"
              }
              className={cn(
                "max-h-32 min-h-10 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm",
                "focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
              )}
              aria-label="Mensaje"
            />
            {showMic ? (
              <Button
                size="icon"
                variant="ghost"
                disabled={!canWrite || sending}
                onClick={() => void recorder.start()}
                aria-label="Grabar nota de voz"
              >
                <Mic className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                title={uploads.hasPending ? "Subiendo adjuntos…" : undefined}
                aria-label="Enviar mensaje"
              >
                <SendHorizonal className="size-4" />
              </Button>
            )}
          </div>
        </>
      )}

      {recorder.status === "denied" && (
        <p className="mt-1 text-[10px] text-warning">
          Micrófono bloqueado: permite el acceso en el navegador para grabar notas de voz.
        </p>
      )}
      {!socketConnected && canWrite && (
        <p className="mt-1 text-[10px] text-warning">
          Sin tiempo real: los envíos van por HTTP y se confirman al reconectar.
        </p>
      )}
    </div>
  )
}
