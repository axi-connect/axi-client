"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/core/lib/error-messages";
import { getImageOriginalUrl } from "@/modules/catalog/infrastructure/services/product-image-service.adapter";

/**
 * Visor del ORIGINAL de una foto de catálogo sobre el Dialog del design
 * system (Esc/overlay/focus-trap/scroll-lock gratis). La URL del original se
 * pide FRESCA al abrir (presigned TTL ~300 s), nunca se cachea en estado largo.
 */
export function PhotoLightbox({
  open,
  onOpenChange,
  imageId,
  alt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: string | null;
  alt: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !imageId) {
      setUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await getImageOriginalUrl(imageId);
        if (!cancelled) setUrl(result.url);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "No se pudo cargar la imagen"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, imageId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-[92vw] gap-2 p-3 sm:max-w-[92vw]">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {error ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : url ? (
          // Presigned rotativa (TTL ~300 s): incompatible con el caché de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Cargando imagen…</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
