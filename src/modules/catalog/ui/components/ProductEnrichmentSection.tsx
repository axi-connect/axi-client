"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, LoaderCircle, RefreshCw, Sparkles, TriangleAlert, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  addSearchTerm,
  ENRICHMENT_DESCRIPTION_MAX,
  ENRICHMENT_STATE_LABELS,
  ENRICHMENT_TERMS_MAX,
  enrichmentDisplayState,
  enrichmentHasContent,
  enrichmentPollInterval,
  type EnrichmentDisplayState,
  type ProductDTO,
  type ProductEnrichmentDTO,
} from "@/modules/catalog/domain/product";
import {
  applySuggestedCategory,
  getProductEnrichment,
  regenerateProductEnrichment,
  updateProductEnrichment,
} from "@/modules/catalog/infrastructure/services/product-enrichment-service.adapter";

type AlertConfig = {
  variant: "default" | "destructive" | "success";
  title: string;
  description?: string;
};

/**
 * Sección «Búsqueda con IA» del detalle del producto (plan catalog_enrichment,
 * D1): lo que la IA entendió del producto para que los clientes lo encuentren
 * aunque lo pidan con otras palabras. Se ve, se corrige, se regenera y se
 * desactiva por producto. Es la única superficie teñida de violeta de la
 * página (acento de IA del design system) y se edita también en un espejado de
 * Shopify: lo generado es de axi. Lo único gobernado es aplicar la categoría.
 */
