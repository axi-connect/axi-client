"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, Clock, Link2, Sparkles, TriangleAlert } from "lucide-react";
import { salesWhatsAppUrl } from "@/core/config/env";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import {
  activationVariant,
  daysUntil,
  offerLabel,
  savingsCents,
  type ActivationDTO,
  type ActivationQuoteDTO,
} from "@/modules/billing/domain/activation";
import { formatMoney } from "@/modules/billing/domain/money";
import { useStartCheckout } from "@/modules/billing/infrastructure/hooks/use-start-checkout";
import { issueInvoiceLink } from "@/modules/billing/infrastructure/services/billing-service.adapter";
import { useActivationStore } from "@/modules/billing/infrastructure/stores/activation.store";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

/**
 * «Activa tu plan» (Tanda B, mockup Fase 0): la tarjeta que vive encima de la
 * estimación mientras el tenant está en prueba.
 *
 * Cuatro trabajos, uno por estado, y una sola regla que los une: **lo que se ve
 * es lo que se factura**. `quote_now` viene re-cotizado del servidor y la
 * confirmación viaja con ese importe (`expected_amount_cents`); si el servidor
 * cotiza otra cosa responde `price_changed` y la tarjeta cambia de trabajo: pide
 * una segunda confirmación explícita con el antes y el después (B-D6).
 *
 * - `ready`: la oferta, el precio tachado y el final, el sello de la promoción
 *   y «Confirmar y pagar» → confirma y abre el checkout de Wompi.
 * - `price_changed`: aviso ámbar y «Confirmar al precio de hoy».
 * - `pending_payment`: la factura de activación ya existe; «Pagar ahora» y
 *   copiar el enlace público (para el contador, o para pagar desde el móvil).
 * - `no_offer` / `unsupported`: no hay nada que confirmar desde aquí; CTA a
 *   precios y a ventas.
 *
 * Desaparece cuando el plan ya está activo: la fila «Plan» de «Cómo se cobra tu
 * licencia» es la que lo cuenta a partir de ahí.
 */
export function ActivationCard({ canPay }: { canPay: boolean }) {
  const { view, status, load } = useActivationStore();

  useEffect(() => {
    void load();
  }, [load]);

  const variant = activationVariant(view);
  if (variant === "hidden" || view === null) return null;
  if (status === "error") return null;

  switch (variant) {
    case "pending_payment":
      return <PendingPayment view={view} canPay={canPay} />;
    case "no_offer":
    case "unsupported":
      return <ChoosePlan unsupported={variant === "unsupported"} />;
    case "ready":
    case "price_changed":
    case "expired_quote":
      return <Offer view={view} canPay={canPay} />;
    default:
      return null;
  }
}

/* ───────────────────────────── ready · price_changed ───────────────────────────── */

