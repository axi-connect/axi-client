"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Layers, RotateCcw, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { StatePill } from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import {
  appendBlock,
  moveBlock,
  moveBlockToEdge,
  newBlock,
  newBlockId,
  removeBlock,
  templateHash,
  cautionedTemplateVariables,
  unknownTemplateVariables,
  updateBlock,
  type BlockCatalogView,
  type BlockType,
  type DocumentTemplateDTO,
  type DocumentTypeView,
  type TemplateBlock,
  type TemplateDocument,
} from "@/modules/documents/domain/template";
import { useTemplatePreview } from "@/modules/documents/infrastructure/hooks/use-template-preview";
import {
  resetDocumentTemplate,
  saveDocumentTemplate,
} from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { BlockList } from "./BlockList";
import { BlockPalette } from "./BlockPalette";
import { TemplatePreviewFrame } from "./TemplatePreviewFrame";

/**
 * El editor de UNA plantilla (F7 Cobros): el papel manda. A la derecha, la
 * hoja producida por la misma cadena que el PDF; a la izquierda, los bloques
 * como índice del papel. El estado vive aquí (plantilla en edición, bloque
 * abierto, sucio); guardar crea una versión nueva y restablecer vuelve al
 * modelo de Axi sin borrar el historial. Quien lo monta (Mi empresa hoy;
 * cualquier proceso mañana) solo pasa el tipo, la plantilla que manda y el
 * catálogo por el wire.
 */
