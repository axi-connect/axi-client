import { Suspense } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { PlatformLoginForm } from "@/modules/platform/ui/forms/PlatformLoginForm";

/**
 * /platform/login — sin shell ni guard. El form usa `useSearchParams`
 * (redirect a `?next`), por eso va dentro de <Suspense>.
 */
export default function PlatformLoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4">
      <div className="w-full sm:max-w-md">
        <div className="mb-6 space-y-3 text-center">
          <BrandMark className="mx-auto size-16" aria-label="Axi Connect" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Consola de Plataforma</h1>
          <Badge className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet" variant="outline">
            Plataforma · solo personal de axi
          </Badge>
        </div>

        <Suspense fallback={null}>
          <PlatformLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
