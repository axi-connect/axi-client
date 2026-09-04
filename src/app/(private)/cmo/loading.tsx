import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton ESTRUCTURAL del despacho: reproduce el reparto real (hero al centro
 * del campo, composer anclado abajo, rail a la derecha) para que el contenido no
 * salte al llegar. Un spinner centrado no diría nada de la forma de la pantalla.
 *
 * Lleva `axel-field` a propósito: el fondo del campo es lo primero que se pinta y
 * si el skeleton no lo tuviera, la pantalla cambiaría de color al hidratar.
 */
export default function CmoLoading() {
  return (
    <div
      className="flex h-full min-h-0 w-full"
      role="status"
      aria-label="Cargando el despacho de Axel"
    >
      <div className="axel-field flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center px-6 pt-8">
          <Skeleton className="size-[96px] rounded-full" />
          <Skeleton className="mt-5 h-3.5 w-56" />
          <Skeleton className="mt-4 h-7 w-[22rem] max-w-full" />
          <Skeleton className="mt-2.5 h-7 w-[17rem] max-w-full" />
          <Skeleton className="mt-4 h-3.5 w-72 max-w-full" />
        </div>
        <div className="flex-none px-6 pt-3 pb-5">
          <div className="mx-auto w-full max-w-[640px]">
            <Skeleton className="h-[92px] w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="hidden w-[316px] flex-none flex-col border-l border-border bg-secondary/40 xl:flex">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="flex-none border-t border-border p-3.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
