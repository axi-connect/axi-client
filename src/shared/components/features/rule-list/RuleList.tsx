"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export interface RuleListProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Máximo de reglas. Al alcanzarlo, la entrada se deshabilita y lo dice. */
  max: number;
  /** Máximo de caracteres por regla. Al pasarse, la regla se marca (no se corta). */
  maxLength: number;
  /** Título de la lista (también nombre accesible de la entrada). */
  label: string;
  /** Media línea bajo el título: qué va aquí. */
  hint?: string;
  /** Ejemplo que se enseña cuando la lista está vacía. */
  example?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Lista editable de frases cortas: el brief del agente (estudio de agentes),
 * donde antes había un textarea gigante. Cada regla se añade con Enter, se
 * edita en su sitio (click / Enter), se quita, y se reordena arrastrando o con
 * `Alt+↑/↓`. Presentacional puro: los topes y el copy los pone quien la usa.
 *
 * `OptionsInput` no servía: son chips de 120 caracteres sin edición ni orden,
 * y una regla es una frase de hasta 200 en la que el orden sí importa (el
 * modelo lee la lista de arriba abajo).
 *
 * Con `prefers-reduced-motion` no hay animación de arrastre (Tailwind
 * `motion-reduce`); el reorden por teclado es el mismo.
 */
/** Solo se arrastra en vertical (sin `@dnd-kit/modifiers` en el repo: una línea). */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function RuleList({ value, onChange, max, maxLength, label, hint, example, placeholder, disabled = false, className }: RuleListProps) {
  const groupId = useId();
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const keysRef = useRef<string[]>([]);
  // Claves estables por posición: dos reglas con el mismo texto no colisionan
  // y reordenar mueve la clave con la regla.
  if (keysRef.current.length !== value.length) {
    keysRef.current = value.map((_, index) => keysRef.current[index] ?? `${groupId}-${String(index)}-${String(Date.now())}`);
  }
  const items = value.map((text, index) => ({ id: keysRef.current[index] ?? String(index), text }));
  const atCapacity = value.length >= max;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= value.length || from === to) return;
      keysRef.current = arrayMove(keysRef.current, from, to);
      onChange(arrayMove(value, from, to));
    },
    [onChange, value],
  );

  const add = () => {
    const text = draft.trim();
    if (text === "" || atCapacity || disabled) return;
    onChange([...value, text]);
    setDraft("");
    setAnnouncement(`Regla añadida (${String(value.length + 1)} de ${String(max)})`);
  };

  const update = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
  };

  const remove = (index: number) => {
    keysRef.current = keysRef.current.filter((_, i) => i !== index);
    onChange(value.filter((_, i) => i !== index));
    setAnnouncement(`Regla quitada (${String(value.length - 1)} de ${String(max)})`);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    move(from, to);
  };

  return (
    <section className={cn("rounded-2xl border border-border bg-background", disabled && "opacity-60", className)} aria-labelledby={`${groupId}-title`}>
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <h3 id={`${groupId}-title`} className="text-sm font-semibold">
          {label}
        </h3>
        <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
          {value.length}/{max}
        </span>
      </header>
      {hint ? <p className="px-4 pb-2.5 text-[12.5px] text-muted-foreground">{hint}</p> : null}
      {value.length === 0 && example ? (
        <p className="flex items-start gap-2 px-4 pb-3.5 text-[13px] text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-violet" aria-hidden />
          <span>
            Por ejemplo: <em className="not-italic text-foreground">{example}</em>
          </span>
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ol className="m-0 list-none p-0" aria-label={label}>
            {items.map((item, index) => (
              <RuleItem
                key={item.id}
                id={item.id}
                index={index}
                total={items.length}
                text={item.text}
                maxLength={maxLength}
                disabled={disabled}
                onChange={(text) => update(index, text)}
                onRemove={() => remove(index)}
                onMove={(delta) => move(index, index + delta)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 border-t border-border/60 p-2.5">
        <Input
          value={draft}
          disabled={disabled || atCapacity}
          maxLength={maxLength}
          placeholder={atCapacity ? `Máximo ${String(max)} reglas: junta dos o quita una` : (placeholder ?? "Añade una regla y pulsa Enter")}
          aria-label={`Nueva regla de ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" disabled={disabled || atCapacity || draft.trim() === ""} onClick={add}>
          <Plus className="size-3.5" aria-hidden />
          Añadir
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

function RuleItem({
  id,
  index,
  total,
  text,
  maxLength,
  disabled,
  onChange,
  onRemove,
  onMove,
}: {
  id: string;
  index: number;
  total: number;
  text: string;
  maxLength: number;
  disabled: boolean;
  onChange: (text: string) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const over = text.length > maxLength;

  useEffect(() => {
    if (!editing) setDraft(text);
  }, [editing, text]);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "0px";
    el.style.height = `${String(el.scrollHeight)}px`;
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next === "") {
      onRemove();
      return;
    }
    if (next !== text) onChange(next);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 border-t border-border/60 px-2 py-2 pl-2 motion-reduce:transition-none",
        isDragging && "relative z-10 bg-background shadow-[var(--shadow-float)]",
      )}
      onKeyDown={(event) => {
        if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          onMove(event.key === "ArrowUp" ? -1 : 1);
        }
      }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="mt-1 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground disabled:cursor-default"
        aria-label={`Arrastrar la regla ${String(index + 1)}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          aria-label={`Regla ${String(index + 1)}`}
          className={cn(
            "w-full resize-none rounded-lg bg-transparent px-1.5 py-1 text-sm leading-[1.45] outline-2 outline-offset-0",
            over || draft.length > maxLength ? "outline-destructive" : "outline-ring",
          )}
          onChange={(event) => {
            setDraft(event.target.value);
            event.target.style.height = "0px";
            event.target.style.height = `${String(event.target.scrollHeight)}px`;
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={cn(
            "min-w-0 rounded-lg px-1.5 py-1 text-left text-sm leading-[1.45] [overflow-wrap:anywhere] hover:bg-foreground/[0.04]",
            over && "outline-2 outline-destructive",
          )}
          disabled={disabled}
          onClick={() => setEditing(true)}
          aria-label={`Editar la regla ${String(index + 1)}`}
        >
          {text}
        </button>
      )}

      <span className={cn("flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [li:hover_&]:opacity-100", editing && "opacity-100")}>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Subir" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-3.5" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Bajar" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-3.5" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Quitar" disabled={disabled} onClick={onRemove}>
          <X className="size-3.5" aria-hidden />
        </Button>
      </span>

      {editing || over ? (
        <span className={cn("col-start-2 flex justify-between gap-2 px-1.5 text-[11.5px] tabular-nums text-muted-foreground", (over || draft.length > maxLength) && "text-destructive")}>
          <span>{over || draft.length > maxLength ? `Se pasa de ${String(maxLength)} caracteres: acórtala o divídela en dos.` : "Enter guarda · Esc cancela · Alt+↑↓ reordena"}</span>
          <span>
            {(editing ? draft : text).length}/{maxLength}
          </span>
        </span>
      ) : null}
    </li>
  );
}
