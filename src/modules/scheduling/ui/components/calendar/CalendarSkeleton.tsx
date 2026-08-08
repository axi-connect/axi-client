import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural del calendario: toolbar + grilla (anchos deterministas). */
export function CalendarSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col gap-4 p-4 md:p-6"
      role="status"
      aria-label="Cargando agenda"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-6 w-44 rounded-md" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-9 w-56 rounded-full" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-2xl border border-border">
        <Skeleton className="h-8 w-full rounded-none" />
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-px">
          {Array.from({ length: 21 }, (_, i) => (
            <Skeleton key={i} className="h-full min-h-20 rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
