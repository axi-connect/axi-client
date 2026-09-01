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
import { Input } from "@/shared/components/ui/input";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import {
  EMPTY_ADMISSION,
  hasAdmission,
  SEARCH_RADII,
  type AdmissionDTO,
  type DiscoveryCategoryDTO,
  type SearchSource,
  type SourceCatalogItemDTO,
} from "../../domain/search";
import { AdvancedSearchOptions } from "./AdvancedSearchOptions";
import {
  geocode,
  startSearch,
  type StartSearchInput,
} from "../../infrastructure/services/prospecting-service.adapter";

/** Topes que ofrece la interfaz. El backend acepta hasta 500. */
const LIMITS = [25, 50, 100, 200, 500];

/**
 * Por qué no se puede elegir esa fuente, en tres palabras.
 *
 * Corto a propósito: va como sufijo de la opción del desplegable, al lado del
 * nombre. La versión larga vive en la vitrina de fuentes, que es donde hay sitio
 * para explicarlo.
 */
const UNAVAILABLE_SHORT: Record<string, string> = {
  no_account: "sin dar de alta",
  disabled: "apagada",
  unhealthy: "con problemas",
  capped_day: "tope de hoy alcanzado",
  capped_month: "tope del mes alcanzado",
};

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
  /*
    LA CONSULTA del buscador web. Existía en el contrato desde F4 y el formulario
    dejó de mandarla al cerrar las categorías contra el diccionario de OSM: sin
    ella, a Serper se le preguntaba «restaurante Bogotá ciudad» —un tema— y
    contestaba con artículos de prensa que se guardaban como negocios.
  */
  const [text, setText] = useState(initial?.text ?? "");
  /*
    «Repetir» llega con el punto ya elegido. Antes no: `center` no viajaba en el
    contrato, así que repetir una búsqueda obligaba a volver a buscar la zona a
    mano —y quien no se diera cuenta la relanzaba sin zona, que en OpenStreetMap
    es el país entero—. El detalle va vacío a propósito: no hay nada que
    desambiguar cuando el punto ya se eligió una vez.
  */
  const [place, setPlace] = useState<LocationSuggestion | null>(
    initial?.center === undefined
      ? null
      : {
          id: "repetida",
          name: initial.zone ?? initial.city ?? "Zona elegida",
          detail: "",
          locality: initial.city ?? null,
          lat: initial.center.lat,
          lng: initial.center.lng,
        },
  );
  const [radius, setRadius] = useState<number>(initial?.radius_m ?? 3_000);
  const [limit, setLimit] = useState<number>(initial?.limit ?? 50);
  const [admission, setAdmission] = useState<AdmissionDTO>(
    initial?.admission ?? EMPTY_ADMISSION,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const chosen = usable.find((option) => option.source === source);
  const free = chosen?.free === true;
  /*
    LA FORMA DEL FORMULARIO LA DICE LA FUENTE, no un `if (source === "serp")`
    escrito aquí. A un mapa se le pide categoría, punto y radio; a un buscador se
    le escribe una frase. Hasta ahora era el formulario del mapa para las tres, y
    el buscador ignoraba los tres campos.
  */
  const shape = chosen?.query_shape ?? "map";
  const isWeb = shape === "web";
  const gated = hasAdmission(admission);
  const categoryLabel =
    categories.find((option) => option.id === category)?.label ?? "negocios";
  /** La etiqueta de una categoría, que es lo que se le escribe al buscador. */
  const labelOfCategory = (id: string): string =>
    categories.find((option) => option.id === id)?.label ?? id;
  /**
   * ¿Hay un verificador de pago encendido?
   *
   * Se deduce de la vitrina: si ninguna fuente disponible cuesta unidades, no
   * hay proveedor de pago en el panel y nada llegará nunca a «verificado». Es
   * una aproximación —el verificador es de otra capacidad— pero acierta en el
   * caso que importa: el tenant que solo tiene las fuentes gratis.
   */
  const verifierAvailable = sources.some((option) => option.available && !option.free);

  const search = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    const { items } = await geocode(query);
    return items;
  }, []);

  /**
   * Lo que viaja según la forma de la fuente.
   *
   * `city` y `zone` son dos campos, y no por gusto: `place.name` es el nombre
   * del punto que devolvió el geocodificador —para «Zona G», un hotel que se
   * llama así—, y ese nombre acabó dentro de la consulta que se le manda a
   * Google y escrito como ciudad de los leads. La zona se muestra; la ciudad se
   * usa para buscar.
   */
  function payloadOf(): Partial<StartSearchInput> {
    if (isWeb) {
      // Ni punto ni radio: el buscador no los usa, y enseñarlos sería prometer
      // una precisión que no existe. De la ubicación solo sirve su nombre.
      return {
        text: text.trim(),
        ...(place === null ? {} : { city: place.locality ?? place.name, zone: place.name }),
      };
    }
    return {
      category,
      ...(text.trim().length === 0 ? {} : { text: text.trim() }),
      ...(place === null
        ? {}
        : {
            city: place.locality ?? place.name,
            zone: place.name,
            center: { lat: place.lat, lng: place.lng },
          }),
      radius_m: radius,
    };
  }

  async function submit() {
    // Cada forma tiene su requisito, y son distintos: un mapa no puede buscar sin
    // un punto, y un buscador no puede buscar sin una pregunta.
    if (isWeb && text.trim().length === 0) {
      showAlert({
        tone: "error",
        title: "Falta qué buscar",
        description: "Escribe lo que le dirías a Google: «distribuidores de dotación industrial».",
      });
      return;
    }
    if (!isWeb && place === null) {
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
        ...payloadOf(),
        limit,
        admission: gated ? admission : undefined,
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
          {/* No es relleno: Radix pide que todo diálogo se describa —avisaba en
              consola por su ausencia— y esta pantalla no decía en ninguna parte
              qué va a pasar al pulsar «Buscar». */}
          <SheetDescription>
            {isWeb
              ? "Lo que el buscador encuentre entra a tu bandeja con su calidad ya medida. Sirve para el negocio que existe en la web y en ningún mapa. Nadie pasa a tu CRM sin que tú lo promuevas."
              : "Los negocios de la zona que elijas entran a tu bandeja con su calidad ya medida. Nadie pasa a tu CRM sin que tú lo promuevas."}
          </SheetDescription>
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
                {/*
                  SE LISTAN TODAS, incluidas las que no están disponibles. Antes
                  el desplegable solo iteraba las usables, así que una fuente sin
                  llave, apagada o con el tope tocado DESAPARECÍA sin dejar
                  rastro: el dueño la veía «habilitada» en el panel de plataforma
                  y no la encontraba aquí. Una opción vetada que dice por qué es
                  información; una opción ausente es un misterio.
                */}
                {sources.map((option) => (
                  <SelectItem
                    key={option.source}
                    value={option.source}
                    disabled={!option.available}
                  >
                    {option.label}
                    {option.available
                      ? option.free && " · gratis"
                      : ` · ${UNAVAILABLE_SHORT[option.unavailable_reason ?? "no_account"]}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWeb ? (
            /*
              EL FORMULARIO DEL BUSCADOR. Una frase, no un punto en el mapa: es
              para lo que sirve un buscador, y es lo que encuentra al mayorista o
              a la agencia que no está en ningún mapa. La categoría se queda como
              ATAJO —rellena el campo— y no como un segundo criterio: combinar
              las dos en la consulta es justo el enredo del que venimos.
            */
            <>
              <div>
                <label className="text-sm font-semibold" htmlFor="search-text">
                  Qué buscas
                </label>
                <p className="text-muted-foreground text-xs">
                  Tus palabras, como se las dirías a Google.
                </p>
                <Input
                  id="search-text"
                  className="mt-1"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="distribuidores de dotación industrial"
                />
              </div>

              <div>
                <label className="text-sm font-semibold" htmlFor="search-category-hint">
                  ¿No sabes qué escribir?
                </label>
                <Select value="" onValueChange={(value) => setText(labelOfCategory(value))}>
                  <SelectTrigger id="search-category-hint" className="mt-1 w-full">
                    <SelectValue placeholder="Elegir una categoría" />
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
                label="Ciudad"
                value={place}
                onSearch={search}
                onSelect={setPlace}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          {!isWeb && place !== null && (
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

          <AdvancedSearchOptions
            value={admission}
            limit={limit}
            categoryLabel={categoryLabel}
            verifierAvailable={verifierAvailable}
            freeSource={free}
            webSource={isWeb}
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            onChange={setAdmission}
          />

          <div>
            {/* La etiqueta cambia con los filtros porque el tope cambia de
                significado: sin ellos cuenta registros —y es un techo de gasto—;
                con ellos cuenta los que cumplen, y el techo se muda a las
                avanzadas. Las dos nunca conviven, así que el panel no engorda. */}
            <label className="text-sm font-semibold" htmlFor="search-limit">
              {gated ? "Cuántos que cumplan" : "Cuántos como máximo"}
            </label>
            <p className="text-muted-foreground text-xs">
              {gated
                ? "La búsqueda sigue hasta reunir esta cantidad."
                : "La búsqueda se detiene aquí. Es tu techo de gasto."}
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
              : gated
                ? // Con filtros el tope cuenta admitidos, así que el gasto lo
                  // manda el techo. Prometer «hasta 25 unidades» sería mentir.
                  `Buscar · hasta ${(admission.max_records ?? limit).toLocaleString("es-CO")} unidades`
                : `Buscar · hasta ${limit.toLocaleString("es-CO")} unidades`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
