"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import type { InvoiceDetailDTO } from "@/modules/billing/domain/invoice";
import { getInvoice } from "@/modules/billing/infrastructure/services/billing-service.adapter";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { InvoiceDetail } from "./InvoiceDetail";

/**
 * Adaptador de ruta → panel (patrón `DealDetailRoute`). `back` para la ruta
 * interceptada (el atrás del navegador cierra); `replace` para la navegación
 * dura, donde no hay historial al que volver y cerrar debe llevar a la lista.
 *
 * La carga vive aquí y no en el detalle para que el panel pueda titularse con el
 * número de la factura: un panel que dice «Detalle» mientras dentro hay un h2
 * con el número repite la cabecera dos veces.
 */
export function InvoiceDetailRoute({
  invoiceId,
  closeBehavior,
}: {
  invoiceId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setInvoice(null);
    getInvoice(invoiceId)
      .then((detail) => {
        if (alive) setInvoice(detail);
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err));
      });
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  function close() {
    if (closeBehavior === "back") router.back();
    else router.replace("/billing/invoices");
  }

  return (
    <DetailSheet
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="lg"
      title={invoice?.number ?? "Factura"}
      subtitle={
        invoice === null
          ? undefined
          : `${formatShortDate(invoice.period_start)} – ${formatShortDate(invoice.period_end)}`
      }
    >
      {error !== null ? (
        <div className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={close}>
            Volver a las facturas
          </Button>
        </div>
      ) : invoice === null ? (
        <div
          className="space-y-3 p-5"
          role="status"
          aria-label="Cargando la factura"
          aria-busy="true"
        >
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <InvoiceDetail invoice={invoice} />
      )}
    </DetailSheet>
  );
}
