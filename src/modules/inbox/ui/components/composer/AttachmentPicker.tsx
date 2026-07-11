"use client"

import { useRef } from "react"
import { Paperclip } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { COMPOSER_ACCEPT } from "@/modules/inbox/domain/inbox"

/** Botón 📎 del composer: abre el selector de archivos (multi-selección). */
export function AttachmentPicker({
  disabled,
  onFiles,
}: {
  disabled: boolean
  onFiles: (files: FileList) => void
}) {
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Adjuntar archivo"
      >
        <Paperclip className="size-4" />
      </Button>
    </>
  )
}
