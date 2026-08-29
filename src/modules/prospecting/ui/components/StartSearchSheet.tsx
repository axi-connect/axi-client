"use client";

import { useCallback, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  LocationSearch,
  MapPreview,
  type LocationSuggestion,
} from "@/shared/components/features/location";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import {
  SEARCH_RADII,
  type DiscoveryCategoryDTO,
  type SearchSource,
  type SourceCatalogItemDTO,
} from "../../domain/search";
import {
  geocode,
  startSearch,
  type StartSearchInput,
} from "../../infrastructure/services/prospecting-service.adapter";

/** Topes que ofrece la interfaz. El backend acepta hasta 500. */
const LIMITS = [25, 50, 100, 200, 500];

/**
 * Lanzar una búsqueda.
 *
 * **El tope es un campo obligatorio, no un ajuste avanzado.** No existe
 * «búscame todos»: es la única forma honesta de que el dueño sepa el techo del
 * gasto antes de aceptarlo. Por eso el botón dice cuántas unidades puede costar
 * como máximo, y por eso una fuente gratis lo dice en el mismo sitio.
 *
 * La ubicación se elige de una lista y se ve en un mapa REAL con el círculo del
 * radio encima. Antes era un campo de texto: la fuente necesita coordenadas, así
 * que escribir «Bogotá» producía una búsqueda que terminaba con cero resultados
 * sin decir por qué. Y la categoría sale del catálogo del backend, el mismo que
 * traduce el adapter — escribir «restaurantes» en plural caía fuera del
 * diccionario y devolvía casi nada, también en silencio.
 */
export function StartSearchSheet({
  open,
  sources,
  categories,
  initial,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  sources: SourceCatalogItemDTO[];
  categories: DiscoveryCategoryDTO[];
  initial?: Partial<StartSearchInput>;
  onOpenChange: (open: boolean) => void;
  onStarted: () => void;
}) {
  const { showAlert } = useAlert();
  const usable = sources.filter((source) => source.available);

  const [source, setSource] = useState<SearchSource>(
    initial?.source ?? usable[0]?.source ?? "openstreetmap",
  );
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.id ?? "");
  const [place, setPlace] = useState<LocationSuggestion | null>(null);
  const [radius, setRadius] = useState<number>(initial?.radius_m ?? 3_000);
  const [limit, setLimit] = useState<number>(initial?.limit ?? 50);
  const [saving, setSaving] = useState(false);

  const chosen = usable.find((option) => option.source === source);
  const free = chosen?.free === true;

  const search = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    const { items } = await geocode(query);
    return items;
  }, []);

  async function submit() {
    if (place === null) {
      showAlert({
        tone: "error",
        title: "Falta la ubicación",
        description: "Elige un lugar de la lista: la fuente busca alrededor de un punto.",
      });
      return;
    }

    setSaving(true);
    try {
      await startSearch({
        source,
        category,
        city: place.name,
        center: { lat: place.lat, lng: place.lng },
        radius_m: radius,
        limit,
      });
      showAlert({
        tone: "success",
        title: "Búsqueda lanzada",
        description: "Verás los resultados llegar aquí mismo.",
      });
      onOpenChange(false);
      onStarted();
    } catch (caught) {
      showAlert({ tone: "error", title: errorMessage(caught) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Buscar negocios</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div>
            <label className="text-sm font-semibold" htmlFor="search-source">
              Dónde buscar
            </label>
            <Select value={source} onValueChange={(value) => setSource(value as SearchSource)}>
              <SelectTrigger id="search-source" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usable.map((option) => (
                  <SelectItem key={option.source} value={option.source}>
                    {option.label}
                    {option.free && " · gratis"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="search-category">
              Qué negocios
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="search-category" className="mt-1 w-full">
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LocationSearch
            label="Dónde"
            value={place}
            onSearch={search}
            onSelect={setPlace}
          />

          {place !== null && (
            <>
              <div>
                <label className="text-sm font-semibold" htmlFor="search-radius">
                  Cuánto a la redonda
                </label>
                <Select
                  value={String(radius)}
                  onValueChange={(value) => setRadius(Number(value))}
                >
                  <SelectTrigger id="search-radius" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_RADII.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* El mapa va DEBAJO del radio: es donde se comprueba si alcanza,
                  que es la decisión que se está tomando. */}
              <MapPreview
                lat={place.lat}
                lng={place.lng}
                label={place.name}
                radiusM={radius}
              />
            </>
          )}

          <div>
            <label className="text-sm font-semibold" htmlFor="search-limit">
              Cuántos como máximo
            </label>
            <p className="text-muted-foreground text-xs">
              La búsqueda se detiene aquí. Es tu techo de gasto.
            </p>
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
              <SelectTrigger id="search-limit" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMITS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option.toLocaleString("es-CO")} negocios
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {chosen !== undefined && !chosen.allowed_channels.includes("whatsapp") && (
            // Se dice ANTES de gastar, no después de descubrir doscientos.
            <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-sm">
              Estos negocios no pidieron que los contactaras, así que solo podrás
              escribirles por correo o a mano. WhatsApp queda fuera.
            </p>
          )}

          <Button className="w-full" disabled={saving} onClick={() => void submit()}>
            {saving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Search aria-hidden="true" />
            )}
            {free
              ? "Buscar · gratis"
              : `Buscar · hasta ${limit.toLocaleString("es-CO")} unidades`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
