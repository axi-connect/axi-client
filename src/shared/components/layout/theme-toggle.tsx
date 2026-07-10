"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/core/lib/utils"

const OPTIONS = [
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "system", label: "Tema del sistema", icon: Monitor },
  { value: "dark", label: "Tema oscuro", icon: Moon },
] as const

/**
 * Control segmentado de tema (light / system / dark).
 * El estado activo solo se pinta tras el montaje para no desincronizar la
 * hidratación (next-themes no conoce el tema en el servidor).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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
