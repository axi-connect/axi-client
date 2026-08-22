"use client";

import { AlertTriangle, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
 * Tarjeta de una regla de recuperación.
 *
 * Las métricas van SIEMPRE acompañadas del desglose de omitidos: un operador
 * que ve "14 omitidos" sin saber por qué asume que el módulo falla, cuando en
 * realidad es el anti-spam haciendo su trabajo.
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
  const skips = metrics ? skipReasonBreakdown(metrics.skipped_by_reason) : [];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border",
        enabled ? "bg-background" : "bg-foreground/[0.015]",
      )}
    >
      <div className="flex flex-wrap items-start gap-3 p-4">
        <span className="inline-flex h-6.5 min-w-6.5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
          #{rank}
        </span>

        <div className="min-w-[11rem] flex-1">
          <h3 className={cn("text-[0.9375rem] font-semibold", !enabled && "text-foreground/70")}>
            {automation.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A los {describeDelay(automation.delay_minutes)} · {describeConditions(automation)}
          </p>
          {automation.promotion ? (
            <Badge
              variant="outline"
              className="mt-2 border-accent-amber/45 bg-accent-amber/10 text-accent-amber"
            >
              {automation.promotion.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="mt-2">
              Solo mensaje · sin descuento
            </Badge>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`Regla ${automation.name}`}
              disabled={blockedByHsm && !enabled}
              onClick={onToggle}
              className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={cn(
                  "relative h-5.5 w-9.5 shrink-0 rounded-full transition-colors",
                  enabled ? "bg-success" : "bg-input",
                )}
              >
                <span
                  className={cn(
                    "absolute left-[3px] top-[3px] size-4 rounded-full bg-background shadow-sm transition-transform",
                    enabled && "translate-x-4",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  enabled ? "text-success" : "text-muted-foreground",
                )}
              >
                {enabled ? "Activa" : "Apagada"}
              </span>
            </button>
          </div>
        )}
      </div>

      {blockedByHsm && (
        <p className="mx-4 mb-4 flex gap-2.5 rounded-md border border-warning/30 bg-warning/[0.07] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Esta regla escribe días después del último mensaje del cliente, así que WhatsApp exige
            una <strong className="font-medium text-foreground">plantilla aprobada por Meta</strong>.
            Elige una para poder encenderla.
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 px-2 text-xs"
                onClick={onConfigureHsm}
              >
                Configurar
              </Button>
            )}
          </span>
        </p>
      )}

      {metrics && metrics.sent + metrics.skipped > 0 && (
        <dl className="grid grid-cols-2 border-t border-border/60 bg-foreground/[0.015] sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Enviados" value={metrics.sent.toLocaleString("es-CO")} />
          <Metric label="Omitidos" value={metrics.skipped.toLocaleString("es-CO")} />
          <Metric
            label="Convirtieron"
            value={metrics.converted.toLocaleString("es-CO")}
            hint={
              metrics.sent > 0
                ? `${((metrics.converted / metrics.sent) * 100).toFixed(1).replace(".", ",")}%`
                : undefined
            }
          />
          <Metric
            label="Recuperado"
            value={formatMoney(metrics.attributed_revenue_cents)}
            amber
          />
          <Metric
            label="Cupones"
            value={
              metrics.coupons_issued > 0
                ? `${metrics.coupons_issued} → ${metrics.coupons_redeemed}`
                : "—"
            }
          />
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2.5">
        <p className="min-w-[12rem] flex-1 text-xs text-muted-foreground">
          {metrics === null
            ? "Sus cifras no cargaron."
            : metrics.sent + metrics.skipped === 0
              ? "Nunca se ha disparado."
              : skips.length > 0
                ? `Omitidos: ${skips.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(" · ")}`
                : metrics.skipped > 0
                  ? // El desglose excluye los motivos transitorios (cooldown, cupo
                    // diario): decir "sin omisiones" con el contador en 3 sería
                    // contradecirse en la misma fila.
                    `Los ${metrics.skipped} omitidos fueron por los límites anti-spam: esos contactos se reintentan.`
                  : "Sin omisiones."}
        </p>
        {canManage && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Editar
            </Button>
            {/* Abre HACIA ARRIBA a propósito. El disparador vive en la última fila
                de una tarjeta con `overflow-hidden`, así que un panel desplegado
                hacia abajo quedaba recortado ENTERO y "Eliminar regla" era
                invisible: el menú se abría y no se veía nada. Hacia arriba cae
                dentro de la caja de la tarjeta. El `<details>` que había antes
                tampoco se cerraba al hacer clic fuera ni con Escape; el
                DropdownMenu compartido sí, y trae navegación con flechas. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Más acciones de ${automation.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-44">
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Eliminar regla
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
  amber,
}: {
  label: string;
  value: string;
  hint?: string;
  amber?: boolean;
}) {
  return (
    <div className="border-b border-r border-border/60 px-4 py-2.5 last:border-r-0">
      <dt className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums",
          amber && "text-accent-amber",
        )}
      >
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
