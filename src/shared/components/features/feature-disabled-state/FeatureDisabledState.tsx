"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * Lo que ve quien entra por URL directa a una pantalla cuya función está
 * apagada (403 `features/feature_disabled`). Explica y ofrece salida en vez de
 * romper: el backend manda, pero el dueño tiene que poder encenderla.
 *
 * Vive en `shared/` porque lo montan varios slices (Pagos, Documentos): la
 * vuelta se parametriza para que cada uno devuelva a su casa.
 */
export function FeatureDisabledState({
  title,
  description,
  code,
  backHref = "/settings/payments",
  backLabel = "Volver a Pagos",
}: {
  title: string;
  description: string;
  code: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-9 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-xl bg-secondary text-muted-foreground">
        <Lock aria-hidden="true" className="size-[22px]" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-[46ch] text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/company/funciones">Ir a Funciones</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        403 features/feature_disabled · {code}
      </p>
    </div>
  );
}
