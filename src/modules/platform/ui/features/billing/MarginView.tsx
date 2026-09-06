"use client";

/**
 * Consola de margen (`/platform/billing/margin`, Tanda C3): lo que cuesta de
 * verdad una conversación y cuánto margen deja una celda.
 *
 * Tres bloques, todos con su origen escrito: la MUESTRA real por segmento
 * (p50/p75/p90 y desglose por métrica), lo que ningún segmento ve (sin
 * atribuir, sin tarifa, comodín, QA, adquisición de axi) y el SIMULADOR de una
 * celda (COGS con banda p50–p90, comisión declarada, costos fijos, margen real
 * y contable, sensibilidad a la TRM, semáforo del bono y meses de CAC).
 *
 * Aquí no se publica nada: publicar es en Tarifas y pasa por la misma verja
 * (`dry_run` en la hoja de publicación). Ninguna cifra se calcula en el cliente.
 */
import { useMemo, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { gatewayFeeLabel } from "../../../domain/billing";
import {
  BASIS_LABELS,
  GATE_CHECK_LABELS,
  SCOPE_LABELS,
  SEGMENT_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  confidenceLabel,
  formatPct,
  formatUsd,
  metricLabel,
  usdToCopCents,
  type MarginSample,
  type MarginSegment,
  type MarginSimulation,
  type SimulateMarginDTO,
} from "../../../domain/margin";
import { useVolumeTiersQuery } from "../../../infrastructure/api/hooks/use-catalog";
import { useMarginSampleQuery, useSimulateMargin } from "../../../infrastructure/api/hooks/use-margin";
import { usePlansQuery } from "../../../infrastructure/api/hooks/use-plans";
import { ProblemAlert } from "../../components/ProblemAlert";

type WindowDays = "7" | "30" | "90";

const CARD = "border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]";

export function MarginView() {
  const [windowDays, setWindowDays] = useState<WindowDays>("30");
  const [planCode, setPlanCode] = useState<string>("all");
  const plans = usePlansQuery();
  const sample = useMarginSampleQuery({
    windowDays: Number(windowDays),
    planCode: planCode === "all" ? undefined : planCode,
  });
  const packages = useMemo(
    () => (plans.data?.data ?? []).filter((plan) => plan.kind === "package" && plan.public_slug !== null),
    [plans.data],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Consola de margen</p>
          <h1 className="text-3xl font-semibold tracking-tight">Margen</h1>
          <p className="text-muted-foreground max-w-[72ch] text-sm">
            Lo que cuesta una conversación, medido sobre los eventos de consumo de todos los tenants, y cuánto
            margen deja cada celda. Cada cifra dice de dónde sale:{" "}
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success align-middle">
              medido
            </Badge>{" "}
            o{" "}
            <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet align-middle">
              declarado
            </Badge>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Ventana"
            value={windowDays}
            onValueChange={setWindowDays}
            items={[
              { value: "7", label: "7 días" },
              { value: "30", label: "30 días" },
              { value: "90", label: "90 días" },
            ]}
          />
          <Select value={planCode} onValueChange={setPlanCode}>
            <SelectTrigger aria-label="Plan de la muestra" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tenants</SelectItem>
              {packages.map((plan) => (
                <SelectItem key={plan.id} value={plan.code}>
                  Suscritos a {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {sample.isError ? (
        <ProblemAlert error={sample.error} onRetry={() => void sample.refetch()} className="mx-auto max-w-xl" />
      ) : sample.data === undefined ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          <SampleSection data={sample.data} />
          <UnseenSection data={sample.data} />
          <Simulator parameters={sample.data.parameters} packages={packages} />
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── muestra por segmento ───────────────────────────── */

function SampleSection({ data }: { data: MarginSample }) {
  const { sample, parameters, cached_at } = data;
  const [segment, setSegment] = useState<MarginSegment["segment"]>("text");
  const trm = parameters.trm_cop_per_usd;
  const shown = sample.segments.find((row) => row.segment === segment) ?? sample.segments[0];

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Muestra: <b className="text-foreground tabular-nums">{sample.conversations.toLocaleString("es-CO")}</b> conversaciones ·
        del {new Date(sample.window.from).toLocaleDateString("es-CO")} al {new Date(sample.window.to).toLocaleDateString("es-CO")} ·
        TRM declarada <b className="text-foreground tabular-nums">{trm.toLocaleString("es-CO")}</b> · sin eventos de QA · calculada{" "}
        {new Date(cached_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {parameters.missing.length > 0 ? (
        <p className="text-warning border-warning/40 bg-warning/8 rounded-xl border p-3 text-xs">
          Faltan parámetros declarados vigentes: {parameters.missing.join(", ")}. La verja de publicación no correrá
          hasta que existan (Parámetros).
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {sample.segments.map((row) => (
          <SegmentCard key={row.segment} row={row} trm={trm} />
        ))}
        <CallsCard calls={sample.calls} trm={trm} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className={CARD}>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Qué encarece · desglose por métrica</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">Costo real medio por conversación del segmento. La barra es la parte de cada métrica.</p>
            </div>
            <SegmentedControl
              label="Segmento"
              value={segment}
              onValueChange={setSegment}
              items={sample.segments.map((row) => ({ value: row.segment, label: SEGMENT_LABELS[row.segment] }))}
            />
          </header>
          {shown === undefined || shown.by_metric.length === 0 ? (
            <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-3 text-xs">
              Sin eventos en este segmento para la ventana.
            </p>
          ) : (
            <MetricTable rows={shown.by_metric} />
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Fuera de COGS y aparte: plantillas de Meta de las campañas de axi como cliente cero ={" "}
            <b className="tabular-nums">{formatUsd(sample.acquisition_measured.template_sent_usd)}</b>, leads ={" "}
            <b className="tabular-nums">{formatUsd(sample.acquisition_measured.lead_usd)}</b> (adquisición medida). QA y operación ={" "}
            <b className="tabular-nums">{formatUsd(sample.operations_usd)}</b>, en su propia línea.
          </p>
        </div>

        <div className={CARD}>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            Modelo declarado (respaldo)
            <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
              declarado
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">Lo que la verja usa cuando un segmento no llega a 30 unidades. Se edita en Parámetros.</p>
          <dl className="mt-3 divide-y text-xs">
            <Stat label="Tokens de entrada por conversación" value={parameters.declared.mix.tokens_in_per_conversation.toLocaleString("es-CO")} />
            <Stat label="Parte leída de caché" value={formatPct(parameters.declared.mix.cache_share, 0)} />
            <Stat label="Tokens de salida por conversación" value={parameters.declared.mix.tokens_out_per_conversation.toLocaleString("es-CO")} />
            <Stat label="Notas de voz por conversación" value={parameters.declared.mix.voice_notes_per_conversation.toLocaleString("es-CO", { maximumFractionDigits: 3 })} />
            <Stat label="Minutos por llamada" value={parameters.declared.mix.minutes_per_call.toLocaleString("es-CO")} />
            <Stat label="Llamadas por 100 conversaciones" value={parameters.declared.mix.calls_per_100_conversations.toLocaleString("es-CO")} />
            <Stat label="Costo declarado · conversación" value={formatUsd(parameters.declared.unit_conversation_usd)} />
            <Stat label="Costo declarado · llamada" value={formatUsd(parameters.declared.unit_call_usd)} />
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">
            Tarifas: la fila <span className="font-mono">is_default</span> vigente de {parameters.declared.rates_provider} (chat), ElevenLabs
            (voz) y Twilio (llamadas). El modelo declarado no se actualiza solo: es una decisión.
          </p>
        </div>
      </div>
    </section>
  );
}

function SegmentCard({ row, trm }: { row: MarginSegment; trm: number }) {
  const low = confidenceLabel(row.confidence, row.sample_size);
  return (
    <div className={CARD}>
      <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
        {SEGMENT_LABELS[row.segment]}
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
          medido
        </Badge>
        {low ? (
          <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
            {low}
          </Badge>
        ) : null}
      </h2>
      <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
        {row.sample_size.toLocaleString("es-CO")} conversaciones · {formatPct(row.share, 0)} de la muestra
      </p>
      <Percentiles p50={row.p50_usd} p75={row.p75_usd} p90={row.p90_usd} trm={trm} />
      <dl className="mt-3 divide-y text-xs">
        <Stat label="Costo contable p50 (con margin_multiplier)" value={formatUsd(row.accounting_p50_usd)} />
        <Stat label="Media" value={formatUsd(row.mean_usd)} />
      </dl>
    </div>
  );
}

function CallsCard({ calls, trm }: { calls: MarginSample["sample"]["calls"]; trm: number }) {
  const low = confidenceLabel(calls.confidence, calls.sessions);
  return (
    <div className={CARD}>
      <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
        Llamadas
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
          medido
        </Badge>
        {low ? (
          <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
            {low}
          </Badge>
        ) : null}
      </h2>
      <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
        {calls.sessions.toLocaleString("es-CO")} llamadas · {calls.calls_per_100_conversations.toLocaleString("es-CO", { maximumFractionDigits: 1 })} por cada 100
        conversaciones · {Math.round(calls.mean_seconds / 60)} min de media
      </p>
      <Percentiles p50={calls.p50_usd} p75={calls.p75_usd} p90={calls.p90_usd} trm={trm} />
      {calls.prorated_voice_turn_usd > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Incluye <b className="tabular-nums">{formatUsd(calls.prorated_voice_turn_usd)}</b> por llamada de turnos LLM históricos sin sesión,
          <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning ml-1">
            prorrateado
          </Badge>
        </p>
      ) : null}
      {low ? (
        <p className="text-muted-foreground mt-3 text-xs">Por debajo de 30 llamadas el percentil no es firme: la verja usa el declarado para este segmento.</p>
      ) : null}
    </div>
  );
}

function Percentiles({ p50, p75, p90, trm }: { p50: number; p75: number; p90: number; trm: number }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[
        ["p50", p50],
        ["p75", p75],
        ["p90", p90],
      ].map(([label, value]) => (
        <div key={label as string} className="bg-secondary rounded-xl px-3 py-2">
          <span className="text-muted-foreground block text-[10.5px] font-medium tracking-[0.06em] uppercase">{label}</span>
          <span className="block text-lg font-semibold tabular-nums">{formatUsd(value as number)}</span>
          <span className="text-muted-foreground block text-[11px] tabular-nums">{formatMoney(usdToCopCents(value as number, trm))}</span>
        </div>
      ))}
    </div>
  );
}

function MetricTable({ rows }: { rows: MarginSegment["by_metric"] }) {
  const total = rows.reduce((sum, row) => sum + row.real_usd_per_unit, 0);
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="py-1.5 pr-2 font-medium">Métrica</th>
            <th className="py-1.5 pr-2 text-right font-medium">Cantidad</th>
            <th className="py-1.5 pr-2 text-right font-medium">Real</th>
            <th className="py-1.5 pr-2 text-right font-medium">Contable</th>
            <th className="w-[30%] py-1.5 font-medium">Parte</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-b last:border-0">
              <td className="py-1.5 pr-2">{metricLabel(row.metric)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{row.quantity_per_unit.toLocaleString("es-CO", { maximumFractionDigits: 1 })}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{row.real_usd_per_unit === 0 ? "—" : formatUsd(row.real_usd_per_unit)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{row.accounting_usd_per_unit === 0 ? "—" : formatUsd(row.accounting_usd_per_unit)}</td>
              <td className="py-1.5">
                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                  <div className="bg-accent-violet h-2 rounded-full" style={{ width: `${total === 0 ? 0 : (row.real_usd_per_unit / total) * 100}%` }} />
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-1.5 pr-2 font-semibold">Total conversación</td>
            <td />
            <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{formatUsd(total)}</td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{formatUsd(rows.reduce((sum, row) => sum + row.accounting_usd_per_unit, 0))}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────────── lo que ningún segmento ve ───────────────────────────── */

function UnseenSection({ data }: { data: MarginSample }) {
  const { sample } = data;
  return (
    <section className={CARD}>
      <h2 className="text-[15px] font-semibold">Dinero que ningún segmento ve · sin atribuir</h2>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Eventos sin conversación ni sesión de llamada, por propósito. Nunca desaparecen: se listan para que el COGS de arriba no
        parezca completo cuando no lo es.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-1.5 pr-2 font-medium">Propósito</th>
              <th className="py-1.5 pr-2 text-right font-medium">Eventos</th>
              <th className="py-1.5 text-right font-medium">Real USD</th>
            </tr>
          </thead>
          <tbody>
            {sample.unattributed.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground py-2">
                  Nada sin atribuir en la ventana.
                </td>
              </tr>
            ) : (
              sample.unattributed.map((row) => (
                <tr key={row.purpose} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 font-mono">{row.purpose}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{row.events.toLocaleString("es-CO")}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatUsd(row.real_usd)}</td>
                </tr>
              ))
            )}
            <tr className="border-t">
              <td className="py-1.5 pr-2">
                Sin tarifa vigente <span className="text-muted-foreground font-mono">unpriced_events</span>
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{sample.unpriced_events.toLocaleString("es-CO")}</td>
              <td className="py-1.5 text-right">—</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2">
                Tarifado con comodín <span className="text-muted-foreground font-mono">wildcard_share</span>
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatPct(sample.wildcard_share)}</td>
              <td className="text-muted-foreground py-1.5 text-right text-[11px]">la tarifa del comodín es ~13× la del modelo default</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ───────────────────────────── simulador ───────────────────────────── */

type PackageOption = { id: string; code: string; name: string };

function Simulator({ parameters, packages }: { parameters: MarginSample["parameters"]; packages: PackageOption[] }) {
  const tiers = useVolumeTiersQuery();
  const simulate = useSimulateMargin();
  const [planId, setPlanId] = useState<string>(packages[0]?.id ?? "");
  const [volume, setVolume] = useState<string>("tier:t5000");
  const [conversations, setConversations] = useState("5000");
  const [interval, setInterval_] = useState<"monthly" | "annual">("monthly");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState<"auto" | "none">("auto");
  const [gateway, setGateway] = useState<string>("worst");
  const [trm, setTrm] = useState("");
  const activeTiers = (tiers.data?.data ?? []).filter((tier) => tier.is_active).sort((a, b) => a.sort_order - b.sort_order);

  const ready = planId !== "" && (volume !== "free" || Number(conversations) > 0);

  function run() {
    const chosenGateway = parameters.gateways.find((g) => `${g.provider}:${g.method}` === gateway);
    const body: SimulateMarginDTO = {
      plan_id: planId,
      volume_tier_code: volume.startsWith("tier:") ? volume.slice(5) : null,
      conversations: volume === "free" ? Number(conversations) : null,
      interval,
      price_cents: parseMoneyToCents(price),
      promotion_code: promo === "auto" ? "auto" : null,
      gateway: chosenGateway ? { provider: chosenGateway.provider, method: chosenGateway.method } : null,
      trm_cop_per_usd: trm.trim() === "" ? null : Number(trm.replace(/\./g, "").replace(",", ".")),
      mix_override: null,
      window_days: 30,
    };
    simulate.mutate(body);
  }

  return (
    <section className={CARD}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Simulador · margen de una celda</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Solo lectura: aquí no se publica nada. Publicar es en Tarifas y pasa por esta misma verja.
          </p>
        </div>
        <Button disabled={!ready || simulate.isPending} onClick={run}>
          Calcular
        </Button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label htmlFor="sim-plan">Paquete</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger id="sim-plan" className="mt-1.5 w-full">
              <SelectValue placeholder="Elige un paquete" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sim-volume">Volumen</Label>
          <Select value={volume} onValueChange={setVolume}>
            <SelectTrigger id="sim-volume" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeTiers.map((tier) => (
                <SelectItem key={tier.code} value={`tier:${tier.code}`}>
                  Tramo {tier.label}
                </SelectItem>
              ))}
              <SelectItem value="free">Volumen libre…</SelectItem>
            </SelectContent>
          </Select>
          {volume === "free" ? (
            <Input
              aria-label="Conversaciones al mes"
              className="mt-1.5 tabular-nums"
              inputMode="numeric"
              value={conversations}
              onChange={(event) => setConversations(event.target.value)}
            />
          ) : null}
        </div>
        <div>
          <Label htmlFor="sim-interval">Periodicidad</Label>
          <Select value={interval} onValueChange={(next) => setInterval_(next as "monthly" | "annual")}>
            <SelectTrigger id="sim-interval" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="annual">Anual · ×11</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sim-price">Precio mensual propuesto (COP)</Label>
          <Input
            id="sim-price"
            className="mt-1.5 tabular-nums"
            inputMode="numeric"
            placeholder="vacío = la celda publicada"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sim-promo">Promoción</Label>
          <Select value={promo} onValueChange={(next) => setPromo(next as "auto" | "none")}>
            <SelectTrigger id="sim-promo" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguna (lista)</SelectItem>
              <SelectItem value="auto">La promoción pública abierta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sim-gateway">Método de pago (comisión)</Label>
          <Select value={gateway} onValueChange={setGateway}>
            <SelectTrigger id="sim-gateway" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worst">
                Peor caso{parameters.gateway ? ` · ${parameters.gateway.provider} ${parameters.gateway.method}` : ""}
              </SelectItem>
              {parameters.gateways.map((g) => (
                <SelectItem key={`${g.provider}:${g.method}`} value={`${g.provider}:${g.method}`}>
                  {g.provider} · {g.method} · {gatewayFeeLabel(g.fee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sim-trm">TRM</Label>
          <Input
            id="sim-trm"
            className="mt-1.5 tabular-nums"
            inputMode="decimal"
            placeholder={`declarada ${parameters.trm_cop_per_usd.toLocaleString("es-CO")}`}
            value={trm}
            onChange={(event) => setTrm(event.target.value)}
          />
        </div>
      </div>

      {simulate.isError ? (
        <p className="text-destructive border-destructive/40 bg-destructive/8 mt-4 rounded-xl border p-3 text-xs">{errorMessage(simulate.error)}</p>
      ) : null}
      {simulate.data ? <SimulationResult result={simulate.data} /> : null}
    </section>
  );
}

function SimulationResult({ result }: { result: MarginSimulation }) {
  const r = result.result;
  const trm = result.trm_cop_per_usd;
  const cogsP50Usd = r.cogs_p50_cents / 100 / trm;
  const cogsP90Usd = r.cogs_p90_cents / 100 / trm;
  const basisBadge =
    result.basis === "measured" ? "border-success/40 bg-success/10 text-success" : "border-accent-violet/40 bg-accent-violet/10 text-accent-violet";
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <dl className="divide-y text-xs">
        <Stat label={`Precio ${result.interval === "annual" ? "anual (×11)" : "mensual"} de lista`} value={formatMoney(result.price.period_list_cents)} />
        {result.price.period_promo_cents !== null ? (
          <Stat label={`Con ${result.price.promotion_code ?? "promoción"}`} value={formatMoney(result.price.period_promo_cents)} />
        ) : null}
        <Stat label={`− Comisión (${result.gateway.provider} ${result.gateway.method})`} value={`− ${formatMoney(r.fee_cents)}`} />
        <Stat
          label={
            <>
              COGS conversaciones · p50{" "}
              <Badge variant="outline" className={basisBadge}>
                {BASIS_LABELS[result.basis]}
              </Badge>
            </>
          }
          value={`${formatUsd(cogsP50Usd)} → ${formatMoney(r.cogs_p50_cents)}`}
        />
        <Stat label="COGS · p90 (el percentil malo)" value={`${formatUsd(cogsP90Usd)} → ${formatMoney(r.cogs_p90_cents)}`} />
        <Stat
          label={
            <>
              Costos fijos por capacidad{" "}
              <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
                declarado
              </Badge>
            </>
          }
          value={`${formatUsd(result.fixed_usd_per_month)} / mes`}
        />
        <Stat label={<b>Margen bruto real · p50</b>} value={<b className={r.margin_real_p50 >= 0.7 ? "text-success" : r.margin_real_p50 > 0 ? "text-warning" : "text-destructive"}>{formatPct(r.margin_real_p50)}</b>} />
        <Stat label="Margen bruto real · p90" value={<span className={r.margin_real_p90 > 0 ? "" : "text-destructive"}>{formatPct(r.margin_real_p90)}</span>} />
        {r.margin_promo_p50 !== null ? <Stat label="Margen con promoción · p50" value={formatPct(r.margin_promo_p50)} /> : null}
        <Stat label="Margen bruto contable · p50" value={formatPct(result.accounting_margin_p50)} />
        <Stat label="Contribución del periodo" value={formatMoney(r.contribution_cents)} />
        <Stat
          label="Tope de gasto de la celda (50 % del precio a la TRM)"
          value={`${formatUsd(r.quota_cap.cap_usd)} · cuota a p50: ${formatPct(r.quota_cap.used_share_p50, 0)} (máx. ${formatPct(r.quota_cap.allowed_share, 0)})`}
        />
        <Stat label="Muestra usada" value={`${result.sample_size.toLocaleString("es-CO")} conversaciones · ${SCOPE_LABELS[result.sample_scope]}`} />
      </dl>

      <div className="flex flex-col gap-4">
        <div className={`flex items-start gap-3 rounded-xl border p-3 ${STATUS_CLASSES[r.status]}`}>
          <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-current" />
          <div className="text-xs">
            <b className="block text-[13px]">{STATUS_LABELS[r.status]}</b>
            {r.status === "ok"
              ? "Margen de lista sobre el umbral del bono y a p90 la celda no pierde."
              : r.status === "bonus_only"
                ? "Bajo el umbral: el canal se paga con bono y no con recurrente (estrategia Q4)."
                : "A p90 (o a p50) la celda pierde dinero: no se puede publicar así."}
          </div>
        </div>

        {r.failures.length > 0 || r.warnings.length > 0 ? (
          <ul className="flex flex-col gap-2 text-xs">
            {r.failures.map((failure, index) => (
              <li key={`f-${index}`} className="border-destructive/40 bg-destructive/8 text-destructive rounded-xl border p-2.5">
                <b className="block font-mono text-[11px]">{GATE_CHECK_LABELS[failure.check] ?? failure.check}</b>
                {failure.detail}
              </li>
            ))}
            {r.warnings.map((warning, index) => (
              <li key={`w-${index}`} className="border-warning/40 bg-warning/8 text-warning rounded-xl border p-2.5">
                <b className="block font-mono text-[11px]">{GATE_CHECK_LABELS[warning.check] ?? warning.check}</b>
                {warning.detail}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-success border-success/40 bg-success/10 rounded-xl border p-2.5 text-xs">La verja de margen pasa con esta base.</p>
        )}

        <div>
          <h3 className="text-[13px] font-semibold">Sensibilidad a la TRM</h3>
          <p className="text-muted-foreground text-xs">Un precio que solo aguanta a una TRM no está aprobado, está apostado.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {result.trm_sensitivity.map((scenario) => (
              <div key={scenario.trm_cop_per_usd} className={`rounded-xl border p-2.5 text-center ${scenario.delta_pct === 0 ? "border-brand/50 bg-accent" : "border-border-soft"}`}>
                <span className="text-muted-foreground block text-[10.5px] font-medium">
                  {scenario.delta_pct === 0 ? "Declarada" : `${scenario.delta_pct > 0 ? "+" : ""}${scenario.delta_pct} %`} · {scenario.trm_cop_per_usd.toLocaleString("es-CO")}
                </span>
                <span className={`block text-lg font-semibold tabular-nums ${scenario.margin_p50 >= 0.7 ? "text-success" : scenario.margin_p50 > 0 ? "text-warning" : "text-destructive"}`}>
                  {formatPct(scenario.margin_p50)}
                </span>
                <span className="text-muted-foreground block text-[11px] tabular-nums">p90: {formatPct(scenario.margin_p90)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold">
            Recuperación del CAC
            <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
              declarado
            </Badge>
          </h3>
          {result.cac === null ? (
            <p className="text-muted-foreground text-xs">Sin CAC declarado todavía: decláralo por periodo en Parámetros.</p>
          ) : (
            <dl className="divide-y text-xs">
              <Stat
                label={`CAC ${result.cac.period} (declarado ÷ ${result.cac.new_clients} activaciones · ${result.cac.signups} altas)`}
                value={`${formatMoney(result.cac.per_client_cents)} por cliente`}
              />
              <Stat
                label="Meses para recuperar con esta celda"
                value={result.cac.recovery_months === null ? "no contribuye" : `${result.cac.recovery_months.toLocaleString("es-CO")} meses`}
              />
            </dl>
          )}
          <p className="text-muted-foreground mt-1 text-xs">El CAC no se resta del margen bruto: se decide aparte (comisión de canal = CAC, no COGS).</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground flex items-center gap-1.5">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
