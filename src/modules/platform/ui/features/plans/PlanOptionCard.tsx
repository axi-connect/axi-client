"use client";

/**
 * Card-radio de un plan comercial — ÚNICA fuente del look de plan
 * seleccionable: la usan el paso «Plan» del wizard de alta (FE2) y el diálogo
 * «Cambiar plan» del tenant (FE3). Quien deshabilita decide el porqué
 * (`disabledReason` → tooltip).
 */
import { Lock } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { PlanListItem } from "../../../domain/plan";

type PlanOptionCardProps = {
  plan: PlanListItem;
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Motivo del bloqueo (se muestra en tooltip). */
  disabledReason?: string;
};

export function PlanOptionCard({ plan, checked, onSelect, disabled = false, disabledReason }: PlanOptionCardProps) {
  const isEnterprise = plan.tier === "enterprise";

  const card = (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors",
        checked ? "border-primary bg-accent" : "border-border bg-background hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-60 hover:bg-background",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-semibold">{plan.name}</span>
        {disabled ? (
          <Lock aria-hidden="true" className="size-4 text-muted-foreground" />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              checked ? "border-primary" : "border-input",
            )}
          >
            {checked && <span className="size-2 rounded-full bg-primary" />}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px] uppercase">{plan.code}</Badge>
        <Badge
          variant="outline"
          className={cn(
            isEnterprise
              ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
              : "border-border text-muted-foreground",
          )}
        >
          {plan.tier}
        </Badge>
      </span>
      {plan.description && <span className="text-sm text-muted-foreground">{plan.description}</span>}
      <span className="text-xs text-muted-foreground tabular-nums">
        {plan.default_limits.length} límites por defecto · {plan.subscriptions_count} suscritos
      </span>
    </button>
  );

  if (!disabled || !disabledReason) return card;
  return (
    <Tooltip>
      {/* span: los elementos disabled no emiten eventos de hover */}
      <TooltipTrigger asChild>
        <span className="block">{card}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
