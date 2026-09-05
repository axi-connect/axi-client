/**
 * Esqueleto estructural de un funnel «Flow» (también lo usan los `loading.tsx`):
 * los puntos, la pregunta y su control, en el material del alcance, y el hueco
 * de la ruta al pie para que la pantalla no salte cuando llegue.
 */
export function FlowSkeleton({ steps, label }: { steps: number; label: string }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center px-6 pt-1" aria-busy="true" aria-label={label}>
      <div className="flex items-center gap-[7px]">
        {Array.from({ length: steps }, (_, index) => (
          <i key={index} className="bg-foreground/35 block size-1.5 rounded-full" />
        ))}
      </div>
      <div className="flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 py-6">
        <div className="sf-glass h-14 w-3/4 animate-pulse rounded-[14px]" />
        <div className="sf-glass h-4 w-1/2 animate-pulse rounded-full" />
        <div className="sf-glass mt-6 h-14 w-full animate-pulse rounded-[14px]" />
        <div className="sf-glass h-14 w-full animate-pulse rounded-[14px]" />
      </div>
      <div className="h-[280px] w-full shrink-0" />
    </div>
  );
}
