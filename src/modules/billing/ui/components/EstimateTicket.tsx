"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatShortDate } from "@/core/lib/format";
import {
  cycleCloseLabel,
  daysToCycleClose,
  type BillingSummaryDTO,
} from "@/modules/billing/domain/account";
import { estimateLabel, hasEstimate } from "@/modules/billing/domain/money";
import { TiltCard } from "@/shared/components/ui/tilt-card";

/**
 * La estimación del próximo cobro, con forma de tiquete.
 *
 * No es decoración por decoración: la estimación es la pieza que evita la
 * factura sorpresa y competía visualmente con las dos `StatTile` de al lado. Un
 * tiquete con talón le da la jerarquía que le corresponde y, sobre todo, junta
 * las dos mitades de la misma pregunta —**cuánto** en la cara y **cuándo** en el
 * talón— en un objeto que se lee de un golpe.
 *
 * Tres cosas que NO hace, y son decisiones:
 *
 * 1. **No es un control.** Reacciona al puntero como material, no como botón: no
 *    lleva a ninguna parte. Un tiquete invita a tocarlo, así que la tentación de
 *    colgarle un destino es real; hay test de que no lo tiene, porque un CTA
 *    escondido en la tarjeta del dinero se pulsa sin querer.
 * 2. **No crece bajo el cursor** (`scale={1}`). En una vista de trabajo, una
 *    tarjeta que se acerca desplaza la mirada justo de la cifra que se está
 *    leyendo.
 * 3. **Sin dato dentro no presume.** Sin estimación se apaga el tinte y el
 *    cometa (`--live`): un anillo ámbar recorriendo el borde de una tarjeta que
 *    dice «no lo sabemos» promete atención sobre un vacío. La FORMA sí se queda
 *    en los tres estados, porque es identidad y no estado — igual que el tilt,
 *    que es una propiedad del objeto físico: quitárselo haría que la tarjeta
 *    pareciera rota en vez de vacía.
 *
 * El contrato con `globals.css` (`.ticket-surface`), que hay que respetar al
 * tocar esto: `--ticket-stub` la comparten la máscara de las muescas y el
 * `flex-basis` del talón, así que se cambia en el CSS y nunca aquí; el
 * envoltorio no puede llevar padding horizontal (movería el contenido pero no la
 * máscara); y el talón se renderiza SIEMPRE, porque la muesca está anclada a su
 * ancho y sin él quedaría cortando el aire.
 */
export function EstimateTicket({ summary }: { summary: BillingSummaryDTO }) {
  const live = hasEstimate(summary.next_invoice_estimate_cents);
  const cycle = summary.cycle;
  const days = daysToCycleClose(summary);

  return (
    <TiltCard
      depth={6}
      scale={1}
      glare="soft"
      className={cn(
        // `z-10`: los dos `StatTile` hermanos son opacos y vienen después en el
        // DOM, así que sin esto taparían el borde que la inclinación mete en el
        // `gap`. Permanente y no `hover:`, porque el lerp de vuelta sigue
        // corriendo un instante después de que el puntero ya salió.
        "ticket-surface border-border z-10 rounded-2xl border sm:col-span-2",
        live && "ticket-surface--live border-accent-amber/30",
      )}
    >
      <div className="flex items-stretch">
        {/* El padding vive en las columnas, nunca en el envoltorio: la máscara
            mide sobre la caja de borde y no se enteraría. */}
        <div className="min-w-0 flex-1 p-5">
          <p
            className={cn(
              "flex items-center gap-2 text-xs font-medium",
              live ? "text-accent-amber" : "text-muted-foreground",
            )}
          >
            <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
            Próximo cobro estimado
          </p>

          <p
            className={
              live
                ? "mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
                : "text-muted-foreground mt-2 text-lg font-medium"
            }
          >
            {estimateLabel(summary.next_invoice_estimate_cents, summary.currency)}
          </p>

          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {live
              ? "Cuota vigente más el excedente acumulado en el ciclo, con las mismas reglas que usará la emisión. Puede subir si sigues consumiendo."
              : "No hay ciclo abierto o tu plan aún no tiene tarifa vigente. En cuanto lo haya, verás aquí lo que costaría el ciclo si cerrara hoy."}
          </p>
        </div>

        <div className="ticket-perforation border-border/70 flex shrink-0 basis-[var(--ticket-stub)] flex-col items-center justify-center gap-0.5 border-l border-dotted p-3 text-center">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Corte
          </p>
          <p className="text-sm font-medium tabular-nums">
            {cycle === null ? "—" : formatShortDate(cycle.period_end)}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {cycle === null ? "Sin ciclo abierto" : cycleCloseLabel(days)}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}
