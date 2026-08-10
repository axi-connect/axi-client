import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural del detalle: cabecera del canal + panel de datos. */
export default function ChannelDetailLoading() {
  return (
    <div role="status" aria-label="Cargando canal" aria-busy="true" className="space-y-6">
      <Skeleton className="h-9 w-28" />
      <div className="flex items-start gap-4 rounded-lg border border-border p-4">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-4 rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando canal…</span>
    </div>
  );
}
