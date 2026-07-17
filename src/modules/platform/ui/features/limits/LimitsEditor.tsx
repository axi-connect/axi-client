"use client";

/**
 * Editor del set de límites — COMPARTIDO entre el formulario de planes
 * (default_limits) y el tab Plan & Límites del tenant (spec §4). Controlado
 * (`value`/`onChange`); las invariantes del backend viven en la UI:
 *   · cost cap fuerza `billing_cycle` (periodo con candado)
 *   · solo 1 cost cap por set (2º toggle deshabilitado + tooltip)
 *   · máx 30 filas (botón añadir deshabilitado + contador)
 *   · duplicados (metric, period) resaltados vía `issues`
 * `issues` viene de `validateLimits()` (dominio) o del server (`usage/limit_invalid`).
 */
import { Lock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { limitValueLabel } from "./limit-format";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  ACTIONS,
  hasOtherCostCap,
  MAX_LIMITS,
  METRICS,
  metricInfo,
  newLimitRow,
  PERIODS,
  type LimitInput,
  type LimitIssue,
} from "../../../domain/limits";

type LimitsEditorProps = {
  value: LimitInput[];
  onChange: (limits: LimitInput[]) => void;
  issues?: LimitIssue[];
  disabled?: boolean;
};

/** Preview del valor según la unidad de la métrica (formato centralizado). */
function valuePreview(limit: LimitInput): string | null {
  if (!(limit.limit_value > 0)) return null;
  const unit = limit.is_cost_limit ? "cost" : metricInfo(limit.metric).unit;
  if (unit === "count") return null;
  return `≈ ${limitValueLabel(limit)}`;
}

export function LimitsEditor({ value, onChange, issues = [], disabled = false }: LimitsEditorProps) {
  const globalIssues = issues.filter((issue) => issue.row === -1);

  function patchRow(row: number, patch: Partial<LimitInput>) {
    onChange(value.map((limit, index) => (index === row ? { ...limit, ...patch } : limit)));
  }

  function toggleCostCap(row: number, on: boolean) {
    // Cost cap SOLO por ciclo de facturación: activar fuerza el periodo.
    patchRow(row, on ? { is_cost_limit: true, period: "billing_cycle" } : { is_cost_limit: false });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {value.map((limit, row) => {
          const rowIssues = issues.filter((issue) => issue.row === row);
          const costCapBlocked = hasOtherCostCap(value, row);
          const preview = valuePreview(limit);

          return (
            <li
              key={row}
              className={cn(
                "space-y-3 rounded-2xl border bg-background p-3",
                rowIssues.length > 0 ? "border-destructive/50" : "border-border",
              )}
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <Select
                  value={limit.metric}
                  onValueChange={(metric) => patchRow(row, { metric: metric as LimitInput["metric"] })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full" aria-label={`Métrica del límite ${row + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>{metric.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {limit.is_cost_limit ? (
                  <span className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    <Lock aria-hidden="true" className="size-3.5" />
                    Ciclo
                  </span>
                ) : (
                  <Select
                    value={limit.period}
                    onValueChange={(period) => patchRow(row, { period: period as LimitInput["period"] })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-28" aria-label={`Periodo del límite ${row + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(limit.limit_value) ? limit.limit_value : ""}
                  onChange={(e) => patchRow(row, { limit_value: e.target.valueAsNumber })}
                  aria-label={`Valor del límite ${row + 1}`}
                  className="w-32 tabular-nums"
                  disabled={disabled}
                />

                <Select
                  value={limit.action}
                  onValueChange={(action) => patchRow(row, { action: action as LimitInput["action"] })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-36" aria-label={`Acción del límite ${row + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {preview && <span className="text-xs text-muted-foreground tabular-nums">{preview}</span>}

                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground">Gracia</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Number.isFinite(limit.grace_pct) ? limit.grace_pct : ""}
                    onChange={(e) => patchRow(row, { grace_pct: e.target.valueAsNumber })}
                    aria-label={`Gracia (%) del límite ${row + 1}`}
                    className="h-8 w-16 tabular-nums"
                    disabled={disabled}
                  />
                  <span className="text-muted-foreground">%</span>
                </label>

                {costCapBlocked && !limit.is_cost_limit ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-2 opacity-60">
                        <Switch
                          checked={false}
                          disabled
                          aria-label={`Cost cap del límite ${row + 1} (deshabilitado)`}
                        />
                        <span className="text-muted-foreground">Cost cap</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Solo un cost cap por set.</TooltipContent>
                  </Tooltip>
                ) : (
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={limit.is_cost_limit}
                      onCheckedChange={(on) => toggleCostCap(row, on)}
                      aria-label={`Cost cap del límite ${row + 1}`}
                      disabled={disabled}
                    />
                    <span className="text-muted-foreground">Cost cap</span>
                  </label>
                )}

                <label className="flex items-center gap-2">
                  <Switch
                    checked={limit.enabled}
                    onCheckedChange={(enabled) => patchRow(row, { enabled })}
                    aria-label={`Límite ${row + 1} activo`}
                    disabled={disabled}
                  />
                  <span className="text-muted-foreground">Activo</span>
                </label>

                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, index) => index !== row))}
                  aria-label={`Eliminar límite ${row + 1}`}
                  disabled={disabled}
                  className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>

              {rowIssues.map((issue) => (
                <p key={issue.message} role="alert" className="text-sm text-destructive">
                  {issue.message}
                </p>
              ))}
            </li>
          );
        })}
      </ul>

      {value.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Sin límites: el consumo no se controla. Añade al menos uno.
        </p>
      )}

      {globalIssues.map((issue) => (
        <p key={issue.message} role="alert" className="text-sm text-destructive">
          {issue.message}
        </p>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, newLimitRow()])}
          disabled={disabled || value.length >= MAX_LIMITS}
        >
          <Plus aria-hidden="true" />
          Añadir límite
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value.length} / {MAX_LIMITS}
        </span>
      </div>
    </div>
  );
}
