"use client";

/**
 * Tab Resumen (entrega_premium_plan.md, F1 y F6): el tenant en un vistazo, con
 * lo que sirve en el día a día del asesor. Arriba, el recorrido de los 7 días
 * con «hoy»; debajo, un bento de fichas de un tema cada una (DESIGN-SYSTEM
 * §9.5) y la isla de tinta con lo próximo que toca.
 *
 * Honesto con el contrato: pinta lo que traen la lista de tenants, la última
 * entrega, su contexto (la oferta) y `…/delivery/trial-progress` (el uso de la
 * prueba y la puesta en marcha).
 */
import { useEffect, useMemo, useState } from "react";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { isDispatchedDelivery } from "../../../../domain/delivery";
import { nextMilestone, trialJourney, type TrialJourneyInput } from "../../../../domain/trial-journey";
import {
  useDeliveryContext,
  useLatestDelivery,
  useTrialProgress,
} from "../../../../infrastructure/api/hooks/use-delivery";
import { useTenantQuery } from "../../../../infrastructure/api/hooks/use-tenants";
import { usePlatformRole } from "../../../../infrastructure/auth/use-platform-role";
import { isHttpError } from "@/core/api/problem";
import { NextStepCard, OfferTile, OwnerAccessTile, WelcomeTile } from "./summary/SummaryTiles";
import { ConversationsTile, SetupTile } from "./summary/TrialProgressTiles";
import { TrialJourneyStrip } from "./summary/TrialJourneyStrip";

/** La lista de tenants no trae su zona; los clientes de hoy son de Colombia. */
const TRIAL_TIMEZONE = "America/Bogota";

/** La cuenta atrás de «Lo próximo» se refresca cada minuto (no cada segundo: no es un reloj). */
const NOW_TICK_MS = 60_000;

/**
 * El reparto del bento (DESIGN-SYSTEM §9.5): 2 columnas en md, 3 en xl con «Lo
 * próximo» anclado a la derecha en dos filas, y 4 desde 1400 px. Lo comparten
 * la vista y su esqueleto para que la carga no salte.
 */
const BENTO_GRID =
  "grid gap-4 md:grid-flow-dense md:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)]";

function useNow(tickMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);
  return now;
}

function DeliveryUnavailable({
  forbidden,
  billingHref,
  onRetry,
}: {
  forbidden: boolean;
  billingHref: string;
  onRetry: () => void;
}) {
  return (
    <BentoTile label="Entrega y prueba" className="max-w-2xl">
      {forbidden ? (
        <>
          <p className="text-sm font-medium">La entrega la gestiona soporte</p>
          <p className="text-sm text-pretty text-muted-foreground">
            Tu rol no ve la entrega, la prueba ni sus citas. La facturación del negocio está en su pestaña.
          </p>
          <BentoLink href={billingHref} className="mt-1">
            Ver facturación
          </BentoLink>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">No pudimos leer la entrega</p>
          <p className="text-sm text-pretty text-muted-foreground">Recarga en un momento o reintenta ahora.</p>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        </>
      )}
    </BentoTile>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando resumen">
      <Skeleton className="h-32 rounded-3xl" />
      <div className={BENTO_GRID}>
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:h-auto min-[1400px]:col-start-4" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl md:col-span-2 xl:col-span-3 min-[1400px]:col-span-2" />
      </div>
    </div>
  );
}

export function TenantSummary({ tenantId }: { tenantId: string }) {
  const { data: tenant, isPending } = useTenantQuery(tenantId);
  // Todo /delivery/* es de super_admin y support: billing_ops recibe 403, así
  // que no se pide nada de la entrega ni se pintan sus fichas (auditoría B1).
  const role = usePlatformRole();
  const progressAllowed = role !== "billing_ops";
  const latest = useLatestDelivery(tenantId, { enabled: progressAllowed });
  const context = useDeliveryContext(tenantId, { enabled: progressAllowed });
  const progress = useTrialProgress(tenantId, { enabled: progressAllowed });
  const progressForbidden = isHttpError(progress.error) && progress.error.status === 403;
  const showProgress = progressAllowed && !progressForbidden;
  const now = useNow(NOW_TICK_MS);

  const delivery = latest.data?.delivery ?? null;
  const journeyInput: TrialJourneyInput | null = useMemo(() => {
    if (!delivery || !isDispatchedDelivery(delivery) || !delivery.trial_starts_at || !delivery.trial_ends_at) return null;
    return {
      startsAt: delivery.trial_starts_at,
      endsAt: delivery.trial_ends_at,
      timeZone: delivery.trial_tz,
      callDay2At: delivery.call_day2_at,
      callDay5At: delivery.call_day5_at,
    };
  }, [delivery]);

  if (isPending || (progressAllowed && latest.isPending)) return <SummarySkeleton />;

  // El estado "no encontrado"/error lo cubre el header del layout.
  if (!tenant) return null;

  // Sin acceso a la entrega (rol) o sin poder leerla (403/500): se dice, en vez
  // de pintar «Aún sin entregar» sobre un dato que no se leyó (B1).
  if (!progressAllowed || latest.isError) {
    const forbidden = !progressAllowed || (isHttpError(latest.error) && latest.error.status === 403);
    return (
      <DeliveryUnavailable
        forbidden={forbidden}
        billingHref={`/platform/tenants/${tenant.id}/billing`}
        onRetry={() => void latest.refetch()}
      />
    );
  }

  const journey = journeyInput ? trialJourney(journeyInput, now) : null;
  const milestone = journeyInput ? nextMilestone(journeyInput, now) : null;
  const timeZone = context.data?.tenant.timezone ?? delivery?.trial_tz ?? TRIAL_TIMEZONE;
  const ownerEmail = context.data?.owner?.email ?? null;

  return (
    <div className="space-y-4">
      {journey && journeyInput ? (
        <TrialJourneyStrip
          journey={journey}
          startsAt={journeyInput.startsAt}
          endsAt={journeyInput.endsAt}
          timeZone={journeyInput.timeZone}
        />
      ) : null}

      <div className={BENTO_GRID}>
        {showProgress ? (
          <>
            <ConversationsTile
              usage={progress.data?.trial_usage}
              todayIndex={journey?.todayIndex ?? null}
              loading={progress.isPending}
              failed={progress.isError}
            />
            <SetupTile setup={progress.isError ? undefined : progress.data?.setup} loading={progress.isPending} />
          </>
        ) : null}
        <OwnerAccessTile delivery={delivery} ownerEmail={ownerEmail} />
        <NextStepCard
          tenantId={tenant.id}
          businessName={tenant.name}
          delivery={delivery}
          milestone={milestone}
          now={now}
        />
        <OfferTile
          offer={context.data?.offer}
          trialEndsAt={delivery?.trial_ends_at ?? tenant.trial_ends_at}
          timeZone={timeZone}
          entregaHref={`/platform/tenants/${tenant.id}/entrega`}
        />
        <WelcomeTile tenantId={tenant.id} delivery={delivery} ownerEmail={ownerEmail} />
      </div>
    </div>
  );
}
