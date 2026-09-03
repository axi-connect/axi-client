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
 * manda siempre todos los campos. La duración se edita en SEGUNDOS, igual que
 * el wire (editarla en minutos redondeaba y reescribía el valor guardado), y el
 * horario como ventana de silencio start→end.
 */
export const callsSettingsFormSchema = z.object({
  ai_enabled: z.boolean(),
  recording_enabled: z.boolean(),
  hangup_on_machine: z.boolean(),
  legal_notice_text: z
    .string()
    .trim()
    .min(10, "Mínimo 10 caracteres — es tu aviso de habeas data")
    .max(500, "Máximo 500 caracteres"),
  max_duration_seconds: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(60, "Entre 60 y 1800 segundos")
    .max(1800, "Entre 60 y 1800 segundos"),
  max_concurrent: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(1, "Entre 1 y 20")
    .max(20, "Entre 1 y 20"),
  ring_timeout_seconds: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(20, "Entre 20 y 55 segundos")
    .max(55, "Entre 20 y 55 segundos"),
  silence_probe_seconds: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(5, "Entre 5 y 30 segundos")
    .max(30, "Entre 5 y 30 segundos"),
  silence_hangup_seconds: z.coerce
    .number({ message: "Requerido" })
    .int("Debe ser un entero")
    .min(5, "Entre 5 y 30 segundos")
    .max(30, "Entre 5 y 30 segundos"),
  quiet_start_hour: z.coerce.number().int().min(0).max(23),
  quiet_end_hour: z.coerce.number().int().min(0).max(23),
});

export type CallsSettingsFormValues = z.infer<typeof callsSettingsFormSchema>;

export function fromCallsSettingsDto(dto: CallsSettingsDTO): CallsSettingsFormValues {
  return {
    ai_enabled: dto.ai_enabled,
    recording_enabled: dto.recording_enabled,
    hangup_on_machine: dto.hangup_on_machine,
    legal_notice_text: dto.legal_notice_text,
    max_duration_seconds: dto.max_duration_seconds,
    max_concurrent: dto.max_concurrent,
    ring_timeout_seconds: dto.ring_timeout_seconds,
    silence_probe_seconds: dto.silence_probe_seconds,
    silence_hangup_seconds: dto.silence_hangup_seconds,
    quiet_start_hour: dto.quiet_hours.start_hour,
    quiet_end_hour: dto.quiet_hours.end_hour,
  };
}

export function toCallsSettingsPayload(values: CallsSettingsFormValues): CallsSettingsDTO {
  return {
    ai_enabled: values.ai_enabled,
    recording_enabled: values.recording_enabled,
    hangup_on_machine: values.hangup_on_machine,
    legal_notice_text: values.legal_notice_text.trim(),
    max_duration_seconds: values.max_duration_seconds,
    max_concurrent: values.max_concurrent,
    ring_timeout_seconds: values.ring_timeout_seconds,
    silence_probe_seconds: values.silence_probe_seconds,
    silence_hangup_seconds: values.silence_hangup_seconds,
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
      "hangup_on_machine",
      ({ value, setValue }) => (
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => setValue("hangup_on_machine", checked)}
          disabled={!opts.canManage}
          aria-label="Colgar si contesta un buzón de voz"
        />
      ),
      {
        label: "Colgar si contesta un buzón de voz",
        description:
          "En llamadas salientes automáticas, si contesta un contestador el agente cuelga sin dejar mensaje (ahorra costo). Añade unos segundos de detección y, en raros casos, puede colgarle a una persona que contesta lento.",
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
    createInputField<CallsSettingsFormValues>("max_duration_seconds", {
      label: "Duración máxima por llamada (segundos)",
      description:
        "El agente avisa 30 s antes y se despide al llegar al tope (60–1800; 600 = 10 min).",
      inputKind: "number",
      inputProps: { min: 60, max: 1800, step: 30 },
      isDisabled: readOnly,
    }),
    createInputField<CallsSettingsFormValues>("max_concurrent", {
      label: "Llamadas simultáneas",
      description: "Tope de llamadas activas al mismo tiempo (1–20).",
      inputKind: "number",
      inputProps: { min: 1, max: 20 },
      isDisabled: readOnly,
    }),
    createInputField<CallsSettingsFormValues>("ring_timeout_seconds", {
      label: "Segundos de timbre antes de rendirse",
      description:
        "Por debajo del desvío a buzón del operador (~40 s) un buzón cuesta cero: la llamada termina «Sin respuesta» sin minutos ni grabación (20–55).",
      inputKind: "number",
      inputProps: { min: 20, max: 55 },
      isDisabled: readOnly,
    }),
    createInputField<CallsSettingsFormValues>("silence_probe_seconds", {
      label: "Silencio antes de preguntar «¿Sigues ahí?» (segundos)",
      description:
        "Se cuenta desde que el agente termina de hablar. Hablar, teclear o interrumpir reinicia el conteo (5–30).",
      inputKind: "number",
      inputProps: { min: 5, max: 30 },
      isDisabled: readOnly,
    }),
    createInputField<CallsSettingsFormValues>("silence_hangup_seconds", {
      label: "Silencio adicional antes de despedirse (segundos)",
      description: "Tras la pregunta, si nadie responde la llamada cierra como «Sin respuesta en línea» (5–30).",
      inputKind: "number",
      inputProps: { min: 5, max: 30 },
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
