"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Lock, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { OptionsInput } from "@/shared/components/features/options-input";
import {
  FIELD_LIMITS,
  FIELD_TYPE_HINTS,
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  MAX_OPTIONS_PER_FIELD,
  type FormFieldType,
  type FormFlow,
} from "@/modules/forms/domain/form";
import type { FormsValues } from "@/modules/forms/ui/forms/config/form-definition.config";
import { AiPromptPreview } from "./AiPromptPreview";
import { FieldTypeIcon } from "./FieldTypeIcon";

/** Placeholder del `ai_prompt` acorde al tipo, para que el ejemplo sea plausible. */
const AI_PROMPT_PLACEHOLDERS: Partial<Record<FormFieldType, string>> = {
  text: "Pide calle, número, barrio y un punto de referencia",
  select: "Pregunta si quiere domicilio o si recoge en el local",
  phone: "Confirma el número con indicativo, ej. +57 320 123 4567",
  date: "Pide el día exacto, no «mañana»",
};

/**
 * Panel de edición del dato seleccionado. Único lugar donde se edita: la lista
 * maestra es un resumen, así que no hay ambigüedad sobre dónde está la verdad.
 */
export function FieldDetailPanel({
  form,
  flow,
  index,
  onRemove,
}: {
  form: UseFormReturn<FormsValues>;
  flow: FormFlow;
  index: number;
  onRemove: () => void;
}) {
  const base = `${flow}.fields.${index}` as const;
  const field = form.watch(`${flow}.fields.${index}`);
  const errors = form.formState.errors[flow]?.fields?.[index];

  const label = field?.label ?? "";
  const aiPrompt = field?.ai_prompt ?? "";
  const type = (field?.type ?? "text") as FormFieldType;
  const displayName = label.trim() === "" ? "este dato" : label;

  return (
    <div className="space-y-5">
      {/* Nombre del dato */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${base}.label`}>Nombre del dato</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {label.length}/{FIELD_LIMITS.label}
          </span>
        </div>
        <Input
          id={`${base}.label`}
          maxLength={FIELD_LIMITS.label}
          placeholder="Dirección de entrega"
          aria-invalid={errors?.label !== undefined}
          aria-describedby={`${base}.label-help`}
          {...form.register(`${flow}.fields.${index}.label`)}
        />
        <p id={`${base}.label-help`} className="text-xs text-muted-foreground">
          {errors?.label?.message ?? "Así lo verás tú; la IA lo usa para nombrar el dato en la charla."}
        </p>
      </div>

      {/* Tipo de dato */}
      <div className="space-y-1.5">
        <Label htmlFor={`${base}.type`}>Tipo de dato</Label>
        <Controller
          control={form.control}
          name={`${flow}.fields.${index}.type`}
          render={({ field: typeField }) => (
            <Select value={typeField.value} onValueChange={typeField.onChange}>
              <SelectTrigger id={`${base}.type`} className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_FIELD_TYPES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    <span className="flex items-center gap-2">
                      <FieldTypeIcon type={candidate} />
                      {FIELD_TYPE_LABELS[candidate]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">{FIELD_TYPE_HINTS[type]}</p>
      </div>

      {/* Obligatorio — el helper text cambia con el estado, ahí se explica el impacto */}
      <Controller
        control={form.control}
        name={`${flow}.fields.${index}.required`}
        render={({ field: requiredField }) => (
          <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${base}.required`} className="cursor-pointer">
                Obligatorio
              </Label>
              <Switch
                id={`${base}.required`}
                checked={requiredField.value}
                onCheckedChange={requiredField.onChange}
                aria-describedby={`${base}.required-help`}
              />
            </div>
            <p id={`${base}.required-help`} className="mt-1 text-xs text-muted-foreground">
              {requiredField.value
                ? "Tu agente no cerrará hasta tener este dato."
                : "Tu agente lo pide, pero puede cerrar sin él."}
            </p>
          </div>
        )}
      />

      {/* Opciones — solo para select */}
      {type === "select" && (
        <Controller
          control={form.control}
          name={`${flow}.fields.${index}.options`}
          render={({ field: optionsField }) => {
            const options = (optionsField.value ?? []).filter((option) => option.trim() !== "");
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`${base}.options`}>Opciones</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {options.length}/{MAX_OPTIONS_PER_FIELD}
                  </span>
                </div>
                <OptionsInput
                  inputId={`${base}.options`}
                  ariaLabel={`Nueva opción de ${displayName}`}
                  value={options}
                  onChange={optionsField.onChange}
                  max={MAX_OPTIONS_PER_FIELD}
                  maxLength={FIELD_LIMITS.option}
                />
                <p
                  className={cn(
                    "text-xs",
                    errors?.options !== undefined ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {errors?.options?.message ??
                    `La IA solo acepta una de estas respuestas. Máximo ${MAX_OPTIONS_PER_FIELD}.`}
                </p>
              </div>
            );
          }}
        />
      )}

      <Separator />

      {/* Cómo debe preguntarlo (ai_prompt) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${base}.ai_prompt`}>Cómo debe preguntarlo</Label>
          <span className="text-xs tabular-nums text-muted-foreground ml-auto">
            {aiPrompt.length}/{FIELD_LIMITS.aiPrompt}
          </span>
        </div>
        <Textarea
          id={`${base}.ai_prompt`}
          rows={3}
          maxLength={FIELD_LIMITS.aiPrompt}
          placeholder={AI_PROMPT_PLACEHOLDERS[type] ?? "Da una indicación breve para la IA"}
          aria-describedby={`${base}.ai_prompt-help`}
          {...form.register(`${flow}.fields.${index}.ai_prompt`)}
        />
        <p id={`${base}.ai_prompt-help`} className="text-xs text-muted-foreground">
          Es una indicación para la IA, no la pregunta literal: ella la formula con su propio tono.
          Déjalo vacío y preguntará por el nombre del dato.
        </p>
      </div>

      {field !== undefined && <AiPromptPreview field={field} />}

      {/* Clave técnica — cerrada por defecto; inmutable si ya se guardó */}
      <Accordion type="single" collapsible>
        <AccordionItem value="code" className="border-b-0">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              Clave técnica
              <code className="font-mono text-xs text-muted-foreground">{field?.code}</code>
              {field?.persisted === true && <Lock className="size-3" aria-label="No se puede cambiar" />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-1.5">
            <Input
              id={`${base}.code`}
              maxLength={FIELD_LIMITS.code}
              disabled={field?.persisted === true}
              /* El título del acordeón no es un <label>: sin esto el input no
                 tendría nombre accesible. */
              aria-label="Clave técnica"
              aria-invalid={errors?.code !== undefined}
              aria-describedby={`${base}.code-help`}
              className="font-mono sm:w-72"
              {...form.register(`${flow}.fields.${index}.code`, {
                setValueAs: (value: string) => value.toLowerCase(),
              })}
            />
            <p
              id={`${base}.code-help`}
              className={cn("text-xs", errors?.code !== undefined ? "text-destructive" : "text-muted-foreground")}
            >
              {errors?.code?.message ??
                (field?.persisted === true
                  ? "Con esta clave se guarda el dato. No se puede cambiar: los datos ya recogidos quedarían huérfanos. Si te equivocaste, quita el dato y créalo de nuevo."
                  : "Con esta clave se guarda el dato. Solo minúsculas, números y guiones bajos, empezando por una letra.")}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
          Quitar el dato
        </Button>
      </div>
    </div>
  );
}
