"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import type { BulkDTO } from "@/modules/crm/domain/bulk-follow-up";
import type { BulkAudience } from "@/modules/crm/infrastructure/services/bulk-service.adapter";
import { BulkResultSheet } from "@/modules/crm/ui/components/BulkResultSheet";
import { BulkFollowUpModal } from "@/modules/crm/ui/forms/bulk/BulkFollowUpModal";

/**
 * «Pon al agente a trabajar con estos N» (F4a): el botón, su modal y la
 * pantalla de resultado, en una pieza.
 *
 * Existe como componente y no como tres piezas sueltas porque el CTA aparece en
 * cuatro sitios distintos —captación, import, lista de contactos y segmento— y
 * en los cuatro el flujo es idéntico. Repetir el cableado en cada uno es cómo
 * acaban divergiendo los permisos y el texto del botón.
 */
export function BulkFollowUpButton({
  audience,
  audienceLabel,
  label,
  variant = "default",
  size = "sm",
  disabled,
}: {
  audience: BulkAudience;
  /** De dónde salen los contactos, en palabras del operador. */
  audienceLabel: string;
  label: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [scheduled, setScheduled] = useState<BulkDTO | null>(null);

  // `crm:automate` es el mismo permiso que programar UNA tarea de agente: un
  // lote no es un poder distinto, es el mismo repetido.
  if (!hasPermission("crm:automate")) return null;

  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} onClick={() => setOpen(true)}>
        <Sparkles aria-hidden className="size-4" />
        {label}
      </Button>
      <BulkFollowUpModal
        open={open}
        audience={audience}
        audienceLabel={audienceLabel}
        onOpenChange={setOpen}
        onScheduled={setScheduled}
      />
      <BulkResultSheet bulk={scheduled} onOpenChange={(next) => !next && setScheduled(null)} />
    </>
  );
}
