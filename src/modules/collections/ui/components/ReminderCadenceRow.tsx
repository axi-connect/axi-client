"use client";

import { X } from "lucide-react";

/**
 * Los desfases de una cadencia, como fichas que se quitan y se añaden.
 *
 * «El día que vence» NO tiene interruptor propio: es el desfase 0 de esta misma
 * lista, igual que en el servidor. Darle un control aparte inventaba un
 * concepto que el modelo no tiene, y dejaba al dueño con dos sitios donde
 * apagar el mismo aviso.
 */
export function ReminderCadenceRow({
  label,
  days,
  onChange,
  max,
  first,
}: {
  label: string;
  days: number[];
  onChange: (next: number[]) => void;
  /** Tope de desfases, el mismo que valida el servidor. */
  max: number;
  first?: boolean;
}) {
  // El nombre accesible lleva la DIRECCIÓN dentro. Las dos filas comparten
  // desfases —«3 días» está antes y después de vencer—, así que sin ella un
  // lector de pantalla anuncia dos botones idénticos que hacen cosas
  // distintas, y no hay forma de saber cuál se está pulsando.
  const where = label.toLowerCase();
  const options = OFFSET_OPTIONS.filter((day) => !days.includes(day));
  return (
    <div
      className={`relative grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${
        first === true
          ? ""
          : "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-border/60"
      }`}
    >
      <span className="text-sm">{label}</span>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {days.map((day) => (
          <span
            key={day}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-[12.5px] font-medium tabular-nums"
          >
            {offsetLabel(day)}
            <button
              type="button"
              aria-label={`Quitar el aviso de ${offsetLabel(day)} ${where}`}
              onClick={() => onChange(days.filter((one) => one !== day))}
              className="opacity-45 transition-opacity hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        {days.length >= max || options.length === 0 ? null : (
          <select
            aria-label={`Añadir un aviso ${where}`}
            value=""
            onChange={(event) => {
              const day = Number(event.target.value);
              if (Number.isNaN(day)) return;
              onChange([...days, day]);
            }}
            className="h-7 rounded-full border border-dashed border-border bg-transparent px-2 text-[12.5px] text-muted-foreground"
          >
            <option value="">+</option>
            {options.map((day) => (
              <option key={day} value={day}>
                {offsetLabel(day)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

const OFFSET_OPTIONS = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];

/** El 0 es «el día», no «0 días»: nadie cuenta cero días. */
export function offsetLabel(day: number): string {
  if (day === 0) return "el día";
  return day === 1 ? "1 día" : `${String(day)} días`;
}
