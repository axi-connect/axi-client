import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Anchos deterministas: nunca `Math.random()` en una silueta (rompe la hidratación, DS §9.1). */
const WIDTHS = [
  ["62%", "38%"],
  ["48%", "30%"],
  ["70%", "42%"],
  ["55%", "26%"],
  ["66%", "34%"],
  ["44%", "28%"],
] as const;

/** La silueta con la forma real de la fila: miniatura, dos líneas y el estado. */
export function ProductRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando productos" className="flex flex-col gap-4 px-5 py-4">
      {WIDTHS.slice(0, rows).map(([first, second], index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 rounded-md" style={{ width: first }} />
            <Skeleton className="h-2.5 rounded-md" style={{ width: second }} />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error al cargar: aviso en línea dentro del listado (DS §9.4), con los
 * filtros todavía a mano encima: si el que falla es un filtro, se puede quitar.
 */
export function ProductsLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="px-4 pb-4">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>No pudimos cargar tus productos</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 rounded-full px-4 text-foreground"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              onRetry();
              window.setTimeout(() => setRetrying(false), 600);
            }}
          >
            {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Sin resultados: dice la causa real (filtros o búsqueda) y ofrece deshacerla.
 * Antes decía «Sin resultados para esta búsqueda» aunque la causa fuera un filtro.
 */
export function ProductsNoResults({
  byFilters,
  search,
  onClearFilters,
  onClearSearch,
}: {
  byFilters: boolean;
  search: string | undefined;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <SearchX aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="text-[15px] font-semibold">
        {byFilters ? "Ningún producto con estos filtros" : `Ningún producto coincide con «${search ?? ""}»`}
      </p>
      <p className="text-sm text-muted-foreground">
        {byFilters ? "Quita alguno o límpialos todos." : "Prueba con otra palabra o con el SKU."}
      </p>
      <Button variant="outline" size="sm" className="mt-1 rounded-full px-4" onClick={byFilters ? onClearFilters : onClearSearch}>
        {byFilters ? "Limpiar filtros" : "Borrar la búsqueda"}
      </Button>
    </div>
  );
}
