"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/features/empty-state";
import {
  DEFAULT_COMMIT,
  applyEdits,
  commitableCount,
  patchesFor,
  reviewBlockers,
  type CatalogImportDTO,
  type ItemEdits,
} from "@/modules/onboarding/domain/catalog-import";
import { nicheByCode } from "@/modules/onboarding/domain/niches";
import { useCatalogImportJob } from "@/modules/onboarding/infrastructure/hooks/use-catalog-import-job";
import {
  commitCatalogImport,
  createCatalogImport,
  patchCatalogImportItem,
} from "@/modules/onboarding/infrastructure/services/catalog-import-service.adapter";
import { ExtractedProductsReview } from "@/modules/onboarding/ui/catalog-import/ExtractedProductsReview";
import { ImportDropzone } from "@/modules/onboarding/ui/catalog-import/ImportDropzone";
import { ImportJobProgress } from "@/modules/onboarding/ui/catalog-import/ImportJobProgress";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

const NICHE_HINTS: Record<string, string> = {
  restaurants: "Para restaurantes ya creamos las categorías Entradas, Platos, Bebidas y Postres. La IA acomoda cada producto en la suya.",
  retail_fashion: "Para moda la IA reconoce tallas y colores como variantes del mismo producto.",
  hotels_tourism: "Para hoteles las habitaciones y tours se crean como servicios reservables.",
  health_beauty: "Para citas cada servicio se crea con su duración, lista para la agenda.",
};

/**
 * Paso 3 · Catálogo (mockup F0-B). Cuatro fases en una sola pantalla: subir
 * → analizando (job sondeado) → revisar (edición en línea) → creado. Al
 * volver con un `import_id` guardado en el progreso, retoma la revisión donde
 * estaba: cerrar la pestaña no pierde el análisis.
 *
 * El commit es del usuario: la IA propone, la persona confirma. Sin precio no
 * se crea nada; «Excluir los incompletos» deja pasar solo lo listo.
 */
