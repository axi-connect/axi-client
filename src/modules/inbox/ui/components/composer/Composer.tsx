"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { AlertCircle, Clock, LayoutTemplate, Mic, MicOff, Paperclip, PlugZap, SendHorizonal, Sparkles, Upload, WifiOff, X, Zap } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { formatBytes } from "@/core/lib/format"
import { HttpError } from "@/core/api/problem"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import { useChannelStatus } from "@/modules/channels/public"
import { COMPOSER_ACCEPT, MAX_UPLOAD_BYTES, type ConversationDTO, type SendInput } from "@/modules/inbox/domain/inbox"
import { firstNameOf } from "@/modules/inbox/domain/inbox-summary"
import { closedWindowNotice, rejectionSentence, windowLine } from "@/modules/inbox/domain/composer-copy"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { noteWindowRejection } from "@/modules/inbox/infrastructure/realtime/use-send-message"
import { useReplyWindow } from "@/modules/inbox/infrastructure/hooks/use-reply-window"
import { useUploadQueue } from "@/modules/inbox/infrastructure/hooks/use-upload-queue"
import { useVoiceRecorder } from "@/modules/inbox/infrastructure/hooks/use-voice-recorder"
import { sendMessageRest, uploadConversationFile } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"
import { AttachmentTray } from "./AttachmentTray"
import { QuickActionsMenu, type QuickActionsMode } from "./QuickActionsMenu"
import type { HandoffActionDescriptor } from "../header/use-handoff-actions"
import { VoiceRecorderBar } from "./VoiceRecorderBar"

/**
 * Composer del inbox (F3 · «Escribir»). Un solo bloque: el texto arriba y las
 * herramientas abajo (adjuntar y acciones rápidas a la izquierda; voz o
 * Enviar en coral a la derecha). Encima, una línea con la ventana de 24 h y
 * los estados que importan (sin tiempo real, micrófono bloqueado) en
 * píldoras, no en 10 px ámbar.
 *
 * Cuando no se puede escribir, la caja se CAMBIA por la razón y la salida:
 * Axi atiende o está en cola (F2), canal caído, o ventana cerrada. Fuera de
 * ventana el motor rechaza todo lo que no sea plantilla, media y voz
 * incluidas, así que se bloquea la caja entera; en WhatsApp Cloud la salida es
 * «Enviar plantilla». Si el servidor rechaza por ventana aunque el reloj local
 * dijera que estaba abierta, manda el servidor (`use-reply-window`).
 *
 * Adjuntos: el clip, arrastrar sobre la conversación y pegar entran por la
 * misma cola (N archivos = N mensajes, el texto va con el primero). Lo que no
 * entra se dice en la caja hasta cerrarlo. «/» al empezar abre las acciones.
 */
const TYPING_IDLE_MS = 2_500
/** Hasta 8 líneas de 21 px más el relleno; después, scroll de marca. */
const TEXTAREA_MAX_PX = 8 * 21 + 16

