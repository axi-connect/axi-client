"use client";

/**
 * Tramos del eje de volumen (`/platform/billing/tiers`).
 *
 * El tramo vende conversaciones; su tarifa es un COMPONENTE del precio
 * (celda = paquete + tramo, G7). Editar aquí la tarifa NO publica nada: las
 * celdas se derivan y se publican con vigencia desde «Tarifas». Crear un tramo
 * tampoco publica: sin celdas con precio no aparece en la landing.
 */
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import type { BillingVolumeTier } from "../../../domain/billing";
import { perConversationCop } from "../../../domain/pricing-cells";
import {
  useCreateVolumeTier,
  useUpdateVolumeTier,
  useVolumeTiersQuery,
} from "../../../infrastructure/api/hooks/use-catalog";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";

export function TiersView() {
  const tiers = useVolumeTiersQuery();
  const [editing, setEditing] = useState<BillingVolumeTier | null | "new">(null);

  if (tiers.isPending) return <TableSkeleton rows={6} />;
  if (tiers.isError) {
    return (
      <ProblemAlert error={tiers.error} onRetry={() => void tiers.refetch()} className="mx-auto max-w-xl" />
    );
  }
  const rows = [...tiers.data.data].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Eje de volumen</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tramos</h1>
          <p className="text-muted-foreground max-w-[70ch] text-sm">
            Cuántas conversaciones con IA al mes vende una celda. El código es estable y viaja en la URL de
            la landing; la tarifa del tramo es un componente del precio y se publica desde «Tarifas».
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Nuevo tramo
        </Button>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          glyph="money"
          title="Sin tramos"
          description="El precio de dos ejes necesita al menos un tramo de conversaciones."
          action={<Button variant="outline" onClick={() => setEditing("new")}>Crear el primero</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="border-border-soft bg-card rounded-2xl border shadow-[var(--shadow-float)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border-soft border-b text-[11px] tracking-wide uppercase">
                    <th className="px-4 py-2.5 text-left font-medium">Orden</th>
                    <th className="px-4 py-2.5 text-left font-medium">Código</th>
                    <th className="px-4 py-2.5 text-right font-medium">Conversaciones</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tarifa mensual</th>
                    <th className="px-4 py-2.5 text-right font-medium">COP / conv.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Celdas</th>
                    <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tier) => {
                    const perConv = perConversationCop({
                      code: tier.code,
                      conversations: tier.conversations,
                      label: tier.label,
                      feeCents: tier.fee_cents,
                      isActive: tier.is_active,
                    });
                    return (
                      <tr key={tier.id} className="border-border-soft hover:bg-foreground/[0.03] border-b last:border-0">
                        <td className="px-4 py-3 tabular-nums">{tier.sort_order}</td>
                        <td className="px-4 py-3 font-mono text-xs">{tier.code}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {tier.conversations.toLocaleString("es-CO")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {tier.fee_cents === null ? (
                            <span className="text-muted-foreground">sin tarifa</span>
                          ) : (
                            formatMoney(tier.fee_cents)
                          )}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                          {perConv === null ? "—" : `$${perConv.toFixed(0)}`}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{tier.price_count}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              tier.is_active
                                ? "border-success/40 bg-success/10 text-success"
                                : "text-muted-foreground"
                            }
                          >
                            {tier.is_active ? "Activo" : "Retirado"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(tier)}>
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <PerConversationChart tiers={rows} />
        </div>
      )}

      <TierSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        tier={editing === "new" ? null : editing}
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
      />
    </div>
  );
}

/**
 * Pesos por conversación de cada tramo: es el descuento por volumen dicho sin
 * porcentajes. Una serie, sin leyenda; etiquetas directas sobre cada punto.
 */
