"use client";

import {
  Bot,
  DoorOpen,
  HandCoins,
  Info,
  MessagesSquare,
  Target,
  UserRound,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { MetricTile } from "@/modules/dashboard/ui/components/MetricTile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { FunnelDTO } from "@/modules/analytics/domain/analytics";
import { CountUpValue } from "./CountUpValue";

const percent = (value: number) => `${value.toLocaleString("es-CO")} %`;

/** Card protagonista (2 por fila hero): valor grande con count-up + tooltip ⓘ. */
function HeroTile({
  label,
  tooltip,
  value,
  format,
  hint,
  icon,
}: {
  label: string;
  tooltip: string;
  value: number;
  format: (n: number) => string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="col-span-2 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-5 lg:row-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            {icon}
          </span>
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Qué significa ${label}`}
              className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info aria-hidden className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div>
        <CountUpValue
          value={value}
          format={format}
          className="block text-4xl font-semibold tracking-tight tabular-nums"
        />
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** Tile secundaria con tooltip en el label (reusa MetricTile del dashboard). */
function SecondaryTile({
  label,
  tooltip,
  value,
  icon,
  alert,
}: {
  label: string;
  tooltip: string;
  value: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("cursor-default")}>
          <MetricTile label={label} value={value} icon={icon} alert={alert} />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Fila hero del tab Conversión: 6 KPIs del funnel determinista. Dos
 * protagonistas (ventas pagadas, tasa de cierre) y cuatro secundarios.
 * `abandonment_rate > 25` marca la tile de abandono en warning.
 */
export function KpiHeroRow({ funnel }: { funnel: FunnelDTO }) {
  const { stages, rates, currency } = funnel;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
      <HeroTile
        label="Ventas pagadas"
        tooltip="Dinero realmente cobrado en el período. Solo cuenta pedidos con pago confirmado."
        value={stages.revenue_paid_cents}
        format={(cents) => formatMoney(Math.round(cents), currency)}
        hint={`${stages.closed_won.toLocaleString("es-CO")} cierres ganados`}
        icon={<HandCoins aria-hidden className="size-4" />}
      />
      <HeroTile
        label="Tasa de cierre"
        tooltip="De cada 100 conversaciones, cuántas terminaron en una venta pagada o una cita completada."
        value={rates.close_rate_paid}
        format={(n) =>
          `${n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
        }
        hint="de conversaciones a venta o cita"
        icon={<Target aria-hidden className="size-4" />}
      />
      <SecondaryTile
        label="Conversaciones"
        tooltip="Chats iniciados por tus clientes en el período."
        value={stages.conversations.toLocaleString("es-CO")}
        icon={<MessagesSquare aria-hidden className="size-5" />}
      />
      <SecondaryTile
        label="Resueltas por la IA"
        tooltip="Conversaciones que tu agente atendió de principio a fin, sin necesitar a una persona."
        value={percent(rates.containment_rate)}
        icon={<Bot aria-hidden className="size-5" />}
      />
      <SecondaryTile
        label="Escaladas"
        tooltip="Conversaciones que pasaron a una persona de tu equipo."
        value={percent(rates.escalation_rate)}
        icon={<UserRound aria-hidden className="size-5" />}
      />
      <SecondaryTile
        label="Abandono"
        tooltip="Clientes que dejaron de responder antes de comprar. Aquí se escapa la plata."
        value={percent(rates.abandonment_rate)}
        icon={<DoorOpen aria-hidden className="size-5" />}
        alert={rates.abandonment_rate > 25}
      />
    </div>
  );
}
