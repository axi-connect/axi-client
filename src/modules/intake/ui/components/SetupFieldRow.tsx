"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  isEditableInline,
  sourceLabel,
  type IntakeField,
} from "@/modules/intake/domain/intake";

/**
 * Una fila de la ficha: etiqueta → valor, editable en el sitio.
 *
 * **Esta fila es la mitad del diseño que la investigación exigía.** Un formato
 * de una pregunta a la vez tiene cuatro defectos documentados —no hay panorama,
 * no se puede editar lo anterior, no se puede saltar, y hay gente que rebota
 * ante los chats— y los cuatro se arreglan con lo mismo: que la conversación
 * sea un método de entrada para un documento, no un sustituto del documento.
 * Quien prefiera teclear la ficha y no hablar con nadie, puede.
 *
 * Es una LISTA, no una tabla: etiqueta, valor, una línea secundaria y un solo
 * indicador. Cinco columnas por dato serían desorden.
 *
 * El matiz de procedencia solo aparece cuando aporta: lo que la persona dijo no
 * lleva sello —es lo normal— y lo que la IA dedujo de su web sí, porque ahí sí
 * cambia lo que hay que hacer con el dato.
 */
export function SetupFieldRow({
  field,
  saving,
  onSave,
  onConfirm,
  onAskAbout,
}: {
  field: IntakeField;
  saving: boolean;
  onSave: (value: unknown) => Promise<boolean>;
  /** Confirmar una deducción tal cual está: un toque y deja de estar pendiente. */
  onConfirm: () => void;
  /** Llevar la duda al chat cuando el dato no se puede teclear en una fila. */
  onAskAbout: (field: IntakeField) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const editable = isEditableInline(field.kind);
  const badge = sourceLabel(field.source);

  function start(): void {
    if (!editable) {
      onAskAbout(field);
      return;
    }
    setDraft(toDraft(field));
    setError(null);
    setEditing(true);
  }

  async function commit(): Promise<void> {
    const value = fromDraft(field, draft);
    if (value === null) {
      setError("No pude entender ese valor");
      return;
    }
    const ok = await onSave(value);
    if (ok) {
      setEditing(false);
    } else {
      setError("No se pudo guardar. Inténtalo de nuevo.");
    }
  }

  return (
    <li
      className={cn(
        "group border-b border-border-soft py-2.5 last:border-b-0",
        field.needs_confirmation && "bg-accent-violet/4",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
            {field.label}
            {field.required && field.value === null ? (
              <span
                className="size-1 rounded-full bg-accent-amber"
                aria-label="Hace falta"
                title="Hace falta"
              />
            ) : null}
          </p>

          {editing ? (
            <FieldEditor
              field={field}
              draft={draft}
              setDraft={setDraft}
              inputRef={inputRef}
              onCommit={() => void commit()}
            />
          ) : (
            <p
              className={cn(
                "mt-0.5 text-[13px] leading-snug wrap-anywhere",
                field.display === null ? "text-muted-foreground/50 italic" : "text-foreground",
              )}
            >
              {field.display ?? "Sin contestar"}
            </p>
          )}

          {badge !== null && !editing ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/70">
              {field.needs_confirmation ? (
                <Sparkles className="size-2.5 text-accent-violet" aria-hidden="true" />
              ) : null}
              {badge}
            </p>
          ) : null}

          {error === null ? null : (
            <p className="mt-1 text-[11px] text-destructive">{error}</p>
          )}
        </div>

        <div className="flex flex-none items-center gap-1">
          {editing ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                aria-label="Cancelar"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-7 rounded-full"
                disabled={saving}
                onClick={() => void commit()}
                aria-label="Guardar"
              >
                <Check className="size-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              {field.needs_confirmation ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-accent-violet/30 px-2 text-[11px] text-accent-violet hover:bg-accent-violet/10"
                  disabled={saving}
                  onClick={onConfirm}
                >
                  <Check className="size-3" aria-hidden="true" />
                  Así es
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                // Visible siempre en táctil (donde no hay hover) y al pasar el
                // ratón en escritorio: un control que solo existe con hover es
                // un control que en un móvil no existe.
                className="size-7 text-muted-foreground opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                onClick={start}
                aria-label={`Corregir ${field.label}`}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function FieldEditor({
  field,
  draft,
  setDraft,
  inputRef,
  onCommit,
}: {
  field: IntakeField;
  draft: string;
  setDraft: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onCommit: () => void;
}) {
  if (field.kind === "choice" && field.options !== null) {
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {field.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setDraft(option);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
              draft === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === "long_text" || field.kind === "list" || field.kind === "multi_choice") {
    return (
      <Textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        rows={3}
        className="mt-1.5 text-[13px]"
        placeholder={
          field.kind === "long_text" ? "Cuéntalo con tus palabras" : "Sepáralos con comas"
        }
      />
    );
  }

  return (
    <Input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
      }}
      className="mt-1.5 h-8 text-[13px]"
    />
  );
}

/** El valor actual, en texto editable. */
function toDraft(field: IntakeField): string {
  if (field.value === null || field.value === undefined) return "";
  if (Array.isArray(field.value)) return field.value.map((item) => String(item)).join(", ");
  if (typeof field.value === "boolean") return field.value ? "sí" : "no";
  return String(field.value);
}

/**
 * El texto editado, de vuelta al tipo del campo.
 *
 * `null` = no se pudo interpretar. La validación de verdad la hace el backend,
 * con el mismo normalizador que usa el asistente; esto solo evita mandar una
 * lista vacía o un texto en blanco.
 */
function fromDraft(field: IntakeField, draft: string): unknown {
  const trimmed = draft.trim();
  if (trimmed === "") return null;

  switch (field.kind) {
    case "list":
    case "multi_choice":
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    case "boolean":
      return ["sí", "si", "true", "1"].includes(trimmed.toLowerCase());
    default:
      return trimmed;
  }
}
