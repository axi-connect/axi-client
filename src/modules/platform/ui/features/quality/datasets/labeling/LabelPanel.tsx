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
  LABEL_STATUS_LABELS,
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
import { Meter } from "../../shared/premium";
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
      // Enter sobre un botón o enlace enfocado lo activa a ÉL, no «Guardar» (QA quality-premium)
      if (event.key === "Enter" && target && (target.tagName === "BUTTON" || target.tagName === "A")) return;
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

  const labelText =
    kind === "intent"
      ? (intentionCode ?? "—")
      : noMatch
        ? "sin match"
        : products.length === 0
          ? "—"
          : products.map((product) => product.sku || product.name).join(", ");

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-3xl border border-border bg-card p-5 lg:p-6" aria-label="Etiquetar ítem">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---- entrada */}
        <div className="min-w-0 space-y-3">
          {kind === "recognition" && (
            <>
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL presignada efímera
                <img src={item.image_url} alt="Foto del cliente" className="aspect-square w-full rounded-3xl bg-secondary object-contain" />
              ) : (
                <div className="grid aspect-square w-full place-items-center rounded-3xl bg-secondary text-sm text-muted-foreground">Foto no disponible</div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Copia normalizada ≤ 1024 px sin EXIF ni GPS
                {recognitionInput?.kind ? ` · ${recognitionInput.kind === "product" ? "producto" : "captura de publicación"}` : ""}
                {recognitionInput?.caption ? ` · el cliente la envió con «${recognitionInput.caption}»` : ""}
              </p>
            </>
          )}
          {kind === "catalog_search" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Consulta del cliente</p>
              <p className="rounded-3xl bg-muted px-5 py-6 font-heading text-2xl leading-snug font-bold tracking-tight break-words">
                «{searchInput?.query ?? "(ilegible)"}»
              </p>
              {searchInput?.category && <p className="text-xs text-muted-foreground">categoría pedida: {searchInput.category}</p>}
            </div>
          )}
          {kind === "intent" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Primer mensaje del cliente</p>
              <p className="rounded-3xl bg-muted px-5 py-5 text-base leading-relaxed whitespace-pre-wrap break-words">{intentInput?.text ?? "(ilegible)"}</p>
            </div>
          )}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Origen</dt>
            <dd>
              {item.source === "manual" ? "añadido a mano" : "tráfico real"}
              {sourceRef?.occurred_at ? ` · ${new Date(sourceRef.occurred_at).toLocaleDateString("es-CO")}` : ""}
              {typeof sourceRef?.frequency === "number" ? ` · ${sourceRef.frequency}× en el periodo` : ""}
            </dd>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              {LABEL_STATUS_LABELS[item.label_status]}
              {item.labeled_by ? ` · por ${item.labeled_by}` : ""}
            </dd>
          </dl>
        </div>

        {/* ---- etiqueta */}
        <div className="flex min-w-0 flex-col gap-3">
          {kind !== "intent" && (
            <>
              <p className="text-xs text-muted-foreground">
                {kind === "recognition" ? "¿Qué producto es? El reconocedor sugiere" : "¿Qué debería encontrar? La búsqueda actual sugiere"}
              </p>
              {suggestedProducts.length === 0 ? (
                <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Sin candidatos: búscalo en el catálogo.</p>
              ) : (
                <ul className="space-y-2">
                  {suggestedProducts.slice(0, 3).map((product, index) => {
                    const picked = selectedIds.includes(product.product_id);
                    const extra = "score" in product ? (product as unknown as { score: number; confidence: string }) : null;
                    return (
                      <li key={product.product_id}>
                        <button
                          type="button"
                          onClick={() => toggleProduct(product)}
                          aria-pressed={picked}
                          className={cn(
                            "grid w-full grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-left text-sm transition-colors hover:bg-secondary",
                            picked ? "border-foreground ring-1 ring-foreground" : "border-border",
                          )}
                        >
                          <span className="grid size-8 place-items-center rounded-xl bg-muted font-mono text-xs text-muted-foreground">{index + 1}</span>
                          <span className="min-w-0 space-y-1">
                            <span className="block truncate font-medium">{product.name || product.sku}</span>
                            <span className="block truncate font-mono text-xs text-muted-foreground" title={product.sku}>
                              {product.sku}
                            </span>
                            {extra && (
                              <span className="flex items-center gap-2.5 text-xs">
                                <Meter value={extra.score} className="max-w-28 flex-1" />
                                <span className="shrink-0 font-medium tabular-nums">{extra.score.toFixed(2)}</span>
                              </span>
                            )}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-6 place-items-center rounded-full border",
                              picked ? "border-foreground bg-foreground text-background" : "border-border",
                            )}
                          >
                            {picked && <Check className="size-3.5" />}
                          </span>
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
                  "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs transition-colors",
                  noMatch ? "border-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={noMatch}
              >
                <CircleSlash aria-hidden="true" className="size-3.5" />
                {kind === "recognition" ? "No es ningún producto del catálogo" : "No hay match válido"}
              </button>
            </>
          )}
          {kind === "intent" && (
            <>
              <p className="text-xs text-muted-foreground">Intención correcta</p>
              <IntentionPicker companyId={companyId} value={intentionCode} onChange={setIntentionCode} />
            </>
          )}
        </div>
      </div>

      {/* ---- barra de acción: la isla de tinta de esta pantalla */}
      <div className="relative isolate mt-auto flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl bg-foreground px-4 py-3 text-background dark:border dark:border-border dark:bg-card dark:text-foreground">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -left-20 -z-10 size-60 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--axi-brand)_40%,transparent),transparent_70%)]"
        />
        <span className="min-w-0 basis-full xl:basis-auto xl:flex-1">
          <span className="block text-[11px] opacity-70">Etiqueta esperada</span>
          <span className="block truncate font-mono text-sm" aria-live="polite">
            {labelText}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2 xl:ml-auto">
          <Button variant="secondary" size="sm" onClick={() => onDecide({ status: "skipped" })} disabled={pending}>
            <SkipForward aria-hidden="true" />
            Omitir
            <kbd className="rounded bg-foreground/10 px-1 font-mono text-[10px]">S</kbd>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDecide({ status: "disputed" })} disabled={pending}>
            <MessageSquareWarning aria-hidden="true" />
            Disputar
            <kbd className="rounded bg-foreground/10 px-1 font-mono text-[10px]">D</kbd>
          </Button>
          <Button variant="secondary" size="icon" className="size-8" onClick={onDelete} disabled={pending} aria-label="Quitar el ítem del dataset">
            <Trash2 aria-hidden="true" />
          </Button>
          <Button onClick={save} disabled={!canSave || pending}>
            <Check aria-hidden="true" />
            {pending ? "Guardando…" : "Guardar y siguiente"}
            <kbd className="rounded bg-primary-foreground/20 px-1 font-mono text-[10px]">↵</kbd>
          </Button>
        </span>
      </div>
    </section>
  );
}
