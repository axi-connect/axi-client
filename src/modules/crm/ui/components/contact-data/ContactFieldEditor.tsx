"use client";

import { useState } from "react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import type { ContactDataField, FieldScalar } from "@/modules/crm/domain/contact-data";
import type { ContactDataVariant } from "./types";

const INPUT_TYPE: Record<string, React.HTMLInputTypeAttribute> = {
  email: "email",
  phone: "tel",
  number: "number",
  date: "date",
  text: "text",
};

function initialDraft(field: ContactDataField): string | boolean {
  if (field.type === "boolean") {
    if (typeof field.value === "boolean") return field.value;
    if (typeof field.value === "string") return ["true", "1", "si", "sí", "yes"].includes(field.value.toLowerCase());
    return false;
  }
  return field.value === null ? "" : String(field.value);
}

/** Convierte el borrador al escalar que espera el PATCH; `undefined` = no se puede guardar. */
function toScalar(field: ContactDataField, draft: string | boolean): FieldScalar | undefined {
  if (field.type === "boolean") return typeof draft === "boolean" ? draft : undefined;
  if (typeof draft !== "string") return undefined;
  const trimmed = draft.trim();
  if (trimmed === "") return undefined;
  if (field.type === "number") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return trimmed;
}

/**
 * Corregir en línea: el control depende del `type` del campo (select con las
 * opciones del formulario, input de texto/correo/teléfono/número, fecha,
 * sí/no). Enter guarda, Esc cancela. Al guardar el dato queda verificado.
 */
export function ContactFieldEditor({
  field,
  variant,
  busy,
  onSave,
  onCancel,
}: {
  field: ContactDataField;
  variant: ContactDataVariant;
  busy: boolean;
  onSave: (value: FieldScalar) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<string | boolean>(() => initialDraft(field));
  const scalar = toScalar(field, draft);
  const canSave = scalar !== undefined && !busy;
  const label = field.label.trim() === "" ? field.code : field.label;

  const save = () => {
    if (scalar !== undefined && !busy) onSave(scalar);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (event.key === "Enter" && field.type !== "select") {
      event.preventDefault();
      save();
    }
  };

  let control: React.ReactNode;
  if (field.type === "select") {
    control = (
      <Select value={typeof draft === "string" ? draft : ""} onValueChange={setDraft}>
        <SelectTrigger size="sm" className="min-w-[220px]" aria-label={label} autoFocus>
          <SelectValue placeholder="Elige una opción" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (field.type === "boolean") {
    control = (
      <label className="flex h-8 items-center gap-2 text-sm">
        <Switch
          checked={draft === true}
          onCheckedChange={(checked) => setDraft(checked)}
          aria-label={label}
          autoFocus
        />
        {draft === true ? "Sí" : "No"}
      </label>
    );
  } else {
    control = (
      <Input
        type={INPUT_TYPE[field.type ?? "text"] ?? "text"}
        inputMode={field.type === "number" ? "decimal" : field.type === "phone" ? "tel" : undefined}
        value={typeof draft === "string" ? draft : ""}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={label}
        className="h-8"
        classNameContainer="min-w-0 flex-1"
        autoFocus
        disabled={busy}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2" onKeyDown={onKeyDown}>
      <div className={cn("flex flex-wrap items-center gap-2", variant === "rail" && "gap-1.5")}>
        {control}
        <Button type="button" size="sm" className="rounded-full" onClick={save} disabled={!canSave}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Al guardar queda verificado: el agente no lo cambiará, solo podrá proponer.
      </p>
    </div>
  );
}
