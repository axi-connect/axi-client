"use client";

/**
 * Resultados por ítem de un probe (F4): tabla paginada en server con el
 * filtro «Solo fallos» por defecto, columnas según la capacidad, y —en
 * reconocimiento— la calibración por confianza y los pares confundidos.
 */
import { useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import BasicPagination from "@/shared/components/ui/pagination";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  formatRatio,
  parseIntentExpected,
  parseIntentInput,
  parseProbeMetrics,
  parseRecognitionExpected,
  parseRecognitionInput,
  parseSearchExpected,
  parseSearchInput,
  type ProbeItemResult,
} from "../../../../../domain/quality-datasets";
import type { RunDetail } from "../../../../../domain/quality-runs";
import { useProbeResultsQuery } from "../../../../../infrastructure/api/hooks/use-quality-runs";
import { ProblemAlert } from "../../../../components/ProblemAlert";

const PAGE_SIZE = 25;

type Returned = {
  items?: { product_id: string; sku: string; name: string }[];
  candidates?: { sku: string; name: string; score: number; confidence: string }[];
  intention_code?: string | null;
  unresolved_category?: string | null;
};

function returnedText(kind: string, returned: unknown): string {
  const rec = (returned ?? {}) as Returned;
  if (kind === "catalog_search") {
    const items = rec.items ?? [];
    if (rec.unresolved_category) return `∅ · categoría «${rec.unresolved_category}» no resuelta`;
    return items.length === 0 ? "∅" : items.map((item) => item.sku || item.name).join(" · ");
  }
  if (kind === "recognition") {
    const candidates = rec.candidates ?? [];
    return candidates.length === 0 ? "∅" : candidates.map((candidate) => `${candidate.sku} (${candidate.score.toFixed(2)})`).join(" · ");
  }
  return rec.intention_code ?? "∅";
}

function expectedText(kind: string, expected: unknown): string {
  if (kind === "catalog_search") {
    const parsed = parseSearchExpected(expected);
    if (!parsed) return "—";
    if (parsed.product_ids.length === 0) return "sin match válido";
    return parsed.labels?.map((label) => label.sku || label.name).join(", ") ?? `${parsed.product_ids.length} producto(s)`;
  }
  if (kind === "recognition") {
    const parsed = parseRecognitionExpected(expected);
    if (!parsed) return "—";
    return "no_match" in parsed ? "sin match" : parsed.sku;
  }
  return parseIntentExpected(expected)?.intention_code ?? "—";
}

function inputText(kind: string, input: unknown): string {
  if (kind === "catalog_search") return parseSearchInput(input)?.query ?? "—";
  if (kind === "intent") return parseIntentInput(input)?.text ?? "—";
  return parseRecognitionInput(input)?.caption ?? "foto";
}

function outcome(row: ProbeItemResult, kind: string): string {
  if (row.error) return row.error;
  if (row.hit) return kind === "catalog_search" && row.rank !== null && row.rank > 1 ? `esperado en posición ${row.rank}` : "ok";
  if (kind === "catalog_search") {
    const returned = (row.returned ?? {}) as Returned;
    if ((returned.items ?? []).length === 0) return "falsa negación · devolvió vacío";
    return "sin esperado en el top-k";
  }
  if (kind === "recognition") return row.confidence ? `falló con confianza ${row.confidence}` : "sin candidatos";
  return row.method ? `decidió ${row.method === "llm" ? "el LLM" : "la heurística"}` : "sin señal";
}

