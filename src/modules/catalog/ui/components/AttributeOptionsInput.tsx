"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/**
 * Editor de opciones de un atributo `select`: chips removibles + input para
 * añadir (Enter o botón). Deduplica ignorando mayúsculas.
 */
export function AttributeOptionsInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const addOption = () => {
    const option = draft.trim();
    if (!option) return;
    const exists = value.some((existing) => existing.toLowerCase() === option.toLowerCase());
    if (!exists) onChange([...value, option]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          disabled={disabled}
          maxLength={120}
          placeholder="Añadir opción…"
          aria-label="Nueva opción"
          className="h-8 max-w-48"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled || !draft.trim()} onClick={addOption}>
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
