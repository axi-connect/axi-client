"use client";

import { useSearchParams } from "next/navigation";
import { CircleCheck, Clock, Info, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import {
  usePaymentConfirmation,
  type PaymentConfirmation,
} from "@/modules/billing/infrastructure/hooks/use-payment-confirmation";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Button } from "@/shared/components/ui/button";

/**
 * Retorno del pago (`/pay/return`).
 *
 * **Esta pantalla nunca dice «pago confirmado» al llegar.** El `redirect_url` es
 * client-side, no está firmado y es manipulable; la verdad del pago la establece
 * el webhook firmado que Wompi le manda al servidor. Y además **PSE y efectivo
 * nacen `PENDING`**: el usuario vuelve al comercio *antes* de que haya dinero, y
 * es justo el escenario donde una integración ingenua da por pagada una factura
 * que nadie pagó.
 *
 * Dos caminos, en dos componentes distintos porque los hooks no son
 * condicionales: con sesión hay socket que escuchar, sin ella no.
 */
export function PaymentReturnView() {
  const params = useSearchParams();
  const invoiceId = params.get("invoice");
  const token = params.get("token") ?? undefined;

  if (invoiceId === null) {
    return (
      <Shell
        icon={<TriangleAlert className="text-warning size-8" aria-hidden="true" />}
        title="No sabemos qué pago confirmar"
        body="Al volver del pago se perdió la referencia de la factura. Si ya pagaste, no vuelvas a pagar: revisa tu correo o entra a Facturación en tu panel."
      />
    );
  }

  return token === undefined ? (
    <AuthenticatedReturn invoiceId={invoiceId} />
  ) : (
    <PublicReturn invoiceId={invoiceId} token={token} />
  );
}

/**
 * Pagó desde el panel: `billing.payment_approved` llega en segundos con tarjeta,
 * y el backoff queda de red por si el socket estaba caído.
 */
function AuthenticatedReturn({ invoiceId }: { invoiceId: string }) {
  const confirmation = usePaymentConfirmation(invoiceId);
  const { socket } = useSocket("inbox");

  useSocketEvent(socket, "billing.payment_approved", (payload) => {
    if (payload.invoice_id !== invoiceId) return;
    // El evento trae `invoice_status`, así que distingue pagada de parcial sin
    // volver a preguntar por el detalle.
    confirmation.resolve(payload.invoice_status === "paid" ? "paid" : "partial", {
      cents: payload.amount_cents,
      currency: payload.currency,
    });
  });

  return <Outcome confirmation={confirmation} />;
}

/** Pagó por el enlace público: sin sesión no hay socket, solo backoff. */
function PublicReturn({ invoiceId, token }: { invoiceId: string; token: string }) {
  return <Outcome confirmation={usePaymentConfirmation(invoiceId, token)} />;
}

function Outcome({ confirmation }: { confirmation: PaymentConfirmation }) {
  const { outcome, amount, exhausted } = confirmation;

  if (outcome === "paid") {
    return (
      <Shell
        icon={<CircleCheck className="text-success size-9" aria-hidden="true" />}
        title="Tu pago quedó aplicado"
        body="La factura quedó al día. Si tu servicio estaba suspendido, se reactiva solo."
        cta={{ label: "Ir a Facturación", href: "/billing" }}
      />
    );
  }

  if (outcome === "partial") {
    return (
      <Shell
        icon={<Info className="text-info size-8" aria-hidden="true" />}
        title="Recibimos tu pago"
        body={
          amount === null
            ? "Aún queda saldo en esta factura."
            : `Aún quedan ${formatMoney(amount.cents, amount.currency)} por pagar en esta factura.`
        }
        cta={{ label: "Ver la factura", href: "/billing/invoices" }}
      />
    );
  }

  if (outcome === "unpayable") {
    return (
      <Shell
        icon={<Info className="text-info size-8" aria-hidden="true" />}
        title="Esta factura ya no admite pago"
        body="Puede que ya estuviera pagada o anulada. Si acabas de pagar y crees que se cobró dos veces, escríbenos y lo revisamos."
      />
    );
  }

  // Pendiente: el desenlace no está decidido. Es el estado NORMAL de PSE y
  // efectivo, así que se explica en vez de presentarse como un problema.
  return (
    <Shell
      icon={
        exhausted ? (
          <Clock className="text-muted-foreground size-8" aria-hidden="true" />
        ) : (
          <span
            className="border-border border-t-primary size-9 animate-spin rounded-full border-[2.5px] motion-reduce:[animation-duration:2.4s]"
            role="status"
            aria-label="Confirmando el pago"
          />
        )
      }
      title={exhausted ? "Seguimos esperando la confirmación" : "Estamos confirmando tu pago"}
      body={
        exhausted
          ? "No hace falta que esperes aquí. En cuanto el pago se registre te avisamos por correo, y la factura queda al día sola."
          : "Con tarjeta suele tardar unos segundos."
      }
      hint="Los pagos por PSE pueden tardar hasta 24 horas y los de efectivo hasta 72. No vuelvas a pagar: si el cobro salió, se aplicará solo."
      cta={exhausted ? { label: "Ir a Facturación", href: "/billing" } : undefined}
    />
  );
}

function Shell({
  icon,
  title,
  body,
  hint,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  hint?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <BrandMark className="size-10 opacity-90" />
      {icon}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
      </div>
      {hint === undefined ? null : (
        <p className="bg-info/8 border-info/24 text-muted-foreground rounded-xl border p-3 text-left text-xs leading-relaxed">
          {hint}
        </p>
      )}
      {cta === undefined ? null : (
        <Button asChild variant="outline">
          <a href={cta.href}>{cta.label}</a>
        </Button>
      )}
    </div>
  );
}
