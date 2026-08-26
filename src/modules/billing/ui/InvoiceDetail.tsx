"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import {
  INVOICE_STATUS_MAP,
  LINE_KIND_LABELS,
  isCreditLine,
  isPayable,
  type InvoiceDetailDTO,
  type InvoiceLineDTO,
} from "@/modules/billing/domain/invoice";
import { lineTaxNote, totalTaxCents } from "@/modules/billing/domain/tax";
import { issueInvoiceLink } from "@/modules/billing/infrastructure/services/billing-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

/**
 * Desglose de una factura.
 *
 * Dos invariantes que este dominio se implementa mal:
 *
 * 1. **Los impuestos van por línea**, nunca un porcentaje sobre el total: una
 *    misma factura puede llevar una línea excluida de IVA y otra gravada al 19 %.
 * 2. **«Lo que falta» sale de `outstanding_cents`**, y la retención se muestra
 *    como línea propia. Sin ella, un cliente que practicó ReteFuente —lo normal
 *    en B2B colombiano— vería una deuda que no tiene.
 */
export function InvoiceDetail({ invoice }: { invoice: InvoiceDetailDTO }) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [issuing, setIssuing] = useState(false);

  async function issueLink() {
    setIssuing(true);
    try {
      const link = await issueInvoiceLink(invoice.id);
      await navigator.clipboard.writeText(link.url).catch(() => undefined);
      showAlert({
        tone: "success",
        title: "Enlace de pago copiado",
        description: `Caduca el ${formatShortDate(link.expires_at)}. Si ya habías compartido uno de esta factura, acaba de dejar de servir.`,
        autoCloseMs: 9000,
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo emitir el enlace",
        description: errorMessage(err),
        autoCloseMs: 8000,
      });
    } finally {
      setIssuing(false);
    }
  }

  const taxes = totalTaxCents(invoice.lines);
  const subtotal = invoice.total_cents - taxes;
  const payable = isPayable(invoice);
  const canPay = hasPermission("billing:pay");

  return (
    <div className="flex flex-col gap-6 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={invoice.status} map={INVOICE_STATUS_MAP} />
        {invoice.issued_at === null ? null : (
          <span className="text-muted-foreground text-xs tabular-nums">
            Emitida el {formatShortDate(invoice.issued_at)}
          </span>
        )}
      </header>

      <section>
        <h3 className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
          Conceptos
        </h3>
        <ul className="flex flex-col">
          {invoice.lines.map((line, index) => (
            <LineRow key={index} line={line} currency={invoice.currency} />
          ))}
        </ul>

        <dl className="border-border mt-3 flex flex-col gap-2 border-t pt-3.5 text-sm">
          <Total label="Subtotal" value={formatMoney(subtotal, invoice.currency)} />
          <Total label="Impuestos" value={formatMoney(taxes, invoice.currency)} />
          {invoice.paid_cents > 0 ? (
            <Total
              label="Pagado"
              value={`− ${formatMoney(invoice.paid_cents, invoice.currency)}`}
            />
          ) : null}
          {invoice.withholding_cents > 0 ? (
            // Línea propia y visible: es lo que explica por qué el cliente giró
            // menos que el total sin estar en deuda. El soporte contable es su
            // certificado de retención, que llega por fuera.
            <Total
              label="Retención en la fuente"
              value={`− ${formatMoney(invoice.withholding_cents, invoice.currency)}`}
              tone="info"
            />
          ) : null}
          <div className="border-border/60 flex items-center justify-between gap-4 border-t pt-2.5 text-base font-semibold">
            <dt>Falta por pagar</dt>
            <dd className="tabular-nums">
              {formatMoney(invoice.outstanding_cents, invoice.currency)}
            </dd>
          </div>
        </dl>
      </section>

      {taxes === 0 ? (
        <p className="text-muted-foreground border-info/24 bg-info/8 rounded-xl border p-3 text-xs leading-relaxed">
          La licencia de software como servicio va <b>excluida de IVA</b> (Art. 476
          num. 21 del Estatuto Tributario). Este comprobante es interno: todavía no
          es una factura electrónica DIAN.
        </p>
      ) : null}

      <section className="border-border rounded-xl border p-3.5">
        <h3 className="text-sm font-medium">Compartir el pago</h3>
        <p className="text-muted-foreground mt-1 mb-2.5 text-xs leading-relaxed">
          Un enlace que tu contador puede usar sin entrar al panel. Caduca en 7 días
          y <b>emitir uno nuevo invalida el anterior</b>.
        </p>
        <Button
          size="sm"
          className="w-full"
          disabled={!canPay || issuing}
          onClick={() => void issueLink()}
        >
          {issuing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Link2 aria-hidden="true" />
          )}
          Emitir enlace de pago
        </Button>
      </section>

      {payable && canPay ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Quedan {formatMoney(invoice.outstanding_cents, invoice.currency)} por pagar.
          El pago con tarjeta, PSE o Nequi desde el panel llega en la próxima
          entrega; por ahora la vía es el enlace de arriba.
        </p>
      ) : null}
    </div>
  );
}

function LineRow({ line, currency }: { line: InvoiceLineDTO; currency: string }) {
  const note = lineTaxNote(line);
  const credit = isCreditLine(line);

  return (
    <li className="border-border/60 grid grid-cols-[1fr_auto] gap-x-4 border-b py-3 last:border-b-0">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{line.description}</span>
        <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="text-[10px]">
            {LINE_KIND_LABELS[line.kind] ?? line.kind}
          </Badge>
          {line.quantity !== 1 ? (
            <span className="tabular-nums">
              {new Intl.NumberFormat("es-CO").format(line.quantity)} ×{" "}
              {formatMoney(line.unit_amount_cents, currency)}
            </span>
          ) : null}
          {note === null ? null : (
            <span className="tabular-nums">
              {note}: {formatMoney(line.tax_cents, currency)}
            </span>
          )}
        </span>
      </div>
      <span
        className={
          credit
            ? "text-success self-center font-medium tabular-nums"
            : "self-center font-medium tabular-nums"
        }
      >
        {credit ? "− " : ""}
        {formatMoney(line.amount_cents, currency)}
      </span>
    </li>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "info";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={tone === "info" ? "text-info" : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
