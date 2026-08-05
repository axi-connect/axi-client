"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { useTrialStatus } from "@/modules/companies/infrastructure/hooks/use-trial-status"

/**
 * Píldora permanente del trial en el `PrivateHeader` («Prueba: N días»).
 * Se inyecta como `actions` desde `(private)/layout.tsx` (shared no importa
 * de modules, §3.3). Su alto (`h-7`) cabe en el del header sin ampliarlo, y
 * de todos modos ninguna vista depende ya de esa medida: el shell reparte la
 * altura por flex (DESIGN-SYSTEM §4.2). Tono warning en los últimos 2 días;
 * el banner `TrialCountdownBanner` escala el aviso en ese tramo.
 */
export function TrialStatusChip() {
  const { active, daysLeft, ending } = useTrialStatus()
  if (!active) return null

  const label =
    daysLeft === 0 ? "Prueba: vence hoy" : daysLeft === 1 ? "Prueba: 1 día" : `Prueba: ${daysLeft} días`

  return (
    <span
      data-testid="trial-status-chip"
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium tabular-nums",
        ending
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border bg-muted/60 text-foreground/80",
      )}
    >
      <Sparkles aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}
