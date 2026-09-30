"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { FieldList } from "@/shared/components/features/field-list/FieldList";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_DOT,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import { buildReschedulePayload } from "@/modules/scheduling/domain/appointment-payload";
import { fmtClockRange } from "@/modules/scheduling/domain/time-grid";
import { dayHeading } from "@/modules/scheduling/ui/components/calendar/AppointmentsList";
import {
  businessDayKey,
  fmtDayLong,
  fmtTime,
  todayKey as computeTodayKey,
} from "@/core/lib/business-time";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import {
  getAppointment,
  updateAppointment,
} from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import {
  hydrateContactNames,
  hydrateServiceNames,
} from "@/modules/scheduling/infrastructure/services/entity-names.cache";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import { AppointmentOriginCard } from "./AppointmentOriginCard";
import { QuickReschedule } from "./QuickReschedule";
import { StatusActions } from "./StatusActions";

function durationMinutes(appointment: AppointmentDTO): number {
  return Math.round(
    (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000,
  );
}

/**
 * Rail de detalle de la cita (DetailSheet). Adaptador de ruta, patrón
 * DealDetailRoute: `back` para la ruta interceptada, `replace` para hard-nav.
 *
 * `open` se deriva del pathname: al navegar a /create (reagendar) el slot
 * @sheet conserva su contenido en la navegación suave, así que el sheet debe
 * cerrarse solo cuando la URL deja de apuntar a la cita.
 */
export function AppointmentSheetRoute({
  appointmentId,
  closeBehavior,
}: {
  appointmentId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, user } = useAuth();
  const { showAlert } = useAlert();
  const { timezone } = useCompanySchedule();
  const [fetched, setFetched] = useState<AppointmentDTO | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState<string | null>(null);
  // Reagendar rápido: los horarios del día dentro del panel.
  const [rescheduling, setRescheduling] = useState(false);
  const [pickedTime, setPickedTime] = useState("");
  const [moving, setMoving] = useState(false);
  const [slotsKey, setSlotsKey] = useState(0);

  // Tras una mutación el store tiene la versión fresca (upsert + refresh).
  const stored = useCalendarStore((s) => s.appointmentsById[appointmentId]);
  const upsertAppointment = useCalendarStore((s) => s.upsertAppointment);
  const refresh = useCalendarStore((s) => s.refresh);
  const appointment = stored ?? fetched;

  const canManage = hasPermission("scheduling:manage");
  const open = pathname !== null && pathname.includes(`/appointment/${appointmentId}`);

  const close = () => {
    if (closeBehavior === "back") router.back();
    else router.replace("/scheduling/calendar");
  };

  const fetchDetail = useCallback(async (id: string | number) => {
    const data = await getAppointment(String(id));
    setFetched(data);
    return data;
  }, []);

  const onUpdated = (fresh: AppointmentDTO) => {
    setFetched(fresh);
    upsertAppointment(fresh);
    void refresh();
  };

  // Otra cita en el mismo panel (ruta interceptada): se sale de reagendar.
  useEffect(() => {
    setRescheduling(false);
    setPickedTime("");
  }, [appointmentId]);

  // Hidratación de nombres (el DTO no los embebe; caché compartida del slice).
  useEffect(() => {
    if (appointment === null) return;
    let alive = true;
    void hydrateContactNames([appointment.contact_id]).then((names) => {
      if (alive) setContactName(names[appointment.contact_id] ?? "Contacto");
    });
    if (appointment.product_id !== null) {
      const productId = appointment.product_id;
      void hydrateServiceNames()
        .then((services) => {
          if (alive) setServiceName(services.get(productId) ?? "Servicio");
        })
        .catch(() => {
          if (alive) setServiceName("Servicio");
        });
    }
    return () => {
      alive = false;
    };
  }, [appointment]);

  const tz = timezone;
  const today = tz !== null ? computeTodayKey(new Date(), tz) : null;

  const moveTo = async () => {
    if (appointment === null || tz === null || today === null || pickedTime === "" || moving) return;
    const ownDay = businessDayKey(appointment.starts_at, tz);
    setMoving(true);
    try {
      const fresh = await updateAppointment(
        appointment.id,
        buildReschedulePayload(
          {
            date: ownDay < today ? today : ownDay,
            time: pickedTime,
            productId: appointment.product_id ?? undefined,
            durationMinutes: durationMinutes(appointment),
          },
          tz,
        ),
      );
      onUpdated(fresh);
      setRescheduling(false);
      setPickedTime("");
      showAlert({ tone: "success", title: "Cita reagendada · los recordatorios se regeneran solos" });
    } catch (err) {
      if (isHttpError(err) && err.is("scheduling/slot_unavailable")) {
        // Se llenó entre elegir y mover: se refrescan los horarios.
        setPickedTime("");
        setSlotsKey((k) => k + 1);
        showAlert({ tone: "error", title: "Ese horario se acaba de ocupar. Elige otro." });
      } else {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo reagendar la cita") });
      }
    } finally {
      setMoving(false);
    }
  };

  const minutes = appointment !== null ? durationMinutes(appointment) : null;
  const subtitle =
    appointment === null
      ? undefined
      : appointment.product_id !== null
        ? `${serviceName ?? "Servicio"} · ${minutes} min`
        : `${minutes} min`;

  return (
    <DetailSheet
      id={appointmentId}
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      renderFooter={() =>
        appointment === null || !canManage ? null : rescheduling ? (
          <div className="flex w-full items-center gap-2">
            <Button
              variant="contrast"
              className="rounded-full"
              disabled={pickedTime === "" || moving}
              onClick={() => void moveTo()}
            >
              {moving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {pickedTime === "" ? "Elige un horario" : `Mover a las ${pickedTime.replace(/^0/, "")}`}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={moving}
              onClick={() => {
                setRescheduling(false);
                setPickedTime("");
              }}
            >
              Volver
            </Button>
          </div>
        ) : (
          <StatusActions
            appointment={appointment}
            onUpdated={onUpdated}
            onReschedule={() => setRescheduling(true)}
          />
        )
      }
      title={contactName ?? "Cita"}
      subtitle={subtitle}
      fetchDetail={fetchDetail}
      skeleton={
        <div className="space-y-3 p-1" role="status" aria-label="Cargando cita">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      }
    >
      {appointment !== null && tz !== null && today !== null && (
        <div className="flex flex-col gap-5">
          <span className="inline-flex h-7 items-center gap-2 self-start rounded-full bg-secondary px-3 text-sm font-medium">
            <span aria-hidden className={cn("size-2 rounded-full", APPOINTMENT_STATUS_DOT[appointment.status])} />
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </span>

          <FieldList
            items={[
              {
                label: "Fecha",
                value: dayHeading(businessDayKey(appointment.starts_at, tz), today),
              },
              {
                label: "Hora",
                value: (
                  <span className="tabular-nums">
                    {fmtClockRange(appointment.starts_at, appointment.ends_at, tz)}{" "}
                    <span className="text-muted-foreground">· {minutes} min</span>
                  </span>
                ),
              },
              { label: "Notas", value: appointment.notes, block: true },
            ]}
          />

          <AppointmentOriginCard
            appointment={appointment}
            currentUserId={user?.id ?? null}
            timezone={tz}
          />

          {appointment.status === "cancelled" && (
            <div className="rounded-2xl border border-border bg-background p-3.5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <span aria-hidden className="size-2 rounded-full bg-destructive" />
                Cita cancelada
              </p>
              {appointment.cancelled_at !== null && (
                <p className="mt-1 text-xs text-muted-foreground first-letter:uppercase">
                  {fmtDayLong(businessDayKey(appointment.cancelled_at, tz))} · {fmtTime(appointment.cancelled_at, tz)}
                </p>
              )}
              {appointment.cancellation_reason !== null && (
                <p className="mt-2 text-sm text-foreground/80">{appointment.cancellation_reason}</p>
              )}
            </div>
          )}

          {rescheduling && (
            <QuickReschedule
              appointment={appointment}
              contactName={contactName}
              timezone={tz}
              todayKey={today}
              selectedTime={pickedTime}
              refreshKey={slotsKey}
              onPick={setPickedTime}
            />
          )}
        </div>
      )}
    </DetailSheet>
  );
}