export function DocumentTemplateEditor({
  type,
  catalog,
  current,
  onSaved,
  dirtyRef,
}: {
  type: DocumentTypeView;
  catalog: readonly BlockCatalogView[];
  current: DocumentTemplateDTO;
  onSaved: (next: DocumentTemplateDTO) => void;
  /** Para que quien cambia de tipo pueda preguntar antes de perder cambios. */
  dirtyRef?: { current: boolean };
}) {
  const { showAlert, showModal, closeModal } = useAlert();
  const [template, setTemplate] = useState<TemplateDocument>(current.template);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Al cambiar la plantilla que manda (otro tipo, o tras guardar/restablecer)
  // el editor arranca de ella.
  useEffect(() => {
    setTemplate(current.template);
    setOpenId(null);
    setServerError(null);
  }, [current]);

  const savedHash = templateHash(current.template);
  const dirty = templateHash(template) !== savedHash;
  useEffect(() => {
    if (dirtyRef) dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

  // Un cierre de pestaña con cambios sin guardar pregunta (el navegador pone el texto).
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const unknown = useMemo(
    () => unknownTemplateVariables(template, type.variables),
    [template, type.variables],
  );
  const cautioned = useMemo(
    () => cautionedTemplateVariables(template, type.variables),
    [template, type.variables],
  );
  const preview = useTemplatePreview({
    type: type.code,
    template,
    blocked: unknown.length > 0,
    enabled: true,
  });

  const patch = (next: TemplateBlock) =>
    setTemplate((prev) => updateBlock(prev, next));
  const add = (blockType: BlockType) =>
    setTemplate((prev) => {
      const id = newBlockId(blockType, prev.blocks);
      setOpenId(id);
      return appendBlock(prev, newBlock(blockType, id));
    });

  const save = async () => {
    if (unknown.length > 0) return;
    setSaving(true);
    setServerError(null);
    try {
      const saved = await saveDocumentTemplate(type.code, template);
      onSaved(saved);
      showAlert({
        tone: "success",
        title: "Plantilla guardada",
        description: `${type.label} · versión ${String(saved.version)}. Los documentos que ya salieron conservan la versión con la que se emitieron.`,
      });
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.featureDisabled)) {
        setServerError("La función de documentos está apagada.");
      } else {
        setServerError(errorMessage(error, "No se pudo guardar la plantilla"));
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const restored = await resetDocumentTemplate(type.code);
      onSaved(restored);
      closeModal();
      showAlert({
        tone: "success",
        title: "Vuelve el modelo de Axi",
        description:
          "Tus versiones no se borraron: la próxima edición será la siguiente, no la 1.",
      });
    } catch (error) {
      closeModal();
      showAlert({
        tone: "error",
        title: "No se pudo restablecer",
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  // §9.4: una decisión que bloquea es `showModal`, como el resto del panel.
  const confirmReset = () =>
    showModal({
      title: "Volver al modelo de Axi",
      description: `Tu ${type.label.toLowerCase()} deja de usarse y vuelve el texto de fábrica. ${
        current.version === 1
          ? "La versión que escribiste no se borra"
          : `Las ${String(current.version)} versiones que escribiste no se borran`
      }: los documentos que ya salieron con ellas siguen igual, y si vuelves a editar empiezas en la versión ${String(current.version + 1)}.`,
      actions: [
        {
          label: "Cancelar",
          variant: "outline",
          id: "document-template-reset-cancel",
        },
        {
          label: "Restablecer",
          variant: "destructive",
          keepOpen: true,
          onClick: () => void reset(),
          id: "document-template-reset-confirm",
        },
      ],
      className: "sm:max-w-md",
    });

  const nextVersion = current.source === "tenant" ? current.version + 1 : 1;
  const meta = dirty
    ? `Guardar crea tu versión ${String(nextVersion)}; lo ya emitido conserva la suya.`
    : current.source === "tenant"
      ? "Lo que ya se emitió conserva la versión con la que salió."
      : "Edita lo que quieras: al guardar nace tu versión 1 y el modelo de Axi sigue ahí para volver.";

  return (
    <div className="flex flex-col gap-4">
      {/* Por debajo de lg la columna es minmax(0,1fr) y no `auto`: con `auto`
          tomaba el ancho mínimo de su contenido (453 px) y a 390 cortaba el
          contenido sin barra ni pista (QA real F7, móvil). */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <section
          aria-label={`Bloques de ${type.label.toLowerCase()}`}
          className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5 md:p-6"
        >
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-heading text-2xl leading-tight font-bold tracking-tight">
                  {type.label}
                </h3>
                {current.source === "tenant" ? (
                  <StatePill tone="info">
                    Tu versión {current.version}
                  </StatePill>
                ) : (
                  <StatePill tone="neutral">Modelo de Axi</StatePill>
                )}
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {meta}
              </p>
            </div>
            {current.source === "tenant" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                onClick={confirmReset}
                disabled={saving}
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Restablecer
                <span className="sr-only"> al modelo de Axi</span>
              </Button>
            )}
          </header>

          <div className="flex flex-col gap-1.5">
            <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Layers aria-hidden="true" className="size-3.5" />
                Los bloques, en el orden en que se imprimen
              </span>
              <span className="tabular-nums">{template.blocks.length}</span>
            </p>
            <BlockList
              blocks={template.blocks}
              type={type}
              catalog={catalog}
              variables={type.variables}
              unknownVariables={unknown}
              openId={openId}
              onOpen={setOpenId}
              onChange={patch}
              onMove={(id, direction) =>
                setTemplate((prev) => moveBlock(prev, id, direction))
              }
              onMoveToEdge={(id, edge) =>
                setTemplate((prev) => moveBlockToEdge(prev, id, edge))
              }
              onRemove={(id) => setTemplate((prev) => removeBlock(prev, id))}
            />
          </div>
          <BlockPalette type={type} catalog={catalog} onAdd={add} />

          {unknown.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>
                {unknown.length === 1
                  ? `{{${unknown[0] ?? ""}}} no existe en ${type.label.toLowerCase()}`
                  : `Estas variables no existen en ${type.label.toLowerCase()}: ${unknown.map((name) => `{{${name}}}`).join(" ")}`}
              </AlertTitle>
              <AlertDescription>
                La vista previa espera hasta que la corrijas; las variables
                disponibles están bajo cada texto.
              </AlertDescription>
            </Alert>
          )}
          {cautioned.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>
                Esta frase puede salir rota en algunos pedidos
              </AlertTitle>
              <AlertDescription>
                <ul className="flex flex-col gap-0.5">
                  {cautioned.map((one) => (
                    <li key={one.name}>
                      <code>{`{{${one.name}}}`}</code> {one.reason}: usa{" "}
                      <code>{`{{${one.use_instead}}}`}</code>, que arma la frase
                      según el plan de cada pedido.
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {serverError !== null && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>{serverError}</AlertTitle>
            </Alert>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Lo que dice{" "}
            <strong className="font-medium whitespace-nowrap text-foreground">
              «filas desde los datos»
            </strong>{" "}
            o{" "}
            <strong className="font-medium whitespace-nowrap text-foreground">
              «solo si hay plan de pagos»
            </strong>{" "}
            lo decide cada pedido al emitir. Lo que decides tú es{" "}
            <strong className="font-medium whitespace-nowrap text-foreground">
              cuándo aparece
            </strong>{" "}
            un párrafo, unas cláusulas o unos pares: dentro de cada uno.
          </p>
        </section>

        <TemplatePreviewFrame
          className="order-first lg:order-none"
          html={preview.html}
          status={preview.status}
          error={preview.error}
          onRetry={preview.retry}
        />
      </div>

      {/* Una isla por pantalla: la barra de tinta es la única, y solo con cambios.
          No es un <form>: un Enter en un campo del bloque no debe guardar. */}
      <UnsavedChangesDock
        dirty={dirty}
        submitting={saving}
        invalid={unknown.length > 0}
        invalidReason={
          unknown.length > 0
            ? `Corrige ${unknown.map((name) => `{{${name}}}`).join(" ")} para guardar.`
            : undefined
        }
        detail={meta}
        submitLabel="Guardar plantilla"
        onSave={() => void save()}
        onDiscard={() => setTemplate(current.template)}
      />
    </div>
  );
}
