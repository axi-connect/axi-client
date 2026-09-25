/**
 * KPIs de una corrida probe (F4; diseño premium F4) según la capacidad:
 * búsqueda (recall@k, MRR, cero resultados, falsas negaciones, p95),
 * reconocimiento (precision@1, hit@3, degradadas, fallidas, p95) e intención
 * (accuracy, LLM, sin señal, p95). La principal va en grande con su medidor
 * (umbrales 0,7 y 0,9); la isla «Siguiente paso» manda a los fallos del
 * dataset. El tono va en el punto, nunca en el texto (AA).
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  formatRate,
  formatRatio,
  parseProbeMetrics,
  type ProbeMetrics,
} from "../../../../../domain/quality-datasets";
import type { RunDetail } from "../../../../../domain/quality-runs";
import { formatLatency } from "../../../analytics/analytics-format";
import { BigFigure, InkPanel, Kicker, Meter, QualityTile, ToneDot, type QualityTone } from "../../shared/premium";
import { formatSpendUsd } from "../runs-format";

type Tile = { label: string; value: string; hint: string; tone?: QualityTone };

function ratioTone(value: number): QualityTone {
  if (value >= 0.9) return "success";
  if (value >= 0.7) return "warning";
  return "destructive";
}

function primary(metrics: ProbeMetrics): { label: string; value: number; hint: string } {
  if (metrics.probe_kind === "catalog_search") {
    return { label: `Recall@${metrics.k ?? "k"} · la consulta encuentra lo esperado entre los primeros`, value: metrics.recall_at_k, hint: `${metrics.hits} de ${metrics.items} consultas` };
  }
  if (metrics.probe_kind === "recognition") {
    return { label: "Precision@1 · el primer candidato es el producto correcto", value: metrics.precision_at_1, hint: `${metrics.hits} de ${metrics.items} fotos` };
  }
  return { label: "Accuracy · la intención detectada es la etiquetada", value: metrics.accuracy, hint: `${metrics.hits} de ${metrics.items} textos` };
}

function secondary(metrics: ProbeMetrics): Tile[] {
  if (metrics.probe_kind === "catalog_search") {
    return [
      { label: `MRR@${metrics.k ?? "k"}`, value: formatRatio(metrics.mrr_at_k), hint: "posición media del primer esperado" },
      { label: "Sin resultados", value: formatRate(metrics.zero_result_rate), hint: "consultas que devolvieron vacío", tone: metrics.zero_result_rate > 0.1 ? "warning" : undefined },
      { label: "Falsas negaciones", value: formatRate(metrics.false_denial_rate), hint: "vacías con un esperado real", tone: metrics.false_denial_rate > 0.05 ? "destructive" : undefined },
      { label: "Tiempo p95", value: formatLatency(metrics.p95_ms), hint: `p50 ${formatLatency(metrics.p50_ms)}` },
    ];
  }
  if (metrics.probe_kind === "recognition") {
    return [
      { label: "Hit@3", value: formatRatio(metrics.hit_at_3), hint: "esperado entre los 3 primeros" },
      { label: "Degradadas", value: formatRate(metrics.degraded_rate), hint: "sin embeddings (solo texto)", tone: metrics.degraded_rate > 0.1 ? "warning" : undefined },
      { label: "Fallidas", value: formatRate(metrics.failed_rate), hint: "visión o búsqueda con error", tone: metrics.failed_rate > 0 ? "warning" : undefined },
      { label: "Tiempo p95", value: formatLatency(metrics.p95_ms), hint: "visión + match" },
    ];
  }
  return [
    { label: "Decidió el LLM", value: formatRate(metrics.llm_share), hint: "el resto: heurística por palabras" },
    { label: "Sin señal", value: formatRate(metrics.none_rate), hint: "ni LLM ni heurística", tone: metrics.none_rate > 0.1 ? "warning" : undefined },
    { label: "Tiempo p95", value: formatLatency(metrics.p95_ms), hint: `p50 ${formatLatency(metrics.p50_ms)}` },
  ];
}

/** Qué mirar primero, con la cifra que ya trae el probe. */
function nextStep(metrics: ProbeMetrics): string {
  if (metrics.probe_kind === "catalog_search") {
    if (metrics.false_denial_rate > 0) {
      return `${formatRate(metrics.false_denial_rate)} de las consultas volvieron vacías aunque el producto existe: el agente habría dicho «no lo tenemos».`;
    }
    if (metrics.zero_result_rate > 0) return `${formatRate(metrics.zero_result_rate)} de las consultas no devolvieron nada. Revisa sinónimos y errores de tipeo.`;
    return "Revisa las consultas donde el esperado quedó fuera de los primeros resultados.";
  }
  if (metrics.probe_kind === "recognition") {
    const confident = metrics.calibration.find((row) => row.confidence === "high");
    if (confident && confident.misses > 0) {
      return `${confident.misses} ${confident.misses === 1 ? "foto falló" : "fotos fallaron"} con confianza alta: son las que más confunden al cliente.`;
    }
    return "Revisa las fotos sin acierto y los pares que el reconocedor confunde.";
  }
  return "Revisa los textos mal clasificados en la matriz de confusión.";
}

