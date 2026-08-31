"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoaderCircle, Search, X, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";

/** Una coincidencia que se puede elegir. */
export type TableSearchSuggestion = {
  id: string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  /** Clase LITERAL de un diccionario cerrado. Nunca `bg-${x}`. */
  dotClassName?: string;
  onSelect: () => void;
};

/** Una acción sobre lo encontrado, no sobre un resultado concreto. */
export type TableSearchAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** El atajo, si lo tiene. Se pinta como tecla. */
  hint?: string;
  onSelect: () => void;
};

export type TableSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Coincidencias YA cargadas. Quien llama decide de dónde salen. */
  suggestions?: readonly TableSearchSuggestion[];
  /** El encabezado del grupo. Decir de dónde salen evita prometer de más. */
  suggestionsLabel?: string;
  actions?: readonly TableSearchAction[];
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
};

/**
 * El buscador de una tabla: una pastilla que se expande.
 *
 * **El input NO se desmonta nunca.** Vive en la barra y al enfocarse crece; lo
 * que aparece debajo es un panel. La alternativa —un overlay a pantalla
 * completa— tapa justo la tabla cuyo contenido estás filtrando, y encima
 * competiría con la paleta de comandos global que algún día querremos.
 *
 * **Y la tabla NO se atenúa.** Hubo un velo semitransparente sobre ella y se
 * quitó: atenuar la tabla entera para escribir cuatro letras en un campo que
 * está justo arriba no da foco, tapa filas que se quieren seguir viendo mientras
 * se teclea. Lo que separa el panel de la tabla es su ELEVACIÓN —superficie
 * propia y sombra—, y con eso basta.
 *
 * **Nada de anillo de color al enfocar.** El coral es color de ACCIÓN; un campo
 * enfocado no es una acción, es dónde estás. La separación la dan la sombra y el
 * cambio de superficie.
 *
 * **La sombra va como `drop-shadow` en el contenedor**, no como `box-shadow` en
 * cada parte: abierto, campo y panel son dos cajas pegadas, y dos sombras dejan
 * una costura visible en la unión. `drop-shadow` sigue la silueta de las dos
 * como si fueran una.
 *
 * **Las coincidencias se ELEVAN al pasar por encima** —suben a la superficie de
 * la página y cogen sombra— en vez de teñirse. Es el gesto que se lee como
 * premium: la opción se levanta hacia ti.
 *
 * El idioma de accesibilidad y de carreras es el de `LocationSearch`, que ya lo
 * resolvió en este repo: `combobox` + `listbox`, índice activo por teclado
 * sincronizado con el ratón, `onMouseDown` en vez de `onClick` —el blur del
 * input cerraría la lista antes de que el clic llegue a soltarse— y un retardo
 * al perder el foco.
 */