export function Composer({
  conversation,
  commands,
  socketConnected,
  onSend,
  unlock = null,
  unlockBusy = false,
  dropTargetRef,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
  socketConnected: boolean
  onSend: (input: SendInput) => Promise<void>
  /**
   * La acción que abre la escritura cuando todavía no se puede (Atender en cola,
   * Intervenir con Axi). Es la misma de la cabecera, de `useHandoffActions`.
   * Sin permiso de handoff llega `null` y la barra solo explica.
   */
  unlock?: HandoffActionDescriptor | null
  unlockBusy?: boolean
  /** La conversación entera: soltar un archivo sobre ella lo adjunta. */
  dropTargetRef?: RefObject<HTMLElement | null>
}) {
  const { showAlert } = useAlert()
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingVoice, setSendingVoice] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingRef = useRef<{ active: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    active: false,
    timer: null,
  })

  const uploads = useUploadQueue(conversation.id)
  const recorder = useVoiceRecorder()
  const replyWin = useReplyWindow(conversation)
  const channelStatus = useChannelStatus(conversation.channel_id)

  const contactName = conversation.contact.full_name || conversation.contact.phone || "el contacto"
  const firstName = firstNameOf(contactName)
  const humanActive = conversation.status === "open" && conversation.mode === "human_active"
  const channelDown = channelStatus === "disconnected" || channelStatus === "error"
  const windowClosed = replyWin.state === "closed"
  const canWrite = humanActive && !channelDown && !windowClosed
  const qaMode: QuickActionsMode = windowClosed ? "templates" : "all"

  const hasAttachments = uploads.attachments.length > 0
  const hasText = body.trim().length > 0
  const canSubmit = canWrite && !sending && (hasAttachments ? uploads.allUploaded : hasText)
  const showMic = recorder.supported && !hasAttachments && !hasText

  const stopTyping = useCallback(() => {
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer)
    if (typingRef.current.active) {
      typingRef.current.active = false
      void commands.typing(conversation.id, false)
    }
  }, [commands, conversation.id])

  // Al desmontar o cambiar de conversación, apaga el typing.
  useEffect(() => stopTyping, [stopTyping])

  // Crece con el texto hasta 8 líneas; después, scroll con la barra de marca.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${String(Math.min(el.scrollHeight, TEXTAREA_MAX_PX))}px`
  }, [body])

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
        // Un mensaje por archivo (patrón WhatsApp Web); el texto va con el primero
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
      textareaRef.current?.focus()
    }
  }

  const handleSendVoice = async () => {
    const voice = recorder.recording
    if (!voice || sendingVoice) return
    setSendingVoice(true)
    try {
      const extension = voice.mime_type.includes("mp4") ? "m4a" : "webm"
      const filename = `nota-de-voz-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.${extension}`
      const upload = await uploadConversationFile(conversation.id, voice.blob, { filename, voiceNote: true })
      await onSend({
        kind: "media",
        upload_id: upload.id,
        media_kind: "audio",
        voice_note: true,
        preview: { object_url: voice.object_url, mime_type: voice.mime_type, filename, size_bytes: voice.blob.size },
      })
      recorder.reset()
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo enviar la nota de voz") })
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
      if (!ack.ok) {
        if (noteWindowRejection(conversation.id, ack.error.code)) {
          throw new Error("La ventana de 24 h está cerrada: solo se puede enviar una plantilla")
        }
        throw new Error(ack.error.message || "No se pudo enviar la acción")
      }
    } else {
      try {
        await sendMessageRest(conversation.id, dto)
      } catch (err) {
        if (noteWindowRejection(conversation.id, err instanceof HttpError ? err.code : null)) {
          throw new Error("La ventana de 24 h está cerrada: solo se puede enviar una plantilla")
        }
        throw err
      }
    }
    // Los mensajes reales llegan por WS; el re-fetch garantiza orden completo
    await useInboxStore.getState().fetchMessages(conversation.id)
  }

  const recording = recorder.status === "recording" || recorder.status === "preview"
  const line = windowLine(replyWin)

  // ------------------------------------------------ la caja, o por qué no hay caja
  let content: ReactNode
  if (!humanActive && conversation.status === "open") {
    // Todavía no se puede escribir (F2): una barra que dice por qué y abre la escritura.
    content = (
      <Notice
        icon={conversation.mode === "ai_active" ? <Sparkles className="size-4 text-accent-violet" /> : null}
        body={
          conversation.mode === "ai_active"
            ? "Axi está atendiendo. Si intervienes, Axi se pausa en esta conversación hasta que se la devuelvas."
            : "Atiéndela para responder. Axi ya no le escribe."
        }
        action={
          unlock !== null ? (
            <Button variant="contrast" className="h-9 shrink-0 rounded-full px-3.5" disabled={unlockBusy} onClick={unlock.onSelect}>
              <unlock.icon aria-hidden className="size-4" />
              {unlock.label}
            </Button>
          ) : null
        }
        muted
      />
    )
  } else if (humanActive && channelDown) {
    content = (
      <Notice
        icon={<PlugZap className="size-4 text-destructive" />}
        title={`${conversation.channel.name} está desconectado.`}
        body="Lo que escribas no saldrá hasta reconectarlo."
        action={
          <Button asChild variant="outline" className="h-9 shrink-0 rounded-full px-3.5">
            <Link href={`/settings/channels/${conversation.channel_id}`}>Ver el canal</Link>
          </Button>
        }
      />
    )
  } else if (humanActive && replyWin.state === "closed") {
    const copy = closedWindowNotice(replyWin, conversation.channel.kind, firstName)
    content = (
      <Notice
        icon={<Clock className="size-4" />}
        title={copy.title}
        body={copy.body}
        action={
          replyWin.templates ? (
            <Button variant="contrast" className="h-9 shrink-0 rounded-full px-3.5" onClick={() => setQaOpen(true)}>
              <LayoutTemplate className="size-4" aria-hidden />
              Enviar plantilla
            </Button>
          ) : null
        }
      />
    )
  } else if (recording) {
    content = (
      <div className="rounded-[20px] border border-border bg-card shadow-xs">
        <VoiceRecorderBar recorder={recorder} sending={sendingVoice} onSend={() => void handleSendVoice()} />
      </div>
    )
  } else {
    content = (
      <div
        className={cn(
          "flex flex-col rounded-[20px] border bg-card shadow-xs transition-[border-color,box-shadow]",
          focused ? "border-foreground ring-[3px] ring-foreground/8" : "border-border",
        )}
      >
        <AttachmentTray attachments={uploads.attachments} onRemove={uploads.remove} onRetry={uploads.retryUpload} />
        <textarea
          ref={textareaRef}
          value={body}
          disabled={!canWrite || sending}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "/" && body === "" && !e.nativeEvent.isComposing) {
              e.preventDefault()
              setQaOpen(true)
              return
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files)
            if (files.length === 0) return
            e.preventDefault()
            uploads.add(files)
          }}
          rows={1}
          placeholder={hasAttachments ? "Añade un texto… (irá con el primer archivo)" : `Escribe a ${firstName}…`}
          className="sidebar-scroll block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-[21px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
          aria-label="Mensaje"
        />
        {uploads.attachments.length > 1 && (
          <p className="px-4 text-[11px] text-muted-foreground">
            {uploads.attachments.length} archivos · se envían como {uploads.attachments.length} mensajes y el texto va con el primero
          </p>
        )}
        <div className="flex items-center gap-0.5 px-1.5 pt-1 pb-1.5">
          <AttachButton disabled={!canWrite || sending} onFiles={uploads.add} />
          <ToolButton label="Acciones rápidas" title="Acciones rápidas · también con «/»" pressed={qaOpen} disabled={!canWrite} onClick={() => setQaOpen((open) => !open)}>
            <Zap className="size-[17px]" />
          </ToolButton>
          <span className="flex-1" />
          {showMic && (
            <ToolButton
              label={recorder.status === "denied" ? "Micrófono bloqueado" : "Grabar nota de voz"}
              disabled={!canWrite || sending || recorder.status === "denied"}
              onClick={() => void recorder.start()}
            >
              <Mic className="size-[17px]" />
            </ToolButton>
          )}
          {showMic ? (
            <Button size="icon" disabled aria-label="Enviar mensaje" className="size-9 rounded-full bg-muted bg-none text-muted-foreground shadow-none">
              <SendHorizonal className="size-4" />
            </Button>
          ) : (
            <Button
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              title={uploads.hasPending ? "Subiendo adjuntos…" : undefined}
              aria-label="Enviar mensaje"
              className="h-9 rounded-full pr-3.5 pl-3"
            >
              Enviar
              <SendHorizonal className="size-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ------------------------------------------------ la línea de encima
  const pills: ReactNode[] = []
  if (humanActive && !channelDown && line !== null) {
    pills.push(
      <StatePill key="window" dot={line.tone === "warn" ? "bg-warning" : "bg-success"}>
        {line.lead} <b className="font-semibold text-foreground tabular-nums">{line.value}</b>
        {line.tail ? ` · ${line.tail}` : ""}
      </StatePill>,
    )
  }
  if (canWrite && !socketConnected) {
    pills.push(
      <StatePill key="socket" icon={<WifiOff className="size-3.5 text-warning" />}>
        Sin tiempo real · se envía por HTTP
      </StatePill>,
    )
  }
  if (canWrite && recorder.status === "denied") {
    pills.push(
      <StatePill key="mic" icon={<MicOff className="size-3.5 text-warning" />}>
        Micrófono bloqueado · permítelo en el candado de la barra de direcciones
      </StatePill>,
    )
  }

  return (
    <QuickActionsMenu
      open={qaOpen && humanActive && !channelDown && (replyWin.state !== "closed" || replyWin.templates)}
      onOpenChange={(open) => {
        setQaOpen(open)
        if (!open) textareaRef.current?.focus()
      }}
      mode={qaMode}
      contactName={contactName}
      onExecute={handleQuickAction}
    >
      <div className="flex shrink-0 flex-col gap-2 bg-background px-3 pt-2 pb-3 sm:px-4">
        {(pills.length > 0 || (canWrite && hasText)) && (
          <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1.5 px-1">
            {pills}
            {canWrite && hasText && (
              <span className="ml-auto hidden text-[11px] whitespace-nowrap text-muted-foreground md:inline">
                <Kbd>Enter</Kbd> envía · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> salto de línea
              </span>
            )}
          </div>
        )}
        {canWrite && uploads.rejections.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
            <span className="flex-1">{rejectionSentence(uploads.rejections, conversation.channel.kind)}</span>
            <button
              type="button"
              onClick={uploads.dismissRejections}
              className="-my-0.5 grid size-6 shrink-0 place-items-center rounded-full hover:bg-destructive/15"
              aria-label="Cerrar el aviso"
            >
              <X className="size-3" strokeWidth={2.6} />
            </button>
          </div>
        )}
        {content}
        {canWrite && dropTargetRef !== undefined && <DropZone targetRef={dropTargetRef} firstName={firstName} onFiles={uploads.add} />}
      </div>
    </QuickActionsMenu>
  )
}

