/**
 * Dominio de los datasets etiquetados (golden sets) y las corridas probe
 * (upgrade quality F4). TypeScript PURO: tipos del contrato generado,
 * etiquetas en español, parseo defensivo de `input`/`suggested`/`expected`
 * (Json por kind) y las reglas espejo de los DTOs.
 */
import type { Schemas } from "@/core/api/types";

export type Dataset = Schemas["QualityDatasetDto"];
export type DatasetListItem = Schemas["QualityDatasetsPageDto"]["data"][number];
export type DatasetItem = Schemas["QualityDatasetItemsPageDto"]["data"][number];
export type CreateDatasetDTO = Schemas["CreateQualityDatasetDto"];
export type UpdateDatasetDTO = Schemas["UpdateQualityDatasetDto"];
export type ImportDatasetDTO = Schemas["ImportQualityDatasetDto"];
export type LabelDatasetItemDTO = Schemas["LabelQualityDatasetItemDto"];
export type AddDatasetItemDTO = Schemas["AddQualityDatasetItemDto"];
export type ProbeItemResult = Schemas["QualityProbeResultsPageDto"]["data"][number];
export type TenantCatalogProduct = Schemas["QualityTenantCatalogSearchDto"]["data"][number];
export type TenantIntention = Schemas["QualityTenantIntentionsDto"]["data"][number];

export type DatasetKind = Dataset["kind"];
export type LabelStatus = DatasetItem["label_status"];

// ─── Límites del contrato (DTOs zod del backend) ────────────────────────────

export const DATASET_NAME_MIN = 2;
export const DATASET_NAME_MAX = 120;
export const IMPORT_DAYS_MAX = 90;
export const IMPORT_LIMIT_MAX = 300;
export const DEFAULT_IMPORT_DAYS = 30;
export const DEFAULT_IMPORT_LIMIT = 200;
export const PROBE_MAX_ITEMS = 300;
export const PROBE_DEFAULT_K = 8;
export const PROBE_K_MAX = 20;
export const PROBE_SPEND_CAP_MAX = 500;
export const DEFAULT_PROBE_SPEND_CAP_USD = 2;

export const DATASET_KINDS: readonly DatasetKind[] = ["catalog_search", "recognition", "intent"];

export const DATASET_KIND_LABELS: Record<DatasetKind, string> = {
  catalog_search: "Búsqueda de catálogo",
  recognition: "Reconocimiento por imagen",
  intent: "Intención",
};

export const DATASET_KIND_HINTS: Record<DatasetKind, string> = {
  catalog_search: "Consultas reales de catalog_lookup y los productos que deberían salir en el top-k.",
  recognition: "Fotos reales de clientes (producto o captura) y el SKU que son. Sin comprobantes ni documentos.",
  intent: "Primer mensaje del cliente y la intención correcta. La PII se enmascara al importar.",
};

export const LABEL_STATUS_LABELS: Record<LabelStatus, string> = {
  unlabeled: "Sin etiqueta",
  labeled: "Etiquetada",
  disputed: "Disputada",
  skipped: "Omitida",
};

/** Los probes de reconocimiento e intención pagan LLM por ítem: tope obligatorio. */
export function probePaysLlm(kind: DatasetKind): boolean {
  return kind !== "catalog_search";
}

// ─── input / suggested / expected por kind (Json opaco → tipos) ─────────────

export type SearchInput = { query: string; category?: string };
export type SearchExpected = { product_ids: string[]; labels?: { product_id: string; sku: string; name: string }[] };
export type SearchSuggested = { items: { product_id: string; sku: string; name: string }[] };

export type RecognitionInput = { storage_key: string; caption?: string; kind?: string };
export type RecognitionExpected = { product_id: string; sku: string; name?: string } | { no_match: true };
export type RecognitionSuggested = {
  candidates: { product_id: string; sku: string; name: string; score: number; confidence: string }[];
};

export type IntentInput = { text: string };
export type IntentExpected = { intention_code: string };
export type IntentSuggested = { intention_code: string; confidence: number };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parseSearchInput(raw: unknown): SearchInput | null {
  const rec = record(raw);
  const query = str(rec?.query);
  if (!query) return null;
  const category = str(rec?.category);
  return category ? { query, category } : { query };
}

export function parseSearchExpected(raw: unknown): SearchExpected | null {
  const rec = record(raw);
  if (!rec || !Array.isArray(rec.product_ids)) return null;
  const ids = rec.product_ids.filter((id): id is string => typeof id === "string");
  const labels = Array.isArray(rec.labels)
    ? rec.labels.flatMap((entry) => {
        const row = record(entry);
        const productId = str(row?.product_id);
        return productId ? [{ product_id: productId, sku: str(row?.sku) ?? "", name: str(row?.name) ?? "" }] : [];
      })
    : undefined;
  return labels && labels.length > 0 ? { product_ids: ids, labels } : { product_ids: ids };
}

