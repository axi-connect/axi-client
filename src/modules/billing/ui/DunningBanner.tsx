"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import {
  daysToSuspension,
  dunningVariant,
  suspensionDate,
} from "@/modules/billing/domain/account";
import { useBillingStore } from "@/modules/billing/infrastructure/stores/billing.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";

/**
 * Banner de mora, en el grupo pegado de `(private)/layout.tsx` (patrón
 * `TrialCountdownBanner`). Ámbar y **no bloqueante**: en `past_due` el panel
 * sigue plenamente operativo — la mora avisa, no corta. El corte llega después,
 * y para entonces el usuario ya no está en el panel.
 *
 * Tono `warning` y nunca el coral de marca: el coral es acción, no peligro
 * (DESIGN mandamiento 8).
 *
 * Monta en TODAS las páginas del panel, así que tiene dos cuidados:
 *
 * 1. **No pide nada sin `billing:read`.** Supervisor y operator no tienen
 *    ninguno de los permisos del slice a propósito, y pedirles el resumen sería
 *    un 403 en cada pantalla que abran.
 * 2. **Comparte la petición** con la vista de resumen vía el store (una sola
 *    petición en vuelo), así que entrar a `/billing` no cuesta dos.
 */
export function DunningBanner() {
  const { status: session, hasPermission } = useAuth();
  const canRead = hasPermission("billing:read");
  const summary = useBillingStore((state) => state.summary);
  const load = useBillingStore((state) => state.load);

  useEffect(() => {
    if (session !== "authenticated" || !canRead) return;
    // Silencioso ante fallo: un aviso de facturación jamás rompe el shell.
    void load().catch(() => undefined);
  }, [session, canRead, load]);

  if (summary === null) return null;
  if (dunningVariant(summary) !== "past_due") return null;

  const days = daysToSuspension(summary);
  const cutoff = suspensionDate(summary);

  return (
    <div
      role="alert"
      className="border-warning/30 bg-warning/10 flex items-center justify-between gap-3 border-b px-4 py-2 md:px-6"
    >
      <p className="text-foreground flex items-center gap-2 text-sm">
        <TriangleAlert aria-hidden="true" className="text-warning size-4 shrink-0" />
        <span>
          <b className="font-semibold">{deadlineText(days, cutoff)}</b>{" "}
          <span className="text-muted-foreground">
            Tienes {formatMoney(summary.outstanding_cents, summary.currency)} pendientes
            {summary.open_invoices > 1
              ? ` en ${String(summary.open_invoices)} facturas.`
              : "."}
          </span>
        </span>
      </p>
      <Button size="sm" asChild>
        <Link href="/billing/invoices">Pagar ahora</Link>
      </Button>
    </div>
  );
}

/**
 * El plazo, con la fecha además del número de días: un «12 de septiembre» es más
 * accionable que un «faltan 3 días».
 *
 * Sin `oldest_due_at` no hay cuenta atrás que pintar y el texto no la inventa:
 * avisa de la deuda sin poner un plazo falso.
 */
function deadlineText(days: number | null, cutoff: Date | null): string {
  if (days === null || cutoff === null) {
    return "Tienes un pago vencido.";
  }
  const fecha = formatShortDate(cutoff.toISOString());
  if (days === 0) return `Hoy es el último día antes de que se suspenda el servicio (${fecha}).`;
  if (days === 1) return `Mañana se suspende el servicio (${fecha}).`;
  return `Te quedan ${String(days)} días antes de que se suspenda el servicio (${fecha}).`;
}
