import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural de recordatorios: toolbar + tabla. */
export default function SchedulingRemindersLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6"
      role="status"
      aria-label="Cargando recordatorios"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-52 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-lg" />
        <span className="ml-auto" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-2xl border border-border">
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
