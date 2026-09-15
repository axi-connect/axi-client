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
      className="grid grid-cols-2 gap-px overflow-clip rounded-xl border border-border bg-border sm:grid-cols-4"
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
        "flex items-center gap-2.5 bg-background px-3.5 py-2.5 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "bg-accent" : "hover:bg-secondary",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
          active ? "bg-background/70 text-brand" : "bg-foreground/5",
          alarm ? "text-destructive" : active ? null : "text-muted-foreground",
          value === 0 && !active && !alarm && "text-muted-foreground/60",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <span
          className={cn(
            "text-[18px] leading-none font-semibold tracking-tight tabular-nums",
            alarm && "text-destructive",
            value === 0 && !alarm && "text-muted-foreground/60",
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            "text-[11px] leading-tight",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
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
