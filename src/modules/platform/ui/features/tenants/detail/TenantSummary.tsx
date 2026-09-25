"use client";

/**
 * Tab Resumen (entrega_premium_plan.md, F1): el tenant en un vistazo, con lo
 * que sirve en el día a día del asesor. Arriba, el recorrido de los 7 días con
 * «hoy»; debajo, un bento de tarjetas de un tema cada una y, a la derecha, la
 * isla de tinta con lo próximo que toca.
 *
 * Honesto con el contrato: pinta solo lo que traen la lista de tenants, la
 * última entrega y el contexto de la entrega (la oferta). El uso de la prueba y
 * la puesta en marcha no se muestran hasta que el servidor los exponga (F6).
 */
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { isDispatchedDelivery } from "../../../../domain/delivery";
import { nextMilestone, trialJourney, type TrialJourneyInput } from "../../../../domain/trial-journey";
import { useDeliveryContext, useLatestDelivery } from "../../../../infrastructure/api/hooks/use-delivery";
import { useTenantQuery } from "../../../../infrastructure/api/hooks/use-tenants";
import {
  IdentityTile,
  NextStepCard,
  OfferTile,
  OwnerAccessTile,
  TeamTile,
  WelcomeTile,
} from "./summary/SummaryTiles";
import { TrialJourneyStrip } from "./summary/TrialJourneyStrip";

/** La lista de tenants no trae su zona; los clientes de hoy son de Colombia. */
const TRIAL_TIMEZONE = "America/Bogota";

/** La cuenta atrás de «Lo próximo» se refresca cada minuto (no cada segundo: no es un reloj). */
const NOW_TICK_MS = 60_000;

function useNow(tickMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);
  return now;
}

function SummarySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando resumen">
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3 min-[1400px]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)]">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl xl:col-start-3 xl:row-span-3 xl:row-start-1 xl:h-auto min-[1400px]:col-start-4 min-[1400px]:row-span-2" />
        <Skeleton className="h-48 rounded-3xl md:col-span-2" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    </div>
  );
}

export function TenantSummary({ tenantId }: { tenantId: string }) {
  const { data: tenant, isPending } = useTenantQuery(tenantId);
  const latest = useLatestDelivery(tenantId);
  const context = useDeliveryContext(tenantId);
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

  if (isPending || latest.isPending) return <SummarySkeleton />;

  // El estado "no encontrado"/error lo cubre el header del layout.
  if (!tenant) return null;

  const journey = journeyInput ? trialJourney(journeyInput, now) : null;
  const milestone = journeyInput ? nextMilestone(journeyInput, now) : null;
  const timeZone = context.data?.tenant.timezone ?? delivery?.trial_tz ?? TRIAL_TIMEZONE;

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3 min-[1400px]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)]">
        <OwnerAccessTile delivery={delivery} ownerEmail={context.data?.owner?.email ?? null} />
        <OfferTile
          offer={context.data?.offer}
          trialEndsAt={delivery?.trial_ends_at ?? tenant.trial_ends_at}
          timeZone={timeZone}
          entregaHref={`/platform/tenants/${tenant.id}/entrega`}
        />
        <TeamTile tenant={tenant} />
        <NextStepCard
          tenantId={tenant.id}
          businessName={tenant.name}
          delivery={delivery}
          milestone={milestone}
          now={now}
        />
        <WelcomeTile tenantId={tenant.id} delivery={delivery} ownerEmail={context.data?.owner?.email ?? null} />
        <IdentityTile tenant={tenant} />
      </div>
    </div>
  );
}
