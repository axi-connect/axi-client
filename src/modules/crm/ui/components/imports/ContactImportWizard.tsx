"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CloudUpload,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { triggerDownload } from "@/core/lib/download";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MultiSelect } from "@/shared/components/features/multi-select";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_ORDER,
  type ContactLifecycleStage,
} from "@/modules/crm/domain/enums";
import {
  IMPORT_ACCEPT_ATTRIBUTE,
  IMPORT_MAX_ROWS,
  formatFileSize,
  validateImportFile,
  type ImportJobDTO,
  type ImportOptions,
} from "@/modules/crm/domain/import";
import type { TagDTO } from "@/modules/crm/domain/segment";
import {
  readImportGuideSeen,
  writeImportGuideSeen,
} from "@/modules/crm/infrastructure/import-guide.storage";
import { useImportJob } from "@/modules/crm/infrastructure/hooks/use-import-job";
import {
  createImport,
  importTemplateUrl,
} from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { listTags } from "@/modules/crm/infrastructure/services/segments-service.adapter";
import { BulkFollowUpButton } from "@/modules/crm/ui/components/BulkFollowUpButton";
import { EnrollInSequenceButton } from "@/modules/crm/ui/components/EnrollInSequenceButton";
import { ImportGuideCard } from "./ImportGuideCard";
import { ImportReport, ImportStatusBadge } from "./ImportReport";

export type ImportWizardStep = "guide" | "upload" | "processing" | "report";

/** Título y descripción por paso: el modal los pinta en su cabecera; la página, el wizard. */
export const IMPORT_STEP_COPY: Record<ImportWizardStep, { title: string; description: string }> =
  {
    guide: {
      title: "Prepara tu archivo para empezar",
      description:
        "Sube un archivo con estas columnas y leeremos tus contactos sin errores. Si ya tienes tu base, solo renombra las cabeceras.",
    },
    upload: {
      title: "Importar contactos",
      description: "Sube tu archivo. Los duplicados se detectan por teléfono o correo.",
    },
    processing: {
      title: "Importando contactos",
      description: "Leemos el archivo fila a fila y validamos teléfonos, correos y etapas.",
    },
    report: {
      title: "Importación terminada",
      description: "Así quedó tu archivo. Las filas con error no se importaron.",
    },
  };

export interface ContactImportWizardProps {
  /**
   * `modal`: el diálogo pone título y descripción; empieza por la guía salvo
   * que el usuario la haya descartado. `embedded`: cabeceras propias por paso
   * y sin guía inicial (queda el enlace «Ver estructura del archivo»).
   */
  variant: "modal" | "embedded";
  /** Cierra el contenedor (Cancelar, Ahora no, Cerrar, Ver contactos). */
  onClose?: () => void;
  onStepChange?: (step: ImportWizardStep) => void;
  /** Job terminal (completed o failed): la pantalla de historial refresca aquí. */
  onJobDone?: (job: ImportJobDTO) => void;
}

const NO_STAGE = "__none__";

/**
 * El asistente de importación (mockup F0 aprobado 2026-09-14): guía → archivo
 * + opciones → procesando → reporte. Un solo componente para el modal de
 * Contactos y para /crm/settings/imports, así el flujo no se bifurca.
 */
