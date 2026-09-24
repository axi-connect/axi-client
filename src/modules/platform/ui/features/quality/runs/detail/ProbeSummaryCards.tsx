/**
 * KPIs de una corrida probe (F4) según la capacidad: búsqueda (recall@k,
 * MRR, cero resultados, falsas negaciones, p95), reconocimiento (precision@1,
 * hit@3, degradadas, fallidas, p95) e intención (accuracy, LLM, sin señal,
 * p95). Tonos: verde ≥ 0,9 · ámbar 0,7–0,9 · rojo < 0,7 para la principal.
 */
import { StatTile } from "../../../dashboard/StatTile";
import {
  formatRate,
  formatRatio,
  parseProbeMetrics,
  type ProbeMetrics,
} from "../../../../../domain/quality-datasets";
import type { RunDetail } from "../../../../../domain/quality-runs";
import { formatLatency } from "../../../analytics/analytics-format";
import { formatSpendUsd } from "../runs-format";

function ratioTone(value: number): "default" | "success" | "warning" | "destructive" {
  if (value >= 0.9) return "success";
  if (value >= 0.7) return "warning";
  return "destructive";
}

function tiles(metrics: ProbeMetrics) {
  if (metrics.probe_kind === "catalog_search") {
    return [
      { label: `Recall@${metrics.k ?? "k"}`, value: formatRatio(metrics.recall_at_k), hint: `${metrics.hits} de ${metrics.items} con algún esperado`, tone: ratioTone(metrics.recall_at_k) },
      { label: `MRR@${metrics.k ?? "k"}`, value: formatRatio(metrics.mrr_at_k), hint: "posición media del primer esperado" },
      { label: "Cero resultados", value: formatRate(metrics.zero_result_rate), hint: "consultas que devolvieron vacío", tone: metrics.zero_result_rate > 0.1 ? ("warning" as const) : ("default" as const) },
      { label: "Falsas negaciones", value: formatRate(metrics.false_denial_rate), hint: "con esperado y devolvió vacío", tone: metrics.false_denial_rate > 0.05 ? ("destructive" as const) : ("default" as const) },
      { label: "p95", value: formatLatency(metrics.p95_ms), hint: `p50 ${formatLatency(metrics.p50_ms)}` },
    ];
  }
  if (metrics.probe_kind === "recognition") {
    return [
      { label: "Precision@1", value: formatRatio(metrics.precision_at_1), hint: `${metrics.hits} de ${metrics.items} fotos`, tone: ratioTone(metrics.precision_at_1) },
      { label: "Hit@3", value: formatRatio(metrics.hit_at_3), hint: "esperado entre los 3 primeros" },
      { label: "Degradadas", value: formatRate(metrics.degraded_rate), hint: "sin embeddings (solo FTS)", tone: metrics.degraded_rate > 0.1 ? ("warning" as const) : ("default" as const) },
      { label: "Fallidas", value: formatRate(metrics.failed_rate), hint: "visión o búsqueda con error", tone: metrics.failed_rate > 0 ? ("warning" as const) : ("default" as const) },
      { label: "p95", value: formatLatency(metrics.p95_ms), hint: "visión + match" },
    ];
  }
  return [
    { label: "Accuracy", value: formatRatio(metrics.accuracy), hint: `${metrics.hits} de ${metrics.items} textos`, tone: ratioTone(metrics.accuracy) },
    { label: "Decidió el LLM", value: formatRate(metrics.llm_share), hint: "el resto: heurística por palabras" },
    { label: "Sin señal", value: formatRate(metrics.none_rate), hint: "ni LLM ni heurística", tone: metrics.none_rate > 0.1 ? ("warning" as const) : ("default" as const) },
    { label: "p95", value: formatLatency(metrics.p95_ms), hint: `p50 ${formatLatency(metrics.p50_ms)}` },
  ];
}

export function ProbeSummaryCards({ run }: { run: RunDetail }) {
  const metrics = parseProbeMetrics(run.metrics);
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Ítems" value={`${run.cases_passed + run.cases_failed}/${run.cases_total}`} />
        <StatTile label="Aciertos" value={run.cases_passed} />
        <StatTile label="Fallos" value={run.cases_failed} tone={run.cases_failed > 0 ? "warning" : "default"} />
        <StatTile label="Gasto plataforma" value={formatSpendUsd(run.spend_usd)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles(metrics).map((tile) => (
        <StatTile key={tile.label} label={tile.label} value={tile.value} hint={tile.hint} tone={tile.tone ?? "default"} />
      ))}
      <StatTile label="Gasto plataforma" value={formatSpendUsd(run.spend_usd)} hint={metrics.canceled_reason === "spend_cap_exceeded" ? "cortada por tope" : undefined} tone={metrics.canceled_reason ? "warning" : "default"} />
    </div>
  );
}
