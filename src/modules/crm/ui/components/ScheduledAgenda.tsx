"use client";

import { History, MessageSquare, PhoneCall, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import { TASK_BADGE_KEY, taskBadgeMap, taskDisplayState } from "@/modules/crm/domain/task-execution";
import { businessDayKey, minutesIntoDay, todayKey, addDaysToKey, type DayKey } from "@/modules/scheduling/public";

/**
 * «Programados» (F2): lo que el agente va a hacer, día por día, en la zona del
 * negocio. Es la respuesta a «¿qué va a pasar y cuándo?», que la lista —
 * ordenada por vencimiento y con tiempos relativos— no daba.
 *
 * Agrupa por `next_run_at` (la cita real del motor, con los diferimientos) y
 * no por `due_at` (el compromiso). Una tarea esperando respuesta aparece en el
 * día de su tick con su etiqueta, no como si fuera a enviar algo.
 */
export function ScheduledAgenda({
  tasks,
  loading,
  tz,
  agentNames,
  quietHours,
  onInspect,
}: {
  tasks: readonly ActivityDTO[];
  loading: boolean;
  tz: string;
  agentNames: ReadonlyMap<string, string>;
  quietHours: { start: number; end: number } | null;
  onInspect: (task: ActivityDTO) => void;
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
  const today = todayKey(now, tz);
  const tomorrow = addDaysToKey(today, 1);
  const groups = new Map<DayKey, ActivityDTO[]>();
  for (const task of tasks) {
    const when = task.next_run_at ?? task.due_at;
    if (when === null) continue;
    const key = businessDayKey(when, tz);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="overflow-hidden rounded-2xl border border-border bg-background">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/70 px-4 py-2.5">
            <h3 className="text-sm font-semibold">
              {day === today ? "Hoy" : day === tomorrow ? "Mañana" : dayLabel(day)}
              {(day === today || day === tomorrow) && (
                <span className="ml-1.5 font-medium text-muted-foreground">{dayLabel(day)}</span>
              )}
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare aria-hidden className="size-3.5" />
              {items.length} {items.length === 1 ? "mensaje" : "mensajes"}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {items.map((task) => {
              const when = task.next_run_at ?? task.due_at ?? "";
              const minutes = minutesIntoDay(when, tz);
              const hour = Math.floor(minutes / 60);
              const quiet =
                quietHours !== null && quietHours.start !== quietHours.end
                  ? quietHours.start < quietHours.end
                    ? hour >= quietHours.start && hour < quietHours.end
                    : hour >= quietHours.start || hour < quietHours.end
                  : false;
              const state = taskDisplayState(task);
              return (
                <li
                  key={task.id}
                  className={cn(
                    "grid grid-cols-[64px_20px_1fr_auto] items-center gap-x-3 px-4 py-2.5",
                    quiet && "bg-muted/50",
                  )}
                >
                  <div className={cn("font-mono text-sm tabular-nums", quiet && "text-muted-foreground")}>
                    {clock(minutes)}
                  </div>
                  <MessageSquare aria-hidden className="size-4 text-accent-violet" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{task.title ?? "Seguimiento"}</span>
                      {state.label !== null && (
                        <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} appearance="dot" />
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-muted-foreground">
                      <span className="truncate">{task.objective ?? ""}</span>
                      {task.assigned_agent_id !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <Sparkles aria-hidden className="size-3 text-accent-violet" />
                          {agentNames.get(task.assigned_agent_id) ?? "Agente"}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Ver ejecuciones"
                    onClick={() => onInspect(task)}
                  >
                    <History className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
          {quietHours !== null && quietHours.start !== quietHours.end && items.some((task) => {
            const when = task.next_run_at ?? task.due_at ?? "";
            const hour = Math.floor(minutesIntoDay(when, tz) / 60);
            return quietHours.start < quietHours.end
              ? hour >= quietHours.start && hour < quietHours.end
              : hour >= quietHours.start || hour < quietHours.end;
          }) && (
            <p className="flex items-center gap-2 border-t border-dashed border-border px-4 py-2 text-xs text-muted-foreground">
              <PhoneCall aria-hidden className="hidden" />
              Lo sombreado cae en el horario silencioso ({clock(quietHours.start * 60)}–{clock(quietHours.end * 60)}):
              saldrá a las {clock(quietHours.end * 60)}.
            </p>
          )}
        </section>
      ))}
    </div>
  );
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
