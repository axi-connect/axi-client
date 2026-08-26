"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Clock, Lock, TriangleAlert } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { PUBLIC_BILLING_ERRORS, type PublicInvoiceDTO } from "@/modules/billing/domain/public-invoice";
import { useStartCheckout } from "@/modules/billing/infrastructure/hooks/use-start-checkout";
import { getPublicInvoice } from "@/modules/billing/infrastructure/services/billing-service.adapter";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Pago de una factura SIN sesión (`/pay/:invoice_id/:token`).
 *
 * Es la vía del tenant suspendido y la del contador externo, y por eso es
 * **deliberadamente mínima**: número, período, importe, vencimiento y un botón.
 * Sin razón social, sin NIT, sin desglose, sin otras facturas y **sin enlaces al
 * panel**. Quien tiene el enlace puede ser alguien a quien se lo reenviaron, así
 * que no se le añade ni un dato del tenant que la API no dé.
 *
 * `payable` es la ÚNICA señal que habilita el botón. No se deduce del `status`:
 * una factura `partially_paid` con retención ya registrada tiene saldo cero y no
 * es pagable.
 */
export function PublicInvoiceView({
  invoiceId,
  token,
}: {
  invoiceId: string;
  token: string;
}) {
  const [invoice, setInvoice] = useState<PublicInvoiceDTO | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const { start, starting } = useStartCheckout();

  useEffect(() => {
    let alive = true;
    // Una sola petición, sin reintentos: el endpoint limita a 10 req/min por IP
    // y es estricto a propósito — es la única defensa contra quien pruebe
    // tokens al azar.
    getPublicInvoice(invoiceId, token)
      .then((data) => {
        if (alive) setInvoice(data);
      })
      .catch((error: unknown) => {
        if (alive) setFailure(toFailure(error));
      });
    return () => {
      alive = false;
    };
  }, [invoiceId, token]);

  if (failure !== null) {
    return (
      <Frame icon={failure.icon} title={failure.title}>
        <p className="text-muted-foreground text-sm leading-relaxed">{failure.body}</p>
      </Frame>
    );
  }

  if (invoice === null) {
    return (
      <Frame icon={null} title="Cargando la factura">
        <div
          className="w-full space-y-3"
          role="status"
          aria-label="Cargando la factura"
          aria-busy="true"
        >
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </Frame>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <BrandMark className="size-10 opacity-90" />

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Pago de tu licencia axi</h1>
        <p className="text-muted-foreground text-sm">
          Factura <span className="text-foreground font-mono font-medium">{invoice.number}</span>
        </p>
      </div>

      <section className="border-border bg-background shadow-float w-full rounded-2xl border p-5 text-left">
        <div className="flex flex-col items-center gap-1 border-b border-transparent pt-1 pb-4 text-center">
          <span className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Falta por pagar
          </span>
          {/* `amount_cents` de esta vista es lo que FALTA, no el total. */}
          <strong className="text-4xl font-semibold tracking-tight tabular-nums">
            {formatMoney(invoice.amount_cents, invoice.currency)}
          </strong>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Período facturado</dt>
          <dd className="text-right tabular-nums">
            {formatShortDate(invoice.period_start)} – {formatShortDate(invoice.period_end)}
          </dd>
          {invoice.due_at === null ? null : (
            <>
              <dt className="text-muted-foreground">Vencimiento</dt>
              <dd className="text-right tabular-nums">{formatShortDate(invoice.due_at)}</dd>
            </>
          )}
        </dl>

        {invoice.payable ? (
          <>
            <Button
              className="mt-5 h-11 w-full rounded-full"
              disabled={starting}
              onClick={() => void start(invoiceId, token)}
            >
              <Lock aria-hidden="true" />
              Pagar {formatMoney(invoice.amount_cents, invoice.currency)}
            </Button>
            <p className="text-muted-foreground mt-2.5 text-center text-xs leading-relaxed">
              Te llevamos al checkout seguro de Wompi. Puedes pagar con tarjeta, PSE,
              Nequi o en efectivo.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground border-success/24 bg-success/8 mt-5 rounded-xl border p-3 text-center text-xs leading-relaxed">
            Esta factura ya no tiene saldo pendiente. No hace falta que hagas nada.
          </p>
        )}
      </section>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Este enlace caduca <b className="text-foreground font-medium">7 días</b> después de
        haberse emitido. Si ya no funciona, pídele uno nuevo a quien te lo compartió.
      </p>
    </div>
  );
}

type Failure = { icon: React.ReactNode; title: string; body: string };

/**
 * Los tres desenlaces del enlace público, cada uno con su tono.
 *
 * El caducado **no es un error del usuario** y el texto no lo trata como tal. El
 * token inválido lleva un mensaje **genérico a propósito**: decir «esa factura no
 * existe» confirmaría qué ids existen a quien esté probando. Y el «ya está
 * pagada» se dice con alivio, no con cara de error.
 */
function toFailure(error: unknown): Failure {
  const code = isHttpError(error) ? error.code : "";

  if (code === PUBLIC_BILLING_ERRORS.linkExpired) {
    return {
      icon: <Clock className="text-muted-foreground size-8" aria-hidden="true" />,
      title: "Este enlace caducó",
      body: "Los enlaces de pago duran 7 días. Pídele uno nuevo a quien te lo compartió, o escríbenos y te lo reenviamos.",
    };
  }

  if (code === PUBLIC_BILLING_ERRORS.notPayable) {
    return {
      icon: <CircleCheck className="text-success size-9" aria-hidden="true" />,
      title: "Esta factura ya está saldada",
      body: "No hace falta que hagas nada. Si acabas de pagarla, gracias — ya quedó registrada.",
    };
  }

  return {
    icon: <TriangleAlert className="text-warning size-8" aria-hidden="true" />,
    title: "Este enlace no es válido",
    body: "Comprueba que lo copiaste completo. Si te llegó por correo, ábrelo desde ahí; si sigue sin funcionar, escríbenos.",
  };
}

function Frame({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <BrandMark className="size-10 opacity-90" />
      {icon}
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
