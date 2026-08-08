import { z } from "zod";
import { useWatch, type Control } from "react-hook-form";
import {
  createCustomField,
  createInputField,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form/types";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  buildSettingsPayload,
  SETTINGS_LIMITS,
  splitMinutes,
  TIME_UNIT_LABELS,
  unitToMinutes,
  type SchedulingSettingsDTO,
  type TimeUnit,
} from "@/modules/scheduling/domain/settings";
import { ReminderOffsetsEditor } from "../../components/settings/ReminderOffsetsEditor";

/**
 * Config del formulario de reglas de agendamiento. El PUT es de sección
 * completa: `toSettingsPayload` manda SIEMPRE los 5 campos (lo omitido
 * volvería al default del sistema).
 */
export const settingsFormSchema = z
  .object({
    slot_capacity: z.coerce
      .number({ message: "Requerido" })
      .int("Debe ser un entero")
      .min(SETTINGS_LIMITS.slot_capacity.min, "Entre 1 y 50")
      .max(SETTINGS_LIMITS.slot_capacity.max, "Entre 1 y 50"),
    default_duration_minutes: z.coerce
      .number({ message: "Requerido" })
      .int("Debe ser un entero")
      .min(SETTINGS_LIMITS.default_duration_minutes.min, "Entre 5 y 480 minutos")
      .max(SETTINGS_LIMITS.default_duration_minutes.max, "Entre 5 y 480 minutos"),
    default_buffer_minutes: z.coerce
      .number({ message: "Requerido" })
      .int("Debe ser un entero")
      .min(SETTINGS_LIMITS.default_buffer_minutes.min, "Entre 0 y 120 minutos")
      .max(SETTINGS_LIMITS.default_buffer_minutes.max, "Entre 0 y 120 minutos"),
    min_notice_value: z.coerce
      .number({ message: "Requerido" })
      .int("Debe ser un entero")
      .min(0, "No puede ser negativa"),
    min_notice_unit: z.enum(["minutes", "hours", "days"]),
    reminder_offsets_minutes: z
      .array(z.number().int())
      .max(SETTINGS_LIMITS.reminder_offsets_minutes.maxItems, "Máximo 6 recordatorios"),
  })
  .superRefine((values, ctx) => {
    const total = unitToMinutes(values.min_notice_value, values.min_notice_unit);
    if (total > SETTINGS_LIMITS.min_notice_minutes.max) {
      ctx.addIssue({
        code: "custom",
        path: ["min_notice_value"],
        message: "Máximo 7 días de antelación",
      });
    }
  });

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/** El GET resuelto → valores del formulario (antelación en su unidad legible). */
export function fromSettingsDto(dto: SchedulingSettingsDTO): SettingsFormValues {
  const notice = splitMinutes(dto.min_notice_minutes);
  return {
    slot_capacity: dto.slot_capacity,
    default_duration_minutes: dto.default_duration_minutes,
    default_buffer_minutes: dto.default_buffer_minutes,
    min_notice_value: notice.value,
    min_notice_unit: notice.unit,
    reminder_offsets_minutes: dto.reminder_offsets_minutes,
  };
}

export function toSettingsPayload(values: SettingsFormValues): SchedulingSettingsDTO {
  return buildSettingsPayload({
    slot_capacity: values.slot_capacity,
    default_duration_minutes: values.default_duration_minutes,
    default_buffer_minutes: values.default_buffer_minutes,
    min_notice_minutes: unitToMinutes(values.min_notice_value, values.min_notice_unit),
    reminder_offsets_minutes: values.reminder_offsets_minutes,
  });
}

/** Valor + unidad de la antelación mínima (dos claves del form en un campo). */
function MinNoticeField({
  control,
  value,
  error,
  disabled,
  onChangeValue,
  onChangeUnit,
}: {
  control: Control<SettingsFormValues>;
  value: number;
  error?: string;
  disabled: boolean;
  onChangeValue: (next: string) => void;
  onChangeUnit: (unit: TimeUnit) => void;
}) {
  const unit = useWatch({ control, name: "min_notice_unit" });
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={Number.isNaN(value) ? "" : value}
          disabled={disabled}
          onChange={(e) => onChangeValue(e.target.value)}
          aria-label="Antelación mínima"
          className="w-24"
        />
        <Select
          value={unit}
          onValueChange={(next) => onChangeUnit(next as TimeUnit)}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Unidad de antelación" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIME_UNIT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function buildSettingsFormFields(opts: {
  /** Sin `scheduling:manage` el formulario es de solo lectura. */
  canManage: boolean;
}): Array<FieldConfig<SettingsFormValues>> {
  const readOnly = () => !opts.canManage;

  return [
    createInputField<SettingsFormValues>("slot_capacity", {
      label: "Citas simultáneas por horario",
      description: "Cuántas citas caben en el mismo bloque (1–50).",
      inputKind: "number",
      inputProps: { min: 1, max: 50 },
      isDisabled: readOnly,
    }),
    createInputField<SettingsFormValues>("default_duration_minutes", {
      label: "Duración por defecto (minutos)",
      description: "Cuando la cita no referencia un servicio del catálogo.",
      inputKind: "number",
      inputProps: { min: 5, max: 480, step: 5 },
      isDisabled: readOnly,
    }),
    createInputField<SettingsFormValues>("default_buffer_minutes", {
      label: "Tiempo entre citas (minutos)",
      description: "Colchón que se reserva después de cada cita (0–120).",
      inputKind: "number",
      inputProps: { min: 0, max: 120, step: 5 },
      isDisabled: readOnly,
    }),
    createCustomField<SettingsFormValues>(
      "min_notice_value",
      ({ control, value, setValue, getError }) => (
        <MinNoticeField
          control={control}
          value={value as number}
          error={getError()}
          disabled={!opts.canManage}
          onChangeValue={(next) =>
            setValue("min_notice_value", next as unknown as number)
          }
          onChangeUnit={(unit) => setValue("min_notice_unit", unit)}
        />
      ),
      {
        label: "Antelación mínima del asistente",
        description:
          "La IA no agenda dentro de esta ventana. No aplica a las citas creadas desde el panel.",
      },
    ),
    createCustomField<SettingsFormValues>(
      "reminder_offsets_minutes",
      ({ value, setValue, getError }) => (
        <ReminderOffsetsEditor
          value={(value as number[]) ?? []}
          onChange={(offsets) => setValue("reminder_offsets_minutes", offsets)}
          disabled={!opts.canManage}
          error={getError()}
        />
      ),
      {
        label: "Recordatorios automáticos de cita",
        description:
          "Se envían al contacto antes de cada cita y se regeneran al reagendar (máximo 6).",
        colSpan: { base: 1, md: 2 },
      },
    ),
  ];
}