export function parseSearchSuggested(raw: unknown): SearchSuggested {
  const rec = record(raw);
  const items = Array.isArray(rec?.items) ? rec.items : [];
  return {
    items: items.flatMap((entry) => {
      const row = record(entry);
      const productId = str(row?.product_id);
      return productId ? [{ product_id: productId, sku: str(row?.sku) ?? "", name: str(row?.name) ?? "" }] : [];
    }),
  };
}

export function parseRecognitionInput(raw: unknown): RecognitionInput | null {
  const rec = record(raw);
  const storageKey = str(rec?.storage_key);
  if (!storageKey) return null;
  return {
    storage_key: storageKey,
    ...(str(rec?.caption) ? { caption: str(rec?.caption) } : {}),
    ...(str(rec?.kind) ? { kind: str(rec?.kind) } : {}),
  };
}

export function parseRecognitionExpected(raw: unknown): RecognitionExpected | null {
  const rec = record(raw);
  if (!rec) return null;
  if (rec.no_match === true) return { no_match: true };
  const productId = str(rec.product_id);
  const sku = str(rec.sku);
  if (!productId || !sku) return null;
  return { product_id: productId, sku, ...(str(rec.name) ? { name: str(rec.name) } : {}) };
}

export function parseRecognitionSuggested(raw: unknown): RecognitionSuggested {
  const rec = record(raw);
  const candidates = Array.isArray(rec?.candidates) ? rec.candidates : [];
  return {
    candidates: candidates.flatMap((entry) => {
      const row = record(entry);
      const productId = str(row?.product_id);
      if (!productId) return [];
      return [
        {
          product_id: productId,
          sku: str(row?.sku) ?? "",
          name: str(row?.name) ?? "",
          score: typeof row?.score === "number" ? row.score : 0,
          confidence: str(row?.confidence) ?? "low",
        },
      ];
    }),
  };
}

export function parseIntentInput(raw: unknown): IntentInput | null {
  const text = str(record(raw)?.text);
  return text ? { text } : null;
}

export function parseIntentExpected(raw: unknown): IntentExpected | null {
  const code = str(record(raw)?.intention_code);
  return code ? { intention_code: code } : null;
}

export function parseIntentSuggested(raw: unknown): IntentSuggested | null {
  const rec = record(raw);
  const code = str(rec?.intention_code);
  if (!code) return null;
  return { intention_code: code, confidence: typeof rec?.confidence === "number" ? rec.confidence : 0 };
}

/** Título corto del ítem en la lista del etiquetado. */
export function itemTitle(kind: DatasetKind, item: Pick<DatasetItem, "id" | "input">): string {
  if (kind === "catalog_search") return parseSearchInput(item.input)?.query ?? "(consulta ilegible)";
  if (kind === "intent") {
    const text = parseIntentInput(item.input)?.text ?? "(texto ilegible)";
    return text.length > 60 ? `${text.slice(0, 59)}…` : text;
  }
  return `Foto ${item.id.slice(-4)}`;
}

/** Subtítulo: lo etiquetado o lo sugerido. */
export function itemSubtitle(kind: DatasetKind, item: Pick<DatasetItem, "suggested" | "expected" | "label_status">): string {
  if (kind === "catalog_search") {
    const expected = parseSearchExpected(item.expected);
    if (item.label_status === "labeled" && expected) {
      return expected.product_ids.length === 0 ? "sin match válido" : `${expected.product_ids.length} esperado(s)`;
    }
    const suggested = parseSearchSuggested(item.suggested);
    return suggested.items[0] ? `sugerido ${suggested.items[0].sku || suggested.items[0].name}` : "sin sugeridos";
  }
  if (kind === "intent") {
    const expected = parseIntentExpected(item.expected);
    if (item.label_status === "labeled" && expected) return expected.intention_code;
    const suggested = parseIntentSuggested(item.suggested);
    return suggested ? `sugerido ${suggested.intention_code} · ${suggested.confidence.toFixed(2)}` : "sin sugerido";
  }
  const expected = parseRecognitionExpected(item.expected);
  if (item.label_status === "labeled" && expected) return "no_match" in expected ? "sin match" : expected.sku;
  const suggested = parseRecognitionSuggested(item.suggested);
  const top = suggested.candidates[0];
  return top ? `sugerido ${top.sku} · ${top.score.toFixed(2)}` : "sin candidatos";
}

/** Chip de estado del StatusBadge (claves ya conocidas por el componente). */
export function labelStatusKey(status: LabelStatus): string {
  return status === "labeled" ? "active" : status === "disputed" ? "blocked" : status === "skipped" ? "inactive" : "pending";
}

