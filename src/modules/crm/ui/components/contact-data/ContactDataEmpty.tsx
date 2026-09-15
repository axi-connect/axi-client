"use client";

import Link from "next/link";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { ContactDataVariant } from "./types";

/**
 * Tenant sin formularios de captura: dos líneas y el botón para configurarlos.
 * Sin glifo ni disco: el vacío convive con el resto de la ficha (mockup, vista 9).
 */
export function ContactDataEmpty({
  variant,
  canConfigure,
}: {
  variant: ContactDataVariant;
  /** `forms:manage`: sin él el botón no se pinta (el texto sí). */
  canConfigure: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-2", variant === "card" && "pt-1.5 pb-0.5")}>
      <p
        className={cn(
          "max-w-[44ch] text-muted-foreground",
          variant === "card" ? "text-[13px]" : "text-xs",
        )}
      >
        Tu agente aún no pide datos a los clientes. Define qué debe conseguir antes de cerrar un
        pedido o una cita y lo verás aquí, con su origen.
      </p>
      {canConfigure && (
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/settings/forms">Configurar formularios de captura</Link>
        </Button>
      )}
    </div>
  );
}
