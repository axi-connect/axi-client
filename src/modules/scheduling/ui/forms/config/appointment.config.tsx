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
import { ContactPicker } from "@/modules/crm/public";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import {
  businessDayKey,
  hhmmFromInstant,
  type DayKey,
} from "@/modules/scheduling/domain/business-time";
import { TimeAvailabilityField } from "../fields/TimeAvailabilityField";

/**
 * Config del formulario de cita (crear y reagendar). La fecha/hora se captura
 * como pared del negocio; la conversión a UTC vive en
 * `domain/appointment-payload.ts`.
 */
export const appointmentFormSchema = z.object({
  contact: z
    .object({ id: z.string(), label: z.string() })
    .nullable()
    .refine((value) => value !== null, "Elige un contacto"),
  /** "" = sin servicio (duración manual). */
  product_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige o escribe una hora"),
  duration_minutes: z.coerce
    .number({ message: "Duración inválida" })
    .int("Debe ser un entero")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 480 minutos"),
  notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number | null;
};

export function defaultAppointmentFormValues(): Partial<AppointmentFormValues> {
  return {
    contact: null,
    product_id: "",
    date: "",
    time: "",
    duration_minutes: 30,
    notes: "",
  };
}

/** Prefill del modo reagendar desde la cita existente. */
export function rescheduleFormValues(
  appointment: AppointmentDTO,
  contactLabel: string,
  tz: string,
): Partial<AppointmentFormValues> {
  const minutes = Math.round(
    (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000,
  );
  return {
    contact: { id: appointment.contact_id, label: contactLabel },
    product_id: appointment.product_id ?? "",
    date: businessDayKey(appointment.starts_at, tz) as DayKey,
    time: hhmmFromInstant(appointment.starts_at, tz),
    duration_minutes: minutes,
    notes: appointment.notes ?? "",
  };
}

const NO_SERVICE = "__none__";

export function buildAppointmentFormFields(opts: {
  mode: "create" | "reschedule";
  services: ServiceOption[];
  timezone: string;
  /** Nombre del servicio de la cita en reagendar (solo lectura). */
  lockedServiceName?: string | null;
  /** Bump para refrescar la disponibilidad tras un 409 de cupo. */
  refreshKey: number;
}): Array<FieldConfig<AppointmentFormValues>> {
  const { mode, services, timezone, lockedServiceName, refreshKey } = opts;

  const fields: Array<FieldConfig<AppointmentFormValues>> = [];

  fields.push(
    createCustomField<AppointmentFormValues>(
      "contact",
      ({ value, setValue, getError }) => {
        const contact = value as AppointmentFormValues["contact"];
        if (mode === "reschedule") {
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
      { label: "Contacto", colSpan: { base: 1, md: 2 } },
    ),
  );

  if (mode === "create") {
    fields.push(
      createCustomField<AppointmentFormValues>(
        "product_id",
        ({ value, setValue, getError }) => {
          const selected = (value as string) === "" ? NO_SERVICE : (value as string);
          return (
            <div className="space-y-1">
              <Select
                value={selected}
                onValueChange={(next) => {
                  setValue("product_id", next === NO_SERVICE ? "" : next);
                  const service = services.find((s) => s.id === next);
                  if (service?.duration_minutes != null) {
                    setValue("duration_minutes", service.duration_minutes);
                  }
                }}
              >
                <SelectTrigger aria-label="Servicio" className="w-full">
                  <SelectValue placeholder="Sin servicio — duración manual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SERVICE}>Sin servicio — duración manual</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                      {service.duration_minutes != null ? ` · ${service.duration_minutes} min` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError() !== undefined && (
                <p className="text-xs text-destructive">{getError()}</p>
              )}
            </div>
          );
        },
        {
          label: "Servicio (opcional)",
          description: "El servicio fija la duración y el espaciado de la agenda.",
        },
      ),
    );
  } else if (lockedServiceName != null) {
    fields.push(
      createCustomField<AppointmentFormValues>(
        "product_id",
        () => (
          <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
            {lockedServiceName}
          </div>
        ),
        {
          label: "Servicio",
          description: "El servicio no cambia al reagendar; su duración gobierna la cita.",
        },
      ),
    );
  }

  fields.push(
    createInputField<AppointmentFormValues>("date", {
      label: "Fecha",
      inputKind: "date",
    }),
    createInputField<AppointmentFormValues>("duration_minutes", {
      label: "Duración (minutos)",
      inputKind: "number",
      inputProps: { min: 5, max: 480, step: 5 },
      // Con servicio elegido la duración la fija el backend: no se edita.
      isVisible: (values) => values.product_id === "",
    }),
    createCustomField<AppointmentFormValues>(
      "time",
      ({ control, value, setValue, getError }) => (
        <TimeAvailabilityField
          control={control}
          value={(value as string) ?? ""}
          error={getError()}
          timezone={timezone}
          refreshKey={refreshKey}
          onChange={(time) => setValue("time", time)}
        />
      ),
      { label: "Hora", colSpan: { base: 1, md: 2 } },
    ),
  );

  if (mode === "create") {
    fields.push(
      createInputField<AppointmentFormValues>("notes", {
        label: "Notas (opcional)",
        inputKind: "textarea",
        placeholder: "Contexto para el equipo…",
        inputProps: { rows: 2, maxLength: 1000 },
        colSpan: { base: 1, md: 2 },
      }),
    );
  }

  return fields;
}
