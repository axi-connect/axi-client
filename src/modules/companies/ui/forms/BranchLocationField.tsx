"use client"

import { MapPin } from "lucide-react"
import { useWatch, type Control } from "react-hook-form"
import { LocationSearch, MapPreview, type LocationSuggestion } from "@/shared/components/features/location"
import type { BranchFormValues } from "@/modules/companies/ui/forms/config/branch.config"

/**
 * Buscador + mapa de una sucursal. Lee dirección, ciudad y coordenadas con
 * `useWatch` (API pública de RHF) y, al elegir un sitio, rellena las cuatro.
 * Sin coordenadas la IA comparte solo la dirección escrita: se dice.
 */
export function BranchLocationField({
  control,
  setValue,
  error,
  onSearch,
}: {
  control: Control<BranchFormValues>
  setValue: <K extends keyof BranchFormValues>(name: K, value: BranchFormValues[K]) => void
  error?: string
  onSearch: (query: string) => Promise<LocationSuggestion[]>
}) {
  const [name, address, city, latitude, longitude] = useWatch({
    control,
    name: ["name", "address", "city", "latitude", "longitude"],
  })
  const selected: LocationSuggestion | null =
    latitude !== null && longitude !== null
      ? { id: "current", name: address, detail: city ?? "", locality: city ?? null, lat: latitude, lng: longitude }
      : null

  return (
    <div className="space-y-3">
      <LocationSearch
        label="Buscar dirección"
        placeholder="Calle 120 # 6A-05, Bogotá"
        value={selected}
        onSearch={onSearch}
        onSelect={(place) => {
          setValue("address", place.name)
          if (place.locality) setValue("city", place.locality)
          setValue("latitude", place.lat)
          setValue("longitude", place.lng)
        }}
      />
      <p className="text-xs text-muted-foreground">Escribe al menos 3 letras. Fuente: OpenStreetMap.</p>
      {selected ? (
        <MapPreview lat={selected.lat} lng={selected.lng} label={name || address} />
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          Sin ubicación en el mapa: la IA compartirá solo la dirección escrita.
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