// ─── Métricas del probe (Json de run.metrics → tipos) ───────────────────────

export type SearchProbeMetrics = {
  probe_kind: "catalog_search";
  items: number;
  hits: number;
  recall_at_k: number;
  mrr_at_k: number;
  zero_result_rate: number;
  false_denial_rate: number;
  p50_ms: number;
  p95_ms: number;
  k: number | null;
  canceled_reason: string | null;
};

export type RecognitionProbeMetrics = {
  probe_kind: "recognition";
  items: number;
  hits: number;
  precision_at_1: number;
  hit_at_3: number;
  degraded_rate: number;
  failed_rate: number;
  calibration: { confidence: string; hits: number; misses: number; mean_top_score: number | null }[];
  confused_pairs: { expected_sku: string; got_sku: string; count: number }[];
  p50_ms: number;
  p95_ms: number;
  canceled_reason: string | null;
};

export type IntentProbeMetrics = {
  probe_kind: "intent";
  items: number;
  hits: number;
  accuracy: number;
  llm_share: number;
  none_rate: number;
  confusion: { expected: string; predicted: string; count: number }[];
  p50_ms: number;
  p95_ms: number;
  canceled_reason: string | null;
};

export type ProbeMetrics = SearchProbeMetrics | RecognitionProbeMetrics | IntentProbeMetrics;

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseProbeMetrics(raw: unknown): ProbeMetrics | null {
  const rec = record(raw);
  if (!rec) return null;
  const base = {
    items: num(rec.items),
    hits: num(rec.hits),
    p50_ms: num(rec.p50_ms),
    p95_ms: num(rec.p95_ms),
    canceled_reason: str(rec.canceled_reason) ?? null,
  };
  if (rec.probe_kind === "catalog_search") {
    return {
      probe_kind: "catalog_search",
      ...base,
      recall_at_k: num(rec.recall_at_k),
      mrr_at_k: num(rec.mrr_at_k),
      zero_result_rate: num(rec.zero_result_rate),
      false_denial_rate: num(rec.false_denial_rate),
      k: typeof rec.k === "number" ? rec.k : null,
    };
  }
  if (rec.probe_kind === "recognition") {
    return {
      probe_kind: "recognition",
      ...base,
      precision_at_1: num(rec.precision_at_1),
      hit_at_3: num(rec.hit_at_3),
      degraded_rate: num(rec.degraded_rate),
      failed_rate: num(rec.failed_rate),
      calibration: Array.isArray(rec.calibration)
        ? rec.calibration.flatMap((entry) => {
            const row = record(entry);
            const confidence = str(row?.confidence);
            return confidence
              ? [{ confidence, hits: num(row?.hits), misses: num(row?.misses), mean_top_score: typeof row?.mean_top_score === "number" ? row.mean_top_score : null }]
              : [];
          })
        : [],
      confused_pairs: Array.isArray(rec.confused_pairs)
        ? rec.confused_pairs.flatMap((entry) => {
            const row = record(entry);
            const expectedSku = str(row?.expected_sku);
            const gotSku = str(row?.got_sku);
            return expectedSku && gotSku ? [{ expected_sku: expectedSku, got_sku: gotSku, count: num(row?.count) }] : [];
          })
        : [],
    };
  }
  if (rec.probe_kind === "intent") {
    return {
      probe_kind: "intent",
      ...base,
      accuracy: num(rec.accuracy),
      llm_share: num(rec.llm_share),
      none_rate: num(rec.none_rate),
      confusion: Array.isArray(rec.confusion)
        ? rec.confusion.flatMap((entry) => {
            const row = record(entry);
            const expected = str(row?.expected);
            const predicted = str(row?.predicted);
            return expected && predicted ? [{ expected, predicted, count: num(row?.count) }] : [];
          })
        : [],
    };
  }
  return null;
}

/** «0,91» para ratios 0..1. */
export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(2).replace(".", ",");
}

/** «4,3 %» para tasas 0..1. */
export function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1).replace(".", ",")} %`;
}

/** Métrica principal de un dataset según su capacidad (columna «Último resultado»). */
export function headlineMetric(kind: DatasetKind, metrics: unknown): { label: string; value: string } | null {
  const parsed = parseProbeMetrics(metrics);
  if (!parsed) return null;
  if (parsed.probe_kind === "catalog_search") return { label: "Recall@k", value: formatRatio(parsed.recall_at_k) };
  if (parsed.probe_kind === "recognition") return { label: "Precision@1", value: formatRatio(parsed.precision_at_1) };
  if (parsed.probe_kind === "intent") return { label: "Accuracy", value: formatRatio(parsed.accuracy) };
  void kind;
  return null;
}
