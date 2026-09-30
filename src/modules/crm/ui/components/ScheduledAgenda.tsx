"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, History, Mail, MessageSquare, MessageSquareText, PhoneCall, RotateCw, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  agendaSections,
  failureSentence,
  openingDeliveryLabel,
  whenLabel,
  type AgendaWaitingGroup,
} from "@/modules/crm/domain/scheduled-agenda";
import { TASK_BADGE_KEY, taskBadgeMap, taskDisplayState } from "@/modules/crm/domain/task-execution";
import { addDaysToKey, minutesIntoDay, todayKey, type DayKey } from "@/core/lib/business-time";

/**
 * «Programados» (F2 + hotfix plantillas, lienzo aprobado 2026-09-29): a quién,
 * con qué plantilla y cómo va. Tres secciones en orden de urgencia:
 *
 * - **No llegaron**: la apertura que Meta rechazó, con su motivo, «Reenviar» y
 *   «Ver en el chat». La tarea está en pausa hasta que alguien la reenvíe.
 * - **Esperando respuesta**: ya salió; cada contacto dice si la leyó y hasta
 *   cuándo se espera. Un lote se agrupa bajo su título, una sola vez.
 * - **Por salir**: lo que el agente va a hacer, día por día (`next_run_at`).
 */
export function ScheduledAgenda({
  tasks,
  loading,
  tz,
  agentNames,
  quietHours,
  onInspect,
  onResend,
}: {
  tasks: readonly ActivityDTO[];
  loading: boolean;
  tz: string;
  agentNames: ReadonlyMap<string, string>;
  quietHours: { start: number; end: number } | null;
  onInspect: (task: ActivityDTO) => void;
  /** Reenvía la apertura fallida; sin él (sin permiso para responder) no hay botón. */
  onResend?: (task: ActivityDTO) => Promise<void>;
}) {
  if (loading && tasks.length === 0) return <TableSkeleton rows={5} showHeader={false} />;
  if (tasks.length === 0) {
    return (
      <EmptyState
        glyph="time"
        variant="solid"
        title="Nada programado"
        description="Cuando programes un seguimiento, aquí verás el día y la hora en que el agente lo hará."
      />
    );
  }

  const now = new Date();
  const { failed, waiting, upcoming } = agendaSections(tasks, tz);
  const waitingCount = waiting.reduce((sum, group) => sum + group.tasks.length, 0);

  return (
    <div className="space-y-5">
      {failed.length > 0 && (
        <AgendaCard
          title="No llegaron"
          aside={`${countLabel(failed.length)} · el seguimiento queda en pausa hasta que la reenvíes`}
        >
          <ul className="divide-y divide-border">
            {failed.map((task) => (
              <FailedRow key={task.id} task={task} now={now} tz={tz} onResend={onResend} />
            ))}
          </ul>
        </AgendaCard>
      )}

      {waiting.length > 0 && (
        <AgendaCard
          title="Esperando respuesta"
          aside={`${countLabel(waitingCount)} · si responden, el agente retoma la conversación`}
        >
          {waiting.map((group) => (
            <WaitingGroup
              key={group.key}
              group={group}
              agentName={group.agentId === null ? null : (agentNames.get(group.agentId) ?? "Agente")}
              now={now}
              tz={tz}
              onInspect={onInspect}
            />
          ))}
        </AgendaCard>
      )}

      {upcoming.map(({ day, tasks: dayTasks }) => (
        <UpcomingDay
          key={day}
          day={day}
          tasks={dayTasks}
          today={todayKey(now, tz)}
          tz={tz}
          quietHours={quietHours}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
}

function AgendaCard({ title, aside, children }: { title: string; aside: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-3xl border border-border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 pt-4 pb-3">
        <h3 className="font-heading text-lg font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{aside}</span>
      </header>
      {children}
    </section>
  );
}

function ContactCell({ task, sub }: { task: ActivityDTO; sub: string | null }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{task.contact_name ?? "Sin nombre"}</p>
      {sub !== null && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FailedRow({
  task,
  now,
  tz,
  onResend,
}: {
  task: ActivityDTO;
  now: Date;
  tz: string;
  onResend?: (task: ActivityDTO) => Promise<void>;
}) {
  const [resending, setResending] = useState(false);
  const opening = task.last_opening;
  // La hora va FUERA del truncado: a 390–1024 px el nombre de la plantilla se
  // corta y la hora tiene que seguir a la vista (auditoría B8).
  const meta = [
    task.opening_template ? `Plantilla «${task.opening_template.name}»` : null,
    task.bulk_id !== null && task.title ? `lote «${task.title}»` : null,
  ].filter((part): part is string => part !== null);
  const sentAt = opening?.sent_at ? whenLabel(opening.sent_at, now, tz) : null;
  const canResend = onResend !== undefined && opening?.conversation_id != null && opening.message_id != null;

  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-5 py-3.5 md:grid-cols-[20px_minmax(0,0.8fr)_minmax(0,1.6fr)_auto] md:items-center">
      <AlertCircle aria-label="No llegó" className="mt-0.5 size-4 text-destructive md:mt-0" />
      <ContactCell task={task} sub={task.contact_phone} />
      <div className="col-start-2 min-w-0 md:col-start-auto">
        <p className="text-sm text-pretty text-foreground/85">{failureSentence(task)}</p>
        {(meta.length > 0 || sentAt !== null) && (
          <p className="flex min-w-0 gap-1 text-xs text-muted-foreground">
            {meta.length > 0 && <span className="min-w-0 truncate">{meta.join(" · ")}</span>}
            {sentAt !== null && (
              <span className="shrink-0 whitespace-nowrap">
                {meta.length > 0 ? "· " : ""}
                {sentAt}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="col-start-2 flex flex-wrap gap-2 md:col-start-auto">
        {canResend && (
          <Button
            type="button"
            variant="contrast"
            size="sm"
            className="rounded-full"
            disabled={resending}
            onClick={() => {
              setResending(true);
              void onResend?.(task).finally(() => setResending(false));
            }}
          >
            <RotateCw aria-hidden className={cn("size-3.5", resending && "animate-spin motion-reduce:animate-none")} />
            {resending ? "Reenviando…" : "Reenviar"}
          </Button>
        )}
        {opening?.conversation_id != null && (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/workspace/inbox/${opening.conversation_id}`}>Ver en el chat</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function WaitingGroup({
  group,
  agentName,
  now,
  tz,
  onInspect,
}: {
  group: AgendaWaitingGroup;
  agentName: string | null;
  now: Date;
  tz: string;
  onInspect: (task: ActivityDTO) => void;
}) {
  const meta = [
    group.bulk ? "Seguimiento en lote" : "Tarea suelta",
    agentName,
    group.templateName ? `abre con «${group.templateName}»` : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2.5 bg-muted/60 px-5 py-2.5">
        <Sparkles aria-hidden className="size-3.5 shrink-0 text-accent-violet" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{group.title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {group.tasks.map((task) => {
          const delivery = openingDeliveryLabel(task, now, tz);
          return (
            <li
              key={task.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-5 py-3 md:grid-cols-[minmax(0,1.3fr)_11rem_minmax(0,1fr)_auto]"
            >
              <ContactCell task={task} sub={task.contact_phone} />
              <span className="order-3 col-span-2 md:order-none md:col-span-1">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap">
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", delivery.read ? "bg-foreground" : "bg-muted-foreground")}
                  />
                  {delivery.text}
                </span>
              </span>
              <span className="order-4 col-span-2 truncate text-xs text-muted-foreground md:order-none md:col-span-1">
                {task.awaiting_reply_until ? `Espera hasta ${whenLabel(task.awaiting_reply_until, now, tz)}` : null}
              </span>
              <InspectButton task={task} onInspect={onInspect} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UpcomingDay({
  day,
  tasks,
  today,
  tz,
  quietHours,
  onInspect,
}: {
  day: DayKey;
  tasks: ActivityDTO[];
  today: DayKey;
  tz: string;
  quietHours: { start: number; end: number } | null;
  onInspect: (task: ActivityDTO) => void;
}) {
  const tomorrow = addDaysToKey(today, 1);
  const quietActive = quietHours !== null && quietHours.start !== quietHours.end;
  const isQuiet = (task: ActivityDTO) => {
    if (!quietActive) return false;
    const hour = Math.floor(minutesIntoDay(task.next_run_at ?? task.due_at ?? "", tz) / 60);
    return quietHours.start < quietHours.end
      ? hour >= quietHours.start && hour < quietHours.end
      : hour >= quietHours.start || hour < quietHours.end;
  };

  return (
    <section aria-label={dayLabel(day)} className="overflow-hidden rounded-3xl border border-border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 pt-4 pb-3">
        <h3 className="font-heading text-lg font-bold">
          {day === today ? "Por salir hoy" : day === tomorrow ? "Por salir mañana" : `Por salir el ${dayLabel(day)}`}
          {(day === today || day === tomorrow) && (
            <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">{dayLabel(day)}</span>
          )}
        </h3>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Conteo por MEDIO: la agenda mezcla mensajes y llamadas (F3). */}
          {mediumCounts(tasks).map(({ medium, count }) => (
            <span key={medium} className="inline-flex items-center gap-1.5">
              <MediumIcon medium={medium} className="size-3.5" />
              {count} {mediumNoun(medium, count)}
            </span>
          ))}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {tasks.map((task) => {
          const minutes = minutesIntoDay(task.next_run_at ?? task.due_at ?? "", tz);
          const quiet = isQuiet(task);
          const state = taskDisplayState(task);
          const how =
            task.task_medium === "call"
              ? "Llamada"
              : task.task_medium === "email"
                ? "Correo del paso"
                : task.task_medium === "sms"
                  ? "SMS del paso"
                  : task.opening_template
                    ? `Abre con «${task.opening_template.name}»`
                    : "Mensaje del agente";
          return (
            <li
              key={task.id}
              className={cn(
                "grid grid-cols-[5.75rem_20px_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3",
                // Lo que cae en horario silencioso va rayado, como en el lienzo:
                // se lee «no sale ahora» sin sumar otro color.
                quiet && "bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,transparent_6px_12px)]",
              )}
            >
              <div className={cn("font-mono text-sm whitespace-nowrap tabular-nums", quiet && "text-muted-foreground")}>
                {clock(minutes)}
              </div>
              <MediumIcon medium={agendaMediumOf(task)} className="size-4 text-accent-violet" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{task.contact_name ?? "Sin nombre"}</span>
                  {state.label !== null && (
                    <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} appearance="dot" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[task.title ?? task.objective, how].filter(Boolean).join(" · ")}
                </p>
              </div>
              <InspectButton task={task} onInspect={onInspect} />
            </li>
          );
        })}
      </ul>
      {tasks.some(isQuiet) && quietActive && (
        <p className="flex items-center gap-2 border-t border-dashed border-border px-4 py-2 text-xs text-muted-foreground">
          Lo sombreado cae en el horario silencioso ({clock(quietHours.start * 60)}–{clock(quietHours.end * 60)}):
          saldrá a las {clock(quietHours.end * 60)}.
        </p>
      )}
    </section>
  );
}

function InspectButton({ task, onInspect }: { task: ActivityDTO; onInspect: (task: ActivityDTO) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      aria-label={`Ver ejecuciones de ${task.contact_name ?? "la tarea"}`}
      onClick={() => onInspect(task)}
    >
      <History className="size-4" />
    </Button>
  );
}

function countLabel(count: number): string {
  return count === 1 ? "1 contacto" : `${String(count)} contactos`;
}

function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "a. m." : "p. m."}`;
}

function dayLabel(day: DayKey): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "");
}

type AgendaMedium = "message" | "call" | "email" | "sms";
const AGENDA_MEDIA: readonly AgendaMedium[] = ["message", "call", "email", "sms"];

/** P3a: el correo y el SMS de una secuencia se cuentan y se pintan como lo que son. */
function agendaMediumOf(task: ActivityDTO): AgendaMedium {
  return task.task_medium === "call" || task.task_medium === "email" || task.task_medium === "sms"
    ? task.task_medium
    : "message";
}

/** Mensajes, llamadas, correos y SMS, en ese orden; solo los medios presentes. */
function mediumCounts(items: readonly ActivityDTO[]): { medium: AgendaMedium; count: number }[] {
  return AGENDA_MEDIA.map((medium) => ({
    medium,
    count: items.filter((task) => agendaMediumOf(task) === medium).length,
  })).filter((entry) => entry.count > 0);
}

function mediumNoun(medium: AgendaMedium, count: number): string {
  if (medium === "call") return count === 1 ? "llamada" : "llamadas";
  if (medium === "email") return count === 1 ? "correo" : "correos";
  if (medium === "sms") return "SMS";
  return count === 1 ? "mensaje" : "mensajes";
}

function MediumIcon({ medium, className }: { medium: AgendaMedium; className?: string }) {
  const Icon =
    medium === "call" ? PhoneCall : medium === "email" ? Mail : medium === "sms" ? MessageSquareText : MessageSquare;
  return <Icon aria-hidden className={className} />;
}
