"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleUser,
  History,
  LayoutList,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useAuth } from "@/shared/auth/auth.hooks";
import { formatDayTime } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { getTenantAgents } from "@/modules/agents/public";
import { loadMyCompanyOnce } from "@/modules/companies/public";
import { getAgentTaskSettings } from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";
import { ScheduledAgenda } from "@/modules/crm/ui/components/ScheduledAgenda";
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
import { StatusBadge } from "@/shared/components/features/status-badge";
import { TaskRunsSheet } from "@/modules/crm/ui/components/TaskRunsSheet";
import { isOverdue, type ActivityDTO, type TaskDueFilter } from "@/modules/crm/domain/activity";
import {
  AWAITING_REPLY_LABEL,
  canRunNow,
  isAgentTask,
  TASK_BADGE_KEY,
  TASK_RUN_STATUS_LABELS,
  taskBadgeMap,
  taskDisplayState,
  type TaskRunStatus,
} from "@/modules/crm/domain/task-execution";
import {
  TASKS_PAGE_SIZE,
  useTasksStore,
  type TasksExecutor,
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

/**
 * Quién ejecuta. `mixed` va PRIMERO y es el default: la bandeja es una sola.
 * El centinela existe porque un segmentado trabaja con strings y el store usa
 * `null` para «mezclado»; la traducción vive en el borde, no en el store.
 */
const EXEC_MIXED = "mixed";
type ExecutorValue = "user" | "agent" | typeof EXEC_MIXED;

const EXECUTORS: readonly SegmentedItem<ExecutorValue>[] = [
  { value: EXEC_MIXED, label: "Todas" },
  { value: "user", label: "Del equipo" },
  { value: "agent", label: "Del agente" },
];

/**
 * Solo en modo agente: «¿qué se me está atascando?». `awaiting` no es un
 * desenlace de corrida sino un estado de la TAREA (abrió con plantilla y
 * espera al cliente); el store lo traduce a su propio filtro.
 */
const RUN_ALL = "all";
const RUN_AWAITING = "awaiting";
type RunFilterValue = TaskRunStatus | typeof RUN_ALL | typeof RUN_AWAITING;
const RUN_FILTERS: readonly SegmentedItem<RunFilterValue>[] = [
  { value: RUN_ALL, label: "Todas" },
  { value: RUN_AWAITING, label: AWAITING_REPLY_LABEL },
  { value: "deferred", label: TASK_RUN_STATUS_LABELS.deferred },
  { value: "failed", label: TASK_RUN_STATUS_LABELS.failed },
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

/**
 * Cuándo pasa algo, en una línea.
 *
 * Una tarea de agente abierta se describe por `next_run_at` y no por `due_at`:
 * `due_at` es el compromiso, pero lo que el operador necesita saber es cuándo
 * lo va a intentar la IA — que con los diferimientos ya no son lo mismo.
 */
function whenLine(task: ActivityDTO, tz: string | null): React.ReactNode {
  if (task.task_status === "cancelled") return "Cancelada";
  if (task.task_status === "completed") {
    return task.completed_at !== null ? `completada ${relativeTime(task.completed_at)}` : "completada";
  }
  if (isAgentTask(task) && task.next_run_at !== null) {
    // F2: la hora ABSOLUTA en la zona del negocio manda; la relativa acompaña.
    // «se ejecuta mañana» no le sirve a nadie que tenga que decidir si llega antes.
    const verb = task.awaiting_reply_until !== null ? "espera hasta" : "se ejecuta";
    return (
      <>
        {verb}{" "}
        <span className="font-medium text-foreground">
          {formatDayTime(task.next_run_at, tz ?? undefined)}
        </span>{" "}
        <span>({relativeTime(task.next_run_at)})</span>
      </>
    );
  }
  return task.due_at !== null ? `vence ${relativeTime(task.due_at)}` : "sin vencimiento";
}

function TaskRow({
  task,
  tz,
  agentName,
  onInspect,
}: {
  task: ActivityDTO;
  tz: string | null;
  agentName: string | null;
  onInspect: (task: ActivityDTO) => void;
}) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const act = useTasksStore((s) => s.act);
  const runNow = useTasksStore((s) => s.runNow);
  const overdue = isOverdue(task);
  const open = task.task_status === "open";
  const completed = task.task_status === "completed";
  const state = taskDisplayState(task);
  const agent = isAgentTask(task);

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

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {state.completable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Reabrir "${task.title ?? "tarea"}"` : `Completar "${task.title ?? "tarea"}"`}
          onClick={() => void run(completed ? "reopen" : "complete")}
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-input transition-colors hover:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : agent ? (
        // Violeta = IA, y solo en el icono: el techo de tinte del 14 % deja
        // fuera cualquier superficie violeta en zona de trabajo. El icono es el
        // MEDIO (mensaje hoy; llamada con F3), no un «es IA» genérico.
        <span
          className="flex size-5 shrink-0 items-center justify-center"
          aria-label="La ejecuta un agente por mensaje"
        >
          <MessageSquare className="size-4 text-accent-violet" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Reabrir "${task.title ?? "tarea"}"` : `Completar "${task.title ?? "tarea"}"`}
          disabled={task.task_status === "cancelled"}
          onClick={() => void run(completed ? "reopen" : "complete")}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            completed ? "border-success bg-success text-white" : "border-input hover:border-success",
            task.task_status === "cancelled" && "opacity-40",
          )}
        >
          {completed && <Check className="size-3.5" aria-hidden />}
        </button>
      )}

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
          {!agent && task.created_by_type === "ai_agent" && (
            <Sparkles className="size-3.5 shrink-0 text-accent-violet" aria-label="Creada por IA" />
          )}
          {state.label !== null && (
            <StatusBadge status={TASK_BADGE_KEY} map={taskBadgeMap(state)} appearance="dot" />
          )}
        </div>
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 text-xs",
            overdue && !agent ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          <span>{whenLine(task, tz)}</span>
          {!agent && task.assigned_user_id === null && open && <span>· sin asignar</span>}
          {agent && agentName !== null && (
            <span className="inline-flex items-center gap-1">
              · <Sparkles aria-hidden className="size-3 text-accent-violet" />
              {agentName}
            </span>
          )}
        </p>
        {state.reason !== null && (
          // La razón es lo que convierte «no salió» en algo accionable; por eso
          // va en la fila y no escondida en el detalle.
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{state.reason}</p>
        )}
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
  const executor = useTasksStore((s) => s.executor);
  const runStatus = useTasksStore((s) => s.runStatus);
  const setTab = useTasksStore((s) => s.setTab);
  const setDue = useTasksStore((s) => s.setDue);
  const setExecutor = useTasksStore((s) => s.setExecutor);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);
  const setPage = useTasksStore((s) => s.setPage);
  const fetch = useTasksStore((s) => s.fetch);
  const fetchStats = useTasksStore((s) => s.fetchStats);

  useSocketEvent(socket, "crm.activity_created", (payload) => {
    useTasksStore.getState().onActivityCreated(payload);
  });
  useSocketEvent(socket, "crm.task_completed", (payload) => {
    useTasksStore.getState().onTaskCompleted(payload);
  });
  useSocketEvent(socket, "crm.agent_task_run_started", (payload) => {
    useTasksStore.getState().onAgentRun(payload);
  });
  useSocketEvent(socket, "crm.agent_task_run_finished", (payload) => {
    useTasksStore.getState().onAgentRun(payload);
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
  const [inspected, setInspected] = useState<ActivityDTO | null>(null);

  const { hasPermission } = useAuth();
  const canAutomate = hasPermission("crm:automate");
  const view = useTasksStore((s) => s.view);
  const setView = useTasksStore((s) => s.setView);
  const agenda = useTasksStore((s) => s.agenda);
  const agendaLoading = useTasksStore((s) => s.agendaLoading);
  const awaiting = useTasksStore((s) => s.awaiting);
  const setAwaiting = useTasksStore((s) => s.setAwaiting);

  // F2: zona del negocio (hora absoluta), nombres de los agentes y el horario
  // silencioso para sombrear la agenda. Tres lecturas baratas y cacheadas;
  // si alguna falla la bandeja degrada (zona del navegador, sin nombre).
  const [tz, setTz] = useState<string | null>(null);
  const [agentNames, setAgentNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [quietHours, setQuietHours] = useState<{ start: number; end: number } | null>(null);
  useEffect(() => {
    loadMyCompanyOnce()
      .then((company) => setTz(company.timezone || null))
      .catch(() => undefined);
    getTenantAgents()
      .then((agents) => setAgentNames(new Map(agents.map((agent) => [agent.id, agent.name]))))
      .catch(() => undefined);
    getAgentTaskSettings()
      .then((settings) => setQuietHours({ start: settings.quiet_start_hour, end: settings.quiet_end_hour }))
      .catch(() => undefined);
  }, []);
  const agendaTz = useMemo(() => tz ?? "America/Bogota", [tz]);

  // La fila del rail se mantiene fresca con la de la lista: si el motor cierra
  // un intento mientras el panel está abierto, el encabezado no puede quedarse
  // mostrando el estado anterior.
  const inspectedTask =
    inspected === null ? null : (items.find((item) => item.id === inspected.id) ?? inspected);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tareas</h2>
          {stats !== null && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {executor === "agent" ? (
                <>
                  <StatChip label="programadas" value={stats.agent.open} />
                  <StatChip label="esperando respuesta" value={stats.agent.awaiting} />
                  {/* `deferred` NO es warn: un diferimiento es operación normal
                      (la ventana de 24 h se cierra sola) y pintarlo en ámbar
                      empuja al tenant a apagar la automatización. */}
                  <StatChip label="en espera" value={stats.agent.deferred} />
                  <StatChip label="sin enviar" value={stats.agent.failed} warn />
                </>
              ) : (
                <>
                  <StatChip label="abiertas" value={stats.open} />
                  <StatChip label="vencidas" value={stats.overdue} warn />
                  <StatChip label="para hoy" value={stats.due_today} />
                  <StatChip label="sin asignar" value={stats.unassigned} />
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* F2: la entrada PROPIA al flujo del agente. Antes había que abrir
              «Nueva tarea» y cambiar un select de «persona» a «agente». */}
          {canAutomate && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/crm/tasks/create?executor=agent">
                <Sparkles className="size-4 text-accent-violet" />
                Programar seguimiento
              </Link>
            </Button>
          )}
          <Button asChild className="rounded-full">
            <Link href="/crm/tasks/create">
              <Plus className="size-4" />
              Nueva tarea
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* F2: Lista / Programados cambian de VISTA en la misma URL → Tabs con
            panel (DESIGN-SYSTEM §9.3), no navegación ni segmentado. */}
        <Tabs value={view} onValueChange={(value) => setView(value as "list" | "scheduled")}>
          <TabsList aria-label="Vista de tareas" size="sm">
            <TabsTrigger value="list">
              <LayoutList className="size-3.5" aria-hidden />
              Lista
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarDays className="size-3.5" aria-hidden />
              Programados
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list" />
          <TabsContent value="scheduled" />
        </Tabs>

        <SegmentedControl
          value={executor ?? EXEC_MIXED}
          onValueChange={(value: ExecutorValue) =>
            setExecutor(value === EXEC_MIXED ? null : (value satisfies TasksExecutor))
          }
          label="Filtrar por quién ejecuta"
          size="sm"
          surface="inline"
          items={EXECUTORS}
        />
      </div>

      {view === "scheduled" ? (
        <ScheduledAgenda
          tasks={agenda}
          loading={agendaLoading}
          tz={agendaTz}
          agentNames={agentNames}
          quietHours={quietHours}
          onInspect={setInspected}
        />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* En modo agente la asignación a personas no aplica: en su lugar se
            filtra por desenlace del motor, que es la pregunta real ahí. */}
        {executor === "agent" ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Última ejecución:</span>
            <SegmentedControl
              value={awaiting ? RUN_AWAITING : (runStatus ?? RUN_ALL)}
              onValueChange={(value: RunFilterValue) => {
                if (value === RUN_AWAITING) setAwaiting(true);
                else setRunStatus(value === RUN_ALL ? null : value);
              }}
              label="Filtrar por desenlace de la última ejecución"
              size="sm"
              surface="inline"
              items={RUN_FILTERS}
            />
          </div>
        ) : (
          <SegmentedControl
            value={tab}
            onValueChange={setTab}
            label="Filtrar por asignación"
            size="sm"
            surface="inline"
            items={TABS}
          />
        )}
      </div>

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
          glyph={executor === "agent" ? "ai" : "time"}
          variant="solid"
          title={executor === "agent" ? "Ningún seguimiento programado" : "Nada pendiente por aquí"}
          description={
            executor === "agent"
              ? "Programa un objetivo y el agente escribirá al cliente por ti."
              : "Crea una tarea o deja que la IA agende los seguimientos por ti."
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                tz={tz}
                agentName={task.assigned_agent_id === null ? null : (agentNames.get(task.assigned_agent_id) ?? null)}
                onInspect={setInspected}
              />
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
      </>
      )}

      <TaskRunsSheet
        task={inspectedTask}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
      />
    </div>
  );
}
