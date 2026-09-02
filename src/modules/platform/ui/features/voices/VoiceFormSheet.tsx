"use client";

/**
 * Drawer de voz del catálogo (crear/editar) sobre `DetailSheet` + `DynamicForm`.
 * - Crear: al guardar se crea la voz y se genera su muestra con la frase del
 *   form (si la síntesis falla, la voz QUEDA creada y se avisa — la muestra
 *   se reintenta desde ⋮).
 * - Editar: `provider`/`external_voice_id` inmutables (los characters guardan
 *   ese par); «Regenerar muestra con esta frase» sintetiza al instante.
 */
import { Lock, Mic } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useAlert } from "@/core/providers/alert-provider";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createCustomField,
  createInputField,
  DynamicForm,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { PlatformVoice } from "../../../domain/voices";
import {
  useCreateVoice,
  useGeneratePreview,
  useUpdateVoice,
} from "../../../infrastructure/api/hooks/use-voices";
import {
  defaultVoiceFormValues,
  toCreateVoiceDTO,
  toUpdateVoiceDTO,
  voiceFormSchema,
  voiceToFormValues,
  type VoiceFormValues,
} from "./voice-form.config";

const IMMUTABLE_HINT = (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Lock aria-hidden="true" className="size-3" />
    Inmutable: los characters de los tenants la referencian
  </span>
);

const GENDER_OPTIONS = [
  { value: "female", label: "Femenina" },
  { value: "male", label: "Masculina" },
  { value: "none", label: "Sin especificar" },
] as const;

/** Slider 0–1 (o rango custom) con el valor visible — patrón CharacterForm. */
function rangeField(
  name: keyof VoiceFormValues & string,
  label: string,
  options: { min: number; max: number; step: number },
) {
  return createCustomField<VoiceFormValues>(name, ({ value, setValue }) => (
    <span className="flex items-center gap-3">
      <input
        type="range"
        min={options.min}
        max={options.max}
        step={options.step}
        value={Number(value ?? 0)}
        onChange={(event) => setValue(name, Number(event.target.value))}
        aria-label={label}
        className="w-full accent-[var(--axi-violet)]"
      />
      <output className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {Number(value ?? 0).toFixed(2)}
      </output>
    </span>
  ), { label });
}

