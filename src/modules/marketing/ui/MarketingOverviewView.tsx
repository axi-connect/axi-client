"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/features/empty-state";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";
import { useMarketingSocket } from "@/modules/marketing/infrastructure/realtime/use-marketing-socket";
import { useOverviewStore } from "@/modules/marketing/infrastructure/stores/overview.store";
import { MarketingNextUpIsland } from "./components/MarketingNextUpIsland";
import {
  LiveCampaignsTile,
  MetaTemplatesTile,
  OptOutsTile,
  PromotionsTile,
  QuotaTile,
  CaptureTile,
  RecoveredTile,
  RecoveryFeedTile,
} from "./components/overview-tiles";
import { OverviewSkeleton } from "./components/OverviewSkeleton";

/** «Septiembre»: el mes de las cifras, en el antetítulo. */
function monthName(date: Date): string {
  const month = date.toLocaleDateString("es-CO", { month: "long" });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

/**
 * Resumen de Marketing en bento (canvas 2026-09-26): lo recuperado por las
 * reglas y las campañas en curso arriba, «Lo próximo» como la única isla, y
 * debajo lo que se vigila (en vivo, promociones, plantillas y cupo de Meta,
 * bajas). Cada bloque carga y falla por su cuenta: uno caído dice «no pudimos
 * leer» en su sitio y deja reintentar, sin tumbar la pantalla.
 */
export function MarketingOverviewView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const canReadLeads = hasPermission("leads:read");
  const { connected } = useMarketingSocket();

  const automations = useOverviewStore((s) => s.automations);
  const recovery = useOverviewStore((s) => s.recovery);
  const promotions = useOverviewStore((s) => s.promotions);
  const optOutsTotal = useOverviewStore((s) => s.optOutsTotal);
  const liveCampaigns = useOverviewStore((s) => s.liveCampaigns);
  const liveCampaignsOmitted = useOverviewStore((s) => s.liveCampaignsOmitted);
  const drafts = useOverviewStore((s) => s.drafts);
  const meta = useOverviewStore((s) => s.meta);
  const capture = useOverviewStore((s) => s.capture);
  const feed = useOverviewStore((s) => s.feed);
  const load = useOverviewStore((s) => s.load);
  // Un solo «ahora» por carga: todas las promociones se comparan contra el mismo instante.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void load({ capture: canReadLeads }).then(() => setNow(new Date()));
  }, [load, canReadLeads]);

  const retry = () => void load({ capture: canReadLeads }).then(() => setNow(new Date()));

  const firstLoad = automations.status === "idle" || (automations.status === "loading" && automations.data === null);
  if (firstLoad) return <OverviewSkeleton />;

  // Sin reglas, sin promociones y sin campañas: el tenant no ha empezado. Cinco ceros no dicen nada.
  const neverUsed =
    automations.status === "ready" &&
    promotions.status === "ready" &&
    liveCampaigns.status === "ready" &&
    drafts.status !== "loading" &&
    (automations.data?.length ?? 0) === 0 &&
    (promotions.data?.length ?? 0) === 0 &&
    (liveCampaigns.data?.length ?? 0) === 0 &&
    (drafts.data ?? 0) === 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        kicker={`Marketing · ${monthName(now)}`}
        title="Lo que tus mensajes venden"
        actions={
          <>
            <span className="text-muted-foreground inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full ring-4", connected ? "bg-success ring-success/15" : "bg-muted-foreground ring-transparent")}
              />
              {connected ? "En vivo" : "Reconectando"}
            </span>
            {canManage ? (
              <>
                <Button variant="outline" className="rounded-full" asChild>
                  <Link href="/marketing/promotions?new=1">Nueva promoción</Link>
                </Button>
                <Button className="rounded-full" asChild>
                  <Link href="/marketing/campaigns/new">
                    <Plus className="size-4" aria-hidden="true" />
                    Nueva campaña
                  </Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {neverUsed ? (
        <EmptyState
          glyph="ai"
          title="Aún no recuperas ventas"
          description="Cada día se te escapan carritos a medias y conversaciones que se apagaron. Enciende una regla y deja que el agente los reenganche solo."
          action={
            canManage && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button className="rounded-full" asChild>
                  <Link href="/marketing/automations">Crear mi primera regla</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/marketing/promotions?new=1">Configurar una promoción</Link>
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          <RecoveredTile recovery={recovery} automations={automations} onRetry={retry} className="md:col-span-2" />
          <MarketingNextUpIsland
            automations={automations}
            promotions={promotions}
            drafts={drafts}
            meta={meta}
            now={now}
            canManage={canManage}
            onRetry={retry}
            className="md:col-span-2 xl:col-span-1 xl:row-span-2"
          />
          <LiveCampaignsTile
            section={liveCampaigns}
            omitted={liveCampaignsOmitted}
            canManage={canManage}
            onRetry={retry}
            className="md:col-span-2"
          />
          <RecoveryFeedTile entries={feed} connected={connected} />
          <PromotionsTile section={promotions} now={now} onRetry={retry} />
          {canReadLeads ? <CaptureTile section={capture} onRetry={retry} /> : null}
          <OptOutsTile section={optOutsTotal} onRetry={retry} />
          <MetaTemplatesTile section={meta} onRetry={retry} />
          <QuotaTile section={meta} onRetry={retry} />
        </div>
      )}

      <p className="text-muted-foreground text-xs text-pretty">
        Los mensajes de marketing aparecen en el{" "}
        <Link href="/workspace/inbox" className="text-foreground inline-flex min-h-6 items-center font-medium underline-offset-4 hover:underline">
          inbox
        </Link>{" "}
        dentro del hilo normal del contacto: tus asesores ven exactamente lo que se le escribió.
      </p>
    </div>
  );
}
