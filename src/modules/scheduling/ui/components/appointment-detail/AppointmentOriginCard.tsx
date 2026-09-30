"use client";

import Link from "next/link";
import { MessageSquareText, Phone, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { appointmentOrigin, type AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { businessDayKey, fmtDayLong, fmtTime } from "@/core/lib/business-time";

/** «29 de septiembre, 4:12 p. m.» en la zona del negocio. */
function when(iso: string, tz: string): string {
  const day = fmtDayLong(businessDayKey(iso, tz)).split(", ")[1]?.replace(/ de \d{4}$/, "") ?? "";
  return `${day}, ${fmtTime(iso, tz)}`;
}

/**
 * De dónde viene la cita (lienzo Agenda premium F1, «De dónde viene»):
 *
 * - Axi la agendó en una llamada → «Ver llamada» abre esa llamada (`/calls/:id`).
 *   Antes el enlace decía «Ver conversación» y llevaba al Inbox con el id de la
 *   llamada: una conversación que no existe.
 * - Axi la agendó en una conversación → «Ver conversación» abre el hilo.
 * - La creó el equipo → dice quién, sin enlace.
 *
 * Lo que dice Axi va en violeta (DESIGN §7.1: «Axi propone en voz baja»).
 */
export function AppointmentOriginCard({
  appointment,
  currentUserId,
  timezone,
}: {
  appointment: AppointmentDTO;
  currentUserId: string | null;
  timezone: string;
}) {
  const origin = appointmentOrigin(appointment);
  const created = when(appointment.created_at, timezone);
  const byAgent = appointment.created_by_type === "ai_agent";

  if (origin.kind === "team" || !byAgent) {
    const who =
      appointment.created_by_user_id != null && appointment.created_by_user_id === currentUserId
        ? "Creada por ti"
        : byAgent
          ? "Agendada por Axi"
          : "Creada por tu equipo";
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3.5">
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground/80 ring-1 ring-border"
        >
          {byAgent ? <Sparkles className="size-4 text-accent-violet" /> : <UserRound className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{who}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {byAgent ? `El ${created}` : `Desde la agenda, el ${created}`}
          </p>
        </div>
      </div>
    );
  }

  const isCall = origin.kind === "call";
  const href = isCall ? `/calls/${origin.callSessionId}` : `/workspace/inbox/${origin.conversationId}`;
  const Icon = isCall ? Phone : MessageSquareText;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-accent-violet/7 p-3.5">
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border"
      >
        <Sparkles className="size-4 text-accent-violet" />
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div>
          <p className="text-sm font-semibold">
            {isCall ? "Agendada por Axi en una llamada" : "Agendada por Axi en una conversación"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">El {created}</p>
        </div>
        <Link
          href={href}
          className={cn(
            "inline-flex h-9 items-center gap-2 self-start rounded-full border border-border bg-card px-3.5 text-sm font-medium whitespace-nowrap",
            "transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
        >
          <Icon aria-hidden className="size-4" />
          {isCall ? "Ver llamada" : "Ver conversación"}
        </Link>
      </div>
    </div>
  );
}