export function VoiceFormSheet({
  open,
  onOpenChange,
  voice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Voz a editar; `null` = crear. */
  voice: PlatformVoice | null;
}) {
  const { showAlert } = useAlert();
  const createVoice = useCreateVoice();
  const updateVoice = useUpdateVoice();
  const generatePreview = useGeneratePreview();
  const isEditing = voice !== null;

  const defaultValues = isEditing ? voiceToFormValues(voice) : defaultVoiceFormValues;

  const fields: FieldConfig<VoiceFormValues>[] = [
    createInputField<VoiceFormValues>("external_voice_id", {
      label: "voice_id de ElevenLabs *",
      placeholder: "EXAVITQu4vr4xnSDxMaL",
      autoComplete: "off",
      description: isEditing
        ? IMMUTABLE_HINT
        : "Cópialo de la librería de voces de ElevenLabs.",
      inputProps: { disabled: isEditing, className: "font-mono" },
    }),
    createInputField<VoiceFormValues>("name", {
      label: "Nombre *",
      placeholder: "Valentina",
      autoComplete: "off",
      description: "Es el nombre que el tenant ve en el selector.",
    }),
    createInputField<VoiceFormValues>("description", {
      label: "Descripción",
      placeholder: "Cálida y cercana — la voz de una asesora que conoce a sus clientes.",
      autoComplete: "off",
      description: "El texto con el que el tenant elige (timbre, tono, uso sugerido).",
    }),
    createCustomField<VoiceFormValues>("gender", ({ value, setValue }) => (
      <Select
        value={String(value ?? "female")}
        onValueChange={(gender) => setValue("gender", gender as VoiceFormValues["gender"])}
      >
        <SelectTrigger className="w-full" aria-label="Género">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GENDER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ), { label: "Género" }),
    createInputField<VoiceFormValues>("accent", {
      label: "Acento",
      placeholder: "es-latam",
      autoComplete: "off",
    }),
    createInputField<VoiceFormValues>("default_model_id", {
      label: "Modelo por defecto *",
      autoComplete: "off",
      description: "Los characters sin BYOK sintetizan exactamente con este modelo.",
      inputProps: { className: "font-mono" },
    }),
    rangeField("stability", "Estabilidad", { min: 0, max: 1, step: 0.05 }),
    rangeField("similarity_boost", "Similitud", { min: 0, max: 1, step: 0.05 }),
    rangeField("speed", "Velocidad", { min: 0.5, max: 2, step: 0.05 }),
    createCustomField<VoiceFormValues>("sample_phrase", ({ value, setValue }) => {
      const phrase = String(value ?? "");
      return (
        <span className="block space-y-2 rounded-xl border border-accent-violet/25 bg-accent-violet/5 p-3">
          <textarea
            value={phrase}
            onChange={(event) => setValue("sample_phrase", event.target.value)}
            rows={2}
            aria-label="Frase de la muestra"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {phrase.length} caracteres · cada generación los consume con la cuenta de axi
            </span>
            {isEditing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-accent-violet/40 text-accent-violet hover:bg-accent-violet/10"
                disabled={generatePreview.isPending || phrase.trim() === ""}
                onClick={() => void regenerate(phrase.trim())}
              >
                <Mic aria-hidden className="size-3.5" />
                {generatePreview.isPending ? "Generando…" : "Regenerar muestra con esta frase"}
              </Button>
            )}
          </span>
        </span>
      );
    }, {
      label: "Frase de la muestra",
      description: isEditing
        ? "Es lo que oye el tenant al probar la voz."
        : "Al guardar se genera la muestra con esta frase.",
    }),
  ];

  async function regenerate(phrase: string) {
    if (voice === null) return;
    try {
      await generatePreview.mutateAsync({ id: voice.id, text: phrase });
      showAlert({
        tone: "success",
        title: "Muestra regenerada",
        description: `${String(phrase.length)} caracteres con la cuenta de axi.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo generar la muestra",
        description: errorMessage(error),
      });
    }
  }

  async function onSubmit(values: VoiceFormValues, form: UseFormReturn<VoiceFormValues>) {
    try {
      if (isEditing) {
        await updateVoice.mutateAsync({ id: voice.id, body: toUpdateVoiceDTO(values, voice) });
        showAlert({
          tone: "success",
          title: "Voz actualizada",
          description: `«${values.name.trim()}» aplica en caliente para todos los tenants.`,
          autoCloseMs: 5000,
        });
        onOpenChange(false);
        return;
      }
      const created = await createVoice.mutateAsync(toCreateVoiceDTO(values));
      onOpenChange(false);
      try {
        await generatePreview.mutateAsync({ id: created.id, text: values.sample_phrase.trim() });
        showAlert({
          tone: "success",
          title: `«${values.name.trim()}» creada con su muestra`,
          description: `${String(values.sample_phrase.trim().length)} caracteres con la cuenta de axi.`,
          autoCloseMs: 5000,
        });
      } catch (previewError) {
        // La voz QUEDA creada: la muestra se reintenta desde ⋮ → Generar muestra
        showAlert({
          tone: "warning",
          title: `«${values.name.trim()}» creada, pero sin muestra`,
          description: errorMessage(previewError),
        });
      }
    } catch (error) {
      if (applyServerValidation(error, form)) return;
      showAlert({
        tone: "error",
        title: "No se pudo guardar la voz",
        description: errorMessage(error),
      });
    }
  }

  const pending = createVoice.isPending || updateVoice.isPending;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar «${voice.name}»` : "Añadir voz"}
      subtitle={
        isEditing
          ? "Los cambios aplican en caliente para todos los tenants."
          : "La voz queda disponible para todos los tenants al guardar."
      }
      size="lg"
    >
      <div className="space-y-4 p-4">
        <DynamicForm<VoiceFormValues>
          schema={voiceFormSchema}
          defaultValues={defaultValues}
          fields={fields}
          onSubmit={onSubmit}
          actions={{
            render: ({ submitting }) => (
              <div className="flex w-full items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || pending}>
                  {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar voz"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}
