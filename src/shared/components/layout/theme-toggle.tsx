"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

/**
 * `label` es el nombre accesible (y el `title` del segmentado). `short` es el
 * texto visible del popover compacto: en una lista ya encabezada por «Tema de
 * la interfaz», repetir «Tema» en cada fila solo hace que se trunque.
 */
const OPTIONS = [
  { value: "light", label: "Tema claro", short: "Claro", icon: Sun },
  { value: "system", label: "Tema del sistema", short: "Sistema", icon: Monitor },
  { value: "dark", label: "Tema oscuro", short: "Oscuro", icon: Moon },
] as const

type ThemeToggleProps = {
  className?: string
  /**
   * `segmented` (por defecto) es el control de tres posiciones de siempre.
   * `compact` es un solo botón de icono que abre las mismas tres opciones en un
   * popover: existe para el sidebar en modo icono, donde el segmentado (~84px)
   * no cabe en un rail de 48px. Antes se ocultaba ahí, y el cambio de tema
   * quedaba inaccesible hasta volver a expandir el menú.
   */
  variant?: "segmented" | "compact"
}

/**
 * Control de tema (light / system / dark).
 * El estado activo solo se pinta tras el montaje para no desincronizar la
 * hidratación (next-themes no conoce el tema en el servidor).
 */
export function ThemeToggle({ className, variant = "segmented" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (variant === "compact") {
    return <ThemeToggleCompact className={className} mounted={mounted} theme={theme} setTheme={setTheme} />
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={cn(
        "flex w-fit items-center gap-0.5 rounded-full border border-border-soft bg-muted/60 p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-6.5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all duration-150",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Variante para espacios estrechos. Se usa `Popover` (Radix, con `Portal`) y no
 * el `DropdownMenu` del repo por dos razones: el propio solo admite `side`
 * `top`/`bottom`, y el portal es lo que deja al panel escapar de un rail de
 * 48px. Es además el mismo primitivo con el que el sidebar colapsado saca los
 * subniveles a un flyout.
 */
function ThemeToggleCompact({
  className,
  mounted,
  theme,
  setTheme,
}: {
  className?: string
  mounted: boolean
  theme: string | undefined
  setTheme: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  // Antes del montaje no se conoce el tema: se muestra el icono del sistema en
  // vez de adivinar uno y provocar un salto visual al hidratar.
  const current = (mounted && OPTIONS.find((option) => option.value === theme)) || OPTIONS[1]
  const CurrentIcon = current.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Tema de la interfaz: ${current.label}`}
          className={cn(
            "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md",
            "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className,
          )}
        >
          <CurrentIcon aria-hidden="true" className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-40 p-1.5">
        <div role="radiogroup" aria-label="Tema de la interfaz" className="flex flex-col gap-0.5">
          {OPTIONS.map(({ value, label, short, icon: Icon }) => {
            const active = mounted && theme === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                // El nombre accesible es el largo; el visible, el corto.
                aria-label={label}
                onClick={() => {
                  setTheme(value)
                  setOpen(false)
                }}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active && "font-medium",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{short}</span>
                {active && <Check aria-hidden="true" className="ml-auto size-3.5 text-brand" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
