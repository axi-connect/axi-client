"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { checkCcEmail, MAX_CC, splitCcInput } from "../../../domain/delivery";

/**
 * Copia al equipo como chips: Enter, coma o pegar una lista añaden; la ×
 * o Retroceso con el campo vacío quitan. Cada correo pasa por `checkCcEmail`
 * (formato, duplicado, tope de 10 y nunca el del dueño) y el motivo del
 * rechazo se lee bajo el campo, anunciado al lector de pantalla.
 */
export function CcChipsInput({
  value,
  onChange,
  ownerEmail,
  invalid,
  id,
}: {
  value: readonly string[];
  onChange: (next: string[]) => void;
  ownerEmail: string | null;
  invalid?: boolean;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  function add(raw: string): boolean {
    const parts = splitCcInput(raw);
    if (parts.length === 0) return true;
    const next = [...value];
    for (const part of parts) {
      const check = checkCcEmail(part, { ownerEmail, current: next });
      if (!check.ok) {
        setError(check.message);
        onChange(next);
        return false;
      }
      next.push(check.email);
    }
    setError(null);
    onChange(next);
    return true;
  }

  function remove(email: string) {
    onChange(value.filter((item) => item !== email));
    setError(null);
  }

  const full = value.length >= MAX_CC;

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          (invalid || error) && "border-destructive",
        )}
      >
        <ul className="contents" aria-label="Correos en copia">
          {value.map((email) => (
            <li
              key={email}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                aria-label={`Quitar ${email} de la copia`}
                className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={draft}
          disabled={full}
          placeholder={full ? `Máximo ${MAX_CC} correos` : value.length === 0 ? "Escribe un correo y pulsa Enter" : ""}
          aria-invalid={Boolean(invalid || error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === ";") {
              event.preventDefault();
              if (add(draft)) setDraft("");
              return;
            }
            if (event.key === "Backspace" && draft === "" && value.length > 0) {
              remove(value[value.length - 1]!);
            }
          }}
          onBlur={() => {
            if (draft.trim() !== "" && add(draft)) setDraft("");
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (splitCcInput(text).length > 1) {
              event.preventDefault();
              if (add(text)) setDraft("");
            }
          }}
          className="min-w-40 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
