"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, LoaderCircle, MessageSquare, TriangleAlert, XCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Timeline, TimelineSkeleton, type TimelineItem } from "@/shared/components/features/timeline";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  TASK_BADGE_KEY,
  TASK_RUN_TIMELINE_TONES,
  taskBadgeMap,
  taskDisplayState,
  taskRunReasonLabel,
  taskRunTimestamp,
  taskRunTitle,
  type TaskRunDTO,
  type TaskRunStatus,
} from "@/modules/crm/domain/task-execution";
import { listTaskRuns } from "@/modules/crm/infrastructure/services/activities-service.adapter";

const RUN_ICONS: Record<TaskRunStatus, React.ComponentType<{ className?: string }>> = {
  scheduled: Clock,
  running: LoaderCircle,
  done: CheckCircle2,
  deferred: Clock,
  failed: TriangleAlert,
  cancelled: XCircle,
  skipped: XCircle,
};

/**
 * Rail de ejecución de una tarea de agente: el historial de intentos.
 *
 * Es la respuesta a «¿por qué no le ha llegado nada al cliente?», y por eso el
 * eje del panel son las RAZONES, no las marcas de tiempo: un intento sin razón
 * legible no explica nada y el operador acaba abriendo un ticket.
 */
export function TaskRunsSheet({
  task,
  onOpenChange,
}: {
  /** `null` = cerrado. Se pasa la tarea entera: el encabezado la necesita. */
  task: ActivityDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { socket } = useSocket("inbox");
  const [runs, setRuns] = useState<TaskRunDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taskId = task?.id ?? null;

  const load = useCallback(async () => {
    if (taskId === null) return;
    try {
      const response = await listTaskRuns(taskId);
      setRuns(response.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el historial de ejecuciones"));
    }
  }, [taskId]);

  useEffect(() => {
    setRuns(null);
    setError(null);
    void load();
  }, [load]);

  // Un intento en vivo cambia de estado en segundos: recargar la lista entera
  // por cada evento haría saltar el panel bajo la vista del operador, así que
  // solo se recarga cuando el evento es de ESTA tarea.
  const onRunEvent = useCallback(
    (payload: { activity_id: string }) => {
      if (payload.activity_id === taskId) void load();
    },
    [taskId, load],
  );
  useSocketEvent(socket, "crm.agent_task_run_started", onRunEvent);
  useSocketEvent(socket, "crm.agent_task_run_finished", onRunEvent);

  const state = task === null ? null : taskDisplayState(task);

  const items: TimelineItem[] =
    runs?.map((run) => {
      const reason = taskRunReasonLabel(run.reason);
      return {
        id: run.id,
        icon: RUN_ICONS[run.status],
        tone: TASK_RUN_TIMELINE_TONES[run.status],
        title: taskRunTitle(run),
        ...(reason === null && run.detail === null
          ? {}
          : { description: reason ?? run.detail }),
        meta: (
          <span className="flex flex-wrap items-center gap-2">
            <span>{relativeTime(taskRunTimestamp(run))}</span>
            {run.conversation_id !== null && run.message_id !== null && (
              // El enlace al mensaje real es lo que cierra el círculo: el
              // operador ve LO QUE se envió, no solo que se envió.
              <Link
                href={`/workspace/inbox/${run.conversation_id}`}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                <MessageSquare className="size-3" aria-hidden />
                Ver el mensaje
              </Link>
            )}
          </span>
        ),
      };
    }) ?? [];

  return (
    <DetailSheet
      open={task !== null}
      onOpenChange={onOpenChange}
      title="Ejecuciones"
      subtitle={task?.title ?? undefined}
      size={440}
    >
      <div className="space-y-4">
        {task !== null && state !== null && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Estado</span>
              {state.label !== null && (
                <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} />
              )}
            </div>
            {task.objective !== null && (
              <p className="text-sm leading-relaxed">{task.objective}</p>
            )}
            {task.next_run_at !== null && task.task_status === "open" && (
              <p className="text-xs text-muted-foreground">
                Próximo intento {relativeTime(task.next_run_at)}
              </p>
            )}
          </div>
        )}

        {error !== null ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : runs === null ? (
          <TimelineSkeleton rows={3} label="Cargando ejecuciones" />
        ) : runs.length === 0 ? (
          <EmptyState
            glyph="time"
            variant="solid"
            title="Todavía no lo ha intentado"
            description="Aquí aparecerá cada intento del agente, con su resultado y su motivo."
          />
        ) : (
          <Timeline items={items} />
        )}
      </div>
    </DetailSheet>
  );
}
