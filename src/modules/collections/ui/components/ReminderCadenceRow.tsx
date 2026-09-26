"use client";

import { X } from "lucide-react";

/**
 * Los desfases de una cadencia, como fichas que se quitan y se añaden (filas
 * del bento en Cobros premium P5).
 *
 * «El día que vence» NO tiene interruptor propio: es el desfase 0 de esta misma
 * lista, igual que en el servidor. Darle un control aparte inventaba un
 * concepto que el modelo no tiene, y dejaba al dueño con dos sitios donde
 * apagar el mismo aviso.
 */
export function ReminderCadenceRow({
  label,
  hint,
  days,
  onChange,
  max,
}: {
  label: string;
  hint: string;
  days: number[];
  onChange: (next: number[]) => void;
  /** Tope de desfases, el mismo que valida el servidor. */
  max: number;
}) {
  // El nombre accesible lleva la DIRECCIÓN dentro. Las dos filas comparten
  // desfases —«3 días» está antes y después de vencer—, así que sin ella un
  // lector de pantalla anuncia dos botones idénticos que hacen cosas
  // distintas, y no hay forma de saber cuál se está pulsando.
  const where = label.toLowerCase();
  const options = OFFSET_OPTIONS.filter((day) => !days.includes(day));
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 py-4 first-of-type:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {days.map((day) => (
          <span
            key={day}
            className="inline-flex h-8 items-center gap-0.5 rounded-full bg-foreground pr-1 pl-3 text-[13px] font-medium whitespace-nowrap text-background tabular-nums"
          >
            {offsetLabel(day)}
            <button
              type="button"
              aria-label={`Quitar el aviso de ${offsetLabel(day)} ${where}`}
              onClick={() => onChange(days.filter((one) => one !== day))}
              className="grid size-6 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
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
            className="h-8 min-w-12 rounded-full border border-dashed border-border bg-transparent px-3 text-[13px] text-muted-foreground"
          >
            <option value="">+ día</option>
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
