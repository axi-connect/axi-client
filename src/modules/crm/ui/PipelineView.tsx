"use client";

import { Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { DealDTO } from "@/modules/crm/domain/deal";
import { useActiveStages, useOpenBoardDeals } from "@/modules/crm/infrastructure/hooks/use-active-stages";
import { useCrmSocket } from "@/modules/crm/infrastructure/realtime/use-crm-socket";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";

import { DealDetailRoute } from "./DealDetailRoute";
import { PipelineHeader } from "./components/PipelineHeader";
import { PipelineSummary } from "./components/PipelineSummary";
import type { DealCardAction } from "./components/kanban/DealCard";
import { PipelineBoard } from "./components/kanban/PipelineBoard";
import { WinLoseDialog, type WinLoseRequest } from "./components/kanban/WinLoseDialog";
import { DealsTable } from "./tables/DealsTable";

const DEAL_ROUTE = /^\/crm\/pipeline\/deal\/([^/?#]+)/;

/**
 * Vista del pipeline (lienzo CRM premium F1): cabecera, bento de resumen con
 * la isla «Lo próximo», y el tablero o la tabla. El detalle flota encima como
 * panel vía el slot @sheet (ruta interceptada /crm/pipeline/deal/[dealId]).
 *
 * Es una vista de APLICACIÓN (DESIGN-SYSTEM §4.2): la vista no scrollea; cada
 * zona tiene su propio scroller —el tablero en horizontal, cada columna en
 * vertical, la fila del bento hasta `xl`— todos con la barra de marca.
 */
export function PipelineView({ initialDealId }: { initialDealId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const canOperate = hasPermission("crm:read");
  const view = useBoardStore((s) => s.view);
  const stats = useBoardStore((s) => s.stats);
  const statsPeriod = useBoardStore((s) => s.statsPeriod);
  const columns = useBoardStore((s) => s.columns);
  const stageOrder = useBoardStore((s) => s.stageOrder);
  const boardLoaded = useBoardStore((s) => s.boardLoaded);
  const boardError = useBoardStore((s) => s.boardError);
  const hydratePreferences = useBoardStore((s) => s.hydratePreferences);
  const init = useBoardStore((s) => s.init);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const stages = useActiveStages();
  const openDeals = useOpenBoardDeals();
  const [winLose, setWinLose] = useState<WinLoseRequest | null>(null);

  useCrmSocket();

  useEffect(() => {
    hydratePreferences();
    void init();
  }, [hydratePreferences, init]);

  const selectedId = initialDealId ?? pathname.match(DEAL_ROUTE)?.[1] ?? null;

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
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:gap-5 md:p-6">
        <PipelineHeader canOperate={canOperate} stats={stats} />
        <PipelineSummary
          stats={stats}
          period={statsPeriod}
          deals={openDeals}
          stages={stages}
          boardLoaded={boardLoaded}
          onOpenDeal={openDeal}
        />

        <div className="min-h-0 flex-1">
          {view === "table" ? (
            <DealsTable onOpenDeal={openDeal} />
          ) : boardError !== null ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-6 text-center">
              <div className="max-w-sm space-y-1.5">
                <p className="font-heading text-xl font-bold">No pudimos leer el pipeline</p>
                <p className="text-sm text-pretty text-muted-foreground">
                  Tus oportunidades están a salvo. Revisa la conexión e inténtalo de nuevo.
                </p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => void fetchBoard()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          ) : boardEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-card p-6 text-center">
              <div aria-hidden="true" className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="flex h-20 w-12 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-border">
                    {i === 2 && <span className="h-5 w-8 rounded-md bg-foreground" />}
                  </span>
                ))}
              </div>
              <div className="max-w-sm space-y-1.5">
                <p className="font-heading text-xl font-bold">Aún no hay oportunidades</p>
                <p className="text-sm text-pretty text-muted-foreground">
                  Crea la primera, o deja que Axi la abra sola cuando alguien pida precio en el inbox.
                </p>
              </div>
              {canOperate && (
                <Button asChild className="rounded-full">
                  <Link href="/crm/pipeline/create">
                    <Plus className="size-4" aria-hidden="true" />
                    Nueva oportunidad
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <PipelineBoard canOperate={canOperate} selectedId={selectedId} onCardAction={handleCardAction} />
          )}
        </div>
      </main>

      {/* Hard-nav a /crm/pipeline/deal/[id]: el panel se monta aquí (sin slot). */}
      {initialDealId !== undefined && <DealDetailRoute dealId={initialDealId} closeBehavior="replace" />}

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
