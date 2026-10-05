"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/shared/auth/auth.hooks";
import { useAxelAccessory } from "@/modules/cmo/infrastructure/hooks/use-axel-appearance";
import { useAxelIsland } from "@/modules/cmo/infrastructure/hooks/use-axel-island";
import { useCmoNewsSocket } from "@/modules/cmo/infrastructure/realtime/use-cmo-news-socket";
import { getLatestBriefing } from "@/modules/cmo/infrastructure/services/cmo-service.adapter";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import {
  AssistantAvatar,
  AssistantDock,
  AssistantStage,
  islandShape,
  type AssistantExpressionName,
} from "@/shared/components/features/assistant";

/**
 * La isla de Axel en la cabecera de toda la plataforma (plan
 * island_live_plan.md, F4b; aprobada por el dueño con la maqueta F0). Avisa del
 * informe del día y de cada propuesta nueva en cualquier pantalla, sin abrir
 * /cmo; «Ver» despliega el resumen o abre la propuesta.
 *
 * Tres reglas:
 * - **En /cmo no se monta**: allí vive la isla del chat y su Axel vivo; dos
 *   Axel a la vez rompen «un solo avatar vivo por pantalla».
 * - **El avatar es quieto** (una expresión por forma, sin timers): no hay
 *   turno vivo que justifique una cara con vida fuera del despacho.
 * - **Sin permiso de Axel, nada**: la isla no existe para quien no lo ve.
 */
export function AxelGlobalIsland() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  if (pathname.startsWith("/cmo") || !hasPermission("cmo:read")) return null;
  return <GlobalIsland />;
}

const EXPRESSION: Record<string, AssistantExpressionName> = {
  pill: "neutral",
  notice: "curious",
  summary: "proud",
};

function GlobalIsland() {
  useCmoNewsSocket();
  const router = useRouter();
  const news = useCmoStore((state) => state.news);
  const takeNews = useCmoStore((state) => state.takeNews);
  const briefing = useCmoStore((state) => state.briefing.data ?? null);
  const [accessory] = useAxelAccessory();

  const openBoard = useCallback(() => {
    router.push("/cmo");
  }, [router]);
  const openProposal = useCallback(
    (proposalId: string) => {
      router.push(`/cmo/proposals/${proposalId}`);
    },
    [router],
  );
  const noop = useCallback(() => undefined, []);

  const island = useAxelIsland({
    news,
    takeNews,
    briefing,
    loadBriefing: getLatestBriefing,
    liveQuestion: null,
    liveVisible: true,
    thinking: false,
    empty: false,
    onPick: noop,
    onWrite: openBoard,
    onOpenBoard: openBoard,
    onOpenProposal: openProposal,
  });

  const shape = islandShape({ working: false, item: island.current, listening: false });

  return (
    <AssistantDock
      title="Axel"
      className="assistant-dock--global"
      hero={
        <AssistantStage>
          <AssistantAvatar expression={EXPRESSION[shape] ?? "neutral"} accessory={accessory} transitionMs={0} />
        </AssistantStage>
      }
      item={island.current}
      pending={island.pending}
      onFold={island.fold}
      onExpand={island.expand}
      onDismiss={island.dismiss}
      onPillClick={openBoard}
    />
  );
}
