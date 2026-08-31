"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { useCrmSocket } from "@/modules/crm/infrastructure/realtime/use-crm-socket";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { DealStatsTiles } from "./components/DealStatsTiles";
import { PipelineHeader } from "./components/PipelineHeader";
import { PipelineBoard } from "./components/kanban/PipelineBoard";
import { WinLoseDialog, type WinLoseRequest } from "./components/kanban/WinLoseDialog";
import type { DealCardAction } from "./components/kanban/DealCard";
import { DealDetailRoute } from "./DealDetailRoute";
import { DealsTable } from "./tables/DealsTable";

/**
 * Vista del pipeline (F3), patrón OrdersView: header + KPIs + board/tabla
 * conmutables; el detalle vive como rail derecho vía el slot @sheet
 * (ruta interceptada /crm/pipeline/deal/[dealId]).
 */
export function PipelineView({ initialDealId }: { initialDealId?: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canOperate = hasPermission("crm:read");

  const view = useBoardStore((s) => s.view);
  const stats = useBoardStore((s) => s.stats);
  const columns = useBoardStore((s) => s.columns);
  const stageOrder = useBoardStore((s) => s.stageOrder);
  const boardLoaded = useBoardStore((s) => s.boardLoaded);
  const boardError = useBoardStore((s) => s.boardError);
  const hydratePreferences = useBoardStore((s) => s.hydratePreferences);
  const init = useBoardStore((s) => s.init);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);

  const [winLose, setWinLose] = useState<WinLoseRequest | null>(null);

  useCrmSocket();

  useEffect(() => {
    hydratePreferences();
    void init();
  }, [hydratePreferences, init]);

  function openDeal(dealId: string) {
    router.push(`/crm/pipeline/deal/${dealId}`);
  }

  function handleCardAction(deal: DealDTO, action: DealCardAction) {
    if (action.type === "view") openDeal(deal.id);
    else setWinLose({ deal, action: action.type });
  }

  const boardEmpty =
    boardLoaded &&
    boardError === null &&
    stageOrder.every((stageId) => (columns[stageId]?.ids.length ?? 0) === 0);

  return (
    <div className="relative flex h-full min-h-0">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <PipelineHeader canOperate={canOperate} />
        <DealStatsTiles stats={stats} />

        <div className="min-h-0 flex-1">
          {view === "table" ? (
            <DealsTable onOpenDeal={openDeal} />
          ) : boardError !== null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">{boardError}</p>
              <Button variant="outline" className="rounded-full" onClick={() => void fetchBoard()}>
                Reintentar
              </Button>
            </div>
          ) : boardEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <GlassGlyph kind="money" />
              <div>
                <p className="font-medium">Aún no hay oportunidades</p>
                <p className="text-sm text-muted-foreground">
                  Crea la primera o deja que la IA del inbox las abra al detectar intención de compra.
                </p>
              </div>
            </div>
          ) : (
            <PipelineBoard canOperate={canOperate} onCardAction={handleCardAction} />
          )}
        </div>
      </main>

      {/* Hard-nav a /crm/pipeline/deal/[id]: el rail se monta inline (sin slot) */}
      {initialDealId !== undefined && (
        <DealDetailRoute dealId={initialDealId} closeBehavior="replace" />
      )}

      {winLose !== null && (
        <WinLoseDialog
          request={winLose}
          onOpenChange={(open) => {
            if (!open) setWinLose(null);
          }}
        />
      )}
    </div>
  );
}
