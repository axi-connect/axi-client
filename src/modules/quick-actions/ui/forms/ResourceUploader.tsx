"use client"

import { useRef, useState } from "react"
import { cn } from "@/core/lib/utils"
import { ArrowDown, ArrowUp, FileText, ImageIcon, Loader2, Plus, X } from "lucide-react"
import { errorMessage } from "@/core/lib/error-messages"
import { formatBytes } from "@/core/lib/format"
import { useAlert } from "@/core/providers/alert-provider"
import type { QuickActionAssetDTO } from "@/modules/quick-actions/domain/quick-action"
import { uploadQuickActionAsset } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,video/mp4,audio/ogg,audio/mpeg"
const MAX_ASSETS = 10

/**
 * Campo custom del formulario de acciones (W5): sube archivos del recurso
 * (PDF/imágenes) en el momento y mantiene la lista ORDENADA — el orden es el
 * orden de envío (↑/↓ en v1, sin drag&drop). Escribe los assets completos en
 * el form; el config los reduce a `asset_ids`.
 */
export function ResourceUploader({
  assets,
  onChange,
  error,
}: {
  assets: QuickActionAssetDTO[]
  onChange: (assets: QuickActionAssetDTO[]) => void
  error?: string
}) {
  const { showAlert } = useAlert()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList) => {
    if (assets.length + files.length > MAX_ASSETS) {
      showAlert({ tone: "error", title: `Máximo ${MAX_ASSETS} archivos por acción`, open: true })
      return
    }
    setUploading(true)
    try {
      const uploaded: QuickActionAssetDTO[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadQuickActionAsset(file))
      }
      onChange([...assets, ...uploaded])
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo subir el archivo"), open: true })
    } finally {
      setUploading(false)
    }
  }

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= assets.length) return
    const next = [...assets]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files)
          e.target.value = ""
        }}
        aria-hidden
        tabIndex={-1}
      />
      <ul className="flex flex-col gap-1.5" aria-label="Archivos del recurso (orden de envío)">
        {assets.map((asset, index) => (
          <li
            key={asset.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {asset.media_kind === "image" ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{asset.filename}</p>
              <p className="text-[10px] text-muted-foreground">{formatBytes(asset.size_bytes)}</p>
            </div>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={`Subir ${asset.filename} en el orden`}>
              <ArrowUp className="size-3.5" />
            </button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === assets.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={`Bajar ${asset.filename} en el orden`}>
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange(assets.filter((a) => a.id !== asset.id))}
              className="p-1 text-muted-foreground hover:text-destructive"
              aria-label={`Quitar ${asset.filename}`}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand",
          error && "border-destructive text-destructive",
        )}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {uploading ? "Subiendo…" : "Subir PDF o imágenes"}
      </button>
      {assets.length > 1 && (
        <p className="text-[10px] text-muted-foreground">
          El orden de la lista es el orden en que se envían los archivos.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
