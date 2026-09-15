"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { AgentDigestDTO } from "@/modules/crm/domain/activity";
import {
  agentDigestFigures,
  agentDigestTeaser,
  hasDigestNews,
  hasTeaserNews,
  type DigestFigure,
} from "@/modules/crm/domain/agent-digest";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";

/**
 * El parte del agente: lo único que le dice al dueño si la automatización
 * sirve para algo.
 *
 * **No es una franja con icono y una frase.** Un icono de chispas sobre una
 * superficie teñida con prosa dentro es el aviso de chatbot que pinta igual
 * todo producto con IA. Aquí son datos con la MISMA tipografía que el
 * marcador —mismo instrumento, otro trabajo—, sin caja y sin tinte: lo único
 * que dice «esto es de la IA» es un filete violeta de 2 px.
 *
 * Dos densidades:
 * - `full` (modo agente): todas las cifras y «sin enviar» como acción.
 * - `teaser` (bandeja mezclada): dos cifras y lleva al modo agente. Existe
 *   porque quien necesita saber si la automatización sirve es justo quien
 *   nunca toca el filtro de ejecutor.
 */
export function AgentDigestLine({
  digest,
  variant,
}: {
  digest: AgentDigestDTO;
  variant: "full" | "teaser";
}) {
  const setExecutor = useTasksStore((s) => s.setExecutor);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);

  const teaser = variant === "teaser";
  const counts = digest.counts;
  if (!(teaser ? hasTeaserNews(counts) : hasDigestNews(counts))) return null;

  const figures = teaser ? agentDigestTeaser(counts) : agentDigestFigures(counts);
  const when = digest.window === "yesterday" ? "ayer" : "hoy";

  const body = (
    <>
      <span className="shrink-0 text-[10px] tracking-[0.09em] text-muted-foreground uppercase">
        Tus agentes · {when}
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1">
        {figures.map((figure) => (
          <Figure key={figure.key} figure={figure} />
        ))}
      </span>
    </>
  );

  const shell =
    "flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 rounded-r-lg border-l-2 border-l-accent-violet/60 py-2 pr-3 pl-3 text-left transition-colors";

  if (teaser) {
    return (
      <button
        type="button"
        onClick={() => setExecutor("agent")}
        className={cn(shell, "hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}
      >
        {body}
        <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className={cn(shell, "cursor-default")}>
      {body}
      {/* La única cifra que exige una decisión es la única con control: no
          informa del fallo, lleva a él. */}
      {counts.failed > 0 && (
        <button
          type="button"
          onClick={() => setRunStatus("failed")}
          className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-destructive/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <TriangleAlert aria-hidden className="size-3.5 text-destructive" />
          <b className="font-semibold text-foreground tabular-nums">{counts.failed}</b>
          sin enviar
        </button>
      )}
    </div>
  );
}

function Figure({ figure }: { figure: DigestFigure }) {
  return (
    <span className="text-xs whitespace-nowrap text-muted-foreground">
      <b
        className={cn(
          "mr-1 text-[14.5px] font-semibold tracking-tight tabular-nums",
          figure.good ? "text-success" : "text-foreground",
        )}
      >
        {figure.value}
      </b>
      {figure.label}
    </span>
  );
}