export function TableSearch({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Buscar",
  suggestions = [],
  suggestionsLabel = "Coincidencias",
  actions = [],
  loading = false,
  emptyLabel = "Sin coincidencias",
  className,
}: TableSearchProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const inputId = useId();
  const listId = `${inputId}-list`;

  const items = useMemo(
    () => [...suggestions, ...actions.map((action) => ({ ...action, kind: "action" as const }))],
    [suggestions, actions],
  );

  useEffect(() => {
    setActive(0);
  }, [value]);

  const choose = (index: number) => {
    const item = items[index];
    if (item === undefined) return;
    item.onSelect();
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, Math.max(0, items.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (items.length > 0) choose(active);
      else onSubmit?.(value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      // NO se reenfoca el campo: la pulsación viene de él, así que ya lo tiene,
      // y llamar a `focus()` disparaba el `onFocus` que vuelve a abrir el panel
      // — Escape no cerraba nada.
      setOpen(false);
    }
  };

  const showPanel = open && (items.length > 0 || value.length > 0);

  return (
    <div
      data-expanded={open}
      className={cn(
        "relative z-30 min-w-[240px] flex-1",
        // Abierto crece, y la transición es de CSS: en la referencia el ancho es
        // lo que se mueve, y un `scaleX` deformaría las letras.
        "max-w-[360px] data-[expanded=true]:max-w-[620px]",
        "[filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.05))_drop-shadow(0_4px_12px_rgb(0_0_0/0.06))]",
        "data-[expanded=true]:[filter:drop-shadow(0_2px_4px_rgb(0_0_0/0.06))_drop-shadow(0_14px_40px_rgb(0_0_0/0.14))]",
        "motion-safe:transition-[max-width,filter] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
    >
      <div
        className={cn(
          "border-border-soft bg-secondary flex h-10 items-center gap-2.5 rounded-full border px-4",
          "motion-safe:transition-[border-radius] motion-safe:duration-300",
          // OJO: `rounded-t-xl` NO es redundante con `rounded-full`.
          //
          // CSS escala un radio de 9999px cuando los dos radios de un lado
          // suman más que ese lado, y el factor es `largo / suma`. Cerrado, el
          // lado izquierdo suma 9999+9999 contra 40px de alto y cada esquina
          // queda en 20px: la pastilla. Al poner `rounded-b-none` la suma baja a
          // 9999, el presupuesto se libera y **la esquina de arriba se DUPLICA**
          // — medido: la curva arranca a 28,5px en vez de a 11,5px.
          //
          // Fijándolo en 20px, que es lo que la pastilla ya medía, las esquinas
          // de arriba NO CAMBIAN al enfocar: solo se abre el fondo hacia abajo.
          showPanel && "rounded-t-xl rounded-b-none border-b-0",
        )}
      >
        {/* El icono se cambia por el spinner en el sitio, sin mover nada. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={loading ? "loading" : "idle"}
            className="text-muted-foreground block shrink-0"
            initial={reduced === true ? false : { y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced === true ? undefined : { y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {loading ? (
              <LoaderCircle aria-hidden="true" className="size-[18px] animate-spin" />
            ) : (
              <Search aria-hidden="true" className="size-[18px] [stroke-width:1.5]" />
            )}
          </motion.span>
        </AnimatePresence>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => setOpen(true)}
          // El retardo deja que el clic en una opción llegue antes de cerrar.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />

        {value.length > 0 && (
          <button
            type="button"
            aria-label="Limpiar la búsqueda"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 grid size-6 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-[3px]"
            onMouseDown={(event) => {
              event.preventDefault();
              onValueChange("");
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" className="size-[15px] [stroke-width:1.6]" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            // `rounded-b-xl` (20px) y no un 22px inventado: las dos mitades de
            // la tarjeta tienen que medir lo MISMO, o las esquinas opuestas
            // quedan descuadradas 2px.
            className="border-border-soft bg-secondary absolute inset-x-0 top-[39px] overflow-hidden rounded-b-xl border border-t-0 p-1"
            initial={reduced === true ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced === true ? undefined : { opacity: 0, y: -8 }}
            transition={spring.snappy}
          >
            {suggestions.length > 0 && (
              <p className="text-muted-foreground px-3 pt-1.5 pb-1.5 text-[10.5px] font-semibold tracking-wider uppercase">
                {suggestionsLabel}
              </p>
            )}
            <ul id={listId} role="listbox" aria-label={suggestionsLabel}>
              {suggestions.length === 0 && actions.length === 0 && (
                <li className="text-muted-foreground px-3 py-2.5 text-sm">{emptyLabel}</li>
              )}
              {suggestions.map((suggestion, index) => (
                <Option
                  key={suggestion.id}
                  active={index === active}
                  onEnter={() => setActive(index)}
                  onChoose={() => choose(index)}
                >
                  {suggestion.dotClassName !== undefined && (
                    <span
                      aria-hidden="true"
                      className={cn("size-[7px] shrink-0 rounded-full", suggestion.dotClassName)}
                    />
                  )}
                  {suggestion.icon !== undefined && (
                    <suggestion.icon aria-hidden="true" className="size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">
                      {suggestion.label}
                    </span>
                    {suggestion.detail !== undefined && (
                      <span className="text-muted-foreground block truncate text-[11.5px]">
                        {suggestion.detail}
                      </span>
                    )}
                  </span>
                </Option>
              ))}
            </ul>

            {actions.length > 0 && (
              <div
                className={cn(
                  "mt-1",
                  suggestions.length > 0 && "border-border-soft border-t pt-1",
                )}
              >
                {actions.map((action, index) => {
                  const at = suggestions.length + index;
                  return (
                    <Option
                      key={action.id}
                      active={at === active}
                      onEnter={() => setActive(at)}
                      onChoose={() => choose(at)}
                    >
                      <action.icon aria-hidden="true" className="text-brand size-4 shrink-0" />
                      <span className="flex-1 text-[13.5px] font-medium">{action.label}</span>
                      {action.hint !== undefined && (
                        <kbd className="border-border text-muted-foreground rounded-md border px-1.5 font-mono text-[10.5px]">
                          {action.hint}
                        </kbd>
                      )}
                    </Option>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Una fila del panel. Se ELEVA al resaltarse; no se tiñe. */
function Option({
  active,
  onEnter,
  onChoose,
  children,
}: {
  active: boolean;
  onEnter: () => void;
  onChoose: () => void;
  children: React.ReactNode;
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left",
          "motion-safe:transition-[background-color,box-shadow] motion-safe:duration-150",
          active && "bg-background shadow-float",
        )}
        // `mousedown` y no `click`: el blur del input cerraría el panel antes de
        // que el clic llegue a soltarse.
        onMouseDown={(event) => {
          event.preventDefault();
          onChoose();
        }}
        onMouseEnter={onEnter}
      >
        {children}
      </button>
    </li>
  );
}
