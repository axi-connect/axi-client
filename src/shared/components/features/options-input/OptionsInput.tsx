"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/**
 * Editor de una lista cerrada de opciones: chips removibles + input para añadir
 * (Enter o botón). Deduplica ignorando mayúsculas.
 *
 * Los límites son del consumidor porque cada backend tiene los suyos: el
 * attribute set del catálogo admite opciones de 120 caracteres sin tope de
 * items; los formularios de captura (F10) exigen 60 caracteres y máximo 12
 * opciones. Sin `max`, no hay tope de items.
 */
export function OptionsInput({
  value,
  onChange,
  disabled,
  max,
  maxLength = 120,
  inputId,
  ariaLabel = "Nueva opción",
}: {
  value: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
  /** Máximo de opciones. Al alcanzarlo, el input y el botón se deshabilitan. */
  max?: number;
  /** Máximo de caracteres por opción. */
  maxLength?: number;
  inputId?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const atCapacity = max !== undefined && value.length >= max;

  const addOption = () => {
    const option = draft.trim();
    if (option === "" || atCapacity) return;
    const exists = value.some((existing) => existing.toLowerCase() === option.toLowerCase());
    if (!exists) onChange([...value, option]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          value={draft}
          disabled={disabled || atCapacity}
          maxLength={maxLength}
          placeholder={atCapacity ? `Máximo ${max} opciones` : "Añadir opción…"}
          aria-label={ariaLabel}
          className="h-8 max-w-48"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || atCapacity || draft.trim() === ""}
          onClick={addOption}
        >
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((option) => (
            <Badge key={option} variant="secondary" className="gap-1 rounded-full pr-1">
              {option}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Quitar opción ${option}`}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() => onChange(value.filter((existing) => existing !== option))}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