function PerConversationChart({ tiers }: { tiers: BillingVolumeTier[] }) {
  const points = useMemo(
    () =>
      tiers
        .filter((tier) => tier.is_active && tier.fee_cents !== null)
        .map((tier) => ({ code: tier.code, label: tier.label, cop: (tier.fee_cents as number) / 100 / tier.conversations })),
    [tiers],
  );
  if (points.length < 2) return null;
  const W = 520;
  const H = 210;
  const L = 44;
  const R = 14;
  const T = 16;
  const B = 34;
  const iw = W - L - R;
  const ih = H - T - B;
  const max = Math.max(250, ...points.map((point) => point.cop)) * 1.05;
  const x = (index: number) => L + (iw * index) / (points.length - 1);
  const y = (value: number) => T + ih - (value / max) * ih;
  const ticks = [0, 50, 100, 150, 200, 250].filter((tick) => tick <= max);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.cop)}`).join(" ");

  return (
    <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <h2 className="text-[15px] font-semibold">Precio por conversación</h2>
      <p className="text-muted-foreground mt-0.5 text-xs">
        La tarifa del tramo dividida entre sus conversaciones. Baja con el volumen: así se explica el
        descuento sin mencionar porcentajes.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Pesos por conversación según tramo">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} className="stroke-foreground/10" strokeWidth={1} />
            <text x={L - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
              {tick}
            </text>
          </g>
        ))}
        <path d={`${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} className="fill-brand/10" />
        <path d={path} className="stroke-brand" fill="none" strokeWidth={2} strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.code}>
            <circle cx={x(index)} cy={y(point.cop)} r={3.5} className="fill-brand stroke-background" strokeWidth={2} />
            <text
              x={x(index)}
              y={y(point.cop) - 9}
              textAnchor="middle"
              className="fill-foreground font-mono text-[11px] font-semibold"
            >
              ${point.cop.toFixed(0)}
            </text>
            <text x={x(index)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function TierSheet({
  open,
  onOpenChange,
  tier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: BillingVolumeTier | null;
}) {
  const { showAlert } = useAlert();
  const create = useCreateVolumeTier();
  const update = useUpdateVolumeTier();
  const [code, setCode] = useState(tier?.code ?? "");
  const [conversations, setConversations] = useState(tier ? String(tier.conversations) : "");
  const [label, setLabel] = useState(tier?.label ?? "");
  const [sortOrder, setSortOrder] = useState(tier ? String(tier.sort_order) : "");
  const [fee, setFee] = useState(tier?.fee_cents == null ? "" : String(tier.fee_cents / 100));
  const [active, setActive] = useState(tier?.is_active ?? true);

  const feeCents = fee.trim() === "" ? null : parseMoneyToCents(fee);
  const conversationsN = Number(conversations);
  const sortN = Number(sortOrder);
  const ready =
    /^[a-z0-9_]{2,20}$/.test(code) &&
    Number.isInteger(conversationsN) &&
    conversationsN > 0 &&
    label.trim() !== "" &&
    Number.isInteger(sortN) &&
    (fee.trim() === "" || feeCents !== null);
  const conversationsLocked = tier !== null && tier.price_count > 0;

  async function submit() {
    try {
      if (tier === null) {
        await create.mutateAsync({
          code,
          conversations: conversationsN,
          label: label.trim(),
          sort_order: sortN,
          fee_cents: feeCents,
          is_active: active,
        });
        showAlert({
          tone: "success",
          title: "Tramo creado",
          description: "Todavía no se publica: deriva y publica sus celdas desde «Tarifas».",
          autoCloseMs: 7000,
        });
      } else {
        await update.mutateAsync({
          tierId: tier.id,
          body: {
            label: label.trim(),
            sort_order: sortN,
            fee_cents: feeCents,
            is_active: active,
            ...(conversationsLocked ? {} : { conversations: conversationsN }),
          },
        });
        showAlert({
          tone: "success",
          title: "Tramo actualizado",
          description:
            feeCents !== tier.fee_cents
              ? "La tarifa cambió pero las celdas publicadas no: deriva y publica una vigencia nueva."
              : "Cambios guardados.",
          autoCloseMs: 7000,
        });
      }
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={tier === null ? "Nuevo tramo" : `Editar ${tier.code}`}
      subtitle={tier === null ? "El código no se puede cambiar después: viaja en URLs publicadas." : undefined}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tier-code">Código *</Label>
            <Input
              id="tier-code"
              className="mt-1.5 font-mono"
              value={code}
              disabled={tier !== null}
              placeholder="t50000"
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tier-conv">Conversaciones / mes *</Label>
            <Input
              id="tier-conv"
              className="mt-1.5 tabular-nums"
              inputMode="numeric"
              value={conversations}
              disabled={conversationsLocked}
              onChange={(event) => setConversations(event.target.value)}
            />
            {conversationsLocked ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Ya tiene celdas: es la cuota que se le vendió a alguien y no se cambia.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="tier-label">Etiqueta pública *</Label>
            <Input id="tier-label" className="mt-1.5" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="tier-order">Orden *</Label>
            <Input
              id="tier-order"
              className="mt-1.5 tabular-nums"
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tier-fee">Tarifa mensual del tramo (COP)</Label>
            <Input
              id="tier-fee"
              className="mt-1.5 tabular-nums"
              inputMode="numeric"
              placeholder="99.900"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Componente del precio: termina en .900 para que la celda termine en .900. Cambiarla no publica.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="accent-brand size-4" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Activo en el catálogo público
        </label>

        <p className="text-muted-foreground border-warning/30 bg-warning/8 rounded-xl border p-3 text-xs leading-relaxed">
          La landing no publica cifra por encima de 25.000 conversaciones («A la medida»). Crear o
          activar un tramo no lo publica: hay que derivar sus celdas y publicar una vigencia.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || create.isPending || update.isPending} onClick={() => void submit()}>
            {tier === null ? "Crear tramo" : "Guardar"}
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}
