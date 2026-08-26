"use client";

/**
 * Administración de una factura desde plataforma: retención, nota de crédito y
 * anulación.
 *
 * Las tres devuelven el mismo `InvoiceAdministrationDto` con el estado
 * recalculado, y **cuando la acción deja la factura saldada el backend reactiva
 * el servicio solo**: eso se le dice al operador, porque si no, no sabe que su
 * clic acaba de devolverle el acceso a una empresa.
 */
import { useState } from "react";
import { Ban, CircleCheck, Scale } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { FieldList } from "@/shared/components/features/field-list/FieldList";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { INVOICE_STATUS_MAP } from "@/modules/billing/domain/invoice";
import {
  canVoidInvoice,
  isSettledAfter,
  type InvoiceAdministration,
  type PlatformInvoice,
} from "../../../domain/billing";
import {
  useAddAdjustment,
  useRegisterWithholding,
  useVoidInvoice,
} from "../../../infrastructure/api/hooks/use-billing";
import { ConfirmTyped } from "../../components/ConfirmTyped";

export function InvoiceAdminSheet({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: PlatformInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Guarda separada del cuerpo por dos razones: el narrowing de un prop no
  // sobrevive dentro de los callbacks (TypeScript lo trata como reasignable), y
  // así las tres mutaciones no se instancian mientras no hay factura.
  if (invoice === null) return null;
  return <InvoiceAdminBody invoice={invoice} open={open} onOpenChange={onOpenChange} />;
}

function InvoiceAdminBody({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: PlatformInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const withholding = useRegisterWithholding();
  const voidInvoice = useVoidInvoice();
  const adjustment = useAddAdjustment();

  const [withholdingInput, setWithholdingInput] = useState("");
  const [adjustmentKind, setAdjustmentKind] = useState<"credit" | "adjustment">("credit");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);

  const company = invoice.company_name ?? "esta empresa";

  /** Un solo sitio para el desenlace: las tres acciones cuentan lo mismo. */
  function announce(result: InvoiceAdministration, action: string) {
    if (isSettledAfter(result)) {
      showAlert({
        tone: "success",
        title: "Factura saldada",
        description: `${action}. Si ${company} no debía nada más, su servicio ya se reactivó.`,
        autoCloseMs: 8000,
      });
    } else {
      showAlert({
        tone: "success",
        title: action,
        description: `Queda un saldo de ${formatMoney(result.outstanding_cents, invoice.currency)}.`,
        autoCloseMs: 6000,
      });
    }
    onOpenChange(false);
  }

  function fail(error: unknown) {
    showAlert({
      tone: "error",
      title: "No se pudo aplicar",
      description: errorMessage(error),
      autoCloseMs: 8000,
    });
  }

  async function submitWithholding() {
    const cents = parseMoneyToCents(withholdingInput);
    if (cents === null) return;
    try {
      announce(
        await withholding.mutateAsync({
          invoiceId: invoice.id,
          company_id: invoice.company_id,
          withholding_cents: cents,
        }),
        "Retención registrada",
      );
      setWithholdingInput("");
    } catch (error) {
      fail(error);
    }
  }

  async function submitAdjustment() {
    const cents = parseMoneyToCents(adjustmentAmount);
    if (cents === null || cents <= 0 || adjustmentReason.trim().length < 3) return;
    try {
      announce(
        await adjustment.mutateAsync({
          invoiceId: invoice.id,
          company_id: invoice.company_id,
          kind: adjustmentKind,
          description: adjustmentReason.trim(),
          amount_cents: cents,
        }),
        adjustmentKind === "credit" ? "Nota de crédito aplicada" : "Ajuste aplicado",
      );
      setAdjustmentAmount("");
      setAdjustmentReason("");
    } catch (error) {
      fail(error);
    }
  }

  async function submitVoid() {
    try {
      announce(
        await voidInvoice.mutateAsync({
          invoiceId: invoice.id,
          company_id: invoice.company_id,
          reason: voidReason.trim(),
        }),
        `Factura ${invoice.number} anulada`,
      );
      setConfirmVoid(false);
      setVoidReason("");
    } catch (error) {
      setConfirmVoid(false);
      fail(error);
    }
  }

  const voidable = canVoidInvoice(invoice);
  const adjustmentReady =
    parseMoneyToCents(adjustmentAmount) !== null &&
    (parseMoneyToCents(adjustmentAmount) ?? 0) > 0 &&
    adjustmentReason.trim().length >= 3;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={invoice.number}
        subtitle={company}
      >
        <div className="flex flex-col gap-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={invoice.status} map={INVOICE_STATUS_MAP} />
            <span className="text-muted-foreground text-xs tabular-nums">
              {invoice.period_start.slice(0, 10)} → {invoice.period_end.slice(0, 10)}
            </span>
          </div>

          <FieldList
            items={[
              { label: "Total", value: formatMoney(invoice.total_cents, invoice.currency) },
              { label: "Pagado", value: formatMoney(invoice.paid_cents, invoice.currency) },
              {
                label: "Retenido",
                value: formatMoney(invoice.withholding_cents, invoice.currency),
              },
              {
                label: "Falta por pagar",
                value: (
                  <span className="font-semibold tabular-nums">
                    {formatMoney(invoice.outstanding_cents, invoice.currency)}
                  </span>
                ),
              },
            ]}
          />

          {/* Retención */}
          <section className="border-border rounded-2xl border p-4">
            <header className="mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Scale className="text-muted-foreground size-4" aria-hidden="true" />
                Registrar retención
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                El valor <b>total</b> practicado, no un incremento. Para corregir un
                error, se reenvía la cifra buena.
              </p>
            </header>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-1">
                <Label htmlFor="withholding" className="sr-only">
                  Retención total practicada
                </Label>
                <Input
                  id="withholding"
                  className="tabular-nums"
                  inputMode="numeric"
                  placeholder="0"
                  value={withholdingInput}
                  onChange={(event) => setWithholdingInput(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={parseMoneyToCents(withholdingInput) === null || withholding.isPending}
                onClick={() => void submitWithholding()}
              >
                Registrar
              </Button>
            </div>
          </section>

          {/* Ajuste / nota de crédito */}
          <section className="border-border rounded-2xl border p-4">
            <header className="mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleCheck className="text-muted-foreground size-4" aria-hidden="true" />
                Ajuste o nota de crédito
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                El importe va <b>siempre positivo</b>: el signo lo pone el tipo. Un
                negativo se rechaza.
              </p>
            </header>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Select
                  value={adjustmentKind}
                  onValueChange={(value) => setAdjustmentKind(value as "credit" | "adjustment")}
                >
                  <SelectTrigger className="min-w-[190px] flex-1" aria-label="Tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Nota de crédito (resta)</SelectItem>
                    <SelectItem value="adjustment">Ajuste (suma)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-32 tabular-nums"
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Importe"
                  value={adjustmentAmount}
                  onChange={(event) => setAdjustmentAmount(event.target.value)}
                />
              </div>
              <Input
                placeholder="Motivo — queda escrito en la factura"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="self-end"
                disabled={!adjustmentReady || adjustment.isPending}
                onClick={() => void submitAdjustment()}
              >
                Aplicar
              </Button>
            </div>
          </section>

          {/* Anulación */}
          <section className="border-destructive/28 rounded-2xl border p-4">
            <header className="mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Ban className="text-destructive size-4" aria-hidden="true" />
                Anular la factura
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                El consecutivo <b>no se reutiliza</b>: la factura anulada sigue en la
                lista con su número. Requiere motivo.
                {voidable ? null : (
                  <>
                    {" "}
                    <b>
                      Esta factura tiene pagos aplicados y no se puede anular
                    </b>
                    : la vía es la nota de crédito.
                  </>
                )}
              </p>
            </header>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Motivo de la anulación"
                value={voidReason}
                disabled={!voidable}
                onChange={(event) => setVoidReason(event.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 self-end"
                disabled={!voidable || voidReason.trim().length < 3 || voidInvoice.isPending}
                onClick={() => setConfirmVoid(true)}
              >
                Anular {invoice.number}
              </Button>
            </div>
          </section>
        </div>
      </DetailSheet>

      <ConfirmTyped
        open={confirmVoid}
        onOpenChange={setConfirmVoid}
        title={`Anular ${invoice.number}`}
        description={
          <>
            La factura queda anulada con su motivo escrito y <b>su número no se
            reutiliza</b>: seguirá en la lista de {company}. Si necesitas devolver
            dinero de una factura ya pagada, la vía es la nota de crédito, no esto.
          </>
        }
        confirmText={invoice.number}
        actionLabel="Anular"
        pending={voidInvoice.isPending}
        onConfirm={() => void submitVoid()}
      />
    </>
  );
}
