"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Check,
  CircleUser,
  MoreVertical,
  Plus,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TableSkeleton } from "@/shared/components/features/loading";
import { EmptyState } from "@/shared/components/features/empty-state";
import { isOverdue, type ActivityDTO, type TaskDueFilter } from "@/modules/crm/domain/activity";
import {
  TASKS_PAGE_SIZE,
  useTasksStore,
  type TasksTab,
} from "@/modules/crm/infrastructure/stores/tasks.store";

const TABS: readonly SegmentedItem<TasksTab>[] = [
  { value: "me", label: "Mis tareas" },
  { value: "unassigned", label: "Sin asignar" },
  { value: "all", label: "Todas" },
];

/**
 * `null` es «todas» en el store, pero un segmentado trabaja con strings: el
 * centinela `all` se traduce en el borde, no en el store.
 */
const DUE_ALL = "all";
const DUE_FILTERS: readonly SegmentedItem<TaskDueFilter | typeof DUE_ALL>[] = [
  { value: DUE_ALL, label: "Todas" },
  { value: "overdue", label: "Vencidas" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
];

function StatChip({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs",
        warn && value > 0 && "border-warning/40 bg-warning/8 text-warning",
      )}
    >
      {warn && value > 0 && <TriangleAlert className="size-3" aria-hidden />}
      <span className="font-semibold tabular-nums">{value}</span>
      {label}
    </span>
  );
}

function TaskRow({ task }: { task: ActivityDTO }) {
  const { showAlert } = useAlert();
  const act = useTasksStore((s) => s.act);
  const overdue = isOverdue(task);
  const open = task.task_status === "open";
  const completed = task.task_status === "completed";

  const run = async (action: "complete" | "reopen" | "cancel") => {
    const result = await act(task.id, action);
    if (!result.ok) showAlert({ tone: "error", title: result.message, open: true });
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={completed ? `Reabrir "${task.title ?? "tarea"}"` : `Completar "${task.title ?? "tarea"}"`}
        disabled={task.task_status === "cancelled"}
        onClick={() => void run(completed ? "reopen" : "complete")}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          completed
            ? "border-success bg-success text-white"
            : "border-input hover:border-success",
          task.task_status === "cancelled" && "opacity-40",
        )}
      >
        {completed && <Check className="size-3.5" aria-hidden />}
      </button>

      <div className="min-w-0 flex-1">
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
          {task.created_by_type === "ai_agent" && (
            <Sparkles className="size-3.5 shrink-0 text-accent-violet" aria-label="Creada por IA" />
          )}
        </div>
        <p className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
          {task.task_status === "cancelled"
            ? "Cancelada"
            : completed && task.completed_at !== null
              ? `completada ${relativeTime(task.completed_at)}`
              : task.due_at !== null
                ? `vence ${relativeTime(task.due_at)}`
                : "sin vencimiento"}
          {task.assigned_user_id === null && open && " · sin asignar"}
        </p>
      </div>

      <Link
        href={`/crm/contacts/${task.contact_id}`}
        aria-label="Ver contacto"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <CircleUser className="size-4" aria-hidden />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Más acciones de la tarea">
            <MoreVertical className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!open && (
            <DropdownMenuItem onClick={() => void run("reopen")}>
              <span className="flex items-center gap-2"><RotateCcw className="size-4" /> Reabrir</span>
            </DropdownMenuItem>
          )}
          {open && (
            <DropdownMenuItem
              className="text-destructive hover:text-destructive"
              onClick={() => void run("cancel")}
            >
              <span className="flex items-center gap-2"><XCircle className="size-4" /> Cancelar tarea</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/**
 * Bandeja de tareas (F4): chips de stats, tabs por asignación, filtro de
 * vencimiento y acciones optimistas. Las tareas nuevas del operador o la IA
 * (`crm.activity_created`) refrescan en vivo; `crm.task_due` llega SOLO como
 * campanita (sin WS) — no se simula tiempo real donde no lo hay.
 */
export function TasksView() {
  const { socket } = useSocket("inbox");
  const items = useTasksStore((s) => s.items);
  const total = useTasksStore((s) => s.total);
  const page = useTasksStore((s) => s.page);
  const loading = useTasksStore((s) => s.loading);
  const error = useTasksStore((s) => s.error);
  const stats = useTasksStore((s) => s.stats);
  const tab = useTasksStore((s) => s.tab);
  const due = useTasksStore((s) => s.due);
  const setTab = useTasksStore((s) => s.setTab);
  const setDue = useTasksStore((s) => s.setDue);
  const setPage = useTasksStore((s) => s.setPage);
  const fetch = useTasksStore((s) => s.fetch);
  const fetchStats = useTasksStore((s) => s.fetchStats);

  useSocketEvent(socket, "crm.activity_created", (payload) => {
    useTasksStore.getState().onActivityCreated(payload);
  });
  useSocketEvent(socket, "crm.task_completed", (payload) => {
    useTasksStore.getState().onTaskCompleted(payload);
  });

  useEffect(() => {
    void fetch();
    void fetchStats();
    const onSave = () => {
      void fetch();
      void fetchStats();
    };
    window.addEventListener("crm:tasks:save:success", onSave);
    return () => window.removeEventListener("crm:tasks:save:success", onSave);
  }, [fetch, fetchStats]);

  const totalPages = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tareas</h2>
          {stats !== null && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatChip label="abiertas" value={stats.open} />
              <StatChip label="vencidas" value={stats.overdue} warn />
              <StatChip label="para hoy" value={stats.due_today} />
              <StatChip label="sin asignar" value={stats.unassigned} />
            </div>
          )}
        </div>
        <Button asChild className="rounded-full">
          <Link href="/crm/tasks/create">
            <Plus className="size-4" />
            Nueva tarea
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={tab}
          onValueChange={setTab}
          label="Filtrar por asignación"
          size="sm"
          items={TABS}
        />

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Vence:</span>
          <SegmentedControl
            value={due ?? DUE_ALL}
            onValueChange={(value) => setDue(value === DUE_ALL ? null : value)}
            label="Filtrar por vencimiento"
            size="sm"
            surface="inline"
            items={DUE_FILTERS}
          />
        </div>
      </div>

      {error !== null ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void fetch()}>
            Reintentar
          </Button>
        </div>
      ) : loading && items.length === 0 ? (
        <TableSkeleton rows={6} showHeader={false} />
      ) : items.length === 0 ? (
        <EmptyState
          glyph="time"
          variant="solid"
          title="Nada pendiente por aquí"
          description="Crea una tarea o deja que la IA agende los seguimientos por ti."
        />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
            {items.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground tabular-nums">
                Página {page} de {totalPages} — {total} tareas
              </span>
              <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
