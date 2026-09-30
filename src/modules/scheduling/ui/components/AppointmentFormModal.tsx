"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getAppointment } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import {
  hydrateContactNames,
  hydrateServiceNames,
} from "@/modules/scheduling/infrastructure/services/entity-names.cache";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { readCreatePrefill } from "@/modules/scheduling/domain/time-grid";
import { AppointmentComposer, type ComposerMode } from "./appointment-form/AppointmentComposer";

/**
 * Modal de crear/reagendar cita (ruta /scheduling/calendar/create, con
 * `?reschedule=<id>` para reagendar y `?date=&time=` para el hueco tocado).
 * `open` se deriva del pathname: en App Router un slot paralelo conserva su
 * último contenido en la navegación suave, así que el modal se cierra solo
 * cuando la URL deja de ser /create.
 *
 * Lienzo Agenda premium F2: ancho de dos columnas en computador y pantalla
 * completa en el celular.
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
  const { timezone, schedules, loading: scheduleLoading } = useCompanySchedule();

  const rescheduleId = searchParams.get("reschedule");
  const prefillKey = `${searchParams.get("date") ?? ""}|${searchParams.get("time") ?? ""}`;
  const prefill = useMemo(
    () => readCreatePrefill(searchParams),
    // `searchParams` es una instancia nueva por render; manda la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefillKey],
  );
  const [rescheduleMode, setRescheduleMode] = useState<ComposerMode | null>(null);
  const createMode = useMemo<ComposerMode>(() => ({ kind: "create", prefill }), [prefill]);
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
          const services = await hydrateServiceNames().catch(() => new Map<string, string>());
          serviceName = services.get(appointment.product_id) ?? "Servicio";
        }
        if (alive) {
          setRescheduleMode({
            kind: "reschedule",
            appointment,
            contactLabel: names[appointment.contact_id] ?? "Contacto",
            serviceName,
          });
        }
      } catch (err) {
        showAlert({ tone: "error", title: errorMessage(err, "La cita ya no existe") });
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
  const subtitle =
    isReschedule && mode?.kind === "reschedule"
      ? [mode.contactLabel, mode.serviceName].filter((x) => x !== null).join(" · ")
      : "Elige quién, qué y cuándo. La hora es la del negocio.";
  const ready = mode !== null && timezone !== null && !scheduleLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[56rem] max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0"
      >
        <div className="shrink-0 px-5 pt-5 pb-4 pr-16 md:px-7 md:pt-6">
          <DialogTitle className="font-heading text-2xl leading-tight font-bold tracking-tight">
            {isReschedule ? "Reagendar la cita" : "Nueva cita"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">{subtitle}</DialogDescription>
        </div>
        {ready ? (
          <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
            <AppointmentComposer
              key={`${rescheduleId ?? "new"}|${prefillKey}`}
              mode={mode}
              timezone={timezone}
              schedules={schedules}
              onCancel={close}
              onSuccess={(fresh) => router.replace(`/scheduling/calendar/appointment/${fresh.id}`)}
            />
          </div>
        ) : (
          <div className="grid gap-4 border-t border-border p-6 md:grid-cols-2" role="status" aria-label="Cargando">
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
