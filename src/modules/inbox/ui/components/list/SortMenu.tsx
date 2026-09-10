"use client"

import { useState } from "react"
import { ArrowDownUp, Check, Clock, Flag, History, MailOpen, Timer, type LucideIcon } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import {
  DEFAULT_INBOX_SORT,
  INBOX_SORT_LABELS,
  INBOX_SORTS,
  type InboxSort,
} from "@/modules/inbox/domain/inbox"

const SORT_ICONS: Record<InboxSort, LucideIcon> = {
  recent: Clock,
  oldest: History,
  unread: MailOpen,
  waiting: Timer,
  priority: Flag,
}

/**
 * Orden de la lista: icon-button cuyo icono ES el criterio activo (en 288 px
 * no cabe un `Select` con etiqueta junto a la búsqueda) y un popover con
 * `role="menu"` de radios. Con un orden distinto al default el botón se
 * ELEVA, igual que `FilterTrigger` con filtros puestos: mismo lenguaje.
 */
export function SortMenu({
  value,
  onChange,
  className,
}: {
  value: InboxSort
  onChange: (sort: InboxSort) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ActiveIcon = value === DEFAULT_INBOX_SORT ? ArrowDownUp : SORT_ICONS[value]
  const lifted = value !== DEFAULT_INBOX_SORT

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Ordenar: ${INBOX_SORT_LABELS[value]}`}
          aria-haspopup="menu"
          aria-expanded={open}
          title={`Ordenar: ${INBOX_SORT_LABELS[value]}`}
          className={cn("size-9 rounded-md", lifted && "bg-background text-foreground shadow-float", className)}
        >
          <ActiveIcon aria-hidden="true" className={cn("size-4", lifted && "text-brand")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-56 rounded-2xl p-1.5" role="menu" aria-label="Ordenar por">
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Ordenar por
        </p>
        {INBOX_SORTS.map((sort) => {
          const Icon = SORT_ICONS[sort]
          const checked = sort === value
          return (
            <button
              key={sort}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              onClick={() => {
                onChange(sort)
                setOpen(false)
              }}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                checked
                  ? "bg-background font-medium text-foreground shadow-float"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className={cn("size-4 shrink-0", checked && "text-brand")} />
              <span className="flex-1">{INBOX_SORT_LABELS[sort]}</span>
              {checked && <Check aria-hidden="true" className="size-4 text-brand" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
