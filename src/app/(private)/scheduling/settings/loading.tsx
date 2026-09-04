import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural de la configuración: dos cards. */
export default function SchedulingSettingsLoading() {
  return (
    <div
      className="grid items-start gap-5 lg:grid-cols-2"
      role="status"
      aria-label="Cargando configuración"
    >
      {Array.from({ length: 2 }, (_, card) => (
        <div key={card} className="space-y-4 rounded-2xl border border-border p-5 md:p-6">
          <Skeleton className="h-5 w-56 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          {Array.from({ length: 5 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
