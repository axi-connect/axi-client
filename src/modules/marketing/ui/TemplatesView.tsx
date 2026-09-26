"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDeepLinkTarget } from "@/core/hooks/use-deep-link-target";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
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
import { LoadError, TableCard, TD, TH } from "./components/premium";

/**
 * Mensajes: las plantillas reutilizables del tenant (textos propios; las de
 * Meta viven en su propia pestaña).
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
                showAlert({ tone: "success", title: "Plantilla eliminada" });
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo eliminar"),
                });
              }
            })();
          },
        },
      ],
    });
  }

  /** Editar y eliminar, en la fila y no en un menú: la tabla scrollea y un menú no portalizado se recortaría. */
  function rowActions(template: TemplateDTO) {
    return (
      <div className="flex items-center gap-1 @md:justify-end">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing({ template })}>
          Editar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive size-9 rounded-full"
          aria-label={`Eliminar ${template.name}`}
          onClick={() => handleDelete(template)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm text-pretty">Textos reutilizables para tus campañas y reglas.</p>
        {canManage && (
          <Button size="sm" className="rounded-full" onClick={() => setEditing({ template: null })}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo mensaje
          </Button>
        )}
      </div>

      {error !== null ? (
        <LoadError message={error} onRetry={load} />
      ) : templates === null ? (
        <TableSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          glyph="conversation"
          title="Aún no tienes mensajes guardados"
          description="Guarda aquí los mensajes que repites, con variables como el nombre del cliente, y reutilízalos en campañas y reglas."
          action={
            canManage && (
              <Button onClick={() => setEditing({ template: null })}>
                Crear mi primer mensaje
              </Button>
            )
          }
        />
      ) : (
        <TableCard>
          <Table>
            <caption className="sr-only">Mensajes guardados</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${TH} @md:min-w-48`}>Nombre</TableHead>
                <TableHead className={`${TH} hidden @xl:table-cell`}>Tipo</TableHead>
                <TableHead className={`${TH} hidden @4xl:table-cell`}>Contenido</TableHead>
                <TableHead className={`${TH} hidden @lg:table-cell`}>Estado</TableHead>
                <TableHead className={`${TH} hidden @md:table-cell`}>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className={`${TD} whitespace-normal`}>
                    <span className="block max-w-[14rem] truncate font-medium @4xl:max-w-[20rem]" title={template.name}>
                      {template.name}
                    </span>
                    {/* Con la tabla estrecha, tipo y estado suben aquí: sin columnas que obliguen a desplazar. */}
                    <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-1 text-xs @xl:hidden">
                      <span className="whitespace-nowrap">{TEMPLATE_KIND_LABELS[template.kind]}</span>
                      <span className="whitespace-nowrap @lg:hidden">· {template.is_active ? "Activa" : "Apagada"}</span>
                    </span>
                    {/* Con la tabla muy estrecha, las acciones bajan aquí: al lado del nombre no caben. */}
                    {canManage && <div className="mt-2 @md:hidden">{rowActions(template)}</div>}
                  </TableCell>
                  <TableCell className={`${TD} text-muted-foreground hidden text-sm @xl:table-cell`}>
                    {TEMPLATE_KIND_LABELS[template.kind]}
                  </TableCell>
                  <TableCell className={`${TD} text-muted-foreground hidden max-w-md text-sm whitespace-normal @4xl:table-cell`}>
                    <span className="line-clamp-2">{describeTemplateContent(template)}</span>
                  </TableCell>
                  <TableCell className={`${TD} hidden @lg:table-cell`}>
                    <StatePill tone={template.is_active ? "success" : "neutral"}>
                      {template.is_active ? "Activa" : "Apagada"}
                    </StatePill>
                  </TableCell>
                  <TableCell className={`${TD} hidden text-right @md:table-cell`}>
                    {canManage && rowActions(template)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}

      <section className="border-border bg-card rounded-3xl border p-5">
        <h2 className="text-muted-foreground font-sans text-xs font-normal">Variables disponibles</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((variable) => (
            <span
              key={variable}
              title={TEMPLATE_VARIABLE_LABELS[variable]}
              className="bg-muted rounded-lg px-2 py-1 font-mono text-xs"
            >
              {`{{${variable}}}`}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-xs text-pretty">
          Si una variable no tiene dato, se omite limpiamente: al cliente nunca le llega un{" "}
          <span className="font-mono">{"{{…}}"}</span> sin rellenar. En campañas solo se rellenan las tres primeras.
        </p>
      </section>

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
      });
      onSaved(saved);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo guardar la plantilla"),
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
      title={template ? "Editar mensaje" : "Nuevo mensaje"}
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
            {saving ? "Guardando…" : template ? "Guardar cambios" : "Crear mensaje"}
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

        <div className="border-border flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
          <label htmlFor="tpl-active" className="text-sm">
            Disponible para elegir en campañas y reglas
          </label>
          <Switch id="tpl-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
    </DetailSheet>
  );
}
