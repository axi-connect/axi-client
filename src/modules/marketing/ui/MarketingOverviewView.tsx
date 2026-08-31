"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BellOff,
  Coins,
  Info,
  Megaphone,
  Send,
  Ticket,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatTile } from "@/shared/components/features/stat-tile";
import { PageHeader } from "@/shared/components/layout/page-header";
import { isPromotionLive } from "@/modules/marketing/domain/promotion";
import { useMarketingSocket } from "@/modules/marketing/infrastructure/realtime/use-marketing-socket";
import {
  useOverviewStore,
  type Section,
} from "@/modules/marketing/infrastructure/stores/overview.store";
import { LiveCampaignCard } from "./components/LiveCampaignCard";
import { RecoveryFeed } from "./components/RecoveryFeed";
import { OverviewSkeleton } from "./components/OverviewSkeleton";

/** Atenúa (sin vaciar) mientras un bloque re-consulta: el layout no salta. */
function dimWhileLoading(section: Section<unknown>): string | undefined {
  return section.status === "loading" && section.data !== null
    ? "opacity-60 transition-opacity"
    : undefined;
}

export function MarketingOverviewView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { connected } = useMarketingSocket();

  const automations = useOverviewStore((s) => s.automations);
  const recovery = useOverviewStore((s) => s.recovery);
  const promotions = useOverviewStore((s) => s.promotions);
  const optOutsTotal = useOverviewStore((s) => s.optOutsTotal);
  const liveCampaigns = useOverviewStore((s) => s.liveCampaigns);
  const liveCampaignsOmitted = useOverviewStore((s) => s.liveCampaignsOmitted);
  const feed = useOverviewStore((s) => s.feed);
  const load = useOverviewStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledRules = automations.data?.filter((a) => a.enabled).length ?? null;
  const totalRules = automations.data?.length ?? null;
  const now = new Date();
  const livePromotions =
    promotions.data?.filter((p) => isPromotionLive(p, now)).length ?? null;

  const firstLoad =
    automations.status === "idle" ||
    (automations.status === "loading" && automations.data === null);

  if (firstLoad) return <OverviewSkeleton />;

  // Sin reglas, sin promociones y sin campañas: el tenant no ha empezado. No
  // tiene sentido enseñarle cinco ceros — se le dice por dónde empezar.
  const neverUsed =
    automations.status === "ready" &&
    promotions.status === "ready" &&
    liveCampaigns.status === "ready" &&
    (totalRules ?? 0) === 0 &&
    (promotions.data?.length ?? 0) === 0 &&
    (liveCampaigns.data?.length ?? 0) === 0;

  const loadError = automations.error ?? liveCampaigns.error ?? promotions.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        description="Recupera ventas perdidas y habla con toda tu base de clientes."
        actions={
          canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href="/marketing/automations">Ver reglas</Link>
              </Button>
              <Button className="rounded-full" asChild>
                <Link href="/marketing/campaigns/new">
                  <Megaphone className="size-4" aria-hidden="true" />
                  Nueva campaña
                </Link>
              </Button>
            </>
          )
        }
      />

      {loadError && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            <span className="font-medium text-destructive">
              Algunos datos no se pudieron cargar.
            </span>{" "}
            {loadError}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      )}

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
                  <Link href="/marketing/promotions">Configurar una promoción</Link>
                </Button>
              </div>
            )
          }
        />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
              dimWhileLoading(recovery),
            )}
          >
            <StatTile
              label="Recuperado por tus reglas"
              value={
                recovery.data ? formatMoney(recovery.data.attributed_revenue_cents) : null
              }
              icon={Coins}
              tone="amber"
              hint={
                recovery.data
                  ? `${recovery.data.converted.toLocaleString("es-CO")} pedidos pagados`
                  : undefined
              }
            />
            <StatTile
              label="Mensajes de recuperación"
              value={recovery.data?.sent.toLocaleString("es-CO") ?? null}
              icon={Send}
              hint={
                recovery.data && recovery.data.omitted > 0
                  ? `sobre ${recovery.data.measured} de tus reglas activas`
                  : "desde que encendiste tus reglas"
              }
            />
            <StatTile
              label="Reglas activas"
              value={enabledRules !== null ? `${enabledRules} de ${totalRules}` : null}
              icon={Zap}
              hint={
                totalRules !== null && enabledRules !== null && totalRules > enabledRules
                  ? `${totalRules - enabledRules} apagadas`
                  : undefined
              }
            />
            <StatTile
              label="Cupones canjeados"
              value={
                recovery.data
                  ? `${recovery.data.coupons_redeemed.toLocaleString("es-CO")} de ${recovery.data.coupons_issued.toLocaleString("es-CO")}`
                  : null
              }
              icon={Ticket}
              hint={
                livePromotions !== null
                  ? `${livePromotions} ${livePromotions === 1 ? "promoción activa" : "promociones activas"}`
                  : undefined
              }
            />
            <StatTile
              label="Dados de baja"
              value={optOutsTotal.data?.toLocaleString("es-CO") ?? null}
              icon={BellOff}
              tone={optOutsTotal.data && optOutsTotal.data > 0 ? "warning" : "default"}
              hint="excluidos de toda audiencia"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <section className="rounded-2xl border border-border bg-background">
              <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
                <h2 className="text-sm font-semibold">Campañas en curso</h2>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/marketing/campaigns">Ver todas</Link>
                </Button>
              </header>
              <div className={dimWhileLoading(liveCampaigns)}>
                {liveCampaigns.data && liveCampaigns.data.length > 0 ? (
                  <>
                    <div className="divide-y divide-border/60">
                      {liveCampaigns.data.map((item) => (
                        <LiveCampaignCard key={item.campaign.id} item={item} />
                      ))}
                    </div>
                    {liveCampaignsOmitted > 0 && (
                      <p className="border-t border-border/60 px-5 py-2.5 text-xs text-muted-foreground">
                        Y {liveCampaignsOmitted} más en curso.{" "}
                        <Link href="/marketing/campaigns" className="underline">
                          Verlas todas
                        </Link>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <Megaphone aria-hidden="true" className="size-7 text-muted-foreground" />
                    <p className="text-sm font-medium">No hay campañas en curso</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Cuando lances una, aquí verás su avance en vivo.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-background">
              <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
                <h2 className="text-sm font-semibold">Recuperación en vivo</h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                    connected
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current"
                  />
                  {connected ? "Conectado" : "Reconectando"}
                </span>
              </header>
              <RecoveryFeed entries={feed} connected={connected} />
            </section>
          </div>
        </>
      )}

      <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Los mensajes de marketing aparecen en el{" "}
          <Link href="/workspace/inbox" className="font-medium text-foreground underline">
            inbox
          </Link>{" "}
          dentro del hilo normal del contacto: tus asesores ven exactamente lo que se le
          escribió.
        </span>
      </p>
    </div>
  );
}
