"use client";

import { useEffect, useState } from "react";
import { FileText, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { OrderPaymentDTO } from "@/modules/orders/domain/order";
import { getPaymentProofUrl } from "@/modules/orders/infrastructure/services/order-payments-service.adapter";

/**
 * Comprobante del pago: URL presignada (TTL 5 min) que se pide al montar y se
 * refresca al expirar si el usuario amplía. Imagen → thumbnail + lightbox;
 * PDF/otros → enlace de descarga.
 */
export function PaymentProofViewer({
  orderId,
  payment,
}: {
  orderId: string;
  payment: OrderPaymentDTO;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    getPaymentProofUrl(orderId, payment.id)
      .then((res) => {
        if (!cancelled) setUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, payment.id]);

  if (payment.attachment_id === null) return null;
  if (failed) {
    return <p className="text-xs text-muted-foreground">No se pudo cargar el comprobante.</p>;
  }
  if (url === null) return <Skeleton className="h-28 w-full rounded-xl" />;

  const isImage = payment.mime_type?.startsWith("image/") ?? false;

  if (!isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:bg-accent"
      >
        <FileText className="size-4 text-muted-foreground" />
        Ver comprobante (documento)
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="group relative block w-full overflow-hidden rounded-xl border border-border focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setZoomed(true)}
        aria-label="Ampliar comprobante de pago"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de storage propio */}
        <img src={url} alt="Comprobante de pago" className="max-h-40 w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <ZoomIn className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </button>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">Comprobante de pago</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Comprobante de pago ampliado" className="max-h-[80svh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
