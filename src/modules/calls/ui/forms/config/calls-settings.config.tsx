"use client";

import { useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import {
  createCustomField,
  createInputField,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { CallsSettingsDTO } from "@/modules/calls/domain/call";

/**
 * Config del formulario de llamadas. El PUT es de SECCIÓN COMPLETA: lo
 * omitido volvería al default del sistema, así que `toCallsSettingsPayload`
 * manda siempre todos los campos. La duración se edita en minutos (el wire
 * va en segundos) y el horario como ventana de silencio start→end.
 */
export const callsSettingsFormSchema = z.object({
  ai_enabled: z.boolean(),
  recording_enabled: z.boolean(),
  legal_notice_text: z
    .string()
    .trim()
    .min(10, "Mínimo 10 caracteres — es tu aviso de habeas data")
    .max(500, "Máximo 500 caracteres"),
  max_duration_minutes: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(1, "Entre 1 y 30 minutos")
    .max(30, "Entre 1 y 30 minutos"),
  max_concurrent: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(1, "Entre 1 y 20")
    .max(20, "Entre 1 y 20"),
  quiet_start_hour: z.coerce.number().int().min(0).max(23),
  quiet_end_hour: z.coerce.number().int().min(0).max(23),
});

export type CallsSettingsFormValues = z.infer<typeof callsSettingsFormSchema>;

export function fromCallsSettingsDto(dto: CallsSettingsDTO): CallsSettingsFormValues {
  return {
    ai_enabled: dto.ai_enabled,
    recording_enabled: dto.recording_enabled,
    legal_notice_text: dto.legal_notice_text,
    max_duration_minutes: Math.round(dto.max_duration_seconds / 60),
    max_concurrent: dto.max_concurrent,
    quiet_start_hour: dto.quiet_hours.start_hour,
    quiet_end_hour: dto.quiet_hours.end_hour,
  };
}

export function toCallsSettingsPayload(values: CallsSettingsFormValues): CallsSettingsDTO {
  return {
    ai_enabled: values.ai_enabled,
    recording_enabled: values.recording_enabled,
    legal_notice_text: values.legal_notice_text.trim(),
    max_duration_seconds: values.max_duration_minutes * 60,
    max_concurrent: values.max_concurrent,
    quiet_hours: {
      start_hour: values.quiet_start_hour,
      end_hour: values.quiet_end_hour,
    },
  };
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "a. m." : "p. m."}`;
}

function HourSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number;
  disabled: boolean;
  ariaLabel: string;
  onChange: (hour: number) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
      disabled={disabled}
    >
      <SelectTrigger className="w-32" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {HOURS.map((hour) => (
          <SelectItem key={hour} value={String(hour)}>
            {hourLabel(hour)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function buildCallsSettingsFields(opts: {
  /** Sin `calls:manage` el formulario es de solo lectura. */
  canManage: boolean;
}): Array<FieldConfig<CallsSettingsFormValues>> {
  const readOnly = () => !opts.canManage;

  return [
    createCustomField<CallsSettingsFormValues>(
      "ai_enabled",
      ({ value, setValue }) => (
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => setValue("ai_enabled", checked)}
          disabled={!opts.canManage}
          aria-label="Llamadas con IA"
        />
      ),
      {
        label: "Llamadas con IA",
        description:
          "El interruptor general del módulo. Apagado, no se origina ni contesta ninguna llamada — las conversaciones de chat siguen intactas.",
      },
    ),
    createCustomField<CallsSettingsFormValues>(
      "recording_enabled",
      ({ value, setValue }) => (
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => setValue("recording_enabled", checked)}
          disabled={!opts.canManage}
          aria-label="Grabar las llamadas"
        />
      ),
      {
        label: "Grabar las llamadas",
        description:
          "Guarda el audio junto al transcript. Puedes apagarlo y conservar solo el transcript.",
      },
    ),
    createCustomField<CallsSettingsFormValues>(
      "legal_notice_text",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => setValue("legal_notice_text", e.target.value)}
            disabled={!opts.canManage}
            rows={3}
            maxLength={500}
            aria-label="Aviso al inicio de la llamada"
          />
          {getError() !== undefined && (
            <p className="text-destructive text-xs">{getError()}</p>
          )}
        </div>
      ),
      {
        label: "Aviso al inicio de la llamada",
        description:
          "Se reproduce siempre antes de conversar: es tu aviso de grabación y tratamiento de datos (habeas data).",
        colSpan: { base: 1, md: 2 },
      },
    ),
    createInputField<CallsSettingsFormValues>("max_duration_minutes", {
      label: "Duración máxima por llamada (minutos)",
      description: "El agente se despide con tiempo antes del corte (1–30).",
      inputKind: "number",
      inputProps: { min: 1, max: 30 },
      isDisabled: readOnly,
    }),
    createInputField<CallsSettingsFormValues>("max_concurrent", {
      label: "Llamadas simultáneas",
      description: "Tope de llamadas activas al mismo tiempo (1–20).",
      inputKind: "number",
      inputProps: { min: 1, max: 20 },
      isDisabled: readOnly,
    }),
    createCustomField<CallsSettingsFormValues>(
      "quiet_start_hour",
      ({ control, value, setValue }) => (
        <QuietHoursField
          control={control}
          startHour={value as number}
          disabled={!opts.canManage}
          onChangeStart={(hour) => setValue("quiet_start_hour", hour)}
          onChangeEnd={(hour) => setValue("quiet_end_hour", hour)}
        />
      ),
      {
        label: "Horario de silencio",
        description:
          "Las llamadas salientes automáticas NO se hacen dentro de esta ventana (hora del negocio). Puede cruzar la medianoche, p. ej. de 8 p. m. a 8 a. m.",
        colSpan: { base: 1, md: 2 },
      },
    ),
  ];
}

function QuietHoursField({
  control,
  startHour,
  disabled,
  onChangeStart,
  onChangeEnd,
}: {
  control: Control<CallsSettingsFormValues>;
  startHour: number;
  disabled: boolean;
  onChangeStart: (hour: number) => void;
  onChangeEnd: (hour: number) => void;
}) {
  const endHour = useWatch({ control, name: "quiet_end_hour" });
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">No llamar desde las</span>
      <HourSelect
        value={startHour}
        disabled={disabled}
        ariaLabel="Inicio del silencio"
        onChange={onChangeStart}
      />
      <span className="text-muted-foreground">hasta las</span>
      <HourSelect
        value={endHour}
        disabled={disabled}
        ariaLabel="Fin del silencio"
        onChange={onChangeEnd}
      />
    </div>
  );
}
