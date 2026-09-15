"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/core/lib/utils";

const DEBOUNCE_MS = 300;

/**
 * Campo de búsqueda compacto: el que usan las bandejas.
 *
 * **El rebote vive aquí, no en el store.** El store recibe la búsqueda ya
 * APLICADA y reinicia la paginación una sola vez por pausa de tecleo. Y tiene
 * que poder vaciarse a mano —`Enter`, `Escape` y el botón de limpiar comitean
 * inmediato—, que es justo lo que un `useDebouncedValue` genérico no sabe
 * hacer: un embudo de un solo sentido no tiene `flush()`.
 *
 * **No crece al enfocar.** Ensancharse desplazaría los controles de al lado
 * bajo el cursor, y quitar esos saltos de layout fue el trabajo del rediseño
 * anterior. El foco se marca con el anillo de siempre.
 *
 * No es `TableSearch`: aquel es un combobox con sugerencias y 240 px mínimos,
 * pensado para tablas. Aquí no hay nada que sugerir.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  busy = false,
  shortcut = false,
  className,
}: {
  /** Búsqueda aplicada (la del store). */
  value: string;
  onChange: (q: string) => void;
  placeholder: string;
  /** `aria-label`: el campo nunca lleva etiqueta visible. */
  label: string;
  /** El servidor todavía no ha contestado. */
  busy?: boolean;
  /** `/` enfoca el campo. Solo uno por vista. */
  shortcut?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const [waiting, setWaiting] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Si el store la vacía desde fuera («Limpiar búsqueda» del estado vacío), el
  // campo lo refleja.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      // Escribir «/» dentro de otro campo no puede robar el foco.
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (active instanceof HTMLElement && active.isContentEditable) return;
      event.preventDefault(); // sin esto, la barra recibe el «/»
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const commit = (next: string, immediate = false) => {
    setLocal(next);
    if (timer.current !== null) clearTimeout(timer.current);
    if (immediate) {
      setWaiting(false);
      onChange(next);
      return;
    }
    setWaiting(true);
    timer.current = setTimeout(() => {
      setWaiting(false);
      onChange(next);
    }, DEBOUNCE_MS);
  };

  // El rebote cuenta como espera: entre la tecla y la petición, lo que hay en
  // pantalla tampoco es la respuesta.
  const pending = busy || waiting;

  return (
    <div
      aria-busy={pending}
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border border-input bg-background px-3 text-muted-foreground",
        "transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      {/* Lupa y spinner comparten hueco: el estado no mueve un píxel. */}
      <span aria-hidden className="grid size-4 shrink-0 place-items-center">
        {pending ? (
          <LoaderCircle className="size-4 animate-spin text-brand" />
        ) : (
          <Search className="size-4" />
        )}
      </span>
      <input
        ref={input}
        type="search"
        value={local}
        onChange={(event) => commit(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(local, true);
          if (event.key !== "Escape") return;
          // Con texto, limpia. Ya vacío, sale: si no, el campo te atrapa.
          if (local !== "") commit("", true);
          else input.current?.blur();
        }}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {local !== "" ? (
        <button
          type="button"
          onClick={() => {
            commit("", true);
            // Sin devolver el foco, el siguiente carácter se pierde.
            input.current?.focus();
          }}
          aria-label="Borrar búsqueda"
          className="grid size-6 shrink-0 place-items-center rounded-full outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : (
        shortcut &&
        !focused && (
          <kbd className="hidden h-5 shrink-0 items-center rounded-md border border-border px-1.5 font-mono text-[10.5px] text-muted-foreground sm:inline-flex">
            /
          </kbd>
        )
      )}
    </div>
  );
}
