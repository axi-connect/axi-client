"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoaderCircle, MapPin, Search } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";

/** Un sitio que se puede elegir. Genérico: no sabe de dónde salió. */
export interface LocationSuggestion {
  id: string;
  /** Lo que se lee primero. */
  name: string;
  /** Lo que desambigua dos sitios homónimos. */
  detail: string;
  lat: number;
  lng: number;
  kind?: string;
}

/** Por debajo de tres letras la lista es ruido y la petición un gasto. */
const MIN_QUERY = 3;
const DEBOUNCE_MS = 300;

/**
 * Buscar un lugar y elegirlo de una lista.
 *
 * **No sabe quién resuelve la búsqueda**: recibe `onSearch` y ya. Hoy detrás
 * hay OpenStreetMap; el día que entre Google Places o Mapbox se cambia la
 * función y este componente no se entera. Por eso vive en `shared` y no dentro
 * de captación.
 *
 * El debounce no es cosmético: cada tecla sin él es una petición a un servicio
 * que limita a una por segundo.
 */
export function LocationSearch({
  value,
  placeholder = "Chapinero, Bogotá",
  label,
  onSearch,
  onSelect,
  className,
}: {
  /** El sitio ya elegido, para que el campo lo muestre al reabrir. */
  value?: LocationSuggestion | null;
  placeholder?: string;
  label?: string;
  onSearch: (query: string) => Promise<LocationSuggestion[]>;
  onSelect: (place: LocationSuggestion) => void;
  className?: string;
}) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const reduced = useReducedMotion();

  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<LocationSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Cada búsqueda lleva su turno: una respuesta lenta de hace tres teclas no
  // puede pisar a la que el usuario está esperando.
  const turn = useRef(0);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults(null);
      return;
    }

    const mine = ++turn.current;
    setLoading(true);
    const timer = setTimeout(() => {
      onSearch(trimmed)
        .then((places) => {
          if (turn.current !== mine) return;
          setResults(places);
          setActive(0);
        })
        .catch(() => {
          if (turn.current === mine) setResults([]);
        })
        .finally(() => {
          if (turn.current === mine) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open, onSearch]);

  function choose(place: LocationSuggestion) {
    setQuery(place.name);
    setOpen(false);
    setResults(null);
    onSelect(place);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (results === null || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      {label !== undefined && (
        <label className="text-sm font-semibold" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative mt-1">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open && results !== null}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="pr-9"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // El retardo deja que el clic en un resultado llegue antes de cerrar.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={loading ? "loading" : "idle"}
              className="block"
              initial={reduced === true ? false : { y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced === true ? undefined : { y: 12, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {loading ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Search aria-hidden="true" className="size-4" />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <AnimatePresence>
        {open && results !== null && (
          <motion.ul
            id={listId}
            role="listbox"
            className="border-border bg-popover absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md"
            initial={reduced === true ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced === true ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {results.length === 0 ? (
              <li className="text-muted-foreground px-3 py-2.5 text-sm">
                No encontramos ese lugar. Prueba con el barrio y la ciudad.
              </li>
            ) : (
              results.map((place, index) => (
                <li key={place.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                      index === active ? "bg-accent" : "hover:bg-accent/60",
                    )}
                    // `mousedown` y no `click`: el blur del input cerraría la
                    // lista antes de que el clic llegue a soltarse.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(place);
                    }}
                    onMouseEnter={() => setActive(index)}
                  >
                    <MapPin aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{place.name}</span>
                      {place.detail.length > 0 && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {place.detail}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
