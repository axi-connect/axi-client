"use client";

import { useEffect, useState } from "react";

import type { ReadinessFindingDTO, ReadinessSummaryDTO } from "@/modules/agents/domain/readiness";
import {
  getAgentReadiness,
  getAgentsReadiness,
} from "@/modules/agents/infrastructure/services/readiness-service.adapter";

/**
 * Avisos de un agente. `null` mientras carga o si la lectura falla: la salud
 * es una ayuda, no bloquea el estudio, así que un error no se muestra. Cambiar
 * `reloadKey` (tras guardar) vuelve a leer: las reglas pudieron cambiar.
 */
export function useAgentReadiness(agentId: string | null, reloadKey = 0): ReadinessFindingDTO[] | null {
  const [findings, setFindings] = useState<ReadinessFindingDTO[] | null>(null);

  useEffect(() => {
    if (agentId === null) return;
    let alive = true;
    getAgentReadiness(agentId)
      .then((next) => {
        if (alive) setFindings(next);
      })
      .catch(() => {
        if (alive) setFindings(null);
      });
    return () => {
      alive = false;
    };
  }, [agentId, reloadKey]);

  return agentId === null ? null : findings;
}

/** Lo que frena ventas por agente, para la rejilla (`agent_id` → bloqueos). */
export function useAgentsBlockers(): ReadonlyMap<string, number> {
  const [blockers, setBlockers] = useState<ReadonlyMap<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    getAgentsReadiness()
      .then((rows: ReadinessSummaryDTO[]) => {
        if (alive) setBlockers(new Map(rows.map((row) => [row.agent_id, row.blockers])));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return blockers;
}
