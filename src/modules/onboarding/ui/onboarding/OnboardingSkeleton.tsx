/** Esqueleto estructural de `/onboarding` (también lo usa `loading.tsx`). */
export function OnboardingSkeleton() {
  return (
    <div className="bg-brand-ambient min-h-svh w-full animate-pulse" aria-busy="true" aria-label="Cargando tu configuración">
      <div className="border-border/60 border-b">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-6 py-5">
          <div className="bg-muted h-10 w-72 rounded-xl" />
          <div className="bg-muted h-2 rounded-full" />
          <div className="bg-muted h-6 w-full max-w-2xl rounded-full" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1120px] gap-6 px-6 pt-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-muted h-96 rounded-2xl" />
        <div className="bg-muted h-72 rounded-2xl" />
      </div>
    </div>
  );
}