export function ProbeResultsPanel({ run }: { run: RunDetail }) {
  const [onlyMisses, setOnlyMisses] = useState<"misses" | "all">("misses");
  const [page, setPage] = useState(1);
  const kind = run.dataset?.kind ?? parseProbeMetrics(run.metrics)?.probe_kind ?? "catalog_search";
  const results = useProbeResultsQuery(run.id, { onlyMisses: onlyMisses === "misses", page, pageSize: PAGE_SIZE });
  const rows = results.data?.data ?? [];
  const total = results.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const metrics = parseProbeMetrics(run.metrics);

  return (
    <div className="space-y-4">
      <section className="min-w-0 space-y-3 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
          <h3 className="text-lg font-bold">Resultados por ítem</h3>
          <SegmentedControl
            value={onlyMisses}
            onValueChange={(value) => {
              setOnlyMisses(value);
              setPage(1);
            }}
            label="Filtro de resultados"
            size="sm"
            surface="inline"
            items={[
              { value: "misses" as const, label: "Solo fallos" },
              { value: "all" as const, label: "Todos" },
            ]}
          />
        </div>
        {results.isPending ? (
          <div className="px-5 pb-5">
            <TableSkeleton rows={4} />
          </div>
        ) : results.isError ? (
          <div className="px-5 pb-5">
            <ProblemAlert error={results.error} onRetry={() => void results.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            {onlyMisses === "misses" ? "Sin fallos: todos los ítems acertaron." : "Sin resultados (¿el dataset se eliminó?)."}
          </p>
        ) : (
          <div className={cn("overflow-x-auto", results.isPlaceholderData && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{kind === "catalog_search" ? "Consulta" : kind === "intent" ? "Texto" : "Foto"}</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>{kind === "catalog_search" ? "Devuelto (top-k)" : kind === "intent" ? "Predicho" : "Candidatos"}</TableHead>
                  {kind !== "intent" && <TableHead className="text-right">Rank</TableHead>}
                  <TableHead className="text-right">ms</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64">
                      {kind === "recognition" && row.image_url ? (
                        <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera */}
                          <img src={row.image_url} alt="" className="size-9 rounded-md object-cover" loading="lazy" />
                          <span className="truncate text-xs text-muted-foreground">{inputText(kind, row.input)}</span>
                        </span>
                      ) : (
                        <span className="block truncate">{inputText(kind, row.input)}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs">{expectedText(kind, row.expected)}</TableCell>
                    <TableCell className="max-w-64 truncate font-mono text-xs">{returnedText(kind, row.returned)}</TableCell>
                    {kind !== "intent" && (
                      <TableCell className="text-right tabular-nums">{row.rank ?? "—"}</TableCell>
                    )}
                    <TableCell className="text-right tabular-nums text-muted-foreground">{row.latency_ms}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        {row.hit ? (
                          <CircleCheck aria-hidden="true" className="size-3.5 text-success" />
                        ) : (
                          <CircleX aria-hidden="true" className="size-3.5 text-destructive" />
                        )}
                        {outcome(row, kind)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {total} {onlyMisses === "misses" ? (total === 1 ? "fallo" : "fallos") : total === 1 ? "ítem" : "ítems"}
            {metrics ? ` de ${metrics.items}` : ""} · cada fallo puede volver al dataset con la etiqueta corregida
          </span>
          <span className="flex items-center gap-3">
            {run.dataset && (
              <Link href={`/platform/quality/datasets/${run.dataset.id}`} prefetch={false} className="font-medium text-foreground underline-offset-4 hover:underline">
                Abrir el dataset
              </Link>
            )}
            {totalPages > 1 && <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />}
          </span>
        </div>
      </section>

      {metrics?.probe_kind === "recognition" && (
        <section className="grid min-w-0 gap-6 rounded-3xl border border-border bg-card p-5 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Calibración por confianza</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Confianza</TableHead>
                  <TableHead className="text-right">Aciertos</TableHead>
                  <TableHead className="text-right">Fallos</TableHead>
                  <TableHead className="text-right">top_score medio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.calibration.map((row) => (
                  <TableRow key={row.confidence}>
                    <TableCell>{row.confidence === "high" ? "alta" : row.confidence === "medium" ? "media" : row.confidence === "low" ? "baja" : "sin candidatos"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.hits}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", row.misses > 0 && row.confidence === "high" && "text-destructive")}>{row.misses}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(row.mean_top_score)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Pares confundidos</h4>
            {metrics.confused_pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguno.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {metrics.confused_pairs.map((pair) => (
                  <li key={`${pair.expected_sku}-${pair.got_sku}`} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      {pair.expected_sku} → {pair.got_sku}
                    </span>
                    <span className="tabular-nums text-muted-foreground">×{pair.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {metrics?.probe_kind === "intent" && metrics.confusion.length > 0 && (
        <section className="min-w-0 space-y-2 rounded-3xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold">Matriz de confusión</h4>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {metrics.confusion.map((row) => (
              <li key={`${row.expected}-${row.predicted}`} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">
                  {row.expected} → {row.predicted}
                </span>
                <span className="tabular-nums text-muted-foreground">×{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
