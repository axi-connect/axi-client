"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareText, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { FieldList } from "@/shared/components/features/field-list/FieldList";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import {
  businessDayKey,
  fmtDayLong,
  fmtTime,
  fmtTimeRange,
} from "@/modules/scheduling/domain/business-time";
import { useCompanySchedule } from "@/modules/scheduling/infrastructure/hooks/use-company-schedule";
import { getAppointment } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import {
  hydrateContactNames,
  hydrateServiceNames,
} from "@/modules/scheduling/infrastructure/services/entity-names.cache";

function durationMinutes(appointment: AppointmentDTO): number {
  return Math.round(
    (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000,
  );
}

/**
 * Rail de detalle de la cita (DetailSheet). Adaptador de ruta, patrón
 * DealDetailRoute: `back` para la ruta interceptada, `replace` para hard-nav.
 * Solo lectura en F1 — las acciones (confirmar/reagendar/cancelar) llegan en F2.
 */
export function AppointmentSheetRoute({
  appointmentId,
  closeBehavior,
}: {
  appointmentId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();
  const { timezone } = useCompanySchedule();
  const [appointment, setAppointment] = useState<AppointmentDTO | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState<string | null>(null);

  const close = () => {
    if (closeBehavior === "back") router.back();
    else router.replace("/scheduling/calendar");
  };

  const fetchDetail = useCallback(async (id: string | number) => {
    const data = await getAppointment(String(id));
    setAppointment(data);
    return data;
  }, []);

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
  const isAi = appointment?.created_by_type === "ai_agent";

  return (
    <DetailSheet
      id={appointmentId}
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="md"
      title={contactName ?? "Cita"}
      subtitle={
        appointment !== null && tz !== null
          ? `${fmtDayLong(businessDayKey(appointment.starts_at, tz))} · ${fmtTime(appointment.starts_at, tz)}`
          : undefined
      }
      fetchDetail={fetchDetail}
      skeleton={
        <div className="space-y-3 p-1" role="status" aria-label="Cargando cita">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      }
    >
      {appointment !== null && tz !== null && (
        <div className="space-y-4">
          <Badge className={APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status]}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>

          <FieldList
            items={[
              { label: "Contacto", value: contactName ?? "Contacto" },
              {
                label: "Fecha",
                value: (
                  <span className="capitalize">
                    {fmtDayLong(businessDayKey(appointment.starts_at, tz))}
                  </span>
                ),
              },
              {
                label: "Hora",
                value: (
                  <span className="tabular-nums">
                    {fmtTimeRange(appointment.starts_at, appointment.ends_at, tz)}{" "}
                    <span className="font-normal text-muted-foreground">({tz})</span>
                  </span>
                ),
              },
              { label: "Duración", value: `${durationMinutes(appointment)} min` },
              {
                label: "Servicio",
                value: appointment.product_id !== null ? (serviceName ?? "Servicio") : null,
              },
              { label: "Notas", value: appointment.notes, block: true },
            ]}
          />

          {isAi && (
            <div className="rounded-xl border border-accent-violet/30 bg-accent-violet/5 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <Sparkles aria-hidden className="size-3.5 text-accent-violet" />
                Agendada por el asistente
              </p>
              {appointment.conversation_id !== null && (
                <Link
                  href={`/workspace/inbox/${appointment.conversation_id}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent-violet hover:underline"
                >
                  <MessageSquareText aria-hidden className="size-3.5" />
                  Ver conversación
                </Link>
              )}
            </div>
          )}

          {appointment.status === "cancelled" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Cita cancelada</p>
              {appointment.cancelled_at !== null && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtDayLong(businessDayKey(appointment.cancelled_at, tz))} ·{" "}
                  {fmtTime(appointment.cancelled_at, tz)}
                </p>
              )}
              {appointment.cancellation_reason !== null && (
                <p className="mt-1.5 text-xs">{appointment.cancellation_reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </DetailSheet>
  );
}
