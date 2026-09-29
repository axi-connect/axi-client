"use client";

import * as React from "react";
import { CheckIcon, ChevronDown, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { plural } from "@/core/lib/plural";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command";

/**
 * Selección múltiple del panel (DESIGN-SYSTEM §9, «Selección múltiple»).
 *
 * Es UN control de formulario, no un widget: mide lo que un `Input` (`min-h-9`,
 * el mismo radio y borde), ocupa el ancho de su columna y nunca menos —el
 * `minWidth: 200px` de la versión anterior desbordaba cualquier columna
 * angosta, que es como llegó a la captura del dueño—, y las fichas elegidas
 * son neutras (`secondary` + borde) con la «x» como BOTÓN real, centrada por
 * construcción (`grid place-items-center`) y con zona táctil de 24 px por un
 * `::before` (§10), igual que la de `OptionsInput`.
 *
 * **Anatomía (auditoría 2026-09-28, H1).** El campo es un `div` con el
 * aspecto de `Input` y ancla del popover; dentro conviven como HERMANOS las
 * fichas con su «x», el botón «Quitar N» y el `combobox` (un `button` con el
 * chevron y el nombre accesible). Ningún control vive dentro de otro `button`:
 * un botón anidado rompe la hidratación del HTML del servidor y la ARIA lo
 * prohíbe. Clic en cualquier hueco del campo abre; las «x» detienen el evento.
 *
 * Lo consumen seis pantallas —segmentos, audiencia de campañas, zonas de envío,
 * importar contactos, etiquetas del contacto y simulacros de quality—, así que
 * la API pública se conserva; lo que se retiró (animaciones, tamaños por
 * dispositivo, `singleLine`, `autoSize`, `minWidth`…) no lo usaba ninguna.
 */
interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface MultiSelectGroup {
  heading: string;
  options: MultiSelectOption[];
}

interface MultiSelectProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "defaultValue"> {
  options: MultiSelectOption[] | MultiSelectGroup[];
  onValueChange: (value: string[]) => void;
  defaultValue?: string[];
  placeholder?: string;
  /** Fichas visibles antes de resumir el resto como «+N». */
  maxCount?: number;
  modalPopover?: boolean;
  className?: string;
  hideSelectAll?: boolean;
  searchable?: boolean;
  emptyIndicator?: React.ReactNode;
  popoverClassName?: string;
  disabled?: boolean;
  deduplicateOptions?: boolean;
  /** Vuelve al `defaultValue` cuando este cambia (reset de un formulario). */
  resetOnDefaultValueChange?: boolean;
  closeOnSelect?: boolean;
}

export interface MultiSelectRef {
  reset: () => void;
  getSelectedValues: () => string[];
  setSelectedValues: (values: string[]) => void;
  clear: () => void;
  focus: () => void;
}

function isGrouped(opts: MultiSelectOption[] | MultiSelectGroup[]): opts is MultiSelectGroup[] {
  return opts.length > 0 && "heading" in opts[0];
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((value, index) => value === sorted[index]);
}

/** El aspecto del campo: el de `Input`, con altura mínima y no fija. */
const fieldClass = cn(
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-1 rounded-md border border-input bg-transparent py-1 pr-1 pl-1 text-left text-sm shadow-xs transition-[color,box-shadow] dark:bg-input/30",
  "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
  "has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
);

/** Tesela de marcado en tinta: no coral, para no competir con el CTA del formulario. */
function CheckTile({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
        checked ? "border-foreground bg-foreground text-background" : "border-foreground/35",
      )}
    >
      <CheckIcon className={cn("size-3", !checked && "invisible")} strokeWidth={3} />
    </span>
  );
}

