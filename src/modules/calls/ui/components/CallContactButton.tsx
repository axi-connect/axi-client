"use client";

import { PhoneOutgoing } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { Button } from "@/shared/components/ui/button";
import type { ProactiveCallType } from "@/modules/calls/domain/playbooks";
import { CallLauncherDialog } from "./CallLauncherDialog";

/**
 * «Llamar» a un contacto desde fuera del módulo (ficha del CRM, rail del
 * inbox, Cobros): el botón y su diálogo. Sin `calls:place` o sin el módulo de
 * llamadas en el plan no se pinta: un botón que no puede llamar es ruido.
 */
export function CallContactButton({
  contact,
  defaultType = "followup",
  defaultObjective = "",
  label = "Llamar",
  className,
}: {
  contact: { id: string; name: string | null; phone: string | null };
  defaultType?: ProactiveCallType;
  defaultObjective?: string;
  label?: string;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const { hasCapability } = useEntitlements();
  const [open, setOpen] = useState(false);
  if (!hasPermission("calls:place") || !hasCapability("calls")) return null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled={contact.phone === null || contact.phone === ""}
        title={contact.phone === null || contact.phone === "" ? "El contacto no tiene teléfono" : undefined}
        onClick={() => setOpen(true)}
      >
        <PhoneOutgoing aria-hidden />
        {label}
      </Button>
      <CallLauncherDialog
        open={open}
        onOpenChange={setOpen}
        target={{ kind: "contact", contact_id: contact.id, name: contact.name, phone: contact.phone }}
        defaultType={defaultType}
        defaultObjective={defaultObjective}
      />
    </>
  );
}
