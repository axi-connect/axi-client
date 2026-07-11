"use client"

import { cn } from "@/core/lib/utils"
import { ExternalLink, MapPin } from "lucide-react"
import type { LocationPayload } from "@/modules/inbox/domain/inbox"

/** Ubicación compartida: nombre/dirección + link a Google Maps (sin mapa embebido en v1). */
export function LocationBubble({
  location,
  outbound,
}: {
  location: LocationPayload
  outbound: boolean
}) {
  const mapsUrl = `https://www.google.com/maps?q=${String(location.latitude)},${String(location.longitude)}`
  const title =
    location.name ??
    `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`

  return (
    <div className="flex w-60 max-w-full items-start gap-2">
      <MapPin
        className={cn("mt-0.5 size-4 shrink-0", outbound ? "text-white" : "text-brand")}
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-xs">
        <p className={cn("font-medium", outbound ? "text-white" : "text-foreground")}>{title}</p>
        {location.address && (
          <p className={cn("mt-0.5", outbound ? "text-white/80" : "text-muted-foreground")}>
            {location.address}
          </p>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2",
            outbound ? "text-white" : "text-brand",
          )}
        >
          Ver en Google Maps <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  )
}
