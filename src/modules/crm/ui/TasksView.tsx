"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LayoutList, Plus, Sparkles } from "lucide-react";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useAuth } from "@/shared/auth/auth.hooks";
import { getTenantAgents } from "@/modules/agents/public";
import { loadMyCompanyOnce } from "@/modules/companies/public";
import { getAgentTaskSettings } from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";
import { ScheduledAgenda } from "@/modules/crm/ui/components/ScheduledAgenda";
import { TaskDayList } from "@/modules/crm/ui/components/TaskDayList";
import { TasksNextUpIsland } from "./components/TasksNextUpIsland";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TaskScoreboard } from "@/modules/crm/ui/components/TaskScoreboard";
import { AgentDigestLine } from "@/modules/crm/ui/components/AgentDigestLine";
import { SearchField } from "@/shared/components/ui/search-field";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { Button } from "@/shared/components/ui/button";
import BasicPagination from "@/shared/components/ui/pagination";
import { TableSkeleton } from "@/shared/components/features/loading";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TaskRunsSheet } from "@/modules/crm/ui/components/TaskRunsSheet";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
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

/** «GMT-5» para decir de qué zona son las horas absolutas de la bandeja. */
function zoneAbbr(tz: string): string | null {
  try {
    return (
      new Intl.DateTimeFormat("es-CO", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Bandeja de tareas: marcador, barra de trabajo y lista agrupada por día.
 *
 * El marcador de arriba ES el filtro —las cifras se pulsan— y por eso la vista
 * pasó de cuatro filas de controles a dos. Las tareas nuevas del operador o la
 * IA (`crm.activity_created`) refrescan en vivo; `crm.task_due` llega SOLO como
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
  const executor = useTasksStore((s) => s.executor);
  const setTab = useTasksStore((s) => s.setTab);
  const setExecutor = useTasksStore((s) => s.setExecutor);
  const setPage = useTasksStore((s) => s.setPage);
  const fetch = useTasksStore((s) => s.fetch);
  const fetchStats = useTasksStore((s) => s.fetchStats);
  const q = useTasksStore((s) => s.q);
  const setQuery = useTasksStore((s) => s.setQuery);
  const digest = useTasksStore((s) => s.digest);
  const fetchDigest = useTasksStore((s) => s.fetchDigest);
  const due = useTasksStore((s) => s.due);
  const runStatus = useTasksStore((s) => s.runStatus);
  const awaiting = useTasksStore((s) => s.awaiting);
  const setScope = useTasksStore((s) => s.setScope);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);

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
    // En el montaje y no al entrar en modo agente: pedirlo al cambiar de filtro
    // bajaría la lista medio segundo después, que es el salto de layout que
    // este rediseño lleva prohibido.
    void fetchDigest();
    const onSave = () => {
      void fetch();
      void fetchStats();
    };
    window.addEventListener("crm:tasks:save:success", onSave);
    return () => window.removeEventListener("crm:tasks:save:success", onSave);
  }, [fetch, fetchStats, fetchDigest]);

  const totalPages = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE));
  const [inspected, setInspected] = useState<ActivityDTO | null>(null);

  const { hasPermission } = useAuth();
  const canAutomate = hasPermission("crm:automate");
  const view = useTasksStore((s) => s.view);
  const setView = useTasksStore((s) => s.setView);
  const agenda = useTasksStore((s) => s.agenda);
  const agendaLoading = useTasksStore((s) => s.agendaLoading);

  // Zona del negocio (la hora absoluta de la bandeja), nombres de los agentes y
  // el horario silencioso para sombrear la agenda. Tres lecturas baratas y
  // cacheadas; si alguna falla la bandeja degrada (zona del navegador, sin nombre).
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
      .then((settings) =>
        setQuietHours({ start: settings.quiet_start_hour, end: settings.quiet_end_hour }),
      )
      .catch(() => undefined);
  }, []);
  const agendaTz = useMemo(() => tz ?? "America/Bogota", [tz]);
  const abbr = useMemo(() => zoneAbbr(agendaTz), [agendaTz]);

  /** Hay algún filtro puesto además del alcance por defecto. */
  const filtered = due !== null || tab !== "me" || runStatus !== null || awaiting;

  // La fila del rail se mantiene fresca con la de la lista: si el motor cierra
  // un intento mientras el panel está abierto, el encabezado no puede quedarse
  // mostrando el estado anterior.
  const inspectedTask =
    inspected === null ? null : (items.find((item) => item.id === inspected.id) ?? inspected);

  const createLink = (
    <Button asChild className="rounded-full">
      <Link href="/crm/tasks/create">
        <Plus className="size-4" />
        Nueva tarea
      </Link>
    </Button>
  );
  const scheduleLink = canAutomate ? (
    <Button asChild variant="outline" className="rounded-full">
      <Link href="/crm/tasks/create?executor=agent">
        <Sparkles className="size-4 text-accent-violet" />
        Programar seguimiento
      </Link>
    </Button>
  ) : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[70rem] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl">Tareas</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            <span className="whitespace-nowrap">Lo que el equipo y Axi tienen entre manos</span>
            {abbr === null ? "" : (
              <>
                {" "}
                · <span className="whitespace-nowrap">en hora del negocio ({abbr})</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* La entrada PROPIA al flujo del agente (F2). Antes había que abrir
              «Nueva tarea» y cambiar un select de «persona» a «agente». */}
          {scheduleLink}
          {createLink}
        </div>
      </div>

      {/* El bento de la bandeja (lienzo CRM premium F3): el marcador —las
          cifras son el filtro— y UNA isla con lo que no espera. Se dimensiona
          por el ancho del contenido (`@container`, §9.5). */}
      <div className="@container">
        <div className="grid gap-4 @min-[46rem]:grid-cols-[minmax(0,1fr)_minmax(16rem,19rem)] [&>*]:min-w-0">
          {stats !== null ? (
            <div className="@container h-full min-w-0">
              <TaskScoreboard stats={stats} executor={executor} />
            </div>
          ) : (
            <Skeleton className="h-[116px] rounded-3xl" />
          )}
          <TasksNextUpIsland stats={stats} digest={digest} items={items} agentMode={executor === "agent"} />
        </div>
      </div>

      {/* La línea del agente. En la bandeja mezclada es un resumen de una
          línea que lleva al modo agente; en «Del agente», el parte completo. */}
      {/* En la bandeja mezclada, la línea breve que lleva al modo agente; en
          el modo agente el parte completo vive en la isla. */}
      {digest !== null && executor !== "agent" && <AgentDigestLine digest={digest} variant="teaser" />}

      {/* Una sola barra de trabajo. Antes eran tres filas de segmentados: el
          vencimiento y el desenlace del motor viven ahora en el marcador.
          Rejilla y no `flex-wrap`: con el buscador dentro, envolver produce
          cuatro filas apiladas a 400 px. */}
      <div className="grid gap-2 sm:grid-cols-[minmax(11rem,22rem)_1fr] sm:items-center">
        <SearchField
          value={q}
          onChange={setQuery}
          busy={loading}
          shortcut
          placeholder="Buscar por contacto u objetivo"
          label="Buscar tareas por contacto u objetivo"
        />
        {/* Los controles, SIEMPRE en una línea: si no caben scrollean dentro de
            sí mismos, porque el cuerpo de la vista nunca scrollea en horizontal. */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] sm:justify-end [&::-webkit-scrollbar]:hidden">
          {executor !== "agent" && (
            <SegmentedControl
              value={tab}
              onValueChange={setTab}
              label="Filtrar por asignación"
              size="sm"
              surface="inline"
              items={TABS}
            />
          )}
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
          <span aria-hidden className="hidden h-5 w-px shrink-0 bg-border sm:block" />
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
      ) : error !== null ? (
        <div role="alert" className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl font-bold">No pudimos leer tus tareas</p>
            <p className="text-sm text-pretty text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => void fetch()}>
            Reintentar
          </Button>
        </div>
      ) : loading && items.length === 0 ? (
        <TableSkeleton rows={6} showHeader={false} />
      ) : items.length === 0 && q !== "" ? (
        // «Nada pendiente por aquí» sería mentira con algo escrito: el sistema
        // de diseño exige distinguir «aún no hay nada» de «sin resultados».
        <EmptyState
          glyph="noresults"
          variant="solid"
          title={`Sin resultados para «${q}»`}
          description="Se busca en el título y el objetivo de la tarea, y en el nombre, teléfono y correo del contacto."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setQuery("")}>
                Limpiar búsqueda
              </Button>
            </div>
          }
        />
      ) : items.length === 0 && filtered ? (
        // Con un filtro puesto tampoco es «no hay nada»: es «no hay nada AQUÍ».
        <EmptyState
          glyph="uptodate"
          variant="solid"
          title="Nada en este filtro"
          description="Prueba a quitarlo para ver el resto de la bandeja."
          action={
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setScope({ tab: "me", due: null });
                if (executor === "agent") setRunStatus(null);
              }}
            >
              Ver todas
            </Button>
          }
        />
      ) : items.length === 0 ? (
        // Un tenant nuevo aterriza aquí con cero tareas: es la pantalla que más
        // se ve el primer día, y la que menos trabajo tenía. En vez de un reloj
        // genérico, las dos rutas reales.
        <EmptyState
          glyph={executor === "agent" ? "ai" : "time"}
          variant="solid"
          title={executor === "agent" ? "Ningún seguimiento programado" : "Nada pendiente por aquí"}
          description={
            executor === "agent"
              ? "Programa un objetivo y el agente escribirá o llamará al cliente por ti, a la hora que digas."
              : "Cuando haya un pendiente aparecerá aquí con su día y su hora. Hay dos formas de empezar."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {scheduleLink}
              {executor !== "agent" && createLink}
            </div>
          }
        />
      ) : (
        <>
          <TaskDayList
            tasks={items}
            tz={agendaTz}
            agentNames={agentNames}
            onInspect={setInspected}
          />
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

      <TaskRunsSheet
        task={inspectedTask}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
      />
    </div>
  );
}
