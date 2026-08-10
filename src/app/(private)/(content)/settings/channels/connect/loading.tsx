import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural del wizard: cabecera, stepper y la galería del paso 1. */
export default function ConnectChannelLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando el asistente de conexión"
      aria-busy="true"
      className="mx-auto max-w-3xl space-y-6"
    >
      <Skeleton className="h-9 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-6 w-full max-w-md" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
        {[0, 1].map((index) => (
          <div key={index} className="flex gap-3.5 rounded-lg border border-border p-4">
            <Skeleton className="size-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando el asistente de conexión…</span>
    </div>
  );
}