function Offer({ view, canPay }: { view: ActivationDTO; canPay: boolean }) {
  const { showAlert } = useAlert();
  const { start } = useStartCheckout();
  const { confirm, confirming, priceChange } = useActivationStore();

  // La cotización que rige: la del 409 si acabamos de recibir uno, o la de la vista.
  const quote = priceChange ?? view.quote_now;
  if (quote === null) return null;

  const changed = priceChange !== null || view.price_changed;
  const expired = variantOf(view, priceChange) === "expired_quote";
  const saved = view.quote_saved;
  const savings = savingsCents(quote);
  const promo = quote.promotion_code !== null;
  const trialDays = daysUntil(view.trial_ends_at);

  async function onConfirm(): Promise<void> {
    try {
      const confirmed = await confirm(changed);
      // `null` = el servidor cotizó otra cosa: la tarjeta ya cambió a
      // `price_changed` con la cotización nueva; no se abre ningún pago.
      if (confirmed === null) return;
      await start(confirmed.invoice_id);
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No pudimos confirmar tu plan",
        description: errorMessage(error),
        autoCloseMs: 9000,
      });
    }
  }

  return (
    <section
      aria-labelledby="activation-title"
      className="border-border bg-card relative overflow-hidden rounded-[28px] border shadow-sm"
      data-variant={changed ? "price_changed" : "ready"}
    >
      <Glow />
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="flex flex-col items-start">
          {changed ? (
            <Badge variant="warning" className="gap-1.5">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {expired ? "Cotización vencida" : "Precio actualizado"}
            </Badge>
          ) : promo ? (
            <Badge variant="info" className="gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {promoBadge(quote, view)}
            </Badge>
          ) : (
            <Badge variant="secondary">Tu plan</Badge>
          )}

          <h2
            id="activation-title"
            className="mt-4 max-w-[16ch] text-3xl font-semibold tracking-tight [text-wrap:balance]"
          >
            {changed ? "Tu plan sigue guardado." : "Sigue vendiendo sin pausa."}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-[46ch] text-[15px] leading-relaxed">
            {expired
              ? `Tu cotización venció${view.quote_valid_until === null ? "" : ` el ${formatShortDate(view.quote_valid_until)}`}; este es el precio de hoy. Todo lo demás sigue igual: tu plan, tu volumen y tu periodicidad.`
              : changed
              ? "El precio cambió desde que te registraste. Todo lo demás sigue igual: tu plan, tu volumen y tu periodicidad."
              : trialDays === null
                ? "Activa el plan que elegiste y todo sigue igual: tu agente, tus conversaciones y tu catálogo."
                : `Tu prueba termina ${trialDaysLabel(trialDays, view.trial_ends_at)}. Activa el plan que elegiste y todo sigue igual: tu agente, tus conversaciones y tu catálogo.`}
          </p>

          <p className="text-foreground mt-6 text-sm font-medium">{offerLabel(quote)}</p>

          <ul className="text-muted-foreground mt-4 flex flex-col gap-2 text-sm">
            {TRUST.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <Check className="text-success size-4 shrink-0" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-border/60 bg-background/70 flex flex-col justify-between rounded-2xl border p-5 backdrop-blur">
          <div>
            {changed && saved !== null ? (
              <p className="text-muted-foreground text-sm">
                Antes{" "}
                <s className="tabular-nums">{formatMoney(saved.amount_cents, saved.currency)}</s>
              </p>
            ) : savings > 0 ? (
              <p className="text-muted-foreground text-sm">
                <s className="tabular-nums">{formatMoney(quote.list_amount_cents, quote.currency)}</s>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Precio de lista</p>
            )}
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {formatMoney(quote.amount_cents, quote.currency)}
              </span>
              <span className="text-muted-foreground text-sm">
                {quote.currency} {quote.interval === "annual" ? "al año · 12 meses" : "al mes"}
              </span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {changed
                ? quote.interval === "annual"
                  ? "Un mes gratis: pagas 11 y usas 12."
                  : "Precio de lista vigente."
                : savings > 0
                  ? `Ahorras ${formatMoney(savings, quote.currency)} ${quote.interval === "annual" ? "al año" : "cada mes"}${promo ? ` con ${quote.promotion_name ?? "la promoción"}` : ""}.`
                  : quote.interval === "annual"
                    ? "Un mes gratis: pagas 11 y usas 12."
                    : "Sin permanencia."}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              size="lg"
              disabled={!canPay || confirming}
              onClick={() => void onConfirm()}
            >
              {confirming
                ? "Confirmando…"
                : changed
                  ? "Confirmar al precio de hoy"
                  : "Confirmar y pagar"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              {canPay
                ? promo && !changed
                  ? "Cupo reservado 7 días al confirmar · pago seguro con Wompi"
                  : "Pago seguro con Wompi · nada se cobra hasta que pagues"
                : "Solo quien administra la facturación puede activar el plan."}
            </p>
            {view.quote_honored ? (
              <p className="text-info text-center text-xs">
                Tu precio se sostiene hasta el{" "}
                {view.quote_valid_until === null ? "fin de tu prueba" : formatShortDate(view.quote_valid_until)}.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  "Nada se cobra hasta que pagues",
  "Cancelas cuando quieras",
  "Tus datos y tu configuración se conservan",
];

/** La variante que rige, contando la cotización del 409 si la hay. */
function variantOf(view: ActivationDTO, priceChange: ActivationQuoteDTO | null) {
  return activationVariant(priceChange === null ? view : { ...view, price_changed: true });
}

function promoBadge(quote: ActivationQuoteDTO, view: ActivationDTO): string {
  const name = quote.promotion_name ?? "Promoción";
  const until = view.quote_honored ? view.quote_valid_until : quote.promotion_ends_at;
  return until === null ? name : `${name} hasta el ${formatShortDate(until)}`;
}

function trialDaysLabel(days: number, iso: string | null): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return iso === null ? `en ${String(days)} días` : `el ${formatShortDate(iso)}`;
}

/* ───────────────────────────── pending_payment ───────────────────────────── */

function PendingPayment({ view, canPay }: { view: ActivationDTO; canPay: boolean }) {
  const { showAlert } = useAlert();
  const { start, starting } = useStartCheckout();
  const invoice = view.pending_invoice;
  if (invoice === null) return null;
  const days = daysUntil(invoice.due_at);

  async function copyLink(): Promise<void> {
    try {
      const link = await issueInvoiceLink(invoice!.invoice_id);
      await navigator.clipboard.writeText(link.url).catch(() => undefined);
      showAlert({
        tone: "success",
        title: "Enlace de pago copiado",
        // El servidor ROTA el token: el enlace anterior deja de valer (B4-B2).
        description: `Vale hasta el ${formatShortDate(link.expires_at)} y reemplaza a cualquier enlace anterior. Quien lo abra puede pagar sin entrar al panel.`,
        autoCloseMs: 8000,
      });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No pudimos generar el enlace",
        description: errorMessage(error),
        autoCloseMs: 9000,
      });
    }
  }

  return (
    <section
      aria-labelledby="activation-title"
      className="border-border bg-card rounded-[28px] border p-6 shadow-sm sm:p-8"
      data-variant="pending_payment"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-[52ch]">
          <Badge variant="warning" className="gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            Pendiente de pago
          </Badge>
          <h2 id="activation-title" className="mt-4 text-2xl font-semibold tracking-tight">
            Tu factura de activación está lista.
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Factura {invoice.number}. En cuanto se registre el pago, el plan se activa solo y la
            prueba pasa a ser tu licencia.
            {days === null
              ? ""
              : ` El enlace vale ${days === 0 ? "hasta hoy" : days === 1 ? "hasta mañana" : `${String(days)} días más`}; si vence, el cupo se libera y puedes volver a confirmar al precio del día.`}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:min-w-64">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(invoice.amount_cents, invoice.currency)}
          </p>
          <Button
            size="lg"
            disabled={!canPay || starting}
            onClick={() => void start(invoice.invoice_id)}
          >
            {starting ? "Abriendo el pago…" : "Pagar ahora"}
          </Button>
          <Button variant="outline" disabled={!canPay} onClick={() => void copyLink()}>
            <Link2 className="size-4" aria-hidden="true" />
            Copiar enlace de pago
          </Button>
          {canPay ? null : (
            <p className="text-muted-foreground text-center text-xs">
              Solo quien administra la facturación puede pagar la activación.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── no_offer · unsupported ───────────────────────────── */

function ChoosePlan({ unsupported }: { unsupported: boolean }) {
  return (
    <section
      aria-labelledby="activation-title"
      className="border-border bg-card rounded-[28px] border p-6 shadow-sm sm:p-8"
      data-variant={unsupported ? "unsupported" : "no_offer"}
    >
      <h2 id="activation-title" className="text-2xl font-semibold tracking-tight">
        {unsupported ? "Activa tu combinación con nosotros." : "Elige tu plan."}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-[52ch] text-sm leading-relaxed">
        {unsupported
          ? "Elegiste varios módulos sueltos: esa combinación la activamos contigo en una llamada, al precio que viste."
          : "Tu cuenta entró en prueba sin una oferta guardada. Elige un paquete o un módulo y vuelve aquí para activarlo."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {unsupported ? null : (
          <Button asChild>
            <Link href="/precios">Ver paquetes y precios</Link>
          </Button>
        )}
        <Button variant={unsupported ? "default" : "outline"} asChild>
          <a
            href={salesWhatsAppUrl(
              "Hola, estoy probando axi connect y quiero activar mi plan.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Hablar con ventas
          </a>
        </Button>
      </div>
    </section>
  );
}

/** Los dos resplandores del mockup: marca abajo a la derecha, violeta arriba a la izquierda. */
function Glow() {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-[20%] -bottom-[50%] size-[520px] rounded-full blur-2xl",
          "bg-[radial-gradient(closest-side,var(--color-primary)_0%,transparent_70%)] opacity-20",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-[45%] -left-[15%] size-[440px] rounded-full blur-2xl",
          "bg-[radial-gradient(closest-side,var(--color-info)_0%,transparent_70%)] opacity-15",
        )}
      />
    </>
  );
}
