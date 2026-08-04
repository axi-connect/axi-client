"use client";

/**
 * Catálogo de tarifas IA agrupado por proveedor (primitivo Table — pocos
 * registros, sin paginación server). Vigentes en verde, expiradas atenuadas
 * (toggle "solo vigentes"); `model: *` = fallback (badge violeta).
 * "Cerrar vigencia hoy" = PATCH `effective_to: hoy` (Modal simple).
 */
import { useMemo, useState } from "react";
import { CircleDollarSign, MoreVertical, PencilLine, Plus, TimerOff } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Switch } from "@/shared/components/ui/switch";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  FALLBACK_MODEL,
  groupByProvider,
  isCurrentRate,
  providerLabel,
  type PricingRate,
} from "../../../domain/pricing";
import { usePricingQuery, useUpdatePricing } from "../../../infrastructure/api/hooks/use-pricing";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { StatusBadge } from "../../components/StatusBadge";
import { formatMargin, formatUsdPerMtok } from "./pricing-format";
import { PricingFormSheet } from "./PricingFormSheet";

function RateActions({ rate, onEdit, onClose }: {
  rate: PricingRate;
  onEdit: (rate: PricingRate) => void;
  onClose: (rate: PricingRate) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${rate.model}`}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <MoreVertical aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(rate)}>
          <PencilLine aria-hidden="true" className="size-4" />
          Editar
        </DropdownMenuItem>
        {isCurrentRate(rate) && (
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => onClose(rate)}>
            <TimerOff aria-hidden="true" className="size-4" />
            Cerrar vigencia hoy
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PricingView() {
  const { showAlert } = useAlert();
  const { data, isPending, isError, error, refetch } = usePricingQuery();
  const updatePricing = useUpdatePricing();
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  // Drawer: undefined = cerrado · null = crear · tarifa = editar.
  const [sheetRate, setSheetRate] = useState<PricingRate | null | undefined>(undefined);
  const [closingRate, setClosingRate] = useState<PricingRate | null>(null);

  const rates = useMemo(() => data?.data ?? [], [data]);
  const groups = useMemo(() => {
    const visible = onlyCurrent ? rates.filter((rate) => isCurrentRate(rate)) : rates;
    return groupByProvider(visible);
  }, [rates, onlyCurrent]);

  async function closeToday() {
    if (!closingRate) return;
    try {
      await updatePricing.mutateAsync({
        id: closingRate.id,
        body: {
          margin_multiplier: closingRate.margin_multiplier,
          effective_to: new Date().toISOString(),
        },
      });
      setClosingRate(null);
      showAlert({
        tone: "success",
        title: "Vigencia cerrada",
        description: `${closingRate.model} dejó de estar vigente. Crea la nueva tarifa cuando quieras.`,
        autoCloseMs: 6000,
      });
    } catch (error) {
      setClosingRate(null);
      showAlert({ tone: "error", title: "No se pudo cerrar la vigencia", description: errorMessage(error) });
    }
  }

  if (isPending) return <TableSkeleton rows={6} />;
  if (isError) {
    return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pricing IA</h1>
          <p className="text-sm text-muted-foreground">Tarifas por proveedor y modelo · USD/MTok</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={onlyCurrent} onCheckedChange={setOnlyCurrent} aria-label="Mostrar solo tarifas vigentes" />
            Solo vigentes
          </label>
          <Button onClick={() => setSheetRate(null)}>
            <Plus aria-hidden="true" />
            Crear tarifa
          </Button>
        </div>
      </header>

      {rates.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="Aún no hay tarifas"
          description="Registra el costo por MTok de cada proveedor y modelo; usa * como fallback por proveedor."
          action={
            <Button variant="outline" onClick={() => setSheetRate(null)}>
              Crear la primera tarifa
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.provider} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {providerLabel(group.provider)}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                    <TableHead className="text-right">Caché</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rates.map((rate) => {
                    const current = isCurrentRate(rate);
                    return (
                      <TableRow key={rate.id} className={cn(!current && "opacity-60")}>
                        <TableCell>
                          <span className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs">{rate.model}</span>
                              {rate.model === FALLBACK_MODEL && (
                                <Badge className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet" variant="outline">
                                  fallback
                                </Badge>
                              )}
                              {rate.is_default && (
                                <Badge variant="outline" className="text-xs">
                                  por defecto
                                </Badge>
                              )}
                            </span>
                            {/* El nombre que verá el tenant en el selector del agente */}
                            {rate.display_name !== null && (
                              <span className="text-xs text-muted-foreground">{rate.display_name}</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsdPerMtok(rate.input_cost_per_mtok_usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsdPerMtok(rate.output_cost_per_mtok_usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsdPerMtok(rate.cache_read_per_mtok_usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMargin(rate.margin_multiplier)}</TableCell>
                        <TableCell>
                          {current ? (
                            <span className="flex items-center gap-2">
                              <StatusBadge status="current" />
                              <span className="text-xs text-muted-foreground">
                                desde {formatShortDate(rate.effective_from)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {formatShortDate(rate.effective_from)} – {rate.effective_to ? formatShortDate(rate.effective_to) : "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RateActions rate={rate} onEdit={(r) => setSheetRate(r)} onClose={setClosingRate} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        ))
      )}

      <PricingFormSheet
        open={sheetRate !== undefined}
        onOpenChange={(open) => { if (!open) setSheetRate(undefined); }}
        rate={sheetRate ?? null}
        key={sheetRate === undefined ? "closed" : sheetRate?.id ?? "create"}
      />

      <Modal
        open={closingRate !== null}
        onOpenChange={(open) => { if (!open) setClosingRate(null); }}
        config={{
          title: `Cerrar la vigencia de «${closingRate?.model ?? ""}»`,
          description:
            "La tarifa dejará de aplicar desde ahora. Los consumos futuros usarán la tarifa fallback del proveedor hasta que crees la nueva.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            { label: updatePricing.isPending ? "Cerrando…" : "Cerrar vigencia", onClick: () => void closeToday() },
          ],
        }}
      />
    </div>
  );
}
