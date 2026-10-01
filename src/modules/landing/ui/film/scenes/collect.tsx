import { CalendarCheck, Send } from "lucide-react";

import type { FilmContent } from "@/modules/landing/domain/film/film-content";
import { parseFigure } from "@/modules/landing/domain/film/funnel-fibers";
import { formatPesos } from "@/modules/landing/domain/film/route-scenario";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/**
 * Cobrar (plan §11, lienzo aprobado el 2026-09-30): el recibo de papel N.º 0142
 * en perspectiva, claro sobre el escenario oscuro. Al pasar la escena llegan el
 * recordatorio, la promesa, se llena el último pago, se sella «PAGADO» y sale el
 * PDF por WhatsApp. El HTML trae el recibo ya pagado (fotograma final).
 */

/** «Anticipo · verificado» → ["Anticipo", "Verificado"]. */
function splitPart(label: string): [string, string] {
  const [name, status = ""] = label.split(" · ");
  return [name, status.charAt(0).toUpperCase() + status.slice(1)];
}

function Receipt({ c }: { c: FilmContent }) {
  const k = c.collect;
  const [kind, number] = k.document.split(" · ");
  const paidBefore = k.parts.reduce((sum, [, amount]) => sum + parseFigure(amount), 0);
  const total = parseFigure(k.total);
  const installments = k.last.label.startsWith("Cuota") ? "Tres cuotas" : "Tres pagos";
  return (
    <div className="film-receipt-stage">
      <div className="film-receipt-shadow" data-anim="receipt-shadow" aria-hidden="true" />
      <div className="film-receipt" data-anim="receipt">
        <div className="film-receipt-paper" data-thread-target="">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="film-h truncate text-[13px] tracking-[-0.01em] lg:text-[17px]">{c.business}</p>
              <p className="film-receipt-muted mt-1 text-[11px] lg:text-[11.5px]">
                <span className="lg:hidden">{k.customer} · </span>
                {k.order}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="film-receipt-muted text-[9.5px] font-semibold tracking-[0.18em] uppercase max-lg:hidden">{kind}</p>
              <p className="film-h mt-0.5 text-[15px] lg:text-[22px]">{number}</p>
            </div>
          </div>
          <div className="film-receipt-rule max-lg:hidden" />
          <div className="flex justify-between gap-3 text-[13px] max-lg:hidden">
            <span className="film-receipt-muted">Cliente</span>
            <strong className="truncate font-semibold">{k.customer}</strong>
          </div>
          <div>
            <p className="film-receipt-muted mb-2 text-[9.5px] font-semibold tracking-[0.18em] uppercase max-lg:hidden">{installments}</p>
            <div className="film-receipt-bar" aria-hidden="true">
              <span />
              <span />
              <span className="rest">
                <span data-anim="receipt-fill" />
              </span>
            </div>
          </div>
          <dl className="flex flex-col gap-[7px] text-[11.5px] lg:gap-2.5 lg:text-[13px]">
            {k.parts.map(([label, amount]) => {
              const [name, status] = splitPart(label);
              return (
                <div key={label} className="film-receipt-row">
                  <dt>{name}</dt>
                  <dd className="film-receipt-muted text-[11.5px] max-lg:hidden">{status}</dd>
                  <dd className="tabular-nums">{amount}</dd>
                </div>
              );
            })}
            <div className="film-receipt-row">
              <dt>{k.last.label}</dt>
              <dd className="film-receipt-muted text-[11.5px] max-lg:hidden" data-anim="receipt-status" data-due={k.last.due} data-paid={k.last.paid}>
                {k.last.paid}
              </dd>
              <dd className="tabular-nums">{k.remaining}</dd>
            </div>
          </dl>
          <div className="film-receipt-rule" />
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="film-receipt-muted text-[10.5px] lg:text-[11.5px]">Total pagado</p>
              <p className="film-h mt-0.5 text-[28px] tracking-[-0.03em] tabular-nums lg:text-[38px]" data-anim="receipt-paid" data-from={paidBefore} data-to={total}>
                {formatPesos(total)}
              </p>
            </div>
            <p className="film-receipt-muted mb-1.5 text-right text-xs max-lg:hidden">
              Falta
              <br />
              <strong className="text-[var(--background)] tabular-nums" data-anim="receipt-left" data-from={parseFigure(k.remaining)}>
                {formatPesos(0)}
              </strong>
            </p>
          </div>
          <p className="film-receipt-muted mt-auto text-[11px] max-lg:hidden">
            <span data-anim="receipt-verified" data-final={k.parts.length + 1}>
              {k.parts.length + 1}
            </span> de {k.parts.length + 1} pagos verificados por tu equipo
          </p>
          <div className="film-receipt-stamp" data-anim="receipt-stamp" aria-hidden="true">
            PAGADO
          </div>
          <div className="film-receipt-gloss" data-anim="receipt-gloss" aria-hidden="true" />
        </div>
      </div>
      <p className="film-receipt-sent" data-anim="receipt-sent">
        <Send className="size-3.5" aria-hidden="true" />
        PDF enviado por WhatsApp · 19 oct
      </p>
    </div>
  );
}

export function CollectScene() {
  return (
    <section id="cobrar" data-scene="collect" data-chapter="Cobrar" aria-labelledby="cobrar-h" className="film-scene">
      <div className="film-spot top-[4%] left-[44%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_6%,transparent),transparent)]" />
      <div className="film-wrap film-wrap-wide grid items-center gap-x-[clamp(24px,6vw,130px)] gap-y-8 lg:grid-cols-[minmax(0,470px)_500px] lg:justify-between">
        <div className="min-w-0">
          <SceneHead
            id="cobrar-h"
            eyebrow="Cobrar"
            strong="Cada venta,"
            thin="cobrada."
            lead="Abonos que se reparten solos, recordatorios que suenan a conversación y el recibo listo para enviar."
          />
          <ByNiche>
            {(c) => (
              <div className="mt-14 flex flex-col gap-2.5 max-lg:hidden">
                <p className="film-eyebrow film-dim mb-1 text-[10.5px] tracking-[0.18em]">WhatsApp · antes de vencer</p>
                <p className="film-cobro-bub film-cobro-out" data-anim="cobro-msg">
                  {c.collect.reminder}
                  <span className="film-cobro-meta">14 oct · leído</span>
                </p>
                <p className="film-cobro-bub film-cobro-in" data-anim="cobro-reply">
                  {c.collect.promiseReply}
                  <span className="film-cobro-meta">14 oct</span>
                </p>
                <p className="film-chip mt-1.5 self-start text-[13px]" data-anim="cobro-promise">
                  <CalendarCheck className="size-3.5" aria-hidden="true" />
                  {c.collect.promise}
                </p>
              </div>
            )}
          </ByNiche>
        </div>
        <div className="flex flex-col items-start gap-5 max-lg:items-center">
          <ByNiche>{(c) => <Receipt c={c} />}</ByNiche>
          <ByNiche>
            {(c) => (
              // El envoltorio oculta en escritorio: `.film-chip` (sin capa) le gana a `lg:hidden`.
              <div className="lg:hidden">
                <p className="film-chip text-xs" data-anim="cobro-promise">
                  <CalendarCheck className="size-3.5" aria-hidden="true" />
                  {c.collect.promise}
                </p>
              </div>
            )}
          </ByNiche>
        </div>
      </div>
    </section>
  );
}
