"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";

const MAX_ALIASES = 40;
const MAX_ALIAS_LENGTH = 60;

/**
 * Chips de sinónimos de una categoría (plan catalog_taxonomy_classification,
 * D3). Enter o coma agregan; Retroceso con el campo vacío quita el último.
 * Se guarda en minúsculas y sin duplicados: el índice compara así.
 */
export function AliasesInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const next = raw.trim().toLowerCase().slice(0, MAX_ALIAS_LENGTH);
    if (next.length === 0) return;
    if (value.some((alias) => alias.toLowerCase() === next)) {
      setDraft("");
      return;
    }
    if (value.length >= MAX_ALIASES) return;
    onChange([...value, next]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
        {value.map((alias) => (
          <Badge key={alias} variant="secondary" className="gap-1 pr-1">
            {alias}
            {!disabled && (
              <button
                type="button"
                aria-label={`Quitar ${alias}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                onClick={() => onChange(value.filter((candidate) => candidate !== alias))}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? "jean, denim, baggy…" : "+ agregar"}
          aria-label="Agregar sinónimo"
          className="h-7 min-w-32 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          maxLength={MAX_ALIAS_LENGTH}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {value.length} de {MAX_ALIASES}
      </p>
    </div>
  );
}
