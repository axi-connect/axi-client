import {
  formatRate,
  formatRatio,
  headlineMetric,
  itemSubtitle,
  itemTitle,
  labelStatusKey,
  parseProbeMetrics,
  parseRecognitionExpected,
  parseSearchExpected,
  parseSearchSuggested,
  probePaysLlm,
  type DatasetItem,
} from "../quality-datasets";

function item(overrides: Partial<DatasetItem> = {}): DatasetItem {
  return {
    id: "0199a000-0000-7000-8000-0000000000ab",
    source: "turn_metric",
    input: { query: "tenis" },
    suggested: null,
    expected: null,
    label_status: "unlabeled",
    labeled_by: null,
    labeled_at: null,
    source_ref: null,
    image_url: null,
    created_at: "2026-09-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("parseo por kind", () => {
  it("expected de búsqueda exige product_ids; el de reconocimiento admite no_match", () => {
    expect(parseSearchExpected({ product_ids: ["a"], labels: [{ product_id: "a", sku: "A", name: "Alfa" }] })).toEqual({
      product_ids: ["a"],
      labels: [{ product_id: "a", sku: "A", name: "Alfa" }],
    });
    expect(parseSearchExpected({ nope: 1 })).toBeNull();
    expect(parseRecognitionExpected({ no_match: true })).toEqual({ no_match: true });
    expect(parseRecognitionExpected({ product_id: "p", sku: "S" })).toEqual({ product_id: "p", sku: "S" });
    expect(parseRecognitionExpected({ product_id: "p" })).toBeNull();
  });

  it("sugeridos ilegibles degradan a lista vacía", () => {
    expect(parseSearchSuggested({ items: [{ product_id: "a", sku: "A", name: "Alfa" }, { bad: true }] }).items).toHaveLength(1);
    expect(parseSearchSuggested(null).items).toEqual([]);
  });
});

describe("título y subtítulo del ítem", () => {
  it("búsqueda: la consulta y el sugerido o la etiqueta", () => {
    const unlabeled = item({ suggested: { items: [{ product_id: "a", sku: "SAV-1", name: "Tenis" }] } });
    expect(itemTitle("catalog_search", unlabeled)).toBe("tenis");
    expect(itemSubtitle("catalog_search", unlabeled)).toBe("sugerido SAV-1");
    const labeled = item({ label_status: "labeled", expected: { product_ids: [] } });
    expect(itemSubtitle("catalog_search", labeled)).toBe("sin match válido");
  });

  it("reconocimiento e intención", () => {
    const photo = item({ input: { storage_key: "k" }, suggested: { candidates: [{ product_id: "p", sku: "SAV-2", name: "Bota", score: 0.87, confidence: "high" }] } });
    expect(itemTitle("recognition", photo)).toBe("Foto 00ab");
    expect(itemSubtitle("recognition", photo)).toBe("sugerido SAV-2 · 0.87");
    const text = item({ input: { text: "quiero comprar" }, label_status: "labeled", expected: { intention_code: "sales" } });
    expect(itemTitle("intent", text)).toBe("quiero comprar");
    expect(itemSubtitle("intent", text)).toBe("sales");
  });

  it("estado → clave del StatusBadge", () => {
    expect(["labeled", "disputed", "skipped", "unlabeled"].map((status) => labelStatusKey(status as never))).toEqual([
      "active",
      "blocked",
      "inactive",
      "pending",
    ]);
  });
});

describe("métricas del probe", () => {
  it("parsea las tres capacidades y degrada lo desconocido a null", () => {
    expect(parseProbeMetrics({ probe_kind: "catalog_search", items: 10, hits: 9, recall_at_k: 0.91, mrr_at_k: 0.7, k: 8 })).toMatchObject({
      probe_kind: "catalog_search",
      recall_at_k: 0.91,
      k: 8,
      canceled_reason: null,
    });
    expect(
      parseProbeMetrics({ probe_kind: "recognition", items: 2, precision_at_1: 0.5, calibration: [{ confidence: "high", hits: 1, misses: 1, mean_top_score: 0.9 }], confused_pairs: [{ expected_sku: "A", got_sku: "B", count: 2 }] }),
    ).toMatchObject({ probe_kind: "recognition", calibration: [{ confidence: "high", hits: 1, misses: 1, mean_top_score: 0.9 }], confused_pairs: [{ expected_sku: "A", got_sku: "B", count: 2 }] });
    expect(parseProbeMetrics({ probe_kind: "intent", items: 3, accuracy: 0.667, confusion: [{ expected: "a", predicted: "b", count: 1 }] })).toMatchObject({ probe_kind: "intent", accuracy: 0.667 });
    expect(parseProbeMetrics({ turns_total: 4 })).toBeNull();
    expect(parseProbeMetrics(null)).toBeNull();
  });

  it("métrica principal por capacidad y formatos", () => {
    expect(headlineMetric("catalog_search", { probe_kind: "catalog_search", recall_at_k: 0.912 })).toEqual({ label: "Recall@k", value: "0,91" });
    expect(headlineMetric("intent", { probe_kind: "intent", accuracy: 1 })).toEqual({ label: "Accuracy", value: "1,00" });
    expect(headlineMetric("recognition", null)).toBeNull();
    expect(formatRatio(null)).toBe("—");
    expect(formatRate(0.043)).toBe("4,3 %");
    expect(probePaysLlm("catalog_search")).toBe(false);
    expect(probePaysLlm("recognition")).toBe(true);
  });
});
