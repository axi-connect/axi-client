"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, MoreHorizontal, Plus } from "lucide-react";
import { useDeepLinkTarget } from "@/core/hooks/use-deep-link-target";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TEMPLATE_KIND_LABELS } from "@/modules/marketing/domain/enums";
import {
  describeTemplateContent,
  type TemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import {
  TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_LABELS,
  invalidTemplateVariables,
  MIN_MESSAGE_TEMPLATE_LENGTH,
} from "@/modules/marketing/domain/template";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import { MessageTemplateField } from "./components/MessageTemplateField";

/**
 * Plantillas reutilizables del tenant.
 *
 * El alta desde aquí solo crea plantillas de TEXTO: `media` necesita el flujo de
 * subida de archivos y `hsm` es un enlace a una plantilla de Meta que se elige
 * en su propia pantalla. Las de esos dos tipos se listan y se editan, pero no se
 * crean aquí — ofrecer un formulario que no puede completarse sería peor.
 */
export function TemplatesView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [templates, setTemplates] = useState<TemplateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ template: TemplateDTO | null } | null>(null);

  const load = useCallback(async () => {
    try {
      setTemplates(await listTemplates());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar tus plantillas"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Llegar desde el chat de Axel: `?template=<id>` abre ese mensaje. */
  const deepLink = useDeepLinkTarget("template", templates, {
    onFound: (template) => {
      setEditing({ template });
    },
    onMissing: () => {
      showAlert({
        tone: "warning",
        title: "Ese mensaje ya no está",
        description: "Se eliminó o alguien de tu equipo lo cambió.",
        open: true,
      });
    },
  });

  const sorted = useMemo(
    () =>
      [...(templates ?? [])].sort(
        (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name),
      ),
    [templates],
  );

  function handleDelete(template: TemplateDTO) {
    showModal({
      title: `¿Eliminar «${template.name}»?`,
      description:
        "Las campañas que ya la usaron conservan su copia del contenido, pero no podrás volver a elegirla.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Eliminar",
          variant: "destructive",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await deleteTemplate(template.id);
                setTemplates((prev) => prev?.filter((t) => t.id !== template.id) ?? prev);
                showAlert({ tone: "success", title: "Plantilla eliminada", open: true });
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo eliminar"),
                  open: true,
                });
              }
            })();
          },
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Textos reutilizables para tus campañas y reglas.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing({ template: null })}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva plantilla
          </Button>
        )}
      </div>

      {error !== null ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : templates === null ? (
        <TableSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          accent="amber"
          title="Aún no tienes plantillas"
          description="Guarda aquí los mensajes que repites, con variables como el nombre del cliente, y reutilízalos en campañas y reglas."
          action={
            canManage && (
              <Button onClick={() => setEditing({ template: null })}>
                Crear mi primera plantilla
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <caption className="sr-only">Plantillas del tenant</caption>
            <thead>
              <tr className="border-b border-border/60 bg-foreground/[0.02]">
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Contenido</Th>
                <Th>Estado</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((template) => (
                <tr key={template.id} className="border-b border-border/60 last:border-none">
                  <td className="px-4 py-2.5 font-medium">{template.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {TEMPLATE_KIND_LABELS[template.kind]}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="line-clamp-2">{describeTemplateContent(template)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {template.is_active ? (
                      <Badge
                        variant="outline"
                        className="border-success/40 bg-success/10 text-success"
                      >
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline">Apagada</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing({ template })}
                        >
                          Editar
                        </Button>
                        <details className="relative">
                          <summary
                            className="inline-flex size-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
                            aria-label={`Más acciones de ${template.name}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </summary>
                          <div className="glass absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg p-1">
                            <button
                              type="button"
                              className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                              onClick={() => handleDelete(template)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </details>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background p-5">
        <h3 className="text-sm font-semibold">Variables disponibles</h3>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((variable) => (
            <span
              key={variable}
              title={TEMPLATE_VARIABLE_LABELS[variable]}
              className="rounded-full border border-input px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
            >
              {`{{${variable}}}`}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Si una variable no tiene dato, se omite limpiamente: al cliente nunca le llega un{" "}
          <span className="font-mono">{"{{…}}"}</span> sin rellenar. En campañas solo se rellenan
          las tres primeras.
        </p>
      </div>

      <TemplateSheet
        state={editing}
        onClose={() => {
          setEditing(null);
          deepLink.clear();
        }}
        onSaved={(saved) => {
          setTemplates((prev) => {
            if (!prev) return [saved];
            return prev.some((t) => t.id === saved.id)
              ? prev.map((t) => (t.id === saved.id ? saved : t))
              : [saved, ...prev];
          });
          setEditing(null);
          deepLink.clear();
        }}
      />
    </div>
  );
}

function TemplateSheet({
  state,
  onClose,
  onSaved,
}: {
  state: { template: TemplateDTO | null } | null;
  onClose: () => void;
  onSaved: (template: TemplateDTO) => void;
}) {
  const { showAlert } = useAlert();
  const template = state?.template ?? null;

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Al abrir el sheet se siembra con la plantilla elegida (o en blanco).
  useEffect(() => {
    if (state === null) return;
    setName(template?.name ?? "");
    setBody(template?.body ?? "");
    setIsActive(template?.is_active ?? true);
  }, [state, template]);

  const nameError =
    name.trim().length > 0 && name.trim().length < 3 ? "Mínimo 3 caracteres" : undefined;
  const invalid = invalidTemplateVariables(body);
  const bodyError =
    invalid.length > 0
      ? `Estas variables no existen: ${invalid.map((v) => `{{${v}}}`).join(", ")}`
      : body.trim().length > 0 && body.trim().length < MIN_MESSAGE_TEMPLATE_LENGTH
        ? "El mensaje es demasiado corto"
        : undefined;

  const isText = template === null || template.kind === "text";
  const canSubmit =
    name.trim().length >= 3 &&
    body.trim().length >= MIN_MESSAGE_TEMPLATE_LENGTH &&
    invalid.length === 0;

  async function handleSave() {
    setSaving(true);
    try {
      const saved = template
        ? await updateTemplate(template.id, {
            name: name.trim(),
            body: body.trim(),
            is_active: isActive,
          })
        : await createTemplate({
            name: name.trim(),
            kind: "text",
            body: body.trim(),
            is_active: isActive,
          });
      showAlert({
        tone: "success",
        title: template ? "Plantilla actualizada" : "Plantilla creada",
        open: true,
      });
      onSaved(saved);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo guardar la plantilla"),
        open: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DetailSheet
      open={state !== null}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      title={template ? "Editar plantilla" : "Nueva plantilla"}
      subtitle={
        isText
          ? "Un texto con variables que puedes reutilizar en campañas y reglas."
          : `Plantilla de tipo ${TEMPLATE_KIND_LABELS[template.kind].toLowerCase()}: aquí solo se edita su nombre y su estado.`
      }
      renderFooter={() => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || saving || !isText} onClick={() => void handleSave()}>
            {saving ? "Guardando…" : template ? "Guardar cambios" : "Crear plantilla"}
          </Button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tpl-name" className="text-xs font-medium text-muted-foreground">
            Nombre
          </label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Promo de julio"
            aria-invalid={Boolean(nameError)}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        {isText ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Mensaje</span>
            <MessageTemplateField
              value={body}
              onChange={setBody}
              available={TEMPLATE_VARIABLES}
              error={bodyError}
            />
          </div>
        ) : (
          <p className="rounded-md border border-border/60 bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            El contenido de esta plantilla se gestiona en su origen:{" "}
            {template.kind === "media"
              ? "el archivo se sube desde el flujo de adjuntos."
              : "la plantilla vive en Meta y se sincroniza desde «Plantillas de Meta»."}
          </p>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent/60">
          <input
            type="checkbox"
            className="accent-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Disponible para elegir en campañas y reglas
        </label>
      </div>
    </DetailSheet>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </th>
  );
}
