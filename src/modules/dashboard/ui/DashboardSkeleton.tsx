/**
 * Skeleton estructural del Panel (la silueta del bento: cabecera, la isla a la
 * derecha, la meta, dos fichas de ventas y las demás), para que el render final
 * no "salte". Anchos deterministas (nunca random, rompe hidratación SSR).
 * Usable en `loading.tsx` sin `"use client"`: no importa nada de cliente.
 */
function Bar({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`border-border bg-card flex min-w-0 flex-col gap-3.5 rounded-3xl border p-5 ${className}`}>{children}</div>;
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-7" role="status" aria-label="Cargando el panel">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <Bar className="size-12 rounded-2xl sm:size-15" />
          <div className="flex flex-col gap-2.5">
            <Bar className="h-3 w-56" />
            <Bar className="h-9 w-72 rounded-xl" />
            <Bar className="h-3.5 w-48" />
          </div>
        </div>
        <Bar className="h-9 w-56 rounded-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3">
        <Tile className="md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-52" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3.5 py-2">
              <Bar className="h-8 w-9" />
              <div className="flex flex-1 flex-col gap-2">
                <Bar className="h-3.5 w-2/3" />
                <Bar className="h-3 w-5/6" />
              </div>
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex gap-2.5">
            <Bar className="h-11 flex-1 rounded-full" />
            <Bar className="h-11 flex-1 rounded-full" />
          </div>
        </Tile>
        <Tile className="md:col-span-2">
          <Bar className="h-3 w-40" />
          <Bar className="h-12 w-72 rounded-xl" />
          <Bar className="h-4 w-4/5" />
          <Bar className="mt-6 h-2.5 w-full rounded-full" />
          <Bar className="mt-4 h-3 w-64" />
        </Tile>
        {[0, 1].map((tile) => (
          <Tile key={tile}>
            <Bar className="h-3 w-28" />
            <Bar className="h-10 w-44 rounded-xl" />
            <Bar className="h-3 w-3/5" />
          </Tile>
        ))}
        <Tile className="md:col-span-2">
          <Bar className="h-3 w-44" />
          <div className="flex gap-12">
            <Bar className="h-9 w-16" />
            <Bar className="h-9 w-16" />
            <Bar className="h-9 w-16" />
          </div>
          <Bar className="h-40 w-full rounded-xl" />
        </Tile>
        {[0, 1, 2, 3].map((tile) => (
          <Tile key={tile}>
            <Bar className="h-3 w-32" />
            <Bar className="h-9 w-full" />
            <Bar className="h-9 w-full" />
            <Bar className="h-9 w-4/5" />
          </Tile>
        ))}
      </div>
    </div>
  );
}
