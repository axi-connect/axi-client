"use client";

import { useEffect, useMemo, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { listProducts } from "@/modules/catalog/public";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import {
  buildCreatePayload,
  buildReschedulePayload,
  type AppointmentFormInput,
} from "@/modules/scheduling/domain/appointment-payload";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import {
  createAppointment,
  updateAppointment,
} from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import {
  appointmentFormSchema,
  buildAppointmentFormFields,
  defaultAppointmentFormValues,
  rescheduleFormValues,
  type AppointmentFormValues,
  type ServiceOption,
} from "./config/appointment.config";

export const APPOINTMENT_FORM_ID = "appointment-form";

export type AppointmentFormMode =
  | { kind: "create" }
  | { kind: "reschedule"; appointment: AppointmentDTO; contactLabel: string; serviceName: string | null };

/**
 * Crear / reagendar cita. Vive en el Modal interceptado (@form); Guardar
 * dispara `requestSubmit()` por el id `appointment-form`.
 *
 * 409 `scheduling/slot_unavailable` (el cupo se llenó entre elegir y
 * confirmar): el modal NO se cierra — se limpia la hora y se refresca la
 * grilla de disponibilidad para elegir de nuevo.
 */
export function AppointmentForm({
  mode,
  onSuccess,
}: {
  mode: AppointmentFormMode;
  onSuccess: (fresh: AppointmentDTO) => void;
}) {
  const { showAlert } = useAlert();
  const { timezone } = useCompanySchedule();
  const refresh = useCalendarStore((s) => s.refresh);
  const upsertAppointment = useCalendarStore((s) => s.upsertAppointment);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [availabilityKey, setAvailabilityKey] = useState(0);

  useEffect(() => {
    if (mode.kind !== "create") return;
    let alive = true;
    listProducts({ kind: "service", is_active: true, page_size: 100 })
      .then((res) => {
        if (alive) {
          setServices(
            res.data.map((p) => ({
              id: p.id,
              name: p.name,
              duration_minutes: p.duration_minutes,
            })),
          );
        }
      })
      .catch(() => {
        // Sin catálogo: el formulario sigue sirviendo con duración manual.
      });
    return () => {
      alive = false;
    };
  }, [mode.kind]);

  const defaultValues = useMemo(
    () =>
      mode.kind === "reschedule" && timezone !== null
        ? rescheduleFormValues(mode.appointment, mode.contactLabel, timezone)
        : defaultAppointmentFormValues(),
    [mode, timezone],
  );

  const fields = useMemo(
    () =>
      timezone === null
        ? []
        : buildAppointmentFormFields({
            mode: mode.kind,
            services,
            timezone,
            lockedServiceName: mode.kind === "reschedule" ? mode.serviceName : undefined,
            refreshKey: availabilityKey,
          }),
    [mode, services, timezone, availabilityKey],
  );

  if (timezone === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando formulario">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <DynamicForm<AppointmentFormValues>
      id={APPOINTMENT_FORM_ID}
      schema={appointmentFormSchema}
      fields={fields}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        const input: AppointmentFormInput = {
          date: values.date,
          time: values.time,
          productId: values.product_id,
          durationMinutes: values.duration_minutes,
          notes: values.notes,
        };
        try {
          const fresh =
            mode.kind === "create"
              ? await createAppointment(
                  // El schema garantiza contact !== null (refine).
                  buildCreatePayload(values.contact!.id, input, timezone),
                )
              : await updateAppointment(
                  mode.appointment.id,
                  buildReschedulePayload(input, timezone),
                );
          upsertAppointment(fresh);
          void refresh();
          showAlert({
            tone: "success",
            title:
              mode.kind === "create"
                ? "Cita creada"
                : "Cita reagendada · los recordatorios se regeneran solos",
            open: true,
          });
          onSuccess(fresh);
        } catch (err) {
          if (isHttpError(err) && err.is("scheduling/slot_unavailable")) {
            form.setValue("time", "");
            setAvailabilityKey((key) => key + 1);
            showAlert({
              tone: "warning",
              title: "Ese horario acaba de ocuparse",
              description: "La disponibilidad se actualizó: elige otro horario.",
              open: true,
            });
            return;
          }
          if (isHttpError(err) && err.is("scheduling/product_not_bookable")) {
            form.setError("product_id", { message: errorMessage(err) });
            return;
          }
          if (isHttpError(err) && err.is("scheduling/invalid_time_range")) {
            form.setError("date", { message: "La cita no puede quedar en el pasado" });
            return;
          }
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(
                err,
                mode.kind === "create"
                  ? "No se pudo crear la cita"
                  : "No se pudo reagendar la cita",
              ),
              open: true,
            });
          }
        }
      }}
    />
  );
}
