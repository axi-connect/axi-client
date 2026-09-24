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
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import {
  appendBlock,
  moveBlock,
  moveBlockToEdge,
  newBlock,
  newBlockId,
  removeBlock,
  templateHash,
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {current.source === "tenant" ? (
            <StatusBadge
              status="tenant"
              map={{
                tenant: {
                  label: `Tu versión ${String(current.version)}`,
                  tone: "info",
                },
              }}
              appearance="dot"
            />
          ) : (
            <StatusBadge
              status="system"
              map={{ system: { label: "Modelo de Axi", tone: "neutral" } }}
              appearance="dot"
            />
          )}
          {dirty && (
            <span className="text-xs text-muted-foreground">
              · cambios sin guardar
            </span>
          )}
          {current.source === "system" && !dirty && (
            <span className="text-xs text-muted-foreground">
              · edita lo que quieras: al guardar nace tu versión 1 y el modelo
              de Axi sigue ahí para volver
            </span>
          )}
        </div>
        {current.source === "tenant" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={confirmReset}
            disabled={saving}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Restablecer al modelo de Axi
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
            <Layers aria-hidden="true" className="size-3.5" />
            Los bloques, en el orden en que se imprimen
            <span className="ml-auto tabular-nums">
              {template.blocks.length}
            </span>
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
          <div className="px-1">
            <BlockPalette type={type} catalog={catalog} onAdd={add} />
          </div>

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
          {serverError !== null && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>{serverError}</AlertTitle>
            </Alert>
          )}

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Lo que lleva{" "}
            <strong className="font-medium text-foreground">
              «filas desde los datos»
            </strong>{" "}
            se rellena con el pedido al emitir y{" "}
            <strong className="font-medium text-foreground">
              «solo si hay plan de pagos»
            </strong>{" "}
            es lo que ese bloque es: desaparece solo en un documento de pago
            único. Lo que sí decides tú es{" "}
            <strong className="font-medium text-foreground">
              cuándo aparece
            </strong>{" "}
            un párrafo, unas cláusulas o unos pares: dentro de cada uno, en
            «Cuándo aparece».
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || saving}
              onClick={() => setTemplate(current.template)}
            >
              Descartar cambios
            </Button>
            <Button
              type="button"
              disabled={!dirty || saving || unknown.length > 0}
              onClick={() => void save()}
            >
              Guardar plantilla
            </Button>
          </div>
        </div>

        <TemplatePreviewFrame
          html={preview.html}
          status={preview.status}
          error={preview.error}
          onRetry={preview.retry}
        />
      </div>
    </div>
  );
}
