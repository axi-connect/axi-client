"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { QUARTER_HOURS } from "@/modules/scheduling/domain/schedule-exceptions";

/**
 * Hora de pared en 24 h (S-05). Reemplaza el `<input type="time">` nativo,
 * que cada navegador pinta distinto (AM/PM, su propio reloj): un botón con el
 * aspecto del Input del DS y un menú de 15 en 15 minutos con el scroll de
 * marca, centrado en la hora elegida.
 */
export function TimeField({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Nombre accesible («Abre», «Cierra»). */
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`${label}: ${value}`}
          className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-left">{value}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-32 p-1">
        <div role="listbox" aria-label={label} className="axi-scroll max-h-52 overflow-y-auto">
          {QUARTER_HOURS.map((time) => {
            const selected = time === value;
            return (
              <button
                key={time}
                ref={selected ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(time);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full rounded-sm px-2.5 py-1.5 text-left text-sm tabular-nums hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                  selected && "bg-accent font-medium",
                )}
              >
                {time}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