function SelectedChip({
  label,
  onRemove,
  disabled,
}: {
  label: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <span
      className="inline-flex h-6 max-w-full min-w-0 items-center gap-0.5 rounded-full border border-border bg-secondary py-0 pr-[3px] pl-2.5 text-xs font-medium text-secondary-foreground"
      title={label}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label={`Quitar ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="relative grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-3" strokeWidth={2.75} aria-hidden />
      </button>
    </span>
  );
}

export const MultiSelect = React.forwardRef<MultiSelectRef, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      defaultValue = [],
      placeholder = "Seleccionar opciones",
      maxCount = 3,
      modalPopover = false,
      className,
      hideSelectAll = false,
      searchable = true,
      emptyIndicator,
      popoverClassName,
      disabled = false,
      deduplicateOptions = false,
      resetOnDefaultValueChange = true,
      closeOnSelect = false,
      ...props
    },
    ref,
  ) => {
    const [selected, setSelected] = React.useState<string[]>(defaultValue);
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [announcement, setAnnouncement] = React.useState("");
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    // C1: con el popover abierto, el pointerdown sobre el campo (fuera del
    // contenido) ya lo cierra por Radix; el click que sigue NO debe reabrirlo.
    // Se recuerda cómo estaba en el pointerdown y el click solo abre si estaba cerrado.
    const openAtPointerDown = React.useRef(false);
    const prevDefault = React.useRef<string[]>(defaultValue);
    const id = React.useId();
    const listboxId = `${id}-listbox`;
    const selectionId = `${id}-selection`;

    const allOptions = React.useMemo((): MultiSelectOption[] => {
      const flat = isGrouped(options) ? options.flatMap((group) => group.options) : options;
      if (!deduplicateOptions) return flat;
      const seen = new Set<string>();
      return flat.filter((option) => {
        if (seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
    }, [options, deduplicateOptions]);

    const byValue = React.useMemo(
      () => new Map(allOptions.map((option) => [option.value, option] as const)),
      [allOptions],
    );
    const enabledValues = React.useMemo(
      () => allOptions.filter((option) => !option.disabled).map((option) => option.value),
      [allOptions],
    );

    const commit = React.useCallback(
      (next: string[]) => {
        setSelected(next);
        onValueChange(next);
      },
      [onValueChange],
    );

    React.useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          commit(defaultValue);
          setOpen(false);
          setSearch("");
        },
        getSelectedValues: () => selected,
        setSelectedValues: commit,
        clear: () => commit([]),
        focus: () => buttonRef.current?.focus(),
      }),
      [commit, defaultValue, selected],
    );

    React.useEffect(() => {
      if (!resetOnDefaultValueChange) return;
      if (sameSet(prevDefault.current, defaultValue)) return;
      prevDefault.current = [...defaultValue];
      setSelected((current) => (sameSet(current, defaultValue) ? current : defaultValue));
    }, [defaultValue, resetOnDefaultValueChange]);

    React.useEffect(() => {
      if (!open) setSearch("");
    }, [open]);

    const filtered = React.useMemo(() => {
      if (!searchable || search === "") return options;
      const needle = search.toLowerCase();
      const matches = (option: MultiSelectOption) =>
        option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle);
      if (isGrouped(options)) {
        return options
          .map((group) => ({ ...group, options: group.options.filter(matches) }))
          .filter((group) => group.options.length > 0);
      }
      return options.filter(matches);
    }, [options, search, searchable]);

    const toggle = (value: string) => {
      if (disabled || byValue.get(value)?.disabled) return;
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      const label = byValue.get(value)?.label ?? value;
      setAnnouncement(
        selected.includes(value)
          ? `${label} quitado. ${plural(next.length, "opción seleccionada", "opciones seleccionadas")}.`
          : `${label} seleccionado. ${plural(next.length, "opción seleccionada", "opciones seleccionadas")}.`,
      );
      commit(next);
      if (closeOnSelect) setOpen(false);
    };

    const clear = () => {
      if (disabled) return;
      setAnnouncement("Selección vaciada.");
      commit([]);
    };

    const toggleAll = () => {
      if (disabled) return;
      const allChosen = enabledValues.every((value) => selected.includes(value));
      commit(allChosen ? [] : enabledValues);
      if (closeOnSelect) setOpen(false);
    };

    const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && event.currentTarget.value === "" && selected.length > 0) {
        commit(selected.slice(0, -1));
      }
    };

    const visible = selected.slice(0, maxCount).map((value) => byValue.get(value)).filter(Boolean) as MultiSelectOption[];
    const hidden = selected.slice(maxCount).map((value) => byValue.get(value)?.label ?? value);
    const allChosen = enabledValues.length > 0 && enabledValues.every((value) => selected.includes(value));
    // El nombre accesible lo pone el consumidor (aria-label / aria-labelledby /
    // una <label htmlFor>); el placeholder es el último recurso, no el primero.
    const labelled = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;

    const renderItem = (option: MultiSelectOption) => {
      const checked = selected.includes(option.value);
      return (
        <CommandItem
          key={option.value}
          value={option.value}
          onSelect={() => toggle(option.value)}
          aria-checked={checked}
          data-checked={checked ? "true" : undefined}
          disabled={option.disabled}
          className="cursor-pointer gap-2.5 rounded-lg"
        >
          <CheckTile checked={checked} />
          {option.icon && <option.icon className="size-4 text-muted-foreground" aria-hidden />}
          <span className="truncate">{option.label}</span>
        </CommandItem>
      );
    };

    return (
      <Popover open={open} modal={modalPopover} onOpenChange={setOpen}>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
        <PopoverAnchor asChild>
          {/* Zona de clic del campo entero (el combobox real es el botón del
              chevron): un div con onClick y sin rol, para que no haya control
              dentro de control. El teclado entra por el botón. */}
          <div
            className={cn(fieldClass, className)}
            data-slot="multi-select"
            data-state={open ? "open" : "closed"}
            onPointerDown={() => {
              openAtPointerDown.current = open;
            }}
            onClick={() => {
              if (disabled || openAtPointerDown.current) return;
              setOpen(true);
            }}
          >
            {selected.length === 0 ? (
              <span className="min-w-0 flex-1 truncate px-2 text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                <span id={selectionId} className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {visible.map((option) => (
                    <SelectedChip
                      key={option.value}
                      label={option.label}
                      disabled={disabled}
                      onRemove={() => toggle(option.value)}
                    />
                  ))}
                  {hidden.length > 0 && (
                    <span
                      title={hidden.join(", ")}
                      className="inline-flex h-6 items-center rounded-full border border-dashed border-border px-2 text-xs font-medium text-muted-foreground"
                    >
                      +{hidden.length}
                    </span>
                  )}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Quitar ${plural(selected.length, "seleccionado", "seleccionados")}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      clear();
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
                <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
              </>
            )}
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={labelled ? undefined : placeholder}
                {...props}
                ref={buttonRef}
                role="combobox"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-describedby={selected.length > 0 ? selectionId : undefined}
                onClick={(event) => {
                  // Radix conmuta desde el Trigger; el div de fuera no debe volver a hacerlo.
                  event.stopPropagation();
                  props.onClick?.(event);
                }}
                className="grid h-7 w-8 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none"
              >
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 transition-transform", open && "rotate-180")}
                />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent
          id={listboxId}
          aria-label={props["aria-label"] ?? placeholder}
          align="start"
          className={cn("w-[var(--radix-popover-trigger-width)] min-w-56 rounded-2xl p-0", popoverClassName)}
          onEscapeKeyDown={() => setOpen(false)}
        >
          <Command shouldFilter={false}>
            {searchable && (
              <CommandInput
                placeholder="Buscar…"
                value={search}
                onValueChange={setSearch}
                onKeyDown={onSearchKeyDown}
                aria-label="Buscar entre las opciones"
              />
            )}
            <CommandList className="max-h-[40vh] overscroll-contain p-1" aria-multiselectable="true">
              <CommandEmpty>{emptyIndicator ?? "No se encontraron resultados."}</CommandEmpty>
              {!hideSelectAll && search === "" && enabledValues.length > 0 && (
                <>
                  <CommandGroup>
                    <CommandItem
                      value="__all__"
                      onSelect={toggleAll}
                      aria-checked={allChosen}
                      className="cursor-pointer gap-2.5 rounded-lg text-muted-foreground"
                    >
                      <CheckTile checked={allChosen} />
                      Seleccionar todas
                      {enabledValues.length > 20 ? ` · ${String(enabledValues.length)}` : ""}
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {isGrouped(filtered) ? (
                filtered.map((group) => (
                  <CommandGroup key={group.heading} heading={group.heading}>
                    {group.options.map(renderItem)}
                  </CommandGroup>
                ))
              ) : (
                <CommandGroup>{filtered.map(renderItem)}</CommandGroup>
              )}
            </CommandList>
            <div className="grid grid-cols-2 border-t border-border">
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={clear}
                className="h-9 border-r border-border text-sm font-medium transition-colors hover:bg-accent disabled:text-muted-foreground disabled:hover:bg-transparent"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 text-sm font-medium transition-colors hover:bg-accent"
              >
                Listo
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
export type { MultiSelectOption, MultiSelectGroup, MultiSelectProps };
