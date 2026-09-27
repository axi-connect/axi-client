import { ExternalLink, MapPin } from "lucide-react"
import type { LocationPayload } from "@/modules/inbox/domain/inbox"

/**
 * Ubicación compartida (F3): una ficha con el pin, el nombre, la dirección y
 * «Abrir en Google Maps». No hay proveedor de mapas estáticos contratado, así
 * que no se pinta un mapa: la cuadrícula es un fondo neutro, no un plano.
 * Colores con `currentColor`: igual en la entrante y en la saliente (tinta).
 */
export function LocationBubble({
  location,
}: {
  location: LocationPayload
  /** Se acepta por compatibilidad con el despachador; el color sale de `currentColor`. */
  outbound?: boolean
}) {
  const mapsUrl = `https://www.google.com/maps?q=${String(location.latitude)},${String(location.longitude)}`
  const coordinates = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
  const title = location.name ?? coordinates

  return (
    <div className="w-[17rem] max-w-full overflow-hidden rounded-[14px] bg-current/[0.06]">
      <div
        aria-hidden
        className="grid h-24 place-items-center bg-[length:22px_22px] [background-image:linear-gradient(to_right,color-mix(in_srgb,currentColor_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,currentColor_8%,transparent)_1px,transparent_1px)]"
      >
        <span className="grid size-10 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgb(209_63_66/0.7)]">
          <MapPin className="size-5" />
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-3 pt-2 pb-2.5">
        <p className="text-[13px] font-semibold">{title}</p>
        {location.address && <p className="text-xs opacity-75">{location.address}</p>}
        {location.name && !location.address && <p className="text-xs tabular-nums opacity-75">{coordinates}</p>}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex min-h-6 w-fit items-center gap-1 text-xs font-medium underline underline-offset-2"
        >
          Abrir en Google Maps <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  )
}
