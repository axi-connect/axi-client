"use client";

import { PhoneOutgoing } from "lucide-react";
import { useId, useState } from "react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { Button } from "@/shared/components/ui/button";
import type { CollectionsCallSummary } from "@/modules/calls/domain/collections-call";
import type { ProactiveCallType } from "@/modules/calls/domain/playbooks";
import { CallLauncherDialog } from "./CallLauncherDialog";

/**
 * «Llamar» a un contacto desde fuera del módulo (ficha del CRM, rail del
 * inbox, Cobros): el botón y su diálogo. Sin `calls:place` o sin el módulo de
 * llamadas en el plan no se pinta: un botón que no puede llamar es ruido.
 */
/** ¿Puede este usuario llamar desde aquí? Para quien acomoda su fila según haya botón o no. */
export function useCanPlaceCalls(): boolean {
  const { hasPermission } = useAuth();
  const { hasCapability } = useEntitlements();
  return hasPermission("calls:place") && hasCapability("calls");
}

export function CallContactButton({
  contact,
  defaultType = "followup",
  defaultObjective = "",
  label = "Llamar",
  className,
  labelClassName,
  shortLabel,
  collections,
}: {
  contact: { id: string; name: string | null; phone: string | null };
  defaultType?: ProactiveCallType;
  defaultObjective?: string;
  label?: string;
  className?: string;
  /** Para esconder el texto en pantallas chicas (queda para el lector de pantalla). */
  labelClassName?: string;
  /** Texto corto para el celular («Llamar» en vez de «Llamar para cobrar»). */
  shortLabel?: string;
  /** «Llamar para cobrar» (F3): la llamada va atada a este plan de Cobros. */
  collections?: CollectionsCallSummary;
}) {
  const canPlace = useCanPlaceCalls();
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  if (!canPlace) return null;
  const noPhone = contact.phone === null || contact.phone.trim() === "";
  const who = contact.name?.trim() ? contact.name.trim().split(/\s+/)[0] : "El contacto";
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled={noPhone}
        title={noPhone ? `${who} no tiene teléfono en su ficha` : undefined}
        // F-6: el motivo no puede vivir solo en `title` (ni el teclado ni el
        // lector de pantalla lo alcanzan en un botón deshabilitado).
        aria-describedby={noPhone ? reasonId : undefined}
        onClick={() => setOpen(true)}
      >
        <PhoneOutgoing aria-hidden />
        {shortLabel === undefined ? (
          <span className={labelClassName}>{label}</span>
        ) : (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="max-sm:hidden">{label}</span>
          </>
        )}
      </Button>
      {noPhone && (
        <span id={reasonId} className="sr-only">
          {who} no tiene teléfono en su ficha.
        </span>
      )}
      <CallLauncherDialog
        open={open}
        onOpenChange={setOpen}
        target={{ kind: "contact", contact_id: contact.id, name: contact.name, phone: contact.phone }}
        defaultType={defaultType}
        defaultObjective={defaultObjective}
        collections={collections}
      />
    </>
  );
}
