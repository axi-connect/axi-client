"use client";

import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { isDispatchedDelivery } from "../../../domain/delivery";
import { useLatestDelivery } from "../../../infrastructure/api/hooks/use-delivery";
import { DeliverySummaryList } from "./DeliverySummaryList";
import { ResendDeliveryButton } from "./ResendDeliveryButton";

/**
 * Tarjeta «Entrega» del resumen del tenant: estado, cuándo y por quién salió,
 * el id del mensaje y si el dueño ya creó su contraseña. «Copiar enlace del
 * kit» no está: el servidor guarda solo el hash del token y no puede devolverlo.
 */
export function TenantDeliveryCard({ tenantId }: { tenantId: string }) {
  const { data, isPending, isError } = useLatestDelivery(tenantId);
  const href = `/platform/tenants/${tenantId}/entrega`;

  return (
    <section aria-labelledby="tenant-delivery-title" className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tenant-delivery-title" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Entrega
        </h2>
      </div>
      <div className="mt-2 text-sm">
        {isPending ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : isError ? (
          <p className="text-muted-foreground">No pudimos leer la entrega. Recarga la página en un momento.</p>
        ) : data?.delivery ? (
          <div className="space-y-3">
            <DeliverySummaryList delivery={data.delivery} compact />
            <div className="flex flex-wrap items-center gap-2">
              {isDispatchedDelivery(data.delivery) ? (
                <ResendDeliveryButton
                  tenantId={tenantId}
                  deliveryId={data.delivery.id}
                  passwordSetAt={data.delivery.password_set_at}
                />
              ) : (
                <Button asChild size="sm">
                  <Link href={href}>Retomar la entrega</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href={href}>Ver la entrega</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-muted-foreground">
              <PackageCheck aria-hidden="true" className="size-4" />
              Aún sin entregar: la prueba arranca cuando le envías la bienvenida.
            </p>
            <Button asChild size="sm">
              <Link href={href}>Preparar entrega</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
