import { z } from "zod";
import {
  createCustomField,
  createInputField,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { ContactPicker } from "@/modules/crm/public";
import type { ChannelDTO } from "@/modules/channels/public";
import {
  businessDayKey,
  hhmmFromInstant,
  instantFromBusiness,
} from "@/modules/scheduling/domain/business-time";
import {
  buildRrule,
  parseRrule,
  type RecurrenceWeekday,
} from "@/modules/scheduling/domain/recurrence";
import {
  REMINDER_MESSAGE_MAX,
  type CreateReminderDTO,
  type ReminderDTO,
  type UpdateReminderDTO,
} from "@/modules/scheduling/domain/reminder";
import { RecurrenceBuilder } from "../../components/reminders/RecurrenceBuilder";

/**
 * Config del formulario de recordatorio (crear/editar manuales). Dos modos:
 * "Una vez" (next_run_at futuro) y "Recurrente" (rrule del builder guiado).
 * El timezone se envía SIEMPRE = zona del negocio (no editable).
 */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const reminderFormSchema = z
  .object({
    contact: z
      .object({ id: z.string(), label: z.string() })
      .nullable()
      .refine((value) => value !== null, "Elige un contacto"),
    channel_id: z.string().min(1, "Elige un canal"),
    message: z
      .string()
      .trim()
      .min(1, "Escribe el mensaje")
      .max(REMINDER_MESSAGE_MAX, `Máximo ${REMINDER_MESSAGE_MAX} caracteres`),
    mode: z.enum(["once", "recurring"]),
    once_date: z.string(),
    once_time: z.string(),
    freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    weekdays: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])),
    month_day: z.coerce.number().int().min(1, "Entre 1 y 28").max(28, "Entre 1 y 28"),
    rec_time: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === "once") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.once_date)) {
        ctx.addIssue({ code: "custom", path: ["once_date"], message: "Elige una fecha" });
      }
      if (!TIME_REGEX.test(values.once_time)) {
        ctx.addIssue({ code: "custom", path: ["once_time"], message: "Elige una hora" });
      }
      return;
    }
    if (values.freq === "WEEKLY" && values.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Elige al menos un día" });
    }
    if (!TIME_REGEX.test(values.rec_time)) {
      ctx.addIssue({ code: "custom", path: ["rec_time"], message: "Elige la hora de envío" });
    }
  });

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;

export function defaultReminderFormValues(): Partial<ReminderFormValues> {
  return {
    contact: null,
    channel_id: "",
    message: "",
    mode: "once",
    once_date: "",
    once_time: "09:00",
    freq: "WEEKLY",
    weekdays: [],
    month_day: 1,
    rec_time: "09:00",
  };
}

/** Prefill de edición. Si la rrule no es del subset, el builder avisa del reemplazo. */
export function reminderFormValuesFrom(
  reminder: ReminderDTO,
  contactLabel: string,
  tz: string,
): { values: Partial<ReminderFormValues>; unparsedRrule: string | null } {
  const base: Partial<ReminderFormValues> = {
    ...defaultReminderFormValues(),
    contact:
      reminder.contact_id !== null ? { id: reminder.contact_id, label: contactLabel } : null,
    channel_id: reminder.channel_id,
    message: reminder.message,
  };

  if (reminder.schedule_rrule === null) {
    return {
      values: {
        ...base,
        mode: "once",
        once_date:
          reminder.next_run_at !== null ? businessDayKey(reminder.next_run_at, tz) : "",
        once_time:
          reminder.next_run_at !== null ? hhmmFromInstant(reminder.next_run_at, tz) : "09:00",
      },
      unparsedRrule: null,
    };
  }

  const config = parseRrule(reminder.schedule_rrule);
  if (config === null) {
    return { values: { ...base, mode: "recurring" }, unparsedRrule: reminder.schedule_rrule };
  }
  return {
    values: {
      ...base,
      mode: "recurring",
      freq: config.freq,
      weekdays: (config.byWeekdays ?? []) as RecurrenceWeekday[],
      month_day: config.byMonthDay ?? 1,
      rec_time: `${String(config.hour).padStart(2, "0")}:${String(config.minute).padStart(2, "0")}`,
    },
    unparsedRrule: null,
  };
}

function rruleFromValues(values: ReminderFormValues): string | null {
  const [hour, minute] = values.rec_time.split(":").map(Number);
  return buildRrule({
    freq: values.freq,
    byWeekdays: values.freq === "WEEKLY" ? values.weekdays : undefined,
    byMonthDay: values.freq === "MONTHLY" ? values.month_day : undefined,
    hour,
    minute,
  });
}

