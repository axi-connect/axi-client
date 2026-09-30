"use client";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";

export type ServiceOption = { id: string; name: string; duration_minutes: number | null };

/**
 * El servicio como lista de opciones visible (lienzo F2, D4), con «Sin
 * servicio» al final: entonces la duración se escribe a mano. El elegido va con
 * aro de tinta, no con relleno de color.
 */
export function ServiceOptions({
  services,
  value,
  durationMinutes,
  onChange,
  onDurationChange,
}: {
  services: ServiceOption[];
  /** "" = sin servicio. */
  value: string;
  durationMinutes: number;
  onChange: (productId: string, durationMinutes: number | null) => void;
  onDurationChange: (minutes: number) => void;
}) {
  const options = [
    ...services.map((s) => ({ id: s.id, name: s.name, hint: s.duration_minutes != null ? `${s.duration_minutes} min` : "", duration: s.duration_minutes })),
    { id: "", name: "Sin servicio", hint: "Duración a mano", duration: null },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Servicio" className="sidebar-scroll flex max-h-64 flex-col gap-2 overflow-y-auto p-0.5">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id || "none"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id, option.duration)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left text-sm transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected ? "border-transparent ring-[1.5px] ring-foreground" : "border-border hover:border-foreground/40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-4 shrink-0 rounded-full",
                  selected ? "shadow-[inset_0_0_0_5px_var(--foreground)]" : "shadow-[inset_0_0_0_1.5px_var(--border)]",
                )}
              />
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              {option.hint !== "" && (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{option.hint}</span>
              )}
            </button>
          );
        })}
      </div>
      {value === "" && (
        <label className="flex items-center gap-3 text-sm">
          <span className="text-foreground/80">Duración</span>
          <Input
            type="number"
            min={5}
            max={480}
            step={5}
            value={durationMinutes}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            classNameContainer="w-24"
            className="h-9 rounded-xl tabular-nums"
            aria-label="Duración en minutos"
          />
          <span className="text-muted-foreground">minutos</span>
        </label>
      )}
    </div>
  );
}
