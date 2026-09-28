import { cn } from "@/core/lib/utils";
import { islandClassName } from "@/shared/components/features/island";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton ESTRUCTURAL del despacho: reproduce el estado vacío real —la isla L
 * con el escenario, el saludo y el titular, el compositor con sus píldoras,
 * todo centrado— y el panel «Por decidir» a la derecha, para que nada salte al
 * llegar. Las medidas son las del kit: columna de 640 px, isla de 208 px y su
 * reserva (`.assistant-hero-spacer`), compositor de 56 px.
 *
 * Lleva `assistant-field` (el campo del kit de asistente) a propósito: el fondo del campo es lo primero que se pinta y
 * si el skeleton no lo tuviera, la pantalla cambiaría de color al hidratar.
 */
export default function CmoLoading() {
  return (
    <div className="flex h-full min-h-0 w-full" role="status" aria-label="Cargando el despacho de Axel">
      <div className="assistant-field flex min-w-0 flex-1 flex-col justify-center">
        <div className="px-6">
          <div className="mx-auto flex w-full max-w-[640px] flex-col items-center">
            {/* La isla L (208 px) más su reserva: 232 px hasta el saludo. */}
            <div className="flex h-[232px] w-full flex-col pt-2">
              <div className={cn(islandClassName({ material: "ink", glow: "none" }), "h-[208px] w-full rounded-[36px]")} />
            </div>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-3 h-7 w-[22rem] max-w-full" />
            <Skeleton className="mt-2.5 h-7 w-[17rem] max-w-full" />
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex-none px-6 pt-3 pb-5">
          <div className="mx-auto flex w-full max-w-[640px] flex-col items-center">
            <Skeleton className="h-14 w-full rounded-[26px]" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="hidden w-[340px] flex-none flex-col bg-secondary/40 xl:flex">
        <div className="min-h-0 flex-1 p-3.5">
          <div className="glass-overlay rounded-3xl p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-2 h-3 w-24" />
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
