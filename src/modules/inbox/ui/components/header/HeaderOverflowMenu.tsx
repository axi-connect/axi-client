"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, MoreHorizontal } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Separator } from "@/shared/components/ui/separator"
import type { HandoffActionDescriptor } from "./use-handoff-actions"

/**
 * Menú de desborde de la cabecera. Contiene SOLO ACCIONES: las señales
 * informativas que no caben se ocultan por ancho y siguen disponibles en el rail
 * de contexto — un chip informativo dentro de un menú de acciones desorienta.
 *
 * Usa `Popover` de Radix (con portal). No se puede usar `ui/dropdown-menu.tsx`:
 * es custom, se posiciona `absolute` sin portal y quedaría recortado por el
 * `overflow-hidden` del panel de conversación.
 */
export function HeaderOverflowMenu({
  actions,
  phone,
  contactId,
  disabled = false,
}: {
  actions: HandoffActionDescriptor[]
  phone: string | null
  contactId: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const itemClass =
    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Más acciones"
          disabled={disabled}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                action.onSelect()
              }}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {action.label}
            </button>
          )
        })}

        {actions.length > 0 && <Separator className="my-1" />}

        {phone !== null && phone !== "" && (
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              void navigator.clipboard.writeText(phone).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? (
              <Check className="size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            {copied ? "Teléfono copiado" : "Copiar teléfono"}
          </button>
        )}

        <Link href={`/crm/contacts/${contactId}`} className={itemClass} onClick={() => setOpen(false)}>
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          Ver ficha completa
        </Link>
      </PopoverContent>
    </Popover>
  )
}
