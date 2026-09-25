"use client";

import Link from "next/link";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import type { DeliveryDetailWire } from "../../../infrastructure/api/delivery.dto";
import { DeliverySummaryList } from "./DeliverySummaryList";
import { ResendDeliveryButton } from "./ResendDeliveryButton";

/** Estado «enviado» de «Preparar entrega»: el resumen y «Reenviar». */
export function DeliverySentView({
  tenantId,
  delivery,
  ownerEmail,
}: {
  tenantId: string;
  delivery: DeliveryDetailWire;
  ownerEmail: string | null;
}) {
  const failed = delivery.status === "failed";
  return (
    <section aria-labelledby="delivery-sent-title" className="max-w-3xl space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <header className="flex items-start gap-3">
        {failed ? (
          <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0 text-destructive" />
        ) : (
          <MailCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-success" />
        )}
        <div>
          <h2 id="delivery-sent-title" className="text-xl font-semibold tracking-tight">
            {failed ? "La bienvenida no salió" : "Bienvenida enviada"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {failed
              ? "La entrega quedó hecha (oferta, prueba y kit); lo que falló es el correo. Reenviar lo intenta de nuevo."
              : "El dueño recibió su correo con el enlace para crear la contraseña, y tu equipo, la copia sin enlace."}
          </p>
        </div>
      </header>

      <DeliverySummaryList delivery={delivery} ownerEmail={ownerEmail} />

      {delivery.password_set_at ? (
        <Callout tone="info" icon={CircleAlert}>
          Ya creó su contraseña; reenviar le permite cambiarla.
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <ResendDeliveryButton
          tenantId={tenantId}
          deliveryId={delivery.id}
          passwordSetAt={delivery.password_set_at}
          variant={failed ? "default" : "outline"}
          size="default"
        />
        <Button asChild variant="ghost">
          <Link href={`/platform/tenants/${tenantId}`}>Volver al resumen</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Reenviar usa el mismo kit, emite un enlace de contraseña nuevo que anula el anterior y queda como un intento
        más en el historial.
      </p>
    </section>
  );
}