export function CatalogImportStep({
  nicheCode,
  initialImportId,
  saving,
  onBack,
  onSkip,
  onDone,
  onImportStarted,
}: {
  nicheCode: string | null;
  /** `steps.catalog.data.import_id` del progreso, para reanudar. */
  initialImportId: string | null;
  saving: boolean;
  onBack: () => void;
  onSkip: () => void;
  onDone: (result: { import_id: string; created_count: number }) => void;
  /** Persiste el id del job en el progreso en cuanto nace (reanudación). */
  onImportStarted: (importId: string) => void;
}) {
  const [importId, setImportId] = useState<string | null>(initialImportId);
  const [uploading, setUploading] = useState(false);
  const [edits, setEdits] = useState<Record<string, ItemEdits>>({});
  const [committing, setCommitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { job, error: jobError, stalled, resume, restart, setJob } = useCatalogImportJob(importId);

  // El job cambia de id → la revisión empieza limpia.
  useEffect(() => {
    setEdits({});
  }, [importId]);

  async function upload(file: File) {
    setActionError(null);
    setUploading(true);
    try {
      const created = await createCatalogImport(file, { default_currency: "COP" });
      setJob(created);
      setImportId(created.id);
      onImportStarted(created.id);
    } catch (error) {
      setActionError(errorMessage(error, "No pudimos subir el archivo. Inténtalo de nuevo."));
    } finally {
      setUploading(false);
    }
  }

  async function commit(current: CatalogImportDTO) {
    const items = current.items ?? [];
    setActionError(null);
    setCommitting(true);
    try {
      for (const { item_id, patch } of patchesFor(items, edits)) {
        await patchCatalogImportItem(current.id, item_id, patch);
      }
      const next = await commitCatalogImport(current.id, DEFAULT_COMMIT);
      setJob(next);
      setEdits({});
      restart();
    } catch (error) {
      setActionError(errorMessage(error, "No pudimos crear los productos. Inténtalo de nuevo."));
    } finally {
      setCommitting(false);
    }
  }

  const hint = nicheCode ? (NICHE_HINTS[nicheCode] ?? null) : null;
  const nicheName = nicheByCode(nicheCode)?.name;
  const reviewItems = job?.items?.map((item) => applyEdits(item, edits[item.id])) ?? [];
  const ready = commitableCount(reviewItems);
  const blockers = reviewBlockers(reviewItems).length;

  const phase: "upload" | "processing" | "review" | "completed" | "failed" = !job
    ? "upload"
    : job.status === "review_required"
      ? "review"
      : job.status === "completed"
        ? "completed"
        : job.status === "failed" || job.status === "cancelled"
          ? "failed"
          : "processing";

  const copy = {
    upload: { title: "Carga tu catálogo", lead: "Sube el archivo que ya tienes. No hace falta que esté ordenado: la IA se encarga y tú revisas." },
    processing: { title: "Estamos leyendo tu catálogo", lead: "Puedes esperar aquí o seguir con los agentes y volver después." },
    review: {
      title: "Revisa lo que encontramos",
      lead: job ? `${job.items_total} productos en «${job.file_name}». ${blockers > 0 ? `${blockers} necesitan un dato antes de crearse.` : "Todo listo para crearse."}` : "",
    },
    completed: { title: "Tu catálogo está creado", lead: job ? `Creamos ${job.items_created} productos${job.items_skipped ? ` y omitimos ${job.items_skipped}` : ""}. Puedes completar fotos y detalles en Catálogo.` : "" },
    failed: { title: "Carga tu catálogo", lead: "Sube el archivo que ya tienes. No hace falta que esté ordenado: la IA se encarga y tú revisas." },
  }[phase];

  const primary = (() => {
    if (phase === "review" && job) {
      return (
        <Button size="lg" className="h-11" disabled={committing || saving || ready === 0} onClick={() => void commit(job)} aria-describedby="catalog-blocker">
          {committing ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {committing ? "Creando…" : `Crear ${ready} ${ready === 1 ? "producto" : "productos"}`}
          {!committing ? <ArrowRight aria-hidden="true" /> : null}
        </Button>
      );
    }
    if (phase === "completed" && job) {
      return (
        <Button size="lg" className="h-11" disabled={saving} onClick={() => onDone({ import_id: job.id, created_count: job.items_created })}>
          Continuar
          <ArrowRight aria-hidden="true" />
        </Button>
      );
    }
    return null;
  })();

  return (
    <StepFrame
      stepNumber={3}
      total={5}
      label="Catálogo"
      title={copy.title}
      lead={copy.lead}
      footer={
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Atrás
            </Button>
            {/* En «fallo» la acción vive en el estado vacío; repetirla aquí duplicaría el botón. */}
            {phase !== "completed" && phase !== "failed" ? (
              <Button variant="ghost" disabled={saving} onClick={onSkip}>
                Cargarlo a mano después
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {primary}
            {phase === "review" && blockers > 0 ? (
              <span id="catalog-blocker" className="text-muted-foreground text-xs">
                Solo se crean los productos listos; completa o excluye los {blockers} que faltan.
              </span>
            ) : null}
            {actionError ? (
              <span role="alert" className="text-destructive text-xs">
                {actionError}
              </span>
            ) : null}
          </div>
        </>
      }
      aside={
        phase === "review" ? (
          <StepAside
            glyph="catalog"
            title="Antes de crear"
            text="Solo se crean los productos marcados como «Listo». Los demás puedes completarlos ahora, excluirlos o terminarlos después en Catálogo."
            tips={["Nada se publica sin tu confirmación", "Los duplicados de productos existentes se omiten", "Podrás añadir fotos después"]}
          />
        ) : (
          <StepAside
            glyph="catalog"
            title="Qué hace la IA"
            text="Extrae nombre, precio, descripción y categoría de cada producto. Lo que no encuentre te lo pide antes de crear nada."
            tips={["Nunca inventa precios: si falta, te pregunta", "Detecta duplicados con productos ya creados", "Puedes excluir lo que no quieras vender por chat"]}
          />
        )
      }
    >
      {phase === "upload" ? (
        <>
          <ImportDropzone onFile={(file) => void upload(file)} disabled={uploading} nicheHint={hint} />
          {uploading ? (
            <p role="status" className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
              <LoaderCircle aria-hidden="true" className="text-brand size-4 animate-spin" />
              Subiendo el archivo…
            </p>
          ) : null}
        </>
      ) : null}

      {phase === "processing" && job ? (
        <ImportJobProgress job={job} stalled={stalled} onKeepWaiting={resume} onContinueLater={onSkip} />
      ) : null}

      {phase === "review" && job ? (
        <ExtractedProductsReview items={job.items ?? []} edits={edits} onEditsChange={setEdits} />
      ) : null}

      {phase === "completed" && job ? (
        <div className="border-border bg-background/70 rounded-2xl border p-5 text-sm leading-relaxed">
          <p>
            <strong>{job.items_created}</strong> productos creados{job.items_updated ? `, ${job.items_updated} actualizados` : ""}
            {job.items_skipped ? `, ${job.items_skipped} omitidos` : ""}
            {nicheName ? ` con las categorías de ${nicheName.toLowerCase()}` : ""}.{" "}
            <Link href="/catalog/products" className="text-brand font-medium hover:underline">
              Ver el catálogo
            </Link>
          </p>
        </div>
      ) : null}

      {phase === "failed" && job ? (
        <EmptyState
          glyph="noresults"
          title="No pudimos leer este archivo"
          description={
            job.error ??
            "Por ahora leemos Excel, CSV, PDF con texto y fotos del menú. Prueba con una foto directa de la carta o con tu lista de precios."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setImportId(null)}>Probar con otro archivo</Button>
              <Button variant="outline" onClick={onSkip}>
                Cargarlo a mano después
              </Button>
            </div>
          }
        />
      ) : null}

      {jobError ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {jobError}
        </p>
      ) : null}
    </StepFrame>
  );
}
