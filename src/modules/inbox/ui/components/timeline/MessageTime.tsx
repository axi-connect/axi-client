import { cn } from "@/core/lib/utils"
import { formatClockTime, formatFullDateTime } from "@/core/lib/day-label"

/**
 * Hora de una burbuja: `14:32` en 24 h y tabular, con la fecha completa en el
 * `title` (nativo, no Radix: hay cientos de burbujas y un portal por hora es
 * el punto caliente de render). El día lo da el separador del grupo.
 */
export function MessageTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={formatFullDateTime(iso)} className={cn("tabular-nums", className)}>
      {formatClockTime(iso)}
    </time>
  )
}
