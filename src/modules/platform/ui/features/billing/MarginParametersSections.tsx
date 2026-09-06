"use client";

/**
 * Parámetros declarados de la consola de margen (Tanda C3), dentro de la
 * pestaña Parámetros: comisión de pasarela por método (D12), costos fijos por
 * capacidad con anulación por plan (D14/D15) y CAC declarado por periodo y
 * canal. Misma mecánica que la TRM: una versión se sucede, no se edita; el CAC
 * es la excepción (dato contable del periodo) y se corrige con auditoría.
 */
import { useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { gatewayFeeLabel, type BillingAcquisitionCost } from "../../../domain/billing";
import {
  useAcquisitionCostsQuery,
  useCapabilityCostsQuery,
  useDeclareAcquisitionCost,
  useGatewayFeesQuery,
  usePublishCapabilityCost,
  usePublishGatewayFee,
  usePublishPlanCostOverride,
  useUpdateAcquisitionCost,
} from "../../../infrastructure/api/hooks/use-catalog";
import { usePlansQuery } from "../../../infrastructure/api/hooks/use-plans";

const CARD = "border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]";
/** Códigos del catálogo de capacidades del servidor (solo sugerencias del datalist). */
const KNOWN_CAPABILITIES = ["core", "sales", "crm", "crm_ai", "scheduling", "marketing", "leads", "cmo", "analytics", "calls"];
const today = (): string => new Date().toISOString().slice(0, 10);
const atMidnightUtc = (day: string): string => new Date(`${day}T00:00:00Z`).toISOString();

function CurrentBadge({ current }: { current: boolean }) {
  return (
    <Badge variant="outline" className={current ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground"}>
      {current ? "Vigente" : "Cerrada"}
    </Badge>
  );
}

function Provisional({ source }: { source: string | null }) {
  if (source === null || !/sin confirmar|provisional|estimaci/i.test(source)) return null;
  return (
    <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
      provisional
    </Badge>
  );
}

export function MarginParametersSections() {
  return (
    <>
      <GatewayFeesSection />
      <CapabilityCostsSection />
      <AcquisitionCostsSection />
    </>
  );
}

/* ───────────────────────────── comisión de pasarela ───────────────────────────── */

function GatewayFeesSection() {
  const fees = useGatewayFeesQuery();
  const [open, setOpen] = useState(false);
  const rows = fees.data?.data ?? [];
  const current = rows.filter((row) => row.is_current);
  return (
    <section className={CARD}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">
            Comisión de pasarela <span className="text-muted-foreground font-mono text-[11px] font-normal">D12</span>
          </h2>
          <p className="text-muted-foreground mt-0.5 max-w-[60ch] text-xs leading-relaxed">
            Por proveedor y método: porcentaje + fijo + IVA sobre la comisión. La verja usa el peor método vigente; el
            simulador deja elegir.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Publicar comisión
        </Button>
      </header>
      {fees.isError ? (
        <p className="text-destructive mt-3 text-xs">{errorMessage(fees.error)}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-3 text-xs">
          Ninguna comisión declarada: la verja de margen no puede correr sin una vigente.
        </p>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-1.5 pr-2 font-medium">Método</th>
              <th className="py-1.5 pr-2 font-medium">Comisión</th>
              <th className="py-1.5 pr-2 font-medium">Desde</th>
              <th className="py-1.5 font-medium">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`border-b last:border-0 ${row.is_current ? "" : "text-muted-foreground"}`}>
                <td className="py-1.5 pr-2 font-mono">
                  {row.provider} · {row.method}
                </td>
                <td className="py-1.5 pr-2 tabular-nums">{gatewayFeeLabel(row)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatShortDate(row.effective_from)}</td>
                <td className="flex flex-wrap items-center gap-1.5 py-1.5">
                  <CurrentBadge current={row.is_current} />
                  <Provisional source={row.source} />
                  <span className="text-muted-foreground">{row.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {current.length > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Al confirmar el contrato: publica una versión nueva con la fuente «contrato». La anterior queda para las celdas que
          ya se evaluaron con ella.
        </p>
      ) : null}
      <GatewayFeeSheet open={open} onOpenChange={setOpen} key={open ? "open" : "closed"} />
    </section>
  );
}

function GatewayFeeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { showAlert } = useAlert();
  const publish = usePublishGatewayFee();
  const [provider, setProvider] = useState("wompi");
  const [method, setMethod] = useState("card");
  const [percent, setPercent] = useState("2,99");
  const [fixed, setFixed] = useState("600");
  const [vat, setVat] = useState("19");
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const toBps = (value: string): number => Math.round(Number(value.replace(",", ".")) * 100);
  const fixedCents = parseMoneyToCents(fixed);
  const ready =
    /^[a-z][a-z0-9_]{1,40}$/.test(provider) &&
    /^[a-z][a-z0-9_]{1,40}$/.test(method) &&
    Number.isFinite(toBps(percent)) &&
    fixedCents !== null &&
    Number.isFinite(toBps(vat)) &&
    source.trim().length >= 3;

  async function submit() {
    if (fixedCents === null) return;
    try {
      await publish.mutateAsync({
        provider,
        method,
        percent_bps: toBps(percent),
        fixed_cents: fixedCents,
        vat_bps: toBps(vat),
        effective_from: atMidnightUtc(effectiveFrom),
        source: source.trim(),
        note: note.trim() === "" ? null : note.trim(),
      });
      showAlert({ tone: "success", title: "Comisión publicada", description: `${provider} · ${method} rige desde el ${effectiveFrom}.`, autoCloseMs: 7000 });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo publicar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} size="md" title="Publicar comisión de pasarela" subtitle="Cierra la vigente del mismo método y abre otra.">
      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fee-provider">Proveedor *</Label>
            <Input id="fee-provider" className="mt-1.5 font-mono" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fee-method">Método (código) *</Label>
            <Input id="fee-method" className="mt-1.5 font-mono" placeholder="card · nequi · bancolombia_transfer" value={method} onChange={(e) => setMethod(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fee-percent">Porcentaje (%) *</Label>
            <Input id="fee-percent" className="mt-1.5 tabular-nums" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fee-fixed">Fijo por transacción (COP) *</Label>
            <Input id="fee-fixed" className="mt-1.5 tabular-nums" inputMode="numeric" value={fixed} onChange={(e) => setFixed(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fee-vat">IVA sobre la comisión (%) *</Label>
            <Input id="fee-vat" className="mt-1.5 tabular-nums" inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fee-from">Vigente desde *</Label>
            <Input id="fee-from" type="date" className="mt-1.5 tabular-nums" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="fee-source">Fuente *</Label>
          <Input id="fee-source" className="mt-1.5" placeholder="Contrato Wompi 2026-09" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fee-note">Nota</Label>
          <Input id="fee-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || publish.isPending} onClick={() => void submit()}>
            Publicar
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

/* ───────────────────────────── costos fijos por capacidad ───────────────────────────── */

function CapabilityCostsSection() {
  const costs = useCapabilityCostsQuery();
  const [open, setOpen] = useState<"cost" | "override" | null>(null);
  const capabilities = costs.data?.capabilities ?? [];
  const overrides = costs.data?.overrides ?? [];
  return (
    <section className={CARD}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">
            Costos fijos por capacidad <span className="text-muted-foreground font-mono text-[11px] font-normal">D14 · D15</span>
          </h2>
          <p className="text-muted-foreground mt-0.5 max-w-[60ch] text-xs leading-relaxed">
            USD por tenant y mes, enganchados a la capacidad; un plan puede anular la cifra. La dotación (Axel, leads,
            minutos) no va aquí: se costea con su cuota × tarifa vigente.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen("override")}>
            Anular por plan
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen("cost")}>
            Publicar costo
          </Button>
        </div>
      </header>
      {costs.isError ? (
        <p className="text-destructive mt-3 text-xs">{errorMessage(costs.error)}</p>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-1.5 pr-2 font-medium">Capacidad</th>
              <th className="py-1.5 pr-2 text-right font-medium">USD / mes</th>
              <th className="py-1.5 pr-2 font-medium">Desde</th>
              <th className="py-1.5 font-medium">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground py-2">
                  Ningún costo fijo declarado.
                </td>
              </tr>
            ) : null}
            {capabilities.map((row) => (
              <tr key={row.id} className={`border-b last:border-0 ${row.is_current ? "" : "text-muted-foreground"}`}>
                <td className="py-1.5 pr-2 font-mono">{row.capability}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{row.monthly_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatShortDate(row.effective_from)}</td>
                <td className="flex flex-wrap items-center gap-1.5 py-1.5">
                  <CurrentBadge current={row.is_current} />
                  <Provisional source={row.source} />
                  <span className="text-muted-foreground">{row.source}</span>
                </td>
              </tr>
            ))}
            {overrides.map((row) => (
              <tr key={row.id} className={`border-b last:border-0 ${row.is_current ? "" : "text-muted-foreground"}`}>
                <td className="py-1.5 pr-2 font-mono">
                  {row.capability} <span className="text-muted-foreground">· anulación {row.plan_code}</span>
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{row.monthly_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatShortDate(row.effective_from)}</td>
                <td className="flex flex-wrap items-center gap-1.5 py-1.5">
                  <CurrentBadge current={row.is_current} />
                  <span className="text-muted-foreground">{row.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-muted-foreground mt-3 text-xs">La capacidad se valida contra el catálogo del servidor: una que no exista no se guarda.</p>
      <CapabilityCostSheet mode={open} onClose={() => setOpen(null)} key={open ?? "closed"} />
    </section>
  );
}

function CapabilityCostSheet({ mode, onClose }: { mode: "cost" | "override" | null; onClose: () => void }) {
  const { showAlert } = useAlert();
  const publishCost = usePublishCapabilityCost();
  const publishOverride = usePublishPlanCostOverride();
  const plans = usePlansQuery();
  const [capability, setCapability] = useState("core");
  const [planId, setPlanId] = useState("");
  const [usd, setUsd] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const amount = Number(usd.replace(",", "."));
  const ready = capability.trim().length >= 2 && Number.isFinite(amount) && amount >= 0 && source.trim().length >= 3 && (mode !== "override" || planId !== "");
  // Sugerencias: el catálogo real lo valida el servidor (`CAPABILITY_CATALOG`); esto solo ahorra teclear.
  const knownCapabilities = KNOWN_CAPABILITIES;

  async function submit() {
    try {
      const base = { capability: capability.trim(), monthly_usd: amount, effective_from: atMidnightUtc(effectiveFrom), source: source.trim(), note: note.trim() === "" ? null : note.trim() };
      if (mode === "override") await publishOverride.mutateAsync({ ...base, plan_id: planId });
      else await publishCost.mutateAsync(base);
      showAlert({ tone: "success", title: mode === "override" ? "Anulación publicada" : "Costo fijo publicado", description: `${capability} pasa a ${amount} USD/mes desde el ${effectiveFrom}.`, autoCloseMs: 7000 });
      onClose();
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo publicar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet open={mode !== null} onOpenChange={(open) => !open && onClose()} size="md" title={mode === "override" ? "Anular costo fijo por plan" : "Publicar costo fijo"} subtitle="Una versión se sucede, no se edita.">
      <div className="flex flex-col gap-4 p-5">
        {mode === "override" ? (
          <div>
            <Label htmlFor="cc-plan">Plan *</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="cc-plan" className="mt-1.5 w-full">
                <SelectValue placeholder="Elige el plan" />
              </SelectTrigger>
              <SelectContent>
                {(plans.data?.data ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} · {plan.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="cc-capability">Capacidad *</Label>
          <Input id="cc-capability" className="mt-1.5 font-mono" list="cc-capabilities" value={capability} onChange={(e) => setCapability(e.target.value)} />
          <datalist id="cc-capabilities">
            {knownCapabilities.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cc-usd">USD por tenant y mes *</Label>
            <Input id="cc-usd" className="mt-1.5 tabular-nums" inputMode="decimal" placeholder="6.00" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cc-from">Vigente desde *</Label>
            <Input id="cc-from" type="date" className="mt-1.5 tabular-nums" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="cc-source">Fuente *</Label>
          <Input id="cc-source" className="mt-1.5" placeholder="Factura cloud ÷ tenants activos" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-note">Nota</Label>
          <Input id="cc-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!ready || publishCost.isPending || publishOverride.isPending} onClick={() => void submit()}>
            Publicar
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

/* ───────────────────────────── CAC declarado ───────────────────────────── */

function AcquisitionCostsSection() {
  const cac = useAcquisitionCostsQuery();
  const [declaring, setDeclaring] = useState(false);
  const [editing, setEditing] = useState<BillingAcquisitionCost | null>(null);
  const rows = cac.data?.data ?? [];
  const latestPeriod = rows[0]?.period_start;
  const latestTotal = rows.filter((row) => row.period_start === latestPeriod).reduce((sum, row) => sum + row.amount_cents, 0);
  return (
    <section className={CARD}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            CAC declarado por periodo
            <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
              declarado
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-0.5 max-w-[60ch] text-xs leading-relaxed">
            Anuncios, comisiones del Partner Club y horas de venta. No están en ninguna tabla de consumo: se declaran. La
            consola lo muestra aparte del margen, como meses de recuperación.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDeclaring(true)}>
          Declarar periodo
        </Button>
      </header>
      {cac.isError ? (
        <p className="text-destructive mt-3 text-xs">{errorMessage(cac.error)}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-3 text-xs">
          Ningún CAC declarado: el simulador no calculará meses de recuperación.
        </p>
      ) : (
        <>
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-1.5 pr-2 font-medium">Periodo</th>
                <th className="py-1.5 pr-2 font-medium">Canal</th>
                <th className="py-1.5 pr-2 text-right font-medium">Importe</th>
                <th className="py-1.5 pr-2 font-medium">Fuente</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 tabular-nums">
                    {formatShortDate(row.period_start)} – {formatShortDate(row.period_end)}
                  </td>
                  <td className="py-1.5 pr-2 font-mono">{row.channel}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(row.amount_cents, row.currency)}</td>
                  <td className="text-muted-foreground py-1.5 pr-2">{row.source}</td>
                  <td className="py-1.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                      Corregir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {latestPeriod ? (
            <p className="text-muted-foreground mt-3 text-xs">
              Último periodo declarado ({formatShortDate(latestPeriod)}): <b className="tabular-nums">{formatMoney(latestTotal)}</b> en total. El
              simulador lo divide entre las altas del periodo.
            </p>
          ) : null}
        </>
      )}
      <AcquisitionCostSheet open={declaring} onOpenChange={setDeclaring} key={declaring ? "open" : "closed"} />
      <AcquisitionEditSheet row={editing} onClose={() => setEditing(null)} key={editing?.id ?? "none"} />
    </section>
  );
}

function AcquisitionCostSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { showAlert } = useAlert();
  const declare = useDeclareAcquisitionCost();
  const [channel, setChannel] = useState("meta_ads");
  const [start, setStart] = useState(`${today().slice(0, 7)}-01`);
  const [end, setEnd] = useState(today());
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const cents = parseMoneyToCents(amount);
  const ready = channel.trim().length >= 2 && cents !== null && start !== "" && end > start && source.trim().length >= 3;

  async function submit() {
    if (cents === null) return;
    try {
      await declare.mutateAsync({
        channel: channel.trim(),
        period_start: atMidnightUtc(start),
        period_end: atMidnightUtc(end),
        amount_cents: cents,
        currency: "COP",
        source: source.trim(),
        note: note.trim() === "" ? null : note.trim(),
      });
      showAlert({ tone: "success", title: "CAC declarado", description: `${channel}: ${formatMoney(cents)} para el periodo desde el ${start}.`, autoCloseMs: 7000 });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo declarar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} size="md" title="Declarar CAC de un periodo" subtitle="Una fila por canal y periodo. Se corrige, no se duplica.">
      <div className="flex flex-col gap-4 p-5">
        <div>
          <Label htmlFor="cac-channel">Canal *</Label>
          <Input id="cac-channel" className="mt-1.5 font-mono" placeholder="meta_ads · partner_club · horas_venta" value={channel} onChange={(e) => setChannel(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cac-start">Desde *</Label>
            <Input id="cac-start" type="date" className="mt-1.5 tabular-nums" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cac-end">Hasta (exclusivo) *</Label>
            <Input id="cac-end" type="date" className="mt-1.5 tabular-nums" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="cac-amount">Importe (COP) *</Label>
          <Input id="cac-amount" className="mt-1.5 tabular-nums" inputMode="numeric" placeholder="1.400.000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cac-source">Fuente *</Label>
          <Input id="cac-source" className="mt-1.5" placeholder="Factura Meta septiembre" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cac-note">Nota</Label>
          <Input id="cac-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || declare.isPending} onClick={() => void submit()}>
            Declarar
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

function AcquisitionEditSheet({ row, onClose }: { row: BillingAcquisitionCost | null; onClose: () => void }) {
  const { showAlert } = useAlert();
  const update = useUpdateAcquisitionCost();
  const [amount, setAmount] = useState(row ? String(row.amount_cents / 100) : "");
  const [source, setSource] = useState(row?.source ?? "");
  const cents = parseMoneyToCents(amount);
  const ready = row !== null && cents !== null && source.trim().length >= 3;

  async function submit() {
    if (row === null || cents === null) return;
    try {
      await update.mutateAsync({ id: row.id, body: { amount_cents: cents, source: source.trim() } });
      showAlert({ tone: "success", title: "CAC corregido", description: `${row.channel}: ${formatMoney(cents)}.`, autoCloseMs: 6000 });
      onClose();
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo corregir", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet open={row !== null} onOpenChange={(open) => !open && onClose()} size="md" title="Corregir CAC declarado" subtitle={row ? `${row.channel} · desde ${formatShortDate(row.period_start)}` : undefined}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <Label htmlFor="cac-edit-amount">Importe (COP) *</Label>
          <Input id="cac-edit-amount" className="mt-1.5 tabular-nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cac-edit-source">Fuente *</Label>
          <Input id="cac-edit-source" className="mt-1.5" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!ready || update.isPending} onClick={() => void submit()}>
            Guardar corrección
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}
