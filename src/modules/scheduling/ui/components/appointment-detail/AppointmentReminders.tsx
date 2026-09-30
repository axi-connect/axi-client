"use client";

import { useEffect, useState } from "react";
import { cn } from "@/core/lib/utils";
import { listChannels } from "@/modules/channels/public";
import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import {
  appointmentReminderRows,
  type AppointmentReminderRow,
} from "@/modules/scheduling/domain/appointment-reminders";
import { fmtClock } from "@/modules/scheduling/domain/time-grid";
import { businessDayKey, todayKey as computeTodayKey } from "@/core/lib/business-time";
import { listReminders } from "@/modules/scheduling/infrastructure/services/reminders-service.adapter";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { dayHeading } from "../calendar/AppointmentsList";

const STATE = {
  scheduled: { dot: "bg-info", label: "Programado" },
  sent: { dot: "bg-success", label: "Enviado" },
  off: { dot: "bg-muted-foreground", label: "No se envía" },
} as const;

/** «Hoy, 9:00» / «Mañana, 10:30» / «Jueves 1 de octubre, 9:00». */
function when(iso: string, tz: string, today: string): string {
  const heading = dayHeading(businessDayKey(iso, tz), today).split(" · ")[0];
  return `${heading}, ${fmtClock(iso, tz)}`;
}

/**
 * «Axi le recuerda por WhatsApp Ventas» (lienzo F2): los recordatorios de esta
 * cita, con cuándo sale cada uno y si ya salió. El backend lista por contacto;
 * se filtran por la cita. Si falla, el bloque no se pinta (es contexto, no un
 * dato del que dependa una acción).
 */
export function AppointmentReminders({
  appointment,
  timezone,
}: {
  appointment: AppointmentDTO;
  timezone: string;
}) {
  const [rows, setRows] = useState<{ appointmentId: string; rows: AppointmentReminderRow[] } | null>(null);
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    listReminders({ contact_id: appointment.contact_id })
      .then((reminders) => {
        if (alive) setRows({ appointmentId: appointment.id, rows: appointmentReminderRows(reminders, appointment) });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    listChannels()
      .then((res) => {
        if (alive) setChannels(Object.fromEntries(res.data.map((c) => [c.id, c.name])));
      })
      .catch(() => {
        // Sin nombres de canal: el título queda genérico.
      });
    return () => {
      alive = false;
    };
    // Se recarga al cambiar de cita, de hora o de estado (reagendar/cancelar rehacen los recordatorios).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id, appointment.starts_at, appointment.status, appointment.contact_id]);

  if (failed) return null;

  const current = rows !== null && rows.appointmentId === appointment.id ? rows.rows : null;
  const ended = appointment.status === "cancelled" || appointment.status === "completed" || appointment.status === "no_show";
  const channelIds = [...new Set((current ?? []).map((r) => r.channelId))];
  const channelName = channelIds.length === 1 ? channels[channelIds[0]] : undefined;
  const today = computeTodayKey(new Date(), timezone);

  return (
    <section aria-label="Recordatorios de la cita" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground/85">
        {current !== null && current.length > 0 && !ended && channelName !== undefined
          ? `Axi le recuerda por ${channelName}`
          : "Recordatorios"}
      </h3>
      {current === null ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Cargando recordatorios">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : current.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ended
            ? appointment.status === "cancelled"
              ? "Ya no se envían: la cita se canceló."
              : "La cita ya pasó."
            : "Esta cita no tiene recordatorios. Los defines en Configuración."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {current.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm"
            >
              <span aria-hidden className={cn("size-2 rounded-full", STATE[row.state].dot)} />
              <span className="min-w-0 truncate">
                <span className="font-medium">{when(row.at, timezone, today)}</span>
                <span className="text-muted-foreground"> · {row.lead}</span>
              </span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">{STATE[row.state].label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
