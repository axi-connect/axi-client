"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Hourglass,
  LoaderCircle,
  MessageSquare,
  PhoneCall,
  Send,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatDayTime } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Timeline, TimelineSkeleton, type TimelineItem } from "@/shared/components/features/timeline";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import {
  TASK_BADGE_KEY,
  TASK_MEDIUM_LABELS,
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
      const MediumIcon = run.medium === "call" ? PhoneCall : MessageSquare;
      return {
        id: run.id,
        icon: run.opened_with_template ? Send : RUN_ICONS[run.status],
        tone: TASK_RUN_TIMELINE_TONES[run.status],
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            {taskRunTitle(run)}
            {/* El medio va en cada intento: una tarea «llamada, y si no conecta,
                mensaje» tiene intentos de los dos y el rail debe decir cuál fue cuál. */}
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 text-[10px] font-normal text-muted-foreground">
              <MediumIcon aria-hidden className="size-2.5" />
              {TASK_MEDIUM_LABELS[run.medium].toLowerCase()}
            </span>
          </span>
        ),
        ...(run.opened_with_template
          ? {
              description:
                "El cliente llevaba más de 24 h sin escribir: abrió con la plantilla de Meta. Cuando responda, el agente retoma el objetivo.",
            }
          : reason === null && run.detail === null
            ? {}
            : { description: reason ?? run.detail }),
        meta: (
          <span className="flex flex-wrap items-center gap-2">
            <span title={formatDayTime(taskRunTimestamp(run))}>{relativeTime(taskRunTimestamp(run))}</span>
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
            {run.call_session_id !== null && (
              // F3: la llamada con su grabación, transcripción y resumen.
              <Link
                href={`/calls/${run.call_session_id}`}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                <PhoneCall className="size-3" aria-hidden />
                Ver la llamada
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
                <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} appearance="dot" />
              )}
            </div>
            {task.objective !== null && (
              <p className="text-sm leading-relaxed">{task.objective}</p>
            )}
            {task.task_status === "open" && task.awaiting_reply_until !== null ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Hourglass aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
                <span>
                  Espera la respuesta del cliente hasta el{" "}
                  <strong className="font-medium text-foreground">{formatDayTime(task.awaiting_reply_until)}</strong>
                  . Si no responde, la tarea cierra como «Enviado · sin respuesta».
                </span>
              </p>
            ) : (
              task.next_run_at !== null &&
              task.task_status === "open" && (
                <p className="text-xs text-muted-foreground">
                  Próximo intento{" "}
                  <strong className="font-medium text-foreground">{formatDayTime(task.next_run_at)}</strong>{" "}
                  ({relativeTime(task.next_run_at)})
                </p>
              )
            )}
          </div>
        )}

        {error !== null ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : runs === null ? (
          <TimelineSkeleton rows={3} label="Cargando ejecuciones" />
        ) : runs.length === 0 ? (
          <EmptyState
            glyph="ai"
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
