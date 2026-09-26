"use client";

import { MoreHorizontal } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMillions, formatMoney } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
} from "@/modules/marketing/domain/automation";
import { canEnableAutomation, parseConditions } from "@/modules/marketing/domain/automation";
import { skipReasonBreakdown } from "@/modules/marketing/domain/skip-reasons";

/** "15 minutos", "2 horas", "3 días" — la demora en la unidad que se piensa. */
export function describeDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} ${days === 1 ? "día" : "días"}`;
}

/** Resumen legible de las condiciones; "cualquiera" si no hay ninguna. */
export function describeConditions(automation: AutomationDTO): string {
  const c = parseConditions(automation.conditions);
  const parts: string[] = [];
  if (c.min_cart_total_cents !== undefined) {
    parts.push(`carrito desde ${formatMoney(c.min_cart_total_cents)}`);
  }
  if (c.has_active_cart) parts.push("con carrito activo");
  if (c.lifecycle_stage_in?.length) {
    const labels: Record<string, string> = {
      prospect: "Prospecto",
      lead: "Lead",
      customer: "Cliente",
      other: "Otro",
    };
    parts.push(`etapa ${c.lifecycle_stage_in.map((s) => labels[s] ?? s).join(" o ")}`);
  }
  if (c.min_score !== undefined || c.max_score !== undefined) {
    parts.push(`score ${c.min_score ?? 0}–${c.max_score ?? 100}`);
  }
  if (c.intent_type !== undefined) parts.push(`intención ${c.intent_type}`);
  if (c.include_pending) parts.push("incluye pendientes de pago");
  return parts.length > 0 ? parts.join(" · ") : "sin condiciones";
}

/**
 * Fila de una regla de recuperación dentro de la tarjeta de su disparador
 * (canvas 2026-09-26): prioridad, nombre y cuándo escribe, sus cifras y el
 * interruptor. La tarjeta es `@container`: estrecha, las cifras bajan bajo el
 * nombre.
 *
 * Las cifras van SIEMPRE acompañadas del motivo de los omitidos cuando los hay:
 * un operador que ve «14 omitidos» sin saber por qué asume que el módulo falla,
 * cuando en realidad es el anti-spam haciendo su trabajo.
 */
export function AutomationCard({
  automation,
  metrics,
  rank,
  canManage,
  onEdit,
  onToggle,
  onDelete,
  onConfigureHsm,
}: {
  automation: AutomationDTO;
  metrics: AutomationMetricsDTO | null;
  rank: number;
  canManage: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onConfigureHsm: () => void;
}) {
  const enabled = automation.enabled;
  const blockedByHsm = !canEnableAutomation(automation);
  const delegates = automation.action_kind === "agent_task";
  const skips = metrics ? skipReasonBreakdown(metrics.skipped_by_reason) : [];
  // `delegated` llegó después: un servidor anterior no lo manda, y `undefined` convertiría la suma en NaN.
  const delegated = metrics?.delegated ?? 0;
  const fired = metrics !== null && metrics.sent + delegated + metrics.skipped > 0;
  const code = automation.promotion ? automation.promotion.name : null;

  const skipLine =
    metrics === null
      ? "Sus cifras no cargaron."
      : !fired
        ? "Nunca se ha disparado."
        : skips.length > 0
          ? `${metrics.skipped.toLocaleString("es-CO")} omitidos: ${skips.map((skip) => `${String(skip.count)} ${skip.label.toLowerCase()}`).join(" · ")}`
          : metrics.skipped > 0
            ? // El desglose excluye los motivos transitorios (cooldown, cupo diario): decir «sin omisiones»
              // con el contador en 3 sería contradecirse en la misma fila.
              `Los ${String(metrics.skipped)} omitidos fueron por los límites anti-spam: esos contactos se reintentan.`
            : null;

  return (
    <article className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-4 @3xl:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,19rem)_auto] @3xl:gap-x-5">
      <span className="text-muted-foreground self-start pt-1 text-sm tabular-nums" aria-label={`Prioridad ${String(rank)}`}>
        {rank}
      </span>

      <div className="flex min-w-0 flex-col gap-1">
        <h3 className={cn("font-heading text-[1.02rem] font-bold tracking-tight text-pretty", !enabled && !blockedByHsm && "text-foreground/70")}>
          {canManage ? (
            <button type="button" onClick={onEdit} className="min-h-6 text-left underline-offset-4 hover:underline">
              {automation.name}
            </button>
          ) : (
            automation.name
          )}
        </h3>
        {blockedByHsm ? (
          <p className="flex gap-2 text-sm text-pretty">
            <span aria-hidden="true" className="bg-warning mt-[0.45em] size-1.5 shrink-0 rounded-full" />
            <span className="text-muted-foreground">Pasadas 24 h solo se puede escribir con una plantilla de Meta.</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm text-pretty">
            A los {describeDelay(automation.delay_minutes)} · {delegates ? "la IA retoma con su objetivo" : describeConditions(automation)}
          </p>
        )}
        {!code && !delegates ? (
          <span className="bg-muted text-muted-foreground w-fit rounded-md px-2 py-0.5 text-xs font-medium">Solo mensaje · sin descuento</span>
        ) : null}
        {code ? (
          // La regla solo conoce el NOMBRE de su promoción (no el código): se dice qué ofrece, sin fingir un cupón.
          <span className="bg-muted w-fit max-w-full truncate rounded-md px-2 py-0.5 text-xs font-medium" title={`Ofrece «${code}»`}>
            Ofrece «{code}»
          </span>
        ) : null}
        {skipLine ? <p className="text-muted-foreground text-xs text-pretty">{skipLine}</p> : null}
      </div>

      {blockedByHsm ? (
        <div className="order-4 col-span-2 col-start-2 @3xl:order-none @3xl:col-span-1 @3xl:col-start-auto @3xl:justify-self-end">
          {canManage ? (
            <Button variant="contrast" size="sm" className="rounded-full" onClick={onConfigureHsm}>
              Poner plantilla
            </Button>
          ) : null}
        </div>
      ) : (
        <dl className="order-4 col-span-2 col-start-2 grid grid-cols-3 gap-4 @3xl:order-none @3xl:col-span-1 @3xl:col-start-auto">
          <Metric
            label={delegates ? "Delegadas" : "Enviados"}
            value={metrics ? (delegates ? delegated : metrics.sent).toLocaleString("es-CO") : "—"}
          />
          <Metric
            label="Compraron"
            value={
              metrics && metrics.sent > 0
                ? `${((metrics.converted / metrics.sent) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`
                : "—"
            }
            hint={metrics && metrics.converted > 0 ? `${metrics.converted.toLocaleString("es-CO")} ${metrics.converted === 1 ? "pedido" : "pedidos"}` : undefined}
          />
          <Metric
            label="Recuperado"
            value={metrics && metrics.attributed_revenue_cents > 0 ? formatMillions(metrics.attributed_revenue_cents) : "—"}
            hint={
              metrics && metrics.coupons_issued > 0
                ? `${metrics.coupons_issued.toLocaleString("es-CO")} cupones → ${metrics.coupons_redeemed.toLocaleString("es-CO")}`
                : undefined
            }
          />
        </dl>
      )}

      <div className="flex items-center gap-1.5 self-start pt-0.5 @3xl:self-center">
        {canManage ? (
          <>
            <Switch
              checked={enabled}
              disabled={blockedByHsm && !enabled}
              onCheckedChange={onToggle}
              aria-label={`Regla ${automation.name}`}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Más acciones de ${automation.name}`}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-ring inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent portal align="end" className="w-44">
                <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  Eliminar regla
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">{enabled ? "Encendida" : "Apagada"}</span>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground truncate text-xs">{label}</dt>
      {/* Estrecha, una cifra sin abreviar («$ 950.000») no cabe a text-lg: baja un punto en vez de desbordar. */}
      <dd className="font-heading truncate text-base leading-none font-bold tracking-tight tabular-nums @md:text-lg" title={value}>
        {value}
      </dd>
      {hint ? <dd className="text-muted-foreground truncate text-xs tabular-nums" title={hint}>{hint}</dd> : null}
    </div>
  );
}
