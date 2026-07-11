"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { errorMessage } from "@/core/lib/error-messages"
import { formatBytes } from "@/core/lib/format"
import { useAlert } from "@/core/providers/alert-provider"
import {
  MAX_UPLOAD_BYTES,
  mediaKindForMime,
  type ComposerAttachment,
} from "@/modules/inbox/domain/inbox"
import { uploadConversationFile } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"

/**
 * Cola de adjuntos del composer (F9): valida mime/tamaño en cliente, sube
 * inmediatamente (paralelismo 2) y expone el estado por archivo. Estado local
 * del composer (muere al cambiar de conversación — correcto: los uploads no
 * enviados quedan huérfanos en el backend y un janitor futuro los limpia).
 */
const MAX_CONCURRENT_UPLOADS = 2

export interface UploadQueue {
  attachments: ComposerAttachment[]
  add: (files: FileList | File[]) => void
  remove: (localId: string) => void
  retryUpload: (localId: string) => void
  clear: () => void
  allUploaded: boolean
  hasPending: boolean
}

export function useUploadQueue(conversationId: string): UploadQueue {
  const { showAlert } = useAlert()
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  // Los File viven fuera del estado React (solo se necesitan para subir/reintentar)
  const filesRef = useRef(new Map<string, File>())
  const activeUploadsRef = useRef(0)

  const patch = useCallback((localId: string, changes: Partial<ComposerAttachment>) => {
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.local_id === localId ? { ...attachment, ...changes } : attachment,
      ),
    )
  }, [])

  const startUpload = useCallback(
    (localId: string) => {
      const file = filesRef.current.get(localId)
      if (!file) return
      if (activeUploadsRef.current >= MAX_CONCURRENT_UPLOADS) {
        // Reintento corto hasta que se libere un slot
        setTimeout(() => startUpload(localId), 300)
        return
      }
      activeUploadsRef.current += 1
      patch(localId, { status: "uploading" })
      uploadConversationFile(conversationId, file, { filename: file.name })
        .then((upload) => patch(localId, { status: "uploaded", upload_id: upload.id }))
        .catch((err: unknown) => {
          patch(localId, { status: "error" })
          showAlert({
            tone: "error",
            title: errorMessage(err, "No se pudo subir el archivo"),
            open: true,
          })
        })
        .finally(() => {
          activeUploadsRef.current -= 1
        })
    },
    [conversationId, patch, showAlert],
  )

  const add = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const kind = mediaKindForMime(file.type)
        if (!kind) {
          showAlert({
            tone: "error",
            title: `Tipo de archivo no soportado: ${file.name}`,
            open: true,
          })
          continue
        }
        if (file.size > MAX_UPLOAD_BYTES[kind]) {
          showAlert({
            tone: "error",
            title: `${file.name} supera el máximo de ${formatBytes(MAX_UPLOAD_BYTES[kind])}`,
            open: true,
          })
          continue
        }
        const localId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        filesRef.current.set(localId, file)
        setAttachments((current) => [
          ...current,
          {
            local_id: localId,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            object_url: URL.createObjectURL(file),
            kind,
            status: "pending",
          },
        ])
        startUpload(localId)
      }
    },
    [showAlert, startUpload],
  )

  const remove = useCallback((localId: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.local_id === localId)
      if (target) URL.revokeObjectURL(target.object_url)
      filesRef.current.delete(localId)
      return current.filter((attachment) => attachment.local_id !== localId)
    })
  }, [])

  const retryUpload = useCallback(
    (localId: string) => {
      patch(localId, { status: "pending" })
      startUpload(localId)
    },
    [patch, startUpload],
  )

  const clear = useCallback((options: { revoke?: boolean } = {}) => {
    // Al ENVIAR no se revocan los object URLs: la burbuja optimista los usa
    // como preview hasta que llegue el attachment real.
    if (options.revoke) {
      setAttachments((current) => {
        current.forEach((attachment) => URL.revokeObjectURL(attachment.object_url))
        return []
      })
    } else {
      setAttachments([])
    }
    filesRef.current.clear()
  }, [])

  // Cambio de conversación: descarta la cola (y libera los previews no enviados)
  const previousConversationRef = useRef(conversationId)
  useEffect(() => {
    if (previousConversationRef.current !== conversationId) {
      previousConversationRef.current = conversationId
      clear({ revoke: true })
    }
  }, [conversationId, clear])

  return {
    attachments,
    add,
    remove,
    retryUpload,
    clear: () => clear(),
    allUploaded: attachments.length > 0 && attachments.every((a) => a.status === "uploaded"),
    hasPending: attachments.some((a) => a.status === "pending" || a.status === "uploading"),
  }
}
