"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getAppointment } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import {
  hydrateContactNames,
  hydrateServiceNames,
} from "@/modules/scheduling/infrastructure/services/entity-names.cache";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import {
  hhmmToMinutes,
  isWithinOpenHours,
  openHoursLabel,
  readCreatePrefill,
} from "@/modules/scheduling/domain/time-grid";
import { todayKey } from "@/core/lib/business-time";
import { dayHeading } from "./calendar/AppointmentsList";
import {
  AppointmentForm,
  APPOINTMENT_FORM_ID,
  type AppointmentFormMode,
} from "../forms/AppointmentForm";

/**
 * Modal de crear/reagendar cita (ruta /scheduling/calendar/create, con
 * `?reschedule=<id>` para el modo reagendar). `open` se deriva del pathname:
 * en App Router un slot paralelo conserva su último contenido en la
 * navegación suave, así que el modal debe cerrarse solo cuando la URL deja
 * de ser /create (mismo patrón que el rail de detalle).
 */
export function AppointmentFormModal({
  closeBehavior,
}: {
  /** `back` en la ruta interceptada; `replace` en el fallback full-page. */
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();

  const rescheduleId = searchParams.get("reschedule");
  const { timezone, schedules, loading: scheduleLoading } = useCompanySchedule();
  // Hueco tocado en el calendario: `?date=&time=` (lienzo F1).
  const prefillKey = `${searchParams.get("date") ?? ""}|${searchParams.get("time") ?? ""}`;
  const prefill = useMemo(() => {
    const read = readCreatePrefill(searchParams);
    if (read === null) return null;
    const inside = isWithinOpenHours(schedules, read.date, hhmmToMinutes(read.time));
    return {
      ...read,
      outsideHours: inside ? null : { time: read.time, openHours: openHoursLabel(schedules, read.date) },
    };
    // Solo cambia con la URL y el horario; `searchParams` es una instancia nueva por render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillKey, schedules]);
  const [rescheduleMode, setMode] = useState<AppointmentFormMode | null>(null);
  // Crear no espera nada, salvo el horario cuando hay hueco (para saber si
  // cae fuera); el formulario se monta una vez con sus valores iniciales.
  const waitingSchedule = prefill !== null && scheduleLoading;
  const createMode = useMemo<AppointmentFormMode | null>(
    () => (waitingSchedule ? null : { kind: "create", prefill }),
    [waitingSchedule, prefill],
  );
  const mode = rescheduleId !== null ? rescheduleMode : createMode;

  const open = pathname !== null && pathname.endsWith("/create");

  const close = () => {
    if (closeBehavior === "back") router.back();
    else router.replace("/scheduling/calendar");
  };

  // Modo reagendar: precargar la cita + nombres (el DTO no los embebe).
  useEffect(() => {
    if (rescheduleId === null) return;
    let alive = true;
    void (async () => {
      try {
        const appointment = await getAppointment(rescheduleId);
        const names = await hydrateContactNames([appointment.contact_id]);
        let serviceName: string | null = null;
        if (appointment.product_id !== null) {
          const services = await hydrateServiceNames().catch(
            () => new Map<string, string>(),
          );
          serviceName = services.get(appointment.product_id) ?? "Servicio";
        }
        if (alive) {
          setMode({
            kind: "reschedule",
            appointment,
            contactLabel: names[appointment.contact_id] ?? "Contacto",
            serviceName,
          });
        }
      } catch (err) {
        showAlert({
          tone: "error",
          title: errorMessage(err, "La cita ya no existe"),
        });
        close();
      }
    })();
    return () => {
      alive = false;
    };
    // `close`/`showAlert` estables por render; el efecto depende solo del id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleId]);

  const isReschedule = rescheduleId !== null;
  const prefillDescription =
    prefill !== null && timezone !== null
      ? `${dayHeading(prefill.date, todayKey(new Date(), timezone))} · ${prefill.time.replace(/^0/, "")}`
      : null;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      config={{
        title: isReschedule ? "Reagendar cita" : "Nueva cita",
        description: isReschedule
          ? "Se revalida el cupo y los recordatorios automáticos se regeneran."
          : (prefillDescription ?? "La cita se agenda en la zona horaria del negocio."),
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "appointment-cancel" },
          {
            label: isReschedule ? "Reagendar" : "Agendar cita",
            variant: "default",
            asClose: false,
            id: "appointment-save",
            onClick: () =>
              (
                document.getElementById(APPOINTMENT_FORM_ID) as HTMLFormElement | null
              )?.requestSubmit(),
          },
        ],
      }}
    >
      {mode === null ? (
        <div className="space-y-3" role="status" aria-label="Cargando cita">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <AppointmentForm
          key={prefillKey}
          mode={mode}
          onSuccess={(fresh) =>
            router.replace(`/scheduling/calendar/appointment/${fresh.id}`)
          }
        />
      )}
    </Modal>
  );
}
