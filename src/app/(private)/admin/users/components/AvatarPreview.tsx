"use client"

import { useEffect, useMemo, useState } from "react";

export function AvatarPreview({ defaults }: { defaults: any | null }) {
    const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined)
    const [file, setFile] = useState<File | null>(null)
  
    const fallback = useMemo(() => {
      const maybe = defaults?.avatar as string | undefined
      return typeof maybe === "string" && maybe.length ? maybe : undefined
    }, [defaults])
  
    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail as { name?: string; file?: File | null; objectUrl?: string }
        if (detail?.name === "avatar") {
          setFile(detail.file ?? null)
          setObjectUrl(detail.objectUrl)
        }
      }
      window.addEventListener("dynamic-form:file:change", handler)
      return () => window.removeEventListener("dynamic-form:file:change", handler)
    }, [])
  
    const src = objectUrl || fallback

    const openFileDialog = () => {
        const byAvatar = document.getElementById("df-avatar") as HTMLInputElement | null
        const byPassword = document.getElementById("df-password") as HTMLInputElement | null
        const el = byAvatar || byPassword
        el?.click()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openFileDialog()
        }
    }
  
    return (
        <div className="flex items-center gap-4">
            <div
                role="button"
                tabIndex={0}
                aria-label="Cambiar avatar"
                title="Cambiar avatar"
                onClick={openFileDialog}
                onKeyDown={handleKeyDown}
                className="h-16 w-16 rounded-full overflow-hidden border bg-muted cursor-pointer ring-0 hover:ring-2 hover:ring-accent/40 focus-visible:ring-2 focus-visible:ring-ring transition"
            >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Sin avatar</div>
            )}
            </div>
            <div className="text-sm text-muted-foreground">
            {file ? (
                <div>
                <div>Nuevo archivo: {file.name}</div>
                <div className="text-xs">{Math.round(file.size / 1024)} KB · {file.type || "archivo"}</div>
                </div>
            ) : fallback ? (
                <div>Actual: {String(fallback).slice(0, 34)}{String(fallback).length > 64 ? "…" : ""}</div>
            ) : (
                <div>No hay avatar seleccionado</div>
            )}
            </div>
        </div>
    )
}