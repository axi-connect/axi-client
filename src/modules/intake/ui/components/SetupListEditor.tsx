"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import { cn } from "@/core/lib/utils";

/** Tope duro: el backend corta en 20 y no tiene sentido enseñar más. */
const MAX_ITEMS = 20;
const MAX_LENGTH = 120;

/**
 * El editor de una lista propuesta: el embudo, las etiquetas, las categorías.
 *
 * **Por qué no es una caja de texto separada por comas.** Una propuesta llega
 * con cuatro o cinco elementos ya escritos, y lo que la persona va a hacer con
 * ella es quitar uno y renombrar otro. En una caja de texto eso obliga a releer
 * la propuesta entera y a reescribirla sin equivocarse con las comas: el coste
 * de corregir acaba siendo el mismo que el de dictarla de cero, y entonces
 * proponer no sirvió de nada.
 *
 * Aquí cada elemento es una ficha con su nombre, su sitio y su «quitar». El
 * orden importa de verdad en un embudo —es el recorrido de una venta— y por eso
 * se mueve con dos botones y no arrastrando: arrastrar en un móvil, dentro de
 * una columna que ya hace scroll, es un gesto que compite con el del scroll.
 *
 * Nada se guarda mientras se edita. Se guarda al pulsar «Listo», que es también
 * lo que convierte una propuesta sin confirmar en una respuesta de la persona.
 */
export function SetupListEditor({
  label,
  items,
  saving,
  note,
  onCancel,
  onDone,
}: {
  label: string;
  items: string[];
  saving: boolean;
  /** La regla del agregado, en una línea: qué se añade y qué no se toca. */
  note: string;
  onCancel: () => void;
  /** `null` = la lista quedó igual que la propuesta; solo hay que confirmarla. */
  onDone: (items: string[] | null) => void;
}) {
  const [draft, setDraft] = useState<string[]>(items);

  const changed =
    draft.length !== items.length ||
    draft.some((item, index) => item !== items[index]);
  const usable = draft.map((item) => item.trim()).filter((item) => item !== "");

  function move(index: number, delta: number): void {
    const next = [...draft];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + delta, 0, item);
    setDraft(next);
  }

  return (
    <li className="bg-foreground/[0.04] px-4 py-3">
      <p className="mb-2 text-[12px] text-muted-foreground">{label}</p>

      <ul className="flex flex-col gap-1.5">
        {draft.map((item, index) => (
          // El índice como clave es correcto AQUÍ y solo aquí: la lista se
          // reordena por posición y dos elementos pueden llamarse igual
          // mientras se teclea, así que el texto no sirve de identidad.
          <li
            key={index}
            className="flex items-center gap-2 rounded-xl border border-foreground/[0.09] bg-background py-[7px] pr-2 pl-2.5"
          >
            <span className="w-3.5 flex-none text-[11px] text-muted-foreground/60 tabular-nums">
              {index + 1}
            </span>
            <input
              value={item}
              maxLength={MAX_LENGTH}
              onChange={(event) => {
                const next = [...draft];
                next[index] = event.target.value;
                setDraft(next);
              }}
              aria-label={`${label}, ${String(index + 1)}`}
              className="min-w-0 flex-1 bg-transparent text-[14.5px] text-foreground outline-none"
            />
            <IconButton
              label="Subir"
              disabled={index === 0 || saving}
              onClick={() => {
                move(index, -1);
              }}
            >
              <ChevronUp className="size-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Bajar"
              disabled={index === draft.length - 1 || saving}
              onClick={() => {
                move(index, 1);
              }}
            >
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Quitar"
              disabled={saving}
              danger
              onClick={() => {
                setDraft(draft.filter((_, position) => position !== index));
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>

      {draft.length >= MAX_ITEMS ? null : (
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setDraft([...draft, ""]);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-foreground/[0.14] py-2 text-[13.5px] text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Añadir
        </button>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <p className="flex-1 text-[11.5px] leading-[1.35] text-muted-foreground/70">
          {note}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="flex-none rounded-full px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.08] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving || usable.length === 0}
          onClick={() => {
            onDone(changed ? usable : null);
          }}
          className="flex-none rounded-full bg-brand/10 px-[13px] py-1.5 text-[12.5px] font-semibold text-brand transition-[background-color,transform] hover:bg-brand/16 active:scale-[.95] disabled:opacity-50"
        >
          Listo
        </button>
      </div>
    </li>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-[26px] flex-none items-center justify-center rounded-full text-muted-foreground transition-colors",
        "hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent",
        danger === true && "hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
