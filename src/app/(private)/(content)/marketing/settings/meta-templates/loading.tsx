import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * La silueta de Plantillas de Meta (DESIGN-SYSTEM §9.1): la intro, las tres
 * fichas, «Lo próximo» y filas con su estado. El `loading.tsx` de Configuración
 * es un formulario, y esta vista no lo es. Anchos fijos: nada de aleatorio en SSR.
 */
export default function MetaTemplatesLoading() {
  return (
    <div role="status" aria-label="Cargando plantillas de Meta" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex w-full max-w-2xl flex-col gap-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
        <Skeleton className="h-8 w-64 rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-[7.5rem] rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-3xl" />
      <div className="border-border bg-card flex flex-col gap-5 rounded-3xl border p-5">
        {["w-2/5", "w-1/3", "w-1/2", "w-1/4"].map((width) => (
          <div key={width} className="flex items-center gap-4">
            <Skeleton className={`h-3.5 ${width}`} />
            <Skeleton className="ml-auto h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