export function toCreateReminderDto(values: ReminderFormValues, tz: string): CreateReminderDTO {
  const base = {
    // El schema garantiza contact !== null (refine).
    contact_id: values.contact!.id,
    channel_id: values.channel_id,
    message: values.message.trim(),
    timezone: tz,
  };
  if (values.mode === "once") {
    return { ...base, next_run_at: instantFromBusiness(values.once_date, values.once_time, tz) };
  }
  return { ...base, schedule_rrule: rruleFromValues(values) ?? undefined };
}

/**
 * PATCH de edición. Recurrente: NO se manda `next_run_at` (el backend lo
 * recalcula solo al cambiar la rrule). One-shot: se manda el nuevo instante
 * y `schedule_rrule: null` por si antes era recurrente.
 */
export function toUpdateReminderDto(values: ReminderFormValues, tz: string): UpdateReminderDTO {
  if (values.mode === "once") {
    return {
      message: values.message.trim(),
      schedule_rrule: null,
      next_run_at: instantFromBusiness(values.once_date, values.once_time, tz),
    };
  }
  return {
    message: values.message.trim(),
    schedule_rrule: rruleFromValues(values),
    timezone: tz,
  };
}

const MODE_OPTIONS = [
  { value: "once", label: "Una vez" },
  { value: "recurring", label: "Recurrente" },
] as const;

export function buildReminderFormFields(opts: {
  mode: "create" | "edit";
  channels: ChannelDTO[];
  timezone: string;
  unparsedRrule: string | null;
}): Array<FieldConfig<ReminderFormValues>> {
  const connected = opts.channels.filter((channel) => channel.status === "connected");

  return [
    createCustomField<ReminderFormValues>(
      "contact",
      ({ value, setValue, getError }) => {
        const contact = value as ReminderFormValues["contact"];
        if (opts.mode === "edit") {
          return (
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
              {contact?.label ?? "Contacto"}
            </div>
          );
        }
        return (
          <ContactPicker
            value={contact}
            onChange={(next) => setValue("contact", next)}
            error={getError()}
          />
        );
      },
      { label: "Contacto" },
    ),
    createCustomField<ReminderFormValues>(
      "channel_id",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <Select
            value={(value as string) === "" ? undefined : (value as string)}
            onValueChange={(next) => setValue("channel_id", next)}
          >
            <SelectTrigger
              aria-label="Canal"
              aria-invalid={getError() !== undefined}
              className={cn("w-full", getError() !== undefined && "border-destructive")}
            >
              <SelectValue placeholder="Elige un canal…" />
            </SelectTrigger>
            <SelectContent>
              {connected.length === 0 && (
                <SelectItem value="__none__" disabled>
                  Sin canales conectados
                </SelectItem>
              )}
              {connected.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                  {channel.display_phone_number !== null
                    ? ` (${channel.display_phone_number})`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError() !== undefined && (
            <p className="text-xs text-destructive">{getError()}</p>
          )}
        </div>
      ),
      {
        label: "Canal",
        description: "El contacto debe ser alcanzable por el canal elegido.",
      },
    ),
    createInputField<ReminderFormValues>("message", {
      label: `Mensaje (máx. ${REMINDER_MESSAGE_MAX})`,
      inputKind: "textarea",
      placeholder: "Ej.: ¡Hola! Te recordamos enviar el comprobante de pago…",
      inputProps: { rows: 3, maxLength: REMINDER_MESSAGE_MAX },
      colSpan: { base: 1, md: 2 },
    }),
    createCustomField<ReminderFormValues>(
      "mode",
      ({ value, setValue }) => (
        <SegmentedControl
          // `CustomFieldRenderArgs.value` es el valor del propio campo y llega
          // como `unknown`: se estrecha aquí, en el borde del formulario.
          value={value as ReminderFormValues["mode"]}
          onValueChange={(mode) => setValue("mode", mode)}
          label="Modo de envío"
          size="sm"
          surface="inline"
          items={MODE_OPTIONS}
        />
      ),
      {
        label: "¿Cuándo se envía?",
        description: `Las horas son de la zona del negocio (${opts.timezone}).`,
        colSpan: { base: 1, md: 2 },
      },
    ),
    createInputField<ReminderFormValues>("once_date", {
      label: "Fecha",
      inputKind: "date",
      isVisible: (values) => values.mode === "once",
    }),
    createInputField<ReminderFormValues>("once_time", {
      label: "Hora",
      inputKind: "time",
      isVisible: (values) => values.mode === "once",
    }),
    createCustomField<ReminderFormValues>(
      "freq",
      ({ control, setValue }) => (
        <RecurrenceBuilder
          control={control}
          setValue={setValue}
          unparsedRrule={opts.unparsedRrule}
        />
      ),
      {
        label: "Recurrencia",
        colSpan: { base: 1, md: 2 },
        isVisible: (values) => values.mode === "recurring",
      },
    ),
  ];
}