function Notice({
  icon,
  title,
  body,
  action,
  muted = false,
}: {
  icon: ReactNode
  title?: string
  body: string
  action: ReactNode
  muted?: boolean
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-[20px] py-2.5 pr-2.5 pl-4 text-sm leading-snug text-foreground/85",
        muted ? "bg-muted" : "border border-border bg-card shadow-xs",
      )}
    >
      {icon !== null && (
        <span aria-hidden className={cn("grid shrink-0 place-items-center", muted ? "" : "size-9 rounded-xl bg-muted text-foreground/80")}>
          {icon}
        </span>
      )}
      <span className="min-w-[min(15rem,100%)] flex-1">
        {title && <b className="font-semibold text-foreground">{title} </b>}
        {body}
      </span>
      {action}
    </div>
  )
}

function StatePill({ children, dot, icon }: { children: ReactNode; dot?: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 text-[11.5px] font-medium text-foreground/80">
      {dot && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dot)} />}
      {icon && <span aria-hidden className="inline-flex shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] items-center rounded-[5px] border border-border bg-card px-1 font-sans text-[10.5px] text-foreground/80">
      {children}
    </kbd>
  )
}

function ToolButton({
  label,
  title,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string
  title?: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      aria-expanded={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-foreground/75 transition-colors hover:bg-muted hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
        pressed && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/** El clip: abre el selector de archivos (multi-selección). */
function AttachButton({ disabled, onFiles }: { disabled: boolean; onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={COMPOSER_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ""
        }}
        aria-hidden
        tabIndex={-1}
      />
      <ToolButton label="Adjuntar archivo" title="Adjuntar · también puedes arrastrar o pegar" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Paperclip className="size-[17px]" />
      </ToolButton>
    </>
  )
}

/**
 * Soltar archivos sobre la conversación. El velo dice los límites antes de
 * soltar. Solo reacciona a arrastres de ARCHIVOS (no a texto seleccionado).
 */
function DropZone({
  targetRef,
  firstName,
  onFiles,
}: {
  targetRef: RefObject<HTMLElement | null>
  firstName: string
  onFiles: (files: FileList) => void
}) {
  const [active, setActive] = useState(false)
  const depthRef = useRef(0)
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depthRef.current += 1
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depthRef.current = Math.max(0, depthRef.current - 1)
      if (depthRef.current === 0) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depthRef.current = 0
      setActive(false)
      if (e.dataTransfer?.files.length) onFilesRef.current(e.dataTransfer.files)
    }
    target.addEventListener("dragenter", enter)
    target.addEventListener("dragover", over)
    target.addEventListener("dragleave", leave)
    target.addEventListener("drop", drop)
    return () => {
      target.removeEventListener("dragenter", enter)
      target.removeEventListener("dragover", over)
      target.removeEventListener("dragleave", leave)
      target.removeEventListener("drop", drop)
    }
  }, [targetRef])

  if (!active || !targetRef.current) return null
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed border-foreground bg-background/85 px-6 text-center backdrop-blur-[6px]"
    >
      <Upload className="size-7" aria-hidden />
      <span className="font-heading text-xl font-bold">Suelta para adjuntar a {firstName}</span>
      <span className="text-xs text-foreground/75">
        Fotos hasta {formatBytes(MAX_UPLOAD_BYTES.image)} · videos y audios hasta {formatBytes(MAX_UPLOAD_BYTES.video)} · documentos hasta{" "}
        {formatBytes(MAX_UPLOAD_BYTES.document)}
      </span>
    </div>,
    targetRef.current,
  )
}