export function ProbeSummaryCards({ run }: { run: RunDetail }) {
  const metrics = parseProbeMetrics(run.metrics);
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <QualityTile label="Ítems" as="article">
          <BigFigure value={run.cases_passed + run.cases_failed} unit={`de ${run.cases_total}`} />
        </QualityTile>
        <QualityTile label="Aciertos" as="article">
          <BigFigure value={run.cases_passed} />
        </QualityTile>
        <QualityTile label="Fallos" as="article" aside={run.cases_failed > 0 ? <ToneDot tone="warning" className="size-2" /> : undefined}>
          <BigFigure value={run.cases_failed} />
        </QualityTile>
        <QualityTile label="Gasto de plataforma" as="article">
          <BigFigure value={formatSpendUsd(run.spend_usd)} />
        </QualityTile>
      </div>
    );
  }

  const main = primary(metrics);
  const misses = Math.max(0, metrics.items - metrics.hits);

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] min-[1400px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_300px]">
      <QualityTile label={main.label} as="article" className="p-6 lg:col-span-2 xl:col-span-1 xl:row-span-2">
        <BigFigure value={formatRatio(main.value)} unit={main.hint} size="xl" />
        <div className="mt-auto space-y-2 pt-4">
          <Meter value={main.value} marks={[0.7, 0.9]} tone={ratioTone(main.value) === "success" ? "default" : ratioTone(main.value) === "warning" ? "warning" : "destructive"} label={`${main.label}: ${formatRatio(main.value)}`} />
          <p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">umbral de alerta 0,70 · aprobado 0,90</span>
            <span className="whitespace-nowrap tabular-nums">
              {formatSpendUsd(run.spend_usd)}
              {metrics.canceled_reason === "spend_cap_exceeded" ? " · cortada por tope" : ""}
            </span>
          </p>
        </div>
      </QualityTile>

      {secondary(metrics).map((tile) => (
        <QualityTile key={tile.label} label={tile.label} as="article" aside={tile.tone ? <ToneDot tone={tile.tone} className="size-2" /> : undefined}>
          <BigFigure value={tile.value} size="md" />
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground">{tile.hint}</p>
        </QualityTile>
      ))}

      <InkPanel label="Siguiente paso" className="lg:col-span-2 xl:col-span-3 min-[1400px]:col-span-1 min-[1400px]:row-span-2 min-[1400px]:col-start-4 min-[1400px]:row-start-1">
        <Kicker>Siguiente paso</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
          {misses === 0 ? "Sin fallos" : `${misses} ${misses === 1 ? "fallo" : "fallos"} por revisar`}
        </p>
        <p className="text-sm leading-relaxed opacity-80">
          {misses === 0 ? "Todos los ítems etiquetados acertaron. Amplía el dataset con consultas nuevas." : nextStep(metrics)}
        </p>
        {run.dataset && misses > 0 && (
          <div className="mt-auto pt-2">
            <Button asChild variant="secondary">
              <Link href={`/platform/quality/datasets/${run.dataset.id}`} prefetch={false}>
                Revisar en el dataset
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
      </InkPanel>
    </div>
  );
}
