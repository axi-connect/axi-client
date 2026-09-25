"use client";

/**
 * `/platform/tenants/[id]/entrega` (R2: una página, no una modal). Carga el
 * contexto, el catálogo de ofertas y la última entrega, y decide qué mostrar:
 * - una entrega ya enviada → su resumen y «Reenviar»;
 * - si no (o si quedó a medias) → el formulario con la vista previa en vivo.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { isDispatchedDelivery, isResumableDelivery } from "../../../domain/delivery";
import {
  useDeliveryContext,
  useLatestDelivery,
  useOfferCatalog,
} from "../../../infrastructure/api/hooks/use-delivery";
import { ProblemAlert } from "../../components/ProblemAlert";
import { DeliverySentView } from "./DeliverySentView";
import { DeliveryWorkspace } from "./DeliveryWorkspace";

export function DeliveryPage({ tenantId }: { tenantId: string }) {
  const context = useDeliveryContext(tenantId);
  const catalog = useOfferCatalog();
  const latest = useLatestDelivery(tenantId);

  const failed = [context, catalog, latest].find((query) => query.isError);
  if (failed) {
    return (
      <ProblemAlert
        error={failed.error}
        onRetry={() => {
          void context.refetch();
          void catalog.refetch();
          void latest.refetch();
        }}
      />
    );
  }

  if (!context.data || !catalog.data || !latest.data) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" role="status" aria-label="Cargando la entrega">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  const delivery = latest.data.delivery;
  const back = (
    <Button asChild variant="ghost" size="sm">
      <Link href={`/platform/tenants/${tenantId}`}>
        <ArrowLeft aria-hidden="true" />
        Volver al resumen
      </Link>
    </Button>
  );

  if (delivery && isDispatchedDelivery(delivery)) {
    return (
      <div className="space-y-3">
        {back}
        <DeliverySentView tenantId={tenantId} delivery={delivery} ownerEmail={context.data.owner?.email ?? null} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {back}
      <DeliveryWorkspace
        // Una entrega distinta (o su primera carga) arranca el formulario de cero.
        key={delivery?.id ?? "new"}
        tenantId={tenantId}
        context={context.data}
        catalog={catalog.data}
        resumable={isResumableDelivery(delivery) ? delivery : null}
      />
    </div>
  );
}
