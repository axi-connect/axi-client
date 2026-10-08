"use client";

/**
 * «Almacenamiento incluido» de un plan (o de un tenant): GB con coma decimal
 * y atajos de los escalones sembrados. Vacío o «Sin límite» = `null`.
 * Es espacio OCUPADO, no lo subido en el ciclo: por eso vive fuera del
 * `LimitsEditor` (lienzo «Almacenamiento», P3).
 */
import { useEffect, useId, useState } from "react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { parseQuotaInput, STORAGE_QUOTA_PRESETS_GB } from "../../../domain/storage-quota";

type StorageQuotaFieldProps = {
  /** GB; `null` = sin tope. */
  value: number | null;
  onChange: (gb: number | null) => void;
  hint?: React.ReactNode;
};

function toText(gb: number | null): string {
  return gb === null ? "" : String(gb).replace(".", ",");
}

const chip =
  "h-8 rounded-full px-3 text-[13px] font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function StorageQuotaField({ value, onChange, hint }: StorageQuotaFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const [text, setText] = useState(toText(value));
  const invalid = parseQuotaInput(text) === undefined;

  // Un atajo o un reset del formulario reescriben el texto.
  useEffect(() => {
    if (parseQuotaInput(text) !== value) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia el valor externo
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-36">
          <Input
            id={inputId}
            inputMode="decimal"
            value={text}
            placeholder="Sin límite"
            aria-label="Almacenamiento incluido en GB"
            aria-invalid={invalid || undefined}
            aria-describedby={hintId}
            className="pr-10 font-medium tabular-nums"
            onChange={(event) => {
              setText(event.target.value);
              const parsed = parseQuotaInput(event.target.value);
              if (parsed !== undefined) onChange(parsed);
            }}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            GB
          </span>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Atajos de almacenamiento">
          {STORAGE_QUOTA_PRESETS_GB.map((gb) => (
            <button
              key={gb}
              type="button"
              aria-pressed={value === gb}
              onClick={() => onChange(gb)}
              className={cn(chip, value === gb ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {gb} GB
            </button>
          ))}
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            className={cn(chip, value === null ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
          >
            Sin límite
          </button>
        </div>
      </div>
      <p id={hintId} className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
        {invalid
          ? "Escribe los GB con números (por ejemplo 15 o 2,5), o déjalo vacío para no poner tope."
          : (hint ??
            "Es espacio ocupado, no lo que se sube al mes. Al llenarse, el equipo deja de subir archivos; los mensajes de los clientes siguen llegando.")}
      </p>
    </div>
  );
}
