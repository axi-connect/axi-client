"use client";

import { AlertCircle, Check, HardDrive, Loader2, RotateCw, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatBytes } from "@/modules/catalog/domain/product-gallery";
import type { UploadItem } from "@/modules/catalog/infrastructure/stores/photo-upload-queue";
import { useStorageQuotaState } from "@/modules/storage/public";

/**
 * Una foto en camino (lienzo «Subiendo, de a 3»): la miniatura local desde el
 * primer instante y, encima, en qué va —reduciendo, en cola, el % subido, lista
 * o el fallo con «Reintentar» solo para ella—. La reducción se muestra en
 * cifras («8,2 MB → 640 KB»): es lo que justifica la espera.
 */
export function UploadTile({
  item,
  onRetry,
  onDiscard,
}: {
  item: UploadItem;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const { blocksUploads } = useStorageQuotaState();

  if (item.status === "failed") {
    // Espacio lleno (auditoría C-3): reintentar no sirve mientras siga lleno;
    // el motivo va a la vista, no escondido en el `title`
    const noSpace = item.failure === "storage_full" || item.failure === "platform_full";
    const canRetry = !noSpace || !blocksUploads;
    return (
      <div
        className={cn(
          "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center",
          noSpace ? "border-border bg-muted" : "border-destructive/30 bg-destructive/8",
        )}
        title={item.error ?? undefined}
      >
        {noSpace ? (
          <HardDrive className="size-5 text-muted-foreground" aria-hidden />
        ) : (
          <AlertCircle className="size-5 text-destructive" aria-hidden />
        )}
        <span className="text-[11px] leading-tight font-medium text-foreground">
          {noSpace ? "Sin espacio" : "No se subió"}
        </span>
        {!noSpace && item.error ? (
          <span className="line-clamp-2 text-[10.5px] leading-tight text-muted-foreground">{item.error}</span>
        ) : null}
        <span className="flex flex-wrap items-center justify-center gap-1">
          {canRetry ? (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="inline-flex min-h-7 items-center gap-1 rounded-full bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCw className="size-3" aria-hidden />
              Reintentar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDiscard(item.id)}
            aria-label={`Descartar ${item.file_name}`}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      </div>
    );
  }

  const percent = Math.round(item.progress * 100);
  const reduced =
    item.prepared_bytes !== null && item.prepared_bytes < item.original_bytes
      ? `${formatBytes(item.original_bytes)} → ${formatBytes(item.prepared_bytes)}`
      : null;

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
      {/* Object URL local: no hay servidor que cachear */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.preview_url} alt="" className="h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-2 text-white">
        {item.status === "done" ? (
          <span className="absolute top-1.5 left-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-background/92 px-2 text-[10.5px] font-semibold text-foreground">
            <Check className="size-3" aria-hidden />
            Lista
          </span>
        ) : null}
        {item.status === "preparing" || item.status === "queued" ? (
          <span className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px]">
            {item.status === "preparing" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {item.status === "preparing" ? "Reduciendo…" : "En cola"}
          </span>
        ) : null}
        {item.status === "uploading" ? (
          <>
            <span className="text-[11px] font-semibold tabular-nums">{percent} %</span>
            <span
              role="progressbar"
              aria-label={`Subiendo ${item.file_name}`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 overflow-hidden rounded-full bg-white/30"
            >
              <span className="block h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </span>
          </>
        ) : null}
        {reduced !== null && item.status !== "preparing" && item.status !== "queued" ? (
          <span className="truncate text-[10.5px] font-medium tabular-nums">{reduced}</span>
        ) : null}
      </div>
    </div>
  );
}
