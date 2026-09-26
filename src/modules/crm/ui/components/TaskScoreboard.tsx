"use client";

import type { LucideIcon } from "lucide-react";
import { Clock, Hourglass, Inbox, Sparkles, TriangleAlert, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { TaskStatsDTO } from "@/modules/crm/domain/activity";
import { useTasksStore, type TasksExecutor } from "@/modules/crm/infrastructure/stores/tasks.store";

/**
 * El marcador de la bandeja: las cifras SON el filtro.
 *
 * Antes eran cuatro chips de solo lectura encima de dos segmentados que decían
 * lo mismo con otras palabras («2 vencidas» y el botón «Vencidas»). Fundirlos
 * quita dos filas de controles y convierte el número en el camino: se pulsa lo
 * que preocupa.
 *
 * Es **un** instrumento y no cuatro tarjetas: una caja con filetes internos,
 * dibujados con `gap` sobre el fondo del contenedor para que salgan solos
 * también al envolver a dos columnas, sin reglas `nth-child`.
 */
type Cell = {
  key: string;
  value: number;
  label: string;
  icon: LucideIcon;
  active: boolean;
  tone?: "alarm";
  onSelect: () => void;
};

export function TaskScoreboard({
  stats,
  executor,
}: {
  stats: TaskStatsDTO;
  executor: TasksExecutor;
}) {
  // Los dos se llaman SIEMPRE: elegir el hook con un ternario rompe el orden
  // de hooks en cuanto el operador cambia de modo.
  const inbox = useInboxCells(stats);
  const agent = useAgentCells(stats);
  const cells = executor === "agent" ? agent : inbox;

  return (
    <div
      role="group"
      aria-label="Filtrar la bandeja"
      // Cuatro columnas solo si caben (`@container`): en el modo agente las
      // etiquetas son largas («esperando respuesta») y a un cuarto se cortaban.
      // En el modo agente las etiquetas son más largas: 4 columnas desde 56 rem.
      className={cn(
        // `h-full` + filas `fr`: iguala el alto de la isla de al lado, sin hueco.
        "grid h-full min-w-0 auto-rows-fr grid-cols-2 gap-1 rounded-3xl border border-border bg-card p-1.5",
        executor === "agent" ? "@min-[56rem]:grid-cols-4" : "@min-[46rem]:grid-cols-4",
      )}
    >
      {cells.map((cell) => (
        <KpiCell key={cell.key} cell={cell} />
      ))}
    </div>
  );
}

function KpiCell({ cell }: { cell: Cell }) {
  const { value, label, icon: Icon, active, tone, onSelect } = cell;
  const alarm = tone === "alarm" && value > 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        // `items-center` centra el icono contra el BLOQUE de los dos textos, no
        // contra la caja con su relleno.
        "flex min-w-0 items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors md:px-4 md:py-3.5",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "bg-accent" : "hover:bg-muted/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          // En un marcador angosto (celular) el icono cede su sitio a la etiqueta.
          "hidden size-9 shrink-0 place-items-center rounded-xl transition-colors @min-[30rem]:grid md:size-10",
          active ? "bg-card text-brand" : "bg-muted",
          alarm ? "text-destructive" : active ? null : "text-muted-foreground",
          value === 0 && !active && !alarm && "text-muted-foreground/60",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col items-start gap-1">
        {/* La cifra en Nexa, en foreground: el color del estado va en el
            punto de la etiqueta (§9.5), no en el número. */}
        <span
          className={cn(
            "font-heading text-2xl leading-none font-bold tracking-tight tabular-nums md:text-3xl",
            value === 0 && !alarm && "text-muted-foreground/60",
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            "inline-flex max-w-full min-w-0 items-start gap-1.5 text-xs leading-tight",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {alarm && <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />}
          <span className="whitespace-nowrap">{label}</span>
        </span>
      </span>
    </button>
  );
}

/** Bandeja mezclada: el eje es el vencimiento, más el atajo a «sin asignar». */
function useInboxCells(stats: TaskStatsDTO): Cell[] {
  const tab = useTasksStore((s) => s.tab);
  const due = useTasksStore((s) => s.due);
  const setDue = useTasksStore((s) => s.setDue);
  const setScope = useTasksStore((s) => s.setScope);
  const unassigned = tab === "unassigned";

  return [
    {
      key: "open",
      value: stats.open,
      label: "abiertas",
      icon: Inbox,
      active: due === null && !unassigned,
      // Conserva «Todas» si el operador la eligió: la ficha mueve el
      // vencimiento, no le quita el alcance que pidió.
      onSelect: () => setScope({ tab: unassigned ? "me" : tab, due: null }),
    },
    {
      key: "overdue",
      value: stats.overdue,
      label: "vencidas",
      icon: TriangleAlert,
      active: due === "overdue",
      tone: "alarm",
      onSelect: () => setDue("overdue"),
    },
    {
      key: "today",
      value: stats.due_today,
      label: "para hoy",
      icon: Clock,
      active: due === "today",
      onSelect: () => setDue("today"),
    },
    {
      key: "unassigned",
      value: stats.unassigned,
      label: "sin asignar",
      icon: UserRound,
      active: unassigned,
      onSelect: () => setScope({ tab: "unassigned", due: null }),
    },
  ];
}

/**
 * Modo agente: el eje es el desenlace del motor. Estas cuatro celdas sustituyen
 * al segmentado «Última ejecución», que solo existía en este modo y hacía
 * saltar el layout al entrar y salir. La conversión no está aquí: no es un
 * filtro —no hay consulta que devuelva «las que acabaron en compra»— y vive en
 * la línea del parte, que es donde se cuentan resultados.
 */
function useAgentCells(stats: TaskStatsDTO): Cell[] {
  const runStatus = useTasksStore((s) => s.runStatus);
  const awaiting = useTasksStore((s) => s.awaiting);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);
  const setAwaiting = useTasksStore((s) => s.setAwaiting);

  return [
    {
      key: "scheduled",
      value: stats.agent.open,
      label: "programadas",
      icon: Sparkles,
      active: runStatus === null && !awaiting,
      onSelect: () => setRunStatus(null),
    },
    {
      key: "awaiting",
      value: stats.agent.awaiting,
      label: "esperando respuesta",
      icon: Hourglass,
      active: awaiting,
      onSelect: () => setAwaiting(true),
    },
    {
      // `deferred` NO es alarma: un diferimiento es operación normal (la
      // ventana de 24 h se cierra sola) y pintarlo en ámbar empuja al tenant a
      // apagar la automatización.
      key: "deferred",
      value: stats.agent.deferred,
      label: "en espera",
      icon: Clock,
      active: runStatus === "deferred",
      onSelect: () => setRunStatus("deferred"),
    },
    {
      key: "failed",
      value: stats.agent.failed,
      label: "sin enviar",
      icon: TriangleAlert,
      active: runStatus === "failed",
      tone: "alarm",
      onSelect: () => setRunStatus("failed"),
    },
  ];
}