export function ProductEnrichmentSection({
  product,
  canManage,
  canApplyCategory,
  onCategoryApplied,
  setAlert,
}: {
  product: ProductDTO;
  canManage: boolean;
  /** `canManage` y la categoría NO gobernada (`locked_fields` del backend). */
  canApplyCategory: boolean;
  onCategoryApplied: () => void | Promise<void>;
  setAlert?: (cfg: AlertConfig) => void;
}) {
  const [enrichment, setEnrichment] = useState<ProductEnrichmentDTO | null>(product.enrichment ?? null);
  const [busy, setBusy] = useState<"regenerate" | "save" | "toggle" | "category" | null>(null);
  const [description, setDescription] = useState(product.enrichment?.description ?? "");
  const [terms, setTerms] = useState<string[]>(product.enrichment?.search_terms ?? []);
  const [attributes, setAttributes] = useState<Record<string, string>>(product.enrichment?.attributes ?? {});
  const [newTerm, setNewTerm] = useState("");
  const [dirty, setDirty] = useState(false);
  const [stalled, setStalled] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const state = enrichmentDisplayState(enrichment);
  const pending = state === "pending";

  const syncFrom = useCallback((next: ProductEnrichmentDTO | null) => {
    setEnrichment(next);
    setDescription(next?.description ?? "");
    setTerms(next?.search_terms ?? []);
    setAttributes(next?.attributes ?? {});
    setDirty(false);
  }, []);

  // El detalle se re-carga desde fuera (guardar ficha, subir foto): tomar la
  // fila nueva salvo que el usuario esté a mitad de una edición
  useEffect(() => {
    if (!dirty) syncFrom(product.enrichment ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.enrichment]);

  const refetch = useCallback(async () => {
    try {
      const next = await getProductEnrichment(product.id);
      syncFrom(next);
    } catch {
      // 404 = todavía no hay fila: seguimos esperando
    }
  }, [product.id, syncFrom]);

  // Polling mientras el job genera (3 s, presupuesto 30 s → botón «Actualizar»)
  useEffect(() => {
    if (!pending) {
      startedAtRef.current = null;
      setStalled(false);
      return;
    }
    startedAtRef.current ??= Date.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const interval = enrichmentPollInterval(true, elapsed);
      if (interval === false) {
        setStalled(true);
        return;
      }
      timer = setTimeout(async () => {
        if (cancelled) return;
        await refetch();
        if (!cancelled) tick();
      }, interval);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pending, refetch]);

  const regenerate = async () => {
    if (busy !== null) return;
    setBusy("regenerate");
    try {
      await regenerateProductEnrichment(product.id);
      startedAtRef.current = Date.now();
      setStalled(false);
      setEnrichment((prev) => ({
        ...(prev ?? emptyEnrichment()),
        status: "pending",
        edited_by_user_at: null,
        error: null,
        skipped_reason: null,
      }));
      setDirty(false);
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo pedir la generación") });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (busy !== null) return;
    setBusy("save");
    try {
      await updateProductEnrichment(product.id, {
        description: description.trim().length === 0 ? null : description.trim(),
        search_terms: terms,
        attributes: compactAttributes(attributes),
      });
      await refetch();
      setAlert?.({ variant: "success", title: "Metadatos guardados", description: "El automático ya no los pisa." });
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudieron guardar los metadatos") });
    } finally {
      setBusy(null);
    }
  };

  const toggleDisabled = async (disable: boolean) => {
    if (busy !== null) return;
    setBusy("toggle");
    try {
      await updateProductEnrichment(product.id, { status: disable ? "disabled" : "ready" });
      await refetch();
      setAlert?.({
        variant: "success",
        title: disable ? "Metadatos desactivados para este producto" : "Metadatos activados",
        description: disable
          ? "El agente vuelve a usar la descripción de la ficha."
          : "El agente usa de nuevo la descripción generada.",
      });
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo cambiar el estado") });
    } finally {
      setBusy(null);
    }
  };

  const applyCategory = async () => {
    if (busy !== null) return;
    setBusy("category");
    try {
      await applySuggestedCategory(product.id);
      await onCategoryApplied();
      await refetch();
      setAlert?.({ variant: "success", title: "Categoría aplicada" });
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo aplicar la categoría") });
    } finally {
      setBusy(null);
    }
  };

  const tinted = state !== "disabled" && state !== "none";

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border p-4 md:p-6",
        tinted ? "border-accent-violet/30 bg-accent-violet/5" : "border-border bg-background",
      )}
      aria-labelledby="product-enrichment-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="product-enrichment-title" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Sparkles className={cn("size-4", tinted ? "text-accent-violet" : "text-muted-foreground")} aria-hidden />
            Búsqueda con IA
            <StateBadge state={state} />
          </h2>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">{explanation(state, enrichment)}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {state === "none" ? (
              <Button size="sm" onClick={() => void regenerate()} disabled={busy !== null}>
                {busy === "regenerate" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                Generar con IA
              </Button>
            ) : state === "disabled" ? (
              <Button variant="outline" size="sm" onClick={() => void toggleDisabled(false)} disabled={busy !== null}>
                Activar de nuevo
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => void regenerate()} disabled={busy !== null || pending}>
                  {busy === "regenerate" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
                  {state === "failed" ? "Intentar de nuevo" : "Regenerar"}
                </Button>
                {state !== "failed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => void toggleDisabled(true)}
                    disabled={busy !== null || pending}
                  >
                    Desactivar para este producto
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {pending && (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]" role="status" aria-label="Generando metadatos con IA">
          <div className="space-y-2">
            <div className="h-3 w-11/12 animate-pulse rounded bg-accent-violet/15" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-accent-violet/15" />
            <div className="mt-3 h-3 w-2/5 animate-pulse rounded bg-accent-violet/15" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-accent-violet/15" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-accent-violet/15" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-accent-violet/15" />
          </div>
          {stalled && (
            <p className="text-xs text-muted-foreground md:col-span-2">
              Está tardando más de lo normal.{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => void refetch()}>
                Actualizar
              </button>
            </p>
          )}
        </div>
      )}

      {state === "failed" && (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          <span>
            <span className="font-medium">El servicio de IA no pudo generar los metadatos.</span> Mientras
            tanto el agente usa la descripción de la ficha. Vuelve a intentarlo o espera al próximo cambio
            del producto.
          </span>
        </p>
      )}

      {!pending && enrichment !== null && enrichmentHasContent(enrichment) && state !== "disabled" && (
        <>
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4 min-w-0">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Descripción que ve el agente
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {description.length} / {ENRICHMENT_DESCRIPTION_MAX}
                  </span>
                </div>
                <Textarea
                  value={description}
                  maxLength={ENRICHMENT_DESCRIPTION_MAX}
                  readOnly={!canManage}
                  rows={3}
                  aria-label="Descripción generada, editable"
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cómo lo piden tus clientes
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {terms.length} / {ENRICHMENT_TERMS_MAX}
                  </span>
                </div>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background p-2" aria-label="Términos de búsqueda">
                  {terms.map((term) => (
                    <span key={term} className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary pl-2.5 pr-1 text-xs font-medium">
                      {term}
                      {canManage && (
                        <button
                          type="button"
                          className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                          aria-label={`Quitar ${term}`}
                          onClick={() => {
                            setTerms((prev) => prev.filter((candidate) => candidate !== term));
                            setDirty(true);
                          }}
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      )}
                    </span>
                  ))}
                  {canManage && terms.length < ENRICHMENT_TERMS_MAX && (
                    <Input
                      value={newTerm}
                      placeholder="+ agregar"
                      aria-label="Agregar término"
                      className="h-6 w-28 border-dashed px-2 text-xs shadow-none"
                      onChange={(event) => setNewTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        setTerms((prev) => addSearchTerm(prev, newTerm));
                        setNewTerm("");
                        setDirty(true);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Atributos</span>
              <dl className="grid grid-cols-[auto_1fr] overflow-hidden rounded-xl border border-input bg-background text-sm">
                {Object.entries(attributes).length === 0 && (
                  <dd className="col-span-2 p-3 text-xs italic text-muted-foreground">Sin atributos deducibles.</dd>
                )}
                {Object.entries(attributes).map(([key, value], index) => (
                  <div key={key} className={cn("contents", index > 0 && "[&>*]:border-t [&>*]:border-border/50")}>
                    <dt className="px-3 py-1.5 text-muted-foreground">{enrichment.attribute_labels[key] ?? key}</dt>
                    <dd className="px-2 py-1">
                      {canManage ? (
                        <Input
                          value={value}
                          maxLength={40}
                          aria-label={enrichment.attribute_labels[key] ?? key}
                          className="h-7 border-transparent px-1 text-sm shadow-none hover:border-input focus-visible:border-input"
                          onChange={(event) => {
                            setAttributes((prev) => ({ ...prev, [key]: event.target.value }));
                            setDirty(true);
                          }}
                        />
                      ) : (
                        <span className="px-1 font-medium">{value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {enrichment.suggested_category !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent-violet/30 bg-background px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <FolderOpen className="size-4 text-accent-violet" aria-hidden />
                <span>
                  Categoría sugerida: <span className="font-semibold">{enrichment.suggested_category.name}</span>
                  <span className="text-muted-foreground"> · ya se usa para buscar</span>
                </span>
              </span>
              {enrichment.locked_category || !canApplyCategory ? (
                <span className="text-xs text-muted-foreground">
                  {enrichment.locked_category ? "La categoría la define tu tienda conectada" : "Sin permiso para cambiar la categoría"}
                </span>
              ) : (
                <Button size="sm" onClick={() => void applyCategory()} disabled={busy !== null}>
                  {busy === "category" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                  Aplicar categoría
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{provenance(enrichment)}</span>
            {canManage && dirty && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => syncFrom(enrichment)} disabled={busy !== null}>
                  Descartar
                </Button>
                <Button size="sm" onClick={() => void save()} disabled={busy !== null}>
                  {busy === "save" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                  Guardar metadatos
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function StateBadge({ state }: { state: EnrichmentDisplayState }) {
  const violet = state === "ready" || state === "pending";
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        violet ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet" : "text-muted-foreground",
        state === "failed" && "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current", state === "pending" && "animate-pulse")} aria-hidden />
      {ENRICHMENT_STATE_LABELS[state]}
    </Badge>
  );
}

function explanation(state: EnrichmentDisplayState, enrichment: ProductEnrichmentDTO | null): string {
  switch (state) {
    case "none":
      return "Genera la descripción que verá el agente, los atributos y las palabras con que tus clientes piden este producto. No consume tu plan y no escribe nada en tu tienda.";
    case "pending":
      return "Mirando la foto principal y la ficha. Suele tardar unos segundos; puedes seguir editando el resto del producto.";
    case "edited":
      return "Corregiste estos metadatos. Aunque cambie la foto o la ficha, no se vuelven a generar solos: «Regenerar» los reemplaza.";
    case "disabled":
      return "Para este producto el agente usa solo la descripción de la ficha y los clientes lo encuentran por su nombre y categoría. Lo generado se conserva por si lo vuelves a activar.";
    case "failed":
      return "Mientras tanto el agente usa la descripción de la ficha, como hasta ahora.";
    default:
      return enrichment?.source === "text"
        ? "Generado a partir del nombre y la ficha. Cuando subas la primera foto se vuelve a generar mirando el producto."
        : "Lo que la IA entendió de este producto para que tus clientes lo encuentren aunque lo pidan con otras palabras. El agente usa esta descripción en vez de la de la ficha; términos y atributos solo sirven para buscar.";
  }
}

function provenance(enrichment: ProductEnrichmentDTO): string {
  const parts: string[] = [];
  if (enrichment.edited_by_user_at) {
    parts.push(`Editado el ${formatDate(enrichment.edited_by_user_at)}`);
  } else if (enrichment.generated_at) {
    parts.push(
      enrichment.source === "vision"
        ? `Generado con la foto principal y la ficha el ${formatDate(enrichment.generated_at)}`
        : `Generado con la ficha, sin foto, el ${formatDate(enrichment.generated_at)}`,
    );
  }
  if (enrichment.model) parts.push(enrichment.model);
  return parts.join(" · ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function compactAttributes(attributes: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value.trim().length > 0) out[key] = value.trim();
  }
  return out;
}

function emptyEnrichment(): ProductEnrichmentDTO {
  return {
    status: "pending",
    source: null,
    description: null,
    attributes: {},
    attribute_labels: {},
    search_terms: [],
    suggested_category: null,
    locked_category: false,
    vertical_code: null,
    model: null,
    edited_by_user_at: null,
    generated_at: null,
    error: null,
    skipped_reason: null,
    updated_at: new Date().toISOString(),
  };
}
