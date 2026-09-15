"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleUser,
  History,
  MessageSquare,
  MoreVertical,
  Pencil,
  PhoneCall,
  RotateCcw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { isOverdue, type ActivityDTO } from "@/modules/crm/domain/activity";
import {
  bucketDateLabel,
  bucketMixesDays,
  clockLabel,
  dayLabel,
  effectiveWhen,
  groupTasks,
  isPastSlot,
  TASK_BUCKET_LABELS,
  type TaskBucket,
} from "@/modules/crm/domain/task-grouping";
import {
  canRunNow,
  isAgentTask,
  TASK_BADGE_KEY,
  taskBadgeMap,
  taskDisplayState,
} from "@/modules/crm/domain/task-execution";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";

/**
 * La bandeja, agrupada por día.
 *
 * El canalón de la izquierda lleva la hora ABSOLUTA y la cabecera del grupo el
 * día: entre los dos sustituyen a la línea «se ejecuta mañana (en 14 h)» que
 * había debajo de cada título. Una fecha relativa por fila obliga a
 * reconstruir mentalmente un calendario que el servidor ya devuelve ordenado.
 */
export function TaskDayList({
  tasks,
  tz,
  agentNames,
  onInspect,
}: {
  tasks: readonly ActivityDTO[];
  tz: string;
  agentNames: ReadonlyMap<string, string>;
  onInspect: (task: ActivityDTO) => void;
}) {
  // Un solo `now` para toda la lista: recalcularlo por fila dejaría la línea de
  // «ahora» y el atenuado de las filas pasadas discrepando entre sí.
  const now = new Date();
  const groups = groupTasks(tasks, tz, now);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {groups.map(({ bucket, tasks: rows }, group) => (
        <section key={bucket} aria-labelledby={`task-group-${bucket}`}>
          <GroupHeader bucket={bucket} tz={tz} now={now} count={rows.length} first={group === 0} />
          <ul>
            {rows.map((task, index) => (
              <TaskRowFragment
                key={task.id}
                task={task}
                previous={index === 0 ? null : (rows[index - 1] ?? null)}
                bucket={bucket}
                tz={tz}
                now={now}
                agentName={
                  task.assigned_agent_id === null
                    ? null
                    : (agentNames.get(task.assigned_agent_id) ?? null)
                }
                onInspect={onInspect}
              />
            ))}
            {/* Todo el grupo de hoy ya pasó: la línea cierra la lista. */}
            {bucket === "today" && rows.length > 0 && rows.every((row) => isPastSlot(row, now)) && (
              <NowLine tz={tz} now={now} />
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function GroupHeader({
  bucket,
  tz,
  now,
  count,
  first,
}: {
  bucket: TaskBucket;
  tz: string;
  now: Date;
  count: number;
  first: boolean;
}) {
  const date = bucketDateLabel(bucket, tz, now);
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 border-y border-border bg-secondary/60 px-4 py-2",
        first && "border-t-0",
      )}
    >
      <h3
        id={`task-group-${bucket}`}
        className={cn(
          "text-[11px] font-semibold tracking-wider uppercase",
          bucket === "overdue" && "text-destructive",
        )}
      >
        {TASK_BUCKET_LABELS[bucket]}
      </h3>
      {date !== null && <span className="text-xs text-muted-foreground">{date}</span>}
      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

/** La fila, precedida de la línea de «ahora» cuando el reloj cae justo aquí. */
function TaskRowFragment({
  task,
  previous,
  bucket,
  tz,
  now,
  agentName,
  onInspect,
}: {
  task: ActivityDTO;
  previous: ActivityDTO | null;
  bucket: TaskBucket;
  tz: string;
  now: Date;
  agentName: string | null;
  onInspect: (task: ActivityDTO) => void;
}) {
  const nowHere =
    bucket === "today" &&
    !isPastSlot(task, now) &&
    (previous === null || isPastSlot(previous, now));
  return (
    <>
      {nowHere && <NowLine tz={tz} now={now} />}
      <TaskRow
        task={task}
        tz={tz}
        now={now}
        showDay={bucketMixesDays(bucket)}
        dim={bucket === "today" && isPastSlot(task, now)}
        agentName={agentName}
        onInspect={onInspect}
      />
    </>
  );
}

/** Dónde está el reloj dentro del día. Es la única licencia decorativa de la
 *  vista, y lo que pinta es información: qué ya pasó y qué viene. */
function NowLine({ tz, now }: { tz: string; now: Date }) {
  return (
    <li className="flex items-center gap-3 pr-4" aria-hidden>
      <span className="w-16 shrink-0 pl-4 text-right font-mono text-[10px] text-brand tabular-nums">
        {clockLabel(now.toISOString(), tz)}
      </span>
      <span className="relative h-px flex-1 bg-gradient-to-r from-brand to-transparent">
        <span className="absolute -top-[2px] -left-[3px] size-[5px] rounded-full bg-brand" />
      </span>
    </li>
  );
}

function TaskRow({
  task,
  tz,
  now,
  showDay,
  dim,
  agentName,
  onInspect,
}: {
  task: ActivityDTO;
  tz: string;
  now: Date;
  showDay: boolean;
  dim: boolean;
  agentName: string | null;
  onInspect: (task: ActivityDTO) => void;
}) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const act = useTasksStore((s) => s.act);
  const runNow = useTasksStore((s) => s.runNow);

  const open = task.task_status === "open";
  const completed = task.task_status === "completed";
  const state = taskDisplayState(task);
  const agent = isAgentTask(task);
  const overdue = isOverdue(task, now);
  const when = effectiveWhen(task);
  const day = showDay && when !== null ? dayLabel(when, tz, now) : null;
  // «No se pudo enviar» es el único estado que pide una decisión ahora mismo:
  // sus dos acciones salen del menú ⋮ y se ponen en la fila.
  const failed = agent && open && task.last_run_status === "failed";

  const run = async (action: "complete" | "reopen" | "cancel") => {
    const result = await act(task.id, action);
    if (!result.ok) showAlert({ tone: "error", title: result.message, open: true });
  };

  const launch = async () => {
    const result = await runNow(task.id);
    showAlert(
      result.ok
        ? { tone: "success", title: "Tarea encolada: el agente la ejecutará en breve", open: true }
        : { tone: "error", title: result.message, open: true },
    );
  };

  const checkbox = (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-label={
        completed ? `Reabrir "${task.title ?? "tarea"}"` : `Completar "${task.title ?? "tarea"}"`
      }
      disabled={task.task_status === "cancelled"}
      onClick={() => void run(completed ? "reopen" : "complete")}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        completed ? "border-success bg-success text-white" : "border-input hover:border-success",
        task.task_status === "cancelled" && "opacity-40",
      )}
    >
      {completed && <Check className="size-3.5" aria-hidden />}
    </button>
  );

  return (
    <li
      className={cn(
        "relative flex flex-wrap items-start gap-x-3 gap-y-2 border-t border-border/60 py-3 pr-4 transition-colors first:border-t-0 hover:bg-foreground/[0.03]",
        dim && "opacity-60",
      )}
    >
      {/* Franja de estado: deja escanear la columna sin leer una palabra. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] rounded-r-sm",
          failed || (overdue && !agent) ? "bg-destructive" : agent ? "bg-accent-violet/70" : null,
        )}
      />

      <div className="w-16 shrink-0 pt-px pl-4 text-right leading-tight">
        <span
          className={cn(
            "block font-mono text-[13px] tabular-nums",
            overdue && !agent && "text-destructive",
          )}
        >
          {when === null ? "—" : clockLabel(when, tz)}
        </span>
        {day !== null && <span className="block text-[10px] text-muted-foreground">{day}</span>}
      </div>

      {state.completable ? (
        checkbox
      ) : agent ? (
        // Violeta = IA, y solo en el icono. Es el MEDIO EN CURSO, no un «es IA»
        // genérico: una «llamar, y si no, escribir» que ya va por mensaje
        // enseña el mensaje.
        <span
          className="flex size-5 shrink-0 items-center justify-center"
          aria-label={
            task.task_medium === "call"
              ? "La ejecuta un agente por llamada"
              : "La ejecuta un agente por mensaje"
          }
        >
          {task.task_medium === "call" ? (
            <PhoneCall className="size-4 text-accent-violet" aria-hidden />
          ) : (
            <MessageSquare className="size-4 text-accent-violet" aria-hidden />
          )}
        </span>
      ) : (
        checkbox
      )}

      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              "min-w-0 truncate text-sm font-medium",
              completed && "text-muted-foreground line-through",
              task.task_status === "cancelled" && "text-muted-foreground/60 line-through",
            )}
          >
            {task.title ?? "Sin título"}
          </p>
          {!agent && task.created_by_type === "ai_agent" && (
            <Sparkles className="size-3.5 shrink-0 text-accent-violet" aria-label="Creada por IA" />
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {!agent && task.assigned_user_id === null && open && <span>Sin asignar</span>}
          {agent && agentName !== null && (
            <span className="inline-flex items-center gap-1">
              <Sparkles aria-hidden className="size-3 text-accent-violet" />
              {agentName}
            </span>
          )}
        </p>
        {state.reason !== null && (
          // La razón es lo que convierte «no salió» en algo accionable; por eso
          // va en la fila y no escondida en el detalle.
          <p className="mt-1 text-xs text-muted-foreground">{state.reason}</p>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {state.label !== null && (
          <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} appearance="dot" />
        )}
        {failed && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-xs"
              onClick={() => onInspect(task)}
            >
              <History className="size-3.5" aria-hidden />
              Ver ejecuciones
            </Button>
            {canRunNow(task) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => void launch()}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Reintentar
              </Button>
            )}
          </div>
        )}
        <Link
          href={`/crm/contacts/${task.contact_id}`}
          aria-label="Ver contacto"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <CircleUser className="size-4" aria-hidden />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Más acciones de la tarea"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {agent && (
              <DropdownMenuItem onClick={() => onInspect(task)}>
                <span className="flex items-center gap-2">
                  <History className="size-4" /> Ver ejecuciones
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(`/crm/tasks/update/${task.id}`)}>
              <span className="flex items-center gap-2">
                <Pencil className="size-4" /> Editar
              </span>
            </DropdownMenuItem>
            {canRunNow(task) && (
              <DropdownMenuItem onClick={() => void launch()}>
                <span className="flex items-center gap-2">
                  <Send className="size-4" /> Ejecutar ahora
                </span>
              </DropdownMenuItem>
            )}
            {!open && (
              <DropdownMenuItem onClick={() => void run("reopen")}>
                <span className="flex items-center gap-2">
                  <RotateCcw className="size-4" /> Reabrir
                </span>
              </DropdownMenuItem>
            )}
            {open && (
              <DropdownMenuItem
                className="text-destructive hover:text-destructive"
                onClick={() => void run("cancel")}
              >
                <span className="flex items-center gap-2">
                  <XCircle className="size-4" /> Cancelar tarea
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
