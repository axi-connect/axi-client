"use client";

import { useEffect } from "react";
import { AlertTriangle, Clock, FileText, Receipt, TrendingUp } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import {
  dunningVariant,
  type BillingSummaryDTO,
} from "@/modules/billing/domain/account";
import { estimateLabel, formatMoney, hasEstimate } from "@/modules/billing/domain/money";
import { useBillingSocket } from "@/modules/billing/infrastructure/realtime/use-billing-socket";
import { useBillingStore } from "@/modules/billing/infrastructure/stores/billing.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { FieldList } from "@/shared/components/features/field-list/FieldList";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatTile } from "@/shared/components/features/stat-tile/StatTile";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

/**
 * Estado de cuenta de la licencia (`/billing`).
 *
 * La **estimación del próximo cobro** manda la pantalla y no es una línea al
 * pie: es la pieza que evita la factura sorpresa. Hoy el excedente se acumula
 * durante todo el mes y el cliente no lo ve venir hasta que le llega el
 * documento.
 */
export function BillingSummaryView() {
  const { hasPermission } = useAuth();
  const { status, summary, error, load, refresh } = useBillingStore();

  useBillingSocket();

  // Primera carga: con esqueleto. Si el banner de mora ya trajo el resumen al
  // montar el panel, esto refresca en silencio en vez de repetir la petición —
  // la pantalla del dinero no debe servir un dato de hace tres navegaciones.
  useEffect(() => {
    if (useBillingStore.getState().summary === null) void load();
    else void refresh();
  }, [load, refresh]);

  if (status === "loading" && summary === null) {
    return <TableSkeleton rows={4} />;
  }

  if (status === "error" && summary === null) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Facturación" description={DESCRIPTION} />
        <div className="border-destructive/35 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (summary === null) return null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Facturación"
        description={DESCRIPTION}
        badge={<AccountBadge summary={summary} />}
      />

      <Estimate summary={summary} />
      <AccountCard summary={summary} canManage={hasPermission("billing:manage")} />
      <TaxNote />
    </div>
  );
}

const DESCRIPTION = "Tu licencia de axi connect: estado de cuenta, facturas y pagos.";

/** El estado de cuenta como insignia del título, no como una fila más. */
function AccountBadge({ summary }: { summary: BillingSummaryDTO }) {
  switch (dunningVariant(summary)) {
    case "trial":
      return <Badge variant="info">En prueba</Badge>;
    case "past_due":
      return <Badge variant="warning">Pago vencido</Badge>;
    case "cancelled":
      return <Badge variant="secondary">Servicio dado de baja</Badge>;
    default:
      return <Badge variant="secondary">Al día</Badge>;
  }
}

/**
 * La estimación, el saldo y el ciclo.
 *
 * El orden no es casual: primero lo que va a pasar (la estimación), luego lo que
 * se debe hoy y por último el calendario. Es el orden en que el dueño de una
 * PyME se hace las preguntas.
 */
function Estimate({ summary }: { summary: BillingSummaryDTO }) {
  const cycle = summary.cycle;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border-accent-amber/30 from-accent-amber/12 rounded-2xl border bg-gradient-to-br to-transparent p-5 sm:col-span-2">
        <div className="text-accent-amber flex items-center gap-2 text-xs font-medium">
          <TrendingUp className="size-3.5" aria-hidden="true" />
          Próximo cobro estimado
        </div>
        <p
          className={
            hasEstimate(summary.next_invoice_estimate_cents)
              ? "mt-2 text-4xl font-semibold tracking-tight tabular-nums"
              : "text-muted-foreground mt-2 text-lg font-medium"
          }
        >
          {estimateLabel(summary.next_invoice_estimate_cents, summary.currency)}
        </p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {hasEstimate(summary.next_invoice_estimate_cents)
            ? "Cuota vigente más el excedente acumulado en el ciclo, con las mismas reglas que usará la emisión. Puede subir si sigues consumiendo."
            : "No hay ciclo abierto o tu plan aún no tiene tarifa vigente. En cuanto lo haya, verás aquí lo que costaría el ciclo si cerrara hoy."}
        </p>
      </div>

      <StatTile
        label="Saldo pendiente"
        value={formatMoney(summary.outstanding_cents, summary.currency)}
        icon={AlertTriangle}
        tone={summary.outstanding_cents > 0 ? "warning" : "default"}
        hint={
          summary.open_invoices === 0
            ? "Sin facturas abiertas"
            : `${String(summary.open_invoices)} ${summary.open_invoices === 1 ? "factura abierta" : "facturas abiertas"}`
        }
      />

      <StatTile
        label="Ciclo en curso"
        value={
          cycle === null
            ? null
            : `${formatShortDate(cycle.period_start)} – ${formatShortDate(cycle.period_end)}`
        }
        icon={Clock}
        hint={
          cycle === null
            ? "Se abre al asignarte un plan de pago"
            : "El corte cierra el ciclo y emite la factura"
        }
      />
    </div>
  );
}

/** Cómo se cobra la licencia hoy. */
function AccountCard({
  summary,
  canManage,
}: {
  summary: BillingSummaryDTO;
  canManage: boolean;
}) {
  return (
    <section className="border-border rounded-2xl border p-5">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Receipt className="text-muted-foreground size-4" aria-hidden="true" />
          Cómo se cobra tu licencia
        </h2>
      </header>

      <FieldList
        layout="grid"
        items={[
          { label: "Plan", value: summary.plan_code ?? "—" },
          { label: "Moneda", value: summary.currency },
          {
            label: "Cobro automático",
            value: summary.auto_charge ? "Activado" : "Desactivado",
          },
          {
            label: "Medio de pago guardado",
            value: summary.has_payment_source ? "Sí" : "Ninguno",
          },
          {
            label: "Días de gracia",
            value: `${String(summary.grace_days)} desde el vencimiento`,
          },
        ]}
      />

      {canManage ? (
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
          Los datos del contribuyente —razón social, NIT y correo de cobro— los
          gestionamos nosotros por ahora. Escríbenos si necesitas cambiarlos.
        </p>
      ) : null}
    </section>
  );
}

/**
 * El tratamiento fiscal, declarado UNA VEZ a nivel de documento.
 *
 * Aquí es cierto por ley y se puede afirmar; en cada línea del detalle no,
 * porque el DTO no trae el tratamiento (solo el importe del impuesto).
 */
function TaxNote() {
  return (
    <p className="bg-info/8 border-info/24 text-muted-foreground flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed">
      <FileText className="text-info mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        La licencia de software como servicio va <b>excluida de IVA</b> (Art. 476
        num. 21 del Estatuto Tributario). No es lo mismo que «IVA 0 %», y este
        comprobante es interno: todavía no es una factura electrónica DIAN.
      </span>
    </p>
  );
}
