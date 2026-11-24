import { Suspense } from "react";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { PlatformLoginForm } from "@/modules/platform/ui/forms/PlatformLoginForm";

/**
 * /platform/login — sin shell ni guard (rediseño F1: mismo lenguaje que la
 * consola). El form usa `useSearchParams` (redirect a `?next`), por eso va
 * dentro de <Suspense>.
 */
export default function PlatformLoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[26rem]">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <BrandMark className="size-14" aria-label="Axi Connect" />
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-violet" />
            Plataforma · solo personal de axi
          </span>
          <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">Consola de Plataforma</h1>
        </div>

        <Suspense fallback={null}>
          <PlatformLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
