"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import { isOverdue, type ActivityDTO, type AgentDigestDTO, type TaskStatsDTO } from "@/modules/crm/domain/activity";
import { tasksNextUp } from "@/modules/crm/domain/tasks-next-up";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * «Lo próximo» de la bandeja (lienzo CRM premium F3): UNA isla, en cristal.
 * En la bandeja mezclada, lo que no espera (vencidas → para hoy → al día);
 * en el modo agente absorbe el parte de Axi —brillo `ai`, porque habla lo que
 * hizo el agente— y su única acción es lo que no salió. Mientras llegan las
 * cifras que la deciden, su silueta (§9.5): nunca una isla y luego otra.
 */
export function TasksNextUpIsland({
  stats,
  digest,
  items,
  agentMode,
  className,
}: {
  stats: TaskStatsDTO | null;
  digest: AgentDigestDTO | null;
  items: readonly ActivityDTO[];
  agentMode: boolean;
  className?: string;
}) {
  const setDue = useTasksStore((s) => s.setDue);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);

  if (stats === null) return <Skeleton className={`h-[116px] rounded-3xl ${className ?? ""}`} />;

  const overdueTask = items.find((task) => isOverdue(task));
  const next = tasksNextUp({
    agentMode,
    stats,
    digest,
    firstOverdue: overdueTask ? { title: overdueTask.title, contact: overdueTask.contact_name } : null,
  });

  const kicker =
    next.kind === "agent" ? (
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase opacity-70">
        <Sparkles aria-hidden className="size-3 text-accent-violet" />
        Axi · {next.window === "yesterday" ? "ayer" : "hoy"}
      </p>
    ) : (
      <Kicker>Lo próximo</Kicker>
    );

  return (
    <InkIsland
      label={next.kind === "agent" ? "El parte de Axi" : "Lo próximo"}
      glow={next.kind === "agent" || next.kind === "clear" ? "ai" : "brand"}
      className={`gap-1.5 p-5 ${className ?? ""}`}
    >
      {kicker}
      <p className="font-heading text-xl leading-tight font-bold text-pretty">{next.title}</p>
      <p className="line-clamp-2 text-xs text-pretty text-muted-foreground">{next.detail}</p>
      {next.kind === "overdue" && (
        <Button variant="contrast" size="sm" className="mt-1 w-fit rounded-full" onClick={() => setDue("overdue")}>
          Ver las vencidas
          <ArrowRight aria-hidden />
        </Button>
      )}
      {next.kind === "today" && (
        <Button variant="contrast" size="sm" className="mt-1 w-fit rounded-full" onClick={() => setDue("today")}>
          Ver las de hoy
          <ArrowRight aria-hidden />
        </Button>
      )}
      {next.kind === "agent" && next.failed > 0 && (
        <Button variant="contrast" size="sm" className="mt-1 w-fit rounded-full" onClick={() => setRunStatus("failed")}>
          {next.failed === 1 ? "Revisar el que no salió" : "Revisar los que no salieron"}
          <ArrowRight aria-hidden />
        </Button>
      )}
    </InkIsland>
  );
}
