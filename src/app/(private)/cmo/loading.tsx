import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton ESTRUCTURAL del despacho: reproduce el reparto real (briefing arriba,
 * chat al centro, rail a la derecha) para que el contenido no salte al llegar.
 * Un spinner centrado no diría nada de la forma de la pantalla.
 */
export default function CmoLoading() {
  return (
    <div className="flex h-full min-h-0 w-full" role="status" aria-label="Cargando el despacho de Axel">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-none border-b border-border px-6 pt-5 pb-4">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3">
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <Skeleton className="size-[84px] rounded-full" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex-none px-6 pt-3 pb-5">
          <div className="mx-auto w-full max-w-[640px]">
            <Skeleton className="h-[92px] w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="hidden w-[316px] flex-none flex-col gap-3 border-l border-border bg-secondary/40 p-3.5 xl:flex">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
