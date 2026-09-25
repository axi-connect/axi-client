"use client";

/**
 * Panel de etiquetado de UN ítem, por capacidad:
 *  - búsqueda: la consulta + los productos esperados (sugeridos del search
 *    actual como chips + buscador del catálogo; «sin match válido» = lista vacía).
 *  - reconocimiento: la foto (copia normalizada) + candidatos del reconocedor
 *    + buscador + «Sin match».
 *  - intención: el texto + intenciones del tenant (la sugerida marcada).
 * Atajos: Enter guarda y sigue · S omite · D disputa · 1–3 elige sugerido.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, CircleSlash, MessageSquareWarning, SkipForward, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  parseIntentExpected,
  parseIntentInput,
  parseIntentSuggested,
  parseRecognitionExpected,
  parseRecognitionInput,
  parseRecognitionSuggested,
  parseSearchExpected,
  parseSearchInput,
  parseSearchSuggested,
  type DatasetItem,
  type DatasetKind,
} from "../../../../../domain/quality-datasets";
import { IntentionPicker } from "./IntentionPicker";
import { ProductPicker } from "./ProductPicker";

type Product = { product_id: string; sku: string; name: string };

export type LabelDecision =
  | { status: "labeled"; expected: Record<string, unknown> }
  | { status: "skipped" }
  | { status: "disputed" };

type LabelPanelProps = {
  kind: DatasetKind;
  companyId: string;
  item: DatasetItem;
  pending: boolean;
  onDecide: (decision: LabelDecision) => void;
  onDelete: () => void;
};

export function LabelPanel({ kind, companyId, item, pending, onDecide, onDelete }: LabelPanelProps) {
  // ---- estado de la etiqueta en edición (se rehidrata al cambiar de ítem)
  const [products, setProducts] = useState<Product[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const [intentionCode, setIntentionCode] = useState<string | null>(null);

  useEffect(() => {
    if (kind === "catalog_search") {
      const expected = parseSearchExpected(item.expected);
      const suggested = parseSearchSuggested(item.suggested);
      setProducts(
        expected?.labels ??
          (expected ? expected.product_ids.map((id) => ({ product_id: id, sku: "", name: "" })) : suggested.items.slice(0, 1)),
      );
      setNoMatch(expected !== null && expected.product_ids.length === 0);
    } else if (kind === "recognition") {
      const expected = parseRecognitionExpected(item.expected);
      const suggested = parseRecognitionSuggested(item.suggested);
      if (expected && "no_match" in expected) {
        setProducts([]);
        setNoMatch(true);
      } else if (expected) {
        setProducts([{ product_id: expected.product_id, sku: expected.sku, name: expected.name ?? "" }]);
        setNoMatch(false);
      } else {
        const top = suggested.candidates[0];
        setProducts(top ? [{ product_id: top.product_id, sku: top.sku, name: top.name }] : []);
        setNoMatch(false);
      }
    } else {
      setIntentionCode(parseIntentExpected(item.expected)?.intention_code ?? parseIntentSuggested(item.suggested)?.intention_code ?? null);
    }
  }, [item.id, item.expected, item.suggested, kind]);

  const suggestedProducts = useMemo<Product[]>(() => {
    if (kind === "catalog_search") return parseSearchSuggested(item.suggested).items;
    if (kind === "recognition") return parseRecognitionSuggested(item.suggested).candidates;
    return [];
  }, [kind, item.suggested]);

  const canSave =
    kind === "intent"
      ? intentionCode !== null
      : kind === "recognition"
        ? noMatch || products.length === 1
        : noMatch || products.length > 0;

  function buildExpected(): Record<string, unknown> | null {
    if (kind === "intent") return intentionCode ? { intention_code: intentionCode } : null;
    if (kind === "recognition") {
      if (noMatch) return { no_match: true };
      const [product] = products;
      return product ? { product_id: product.product_id, sku: product.sku, name: product.name } : null;
    }
    if (noMatch) return { product_ids: [] };
    return {
      product_ids: products.map((product) => product.product_id),
      labels: products.map((product) => ({ product_id: product.product_id, sku: product.sku, name: product.name })),
    };
  }

  function save() {
    const expected = buildExpected();
    if (expected) onDecide({ status: "labeled", expected });
  }

  function toggleProduct(product: Product) {
    setNoMatch(false);
    if (kind === "recognition") {
      setProducts([product]);
      return;
    }
    setProducts((current) =>
      current.some((entry) => entry.product_id === product.product_id)
        ? current.filter((entry) => entry.product_id !== product.product_id)
        : [...current, product],
    );
  }

  // ---- atajos de teclado (no dentro de inputs)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (pending) return;
      if (event.key === "Enter") {
        event.preventDefault();
        save();
      } else if (event.key === "s" || event.key === "S") {
        onDecide({ status: "skipped" });
      } else if (event.key === "d" || event.key === "D") {
        onDecide({ status: "disputed" });
      } else if (["1", "2", "3"].includes(event.key)) {
        const product = suggestedProducts[Number(event.key) - 1];
        if (product) toggleProduct(product);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las funciones cierran sobre el estado actual
  }, [pending, suggestedProducts, products, noMatch, intentionCode, kind]);

  const selectedIds = products.map((product) => product.product_id);
  const searchInput = kind === "catalog_search" ? parseSearchInput(item.input) : null;
  const recognitionInput = kind === "recognition" ? parseRecognitionInput(item.input) : null;
  const intentInput = kind === "intent" ? parseIntentInput(item.input) : null;
  const sourceRef = item.source_ref as { occurred_at?: string; frequency?: number } | null;

  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-background p-5 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label="Etiquetar ítem">
      {/* ---- entrada */}
      <div className="min-w-0 space-y-3">
        {kind === "recognition" && (
          <>
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera
              <img src={item.image_url} alt="Foto del cliente" className="aspect-[4/3] w-full rounded-2xl object-contain bg-secondary" />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-secondary text-sm text-muted-foreground">Foto no disponible</div>
            )}
            <p className="text-xs text-muted-foreground">
              Copia normalizada ≤ 1024 px sin EXIF ni GPS
              {recognitionInput?.kind ? ` · ${recognitionInput.kind === "product" ? "producto" : "captura de publicación"}` : ""}
              {recognitionInput?.caption ? ` · el cliente la envió con «${recognitionInput.caption}»` : ""}
            </p>
          </>
        )}
        {kind === "catalog_search" && (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Consulta del cliente</p>
            <p className="rounded-xl bg-muted/50 p-3 text-lg font-medium">«{searchInput?.query ?? "(ilegible)"}»</p>
            {searchInput?.category && <p className="text-xs text-muted-foreground">categoría pedida: {searchInput.category}</p>}
          </div>
        )}
        {kind === "intent" && (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Primer mensaje del cliente</p>
            <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-base">{intentInput?.text ?? "(ilegible)"}</p>
          </div>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Origen</dt>
          <dd>
            {item.source === "manual" ? "añadido a mano" : "tráfico real"}
            {sourceRef?.occurred_at ? ` · ${new Date(sourceRef.occurred_at).toLocaleDateString("es-CO")}` : ""}
            {typeof sourceRef?.frequency === "number" ? ` · ${sourceRef.frequency}× en el periodo` : ""}
          </dd>
          <dt className="text-muted-foreground">Estado</dt>
          <dd>{item.label_status}{item.labeled_by ? ` · por ${item.labeled_by}` : ""}</dd>
        </dl>
      </div>

      {/* ---- etiqueta */}
      <div className="flex flex-col gap-4">
        {kind !== "intent" && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {kind === "recognition" ? "Sugeridos por el reconocedor" : "Sugeridos por la búsqueda actual"}
            </p>
            {suggestedProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin candidatos.</p>
            ) : (
              <ul className="space-y-1.5">
                {suggestedProducts.slice(0, 3).map((product, index) => {
                  const picked = selectedIds.includes(product.product_id);
                  const extra = "score" in product ? (product as unknown as { score: number; confidence: string }) : null;
                  return (
                    <li key={product.product_id}>
                      <button
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className={cn(
                          "grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                          picked ? "border-brand bg-accent" : "border-border",
                        )}
                      >
                        <span className="font-mono text-[11px] text-muted-foreground">{index + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{product.name || product.sku}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            <span className="font-mono">{product.sku}</span>
                            {extra ? ` · ${extra.score.toFixed(2)} · ${extra.confidence}` : ""}
                          </span>
                        </span>
                        {picked && <Check aria-hidden="true" className="size-4 text-brand" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <ProductPicker companyId={companyId} selectedIds={selectedIds} onPick={toggleProduct} />
            <button
              type="button"
              onClick={() => {
                setNoMatch((value) => !value);
                setProducts([]);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                noMatch ? "border-brand bg-accent font-medium" : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={noMatch}
            >
              <CircleSlash aria-hidden="true" className="size-3.5" />
              {kind === "recognition" ? "No es ningún producto del catálogo" : "No hay match válido"}
            </button>
          </div>
        )}
        {kind === "intent" && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Intención correcta</p>
            <IntentionPicker companyId={companyId} value={intentionCode} onChange={setIntentionCode} />
          </div>
        )}

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Etiqueta</p>
          <p className="rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs">
            {kind === "intent"
              ? (intentionCode ?? "—")
              : noMatch
                ? "sin match"
                : products.length === 0
                  ? "—"
                  : products.map((product) => product.sku || product.name).join(", ")}
          </p>
          <Button className="w-full" onClick={save} disabled={!canSave || pending}>
            <Check aria-hidden="true" />
            {pending ? "Guardando…" : "Guardar y siguiente"}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onDecide({ status: "skipped" })} disabled={pending}>
              <SkipForward aria-hidden="true" />
              Omitir
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDecide({ status: "disputed" })} disabled={pending}>
              <MessageSquareWarning aria-hidden="true" />
              Disputar
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={onDelete} disabled={pending}>
              <Trash2 aria-hidden="true" />
              Quitar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <kbd className="rounded border border-border px-1">Enter</kbd> guarda · <kbd className="rounded border border-border px-1">S</kbd> omite ·{" "}
            <kbd className="rounded border border-border px-1">D</kbd> disputa · <kbd className="rounded border border-border px-1">1–3</kbd> elige sugerido
          </p>
        </div>
      </div>
    </section>
  );
}