export function ContactImportWizard({
  variant,
  onClose,
  onStepChange,
  onJobDone,
}: ContactImportWizardProps) {
  const { showAlert } = useAlert();
  const [step, setStep] = useState<ImportWizardStep | null>(null);
  const [guideFromUpload, setGuideFromUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [onDuplicate, setOnDuplicate] = useState<ImportOptions["on_duplicate"]>("skip");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [stage, setStage] = useState<ContactLifecycleStage | null>(null);
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputId = `crm-import-file-${variant}`;

  const onJobDoneRef = useRef(onJobDone);
  onJobDoneRef.current = onJobDone;
  const { job, start, reset } = useImportJob((finished) => {
    setStep("report");
    // La lista de contactos escucha este evento para refrescarse (patrón de la tabla).
    if (finished.created_count + finished.updated_count > 0) {
      window.dispatchEvent(new CustomEvent("crm:contacts:save:success"));
    }
    onJobDoneRef.current?.(finished);
  });

  // La preferencia vive en localStorage: se lee al montar (nunca en el render
  // del servidor) para no desincronizar la hidratación de la página completa.
  useEffect(() => {
    setStep(variant === "modal" && !readImportGuideSeen() ? "guide" : "upload");
  }, [variant]);

  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  useEffect(() => {
    if (step !== null) onStepChangeRef.current?.(step);
  }, [step]);

  useEffect(() => {
    listTags()
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  const acceptFile = useCallback(
    (candidate: File) => {
      const reason = validateImportFile(candidate);
      if (reason !== null) {
        setFileError(reason);
        showAlert({
          tone: "error",
          title: "No pudimos usar ese archivo",
          description: reason,
          open: true,
        });
        return;
      }
      setFileError(null);
      setFile(candidate);
    },
    [showAlert],
  );

  const handleSubmit = async () => {
    if (file === null) return;
    setSubmitting(true);
    try {
      const created = await createImport(file, {
        on_duplicate: onDuplicate,
        tag_ids: tagIds,
        lifecycle_stage: stage ?? undefined,
      });
      start(created);
      setStep("processing");
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo iniciar la importación"),
        open: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    reset();
    setFile(null);
    setFileError(null);
    setStep("upload");
  };

  if (step === null) return null;

  const heading =
    variant === "embedded" ? (
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{IMPORT_STEP_COPY[step].title}</h3>
        <p className="text-sm text-muted-foreground">{IMPORT_STEP_COPY[step].description}</p>
      </div>
    ) : null;

  if (step === "guide") {
    return (
      <div className="space-y-4">
        {heading}
        <ImportGuideCard
          onDownloadTemplate={() => triggerDownload(importTemplateUrl())}
          skipLabel={guideFromUpload ? "Volver" : "Ahora no"}
          showDontShowAgain={!guideFromUpload}
          onSkip={() => {
            if (guideFromUpload) setStep("upload");
            else onClose?.();
          }}
          onContinue={(dontShowAgain) => {
            if (dontShowAgain) writeImportGuideSeen(true);
            setStep("upload");
          }}
        />
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {heading ?? <span />}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setGuideFromUpload(true);
              setStep("guide");
            }}
          >
            <Info className="size-4" />
            Ver estructura del archivo
          </Button>
        </div>

        {file !== null ? (
          <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3.5 rounded-2xl border border-border bg-background px-3.5 py-3">
            <span className="grid size-11 place-items-center rounded-xl bg-secondary text-success" aria-hidden>
              <FileSpreadsheet className="size-[22px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file.name}</span>
              <span className="block text-xs text-muted-foreground">
                {file.name.toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV"} ·{" "}
                {formatFileSize(file.size)} · listo para importar
              </span>
            </span>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setFile(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const dropped = event.dataTransfer.files[0];
              if (dropped !== undefined) acceptFile(dropped);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors",
              dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/50",
              fileError !== null && "border-destructive bg-destructive/6",
            )}
          >
            <CloudUpload
              className={cn("size-8", fileError !== null ? "text-destructive" : "text-muted-foreground")}
              aria-hidden
            />
            <p className="text-sm font-medium">Arrastra tu CSV o XLSX aquí o haz clic para elegirlo</p>
            <p className="text-xs text-muted-foreground">
              Máx. 10 MB · {IMPORT_MAX_ROWS.toLocaleString("es-CO")} filas · una fila por contacto
            </p>
            {fileError !== null && (
              <p className="text-xs text-destructive" role="alert">
                {fileError}
              </p>
            )}
            <input
              id={inputId}
              type="file"
              accept={IMPORT_ACCEPT_ATTRIBUTE}
              className="sr-only"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                if (chosen !== undefined) acceptFile(chosen);
                event.target.value = "";
              }}
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Si el contacto ya existe</span>
            <Select
              value={onDuplicate}
              onValueChange={(value) => setOnDuplicate(value as ImportOptions["on_duplicate"])}
            >
              <SelectTrigger className="h-9 w-full" aria-label="Manejo de duplicados">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Omitir la fila</SelectItem>
                <SelectItem value="update">Actualizar sus datos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Etiquetar como</span>
              <MultiSelect
                options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
                defaultValue={tagIds}
                onValueChange={setTagIds}
                placeholder="Sin etiquetas"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Etapa inicial</span>
            <Select
              value={stage ?? NO_STAGE}
              onValueChange={(value: string) =>
                setStage(value === NO_STAGE ? null : (value as ContactLifecycleStage))
              }
            >
              <SelectTrigger className="h-9 w-full" aria-label="Etapa inicial">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STAGE}>Default (prospecto)</SelectItem>
                {CONTACT_STAGE_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {CONTACT_STAGE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {onClose !== undefined && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full"
            disabled={file === null || submitting}
            onClick={() => void handleSubmit()}
          >
            <FileUp className="size-4" />
            {submitting ? "Subiendo…" : "Importar contactos"}
          </Button>
        </div>
      </div>
    );
  }

  if (job === null) return null;

  if (step === "processing") {
    return (
      <div className="space-y-4">
        {heading}
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-mono text-sm font-medium">{job.filename}</span>
          <ImportStatusBadge status={job.status} />
        </div>
        {/* Existe solo mientras el servidor procesa (DESIGN-SYSTEM §6: no es un loop decorativo). */}
        <div
          role="progressbar"
          aria-label="Importando contactos"
          aria-busy="true"
          className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
        >
          <div className="progress-indeterminate bg-brand-gradient absolute inset-y-0 left-0 w-2/5 rounded-full" />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Los contactos aparecerán en la lista al terminar.
        </p>
        <div className="grid grid-cols-[1.125rem_1fr] gap-2.5 rounded-xl bg-secondary px-3 py-2.5 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4" aria-hidden />
          <span>
            Puedes cerrar esta ventana: la importación sigue en segundo plano y te avisamos con
            una notificación cuando termine.
          </span>
        </div>
        {onClose !== undefined && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    );
  }

  const failure = job.status === "failed" ? (job.errors[0]?.message ?? "La importación falló") : null;
  return (
    <div className="space-y-4">
      {heading}
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate font-mono text-sm font-medium">{job.filename}</span>
        <ImportStatusBadge status={job.status} />
        {job.total_rows !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            · {job.total_rows.toLocaleString("es-CO")} filas
          </span>
        )}
      </div>
      {failure !== null ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/6 px-3.5 py-3 text-sm"
        >
          {failure}
        </p>
      ) : (
        <ImportReport job={job} />
      )}
      {/* F4a: el final del camino. Sin esto, la lista entra y nadie la
          trabaja — que es donde un CRM se queda en agenda. Va en el propio
          asistente (no solo en el historial de /crm/settings/imports) porque
          es el MISMO paso "importación terminada" tanto en modal como
          embebido. */}
      {failure === null && job.created_count > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <BulkFollowUpButton
            audience={{ source: "import", import_job_id: job.id }}
            audienceLabel={`Del import ${job.filename}`}
            label={`Poner al agente a trabajar con los ${String(job.created_count)}`}
          />
          <EnrollInSequenceButton audience={{ source: "import", import_job_id: job.id }} />
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-full" onClick={startOver}>
          <RotateCcw className="size-3.5" />
          {failure !== null ? "Intentar de nuevo" : "Importar otro"}
        </Button>
        {onClose !== undefined && (
          <Button size="sm" className="rounded-full" onClick={onClose}>
            Ver contactos
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
