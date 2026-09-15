"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleDollarSign,
  Clock,
  Hourglass,
  Inbox,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
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
 */
type Tile = {
  key: string;
  value: number;
  label: string;
  icon: LucideIcon;
  active: boolean;
  tone?: "alarm" | "good";
  onSelect?: () => void;
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
  const inbox = useInboxTiles(stats);
  const agent = useAgentTiles(stats);
  const tiles = executor === "agent" ? agent : inbox;

  return (
    <div
      role="group"
      aria-label="Filtrar la bandeja"
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-4",
        tiles.length === 5 && "lg:grid-cols-5",
      )}
    >
      {tiles.map((tile) => (
        <TileButton key={tile.key} tile={tile} />
      ))}
    </div>
  );
}

function TileButton({ tile }: { tile: Tile }) {
  const { value, label, icon: Icon, active, tone, onSelect } = tile;
  const body = (
    <>
      <span
        className={cn(
          "text-[22px] leading-tight font-semibold tracking-tight tabular-nums",
          value === 0 && tone === undefined && "text-muted-foreground/60",
          tone === "alarm" && value > 0 && "text-destructive",
          tone === "good" && "text-success",
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-[11.5px] leading-tight",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon
          aria-hidden
          className={cn(
            "size-3 shrink-0",
            tone === "alarm" && value > 0 && "text-destructive",
            tone === "good" && "text-success",
          )}
        />
        {label}
      </span>
    </>
  );

  const shape =
    "flex flex-col items-start gap-px rounded-xl border px-3 py-2.5 text-left transition-colors";

  // La cifra de conversión no filtra nada: no hay consulta que devuelva «las
  // que acabaron en compra». Se pinta igual pero no finge ser un botón.
  if (onSelect === undefined) {
    return <div className={cn(shape, "border-border")}>{body}</div>;
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        shape,
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "border-brand/45 bg-accent"
          : "border-border hover:border-foreground/25 hover:bg-secondary/50",
      )}
    >
      {body}
    </button>
  );
}

/** Bandeja mezclada: el eje es el vencimiento, más el atajo a «sin asignar». */
function useInboxTiles(stats: TaskStatsDTO): Tile[] {
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
 * Modo agente: el eje es el desenlace del motor. Estas cuatro fichas sustituyen
 * al segmentado «Última ejecución», que solo existía en este modo y hacía
 * saltar el layout al entrar y salir.
 */
function useAgentTiles(stats: TaskStatsDTO): Tile[] {
  const runStatus = useTasksStore((s) => s.runStatus);
  const awaiting = useTasksStore((s) => s.awaiting);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);
  const setAwaiting = useTasksStore((s) => s.setAwaiting);

  const tiles: Tile[] = [
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
      // `deferred` NO es warn: un diferimiento es operación normal (la ventana
      // de 24 h se cierra sola) y pintarlo en ámbar empuja al tenant a apagar
      // la automatización.
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

  // F5: la única cifra del bloque que responde a «¿esto sirve para algo?».
  // Mide 7 días, no hoy: un seguimiento del lunes que cierra la venta el jueves
  // cuenta igual.
  if (stats.agent.converted > 0) {
    tiles.push({
      key: "converted",
      value: stats.agent.converted,
      label: "acabaron en compra (7 días)",
      icon: CircleDollarSign,
      active: false,
      tone: "good",
    });
  }
  return tiles;
}
