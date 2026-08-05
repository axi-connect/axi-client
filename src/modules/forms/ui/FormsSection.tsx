"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type Path } from "react-hook-form";
import { arrayMove } from "@dnd-kit/sortable";
import { AlertCircle } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { StatusAlert } from "@/shared/components/ui/notice";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  effectiveFields,
  FLOW_LABELS,
  FORM_FLOWS,
  type FlowForm,
  type FormFlow,
  type RecommendedField,
} from "@/modules/forms/domain/form";
import {
  deleteForm,
  listForms,
  upsertForm,
} from "@/modules/forms/infrastructure/services/form-service.adapter";
import { synthesizeForms } from "@/modules/forms/domain/form";
import {
  flowIssues,
  fromDto,
  newEditableField,
  toFormsValues,
  toUpsertDto,
  type FormsValues,
} from "@/modules/forms/ui/forms/config/form-definition.config";
import { ConversationPreview } from "./components/ConversationPreview";
import { DirtyActionBar } from "./components/DirtyActionBar";
import { FieldDetailPanel } from "./components/FieldDetailPanel";
import { FieldMasterList } from "./components/FieldMasterList";
import { FieldReadOnlyPanel } from "./components/FieldReadOnlyPanel";
import { FlowEmptyState } from "./components/FlowEmptyState";
import { FlowTabs } from "./components/FlowTabs";
import { FlowToolbar } from "./components/FlowToolbar";
import { FormsEditorSkeleton } from "./components/FormsEditorSkeleton";
import { InheritedFieldsNotice } from "./components/InheritedFieldsNotice";

const EMPTY_VALUES: FormsValues = FORM_FLOWS.reduce((acc, flow) => {
  acc[flow] = { is_active: true, fields: [] };
  return acc;
}, {} as FormsValues);

function isFormFlow(value: string | null): value is FormFlow {
  return value !== null && (FORM_FLOWS as readonly string[]).includes(value);
}

/**
 * Editor de formularios de captura (F10).
 *
 * Los TRES flujos viven en un único `useForm`: así cambiar de pestaña no pierde
 * el borrador y las lecturas cruzadas (la herencia de `order_intake`) salen
 * gratis. La escritura, en cambio, es por flujo (`PUT /forms/{flow}`), así que
 * la validación se hace con `flowIssues()` sobre el flujo activo y el reset
 * posterior es un `resetField` de ese subárbol — resetear todo marcaría como
 * limpios los borradores de los otros flujos.
 */
export function FormsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { showAlert, showModal } = useAlert();
  const { hasPermission, status } = useAuth();

  const canManage = hasPermission("forms:manage");
  const canRead = hasPermission("forms:read");
  const readOnly = !canManage;

  const [forms, setForms] = useState<Record<FormFlow, FlowForm> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // El flujo inicial se lee de la URL UNA vez; después la URL se sincroniza con
  // history.replaceState para no re-renderizar el árbol de servidor.
  const [flow, setFlow] = useState<FormFlow>(() => {
    const requested = searchParams.get("flow");
    return isFormFlow(requested) ? requested : "contact_registration";
  });

  const form = useForm<FormsValues>({ defaultValues: EMPTY_VALUES });
  const { dirtyFields } = form.formState;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const synthesized = synthesizeForms(await listForms());
      setForms(synthesized);
      form.reset(toFormsValues(synthesized));
    } catch (err) {
      setLoadError(err);
    }
  }, [form]);

  /**
   * La carga corre UNA sola vez. El guard por ref es necesario, no defensivo:
   * `load` depende de `form`, cuya identidad cambia entre renders, así que sin
   * él el efecto se repetiría y cada `form.reset` de la respuesta BORRARÍA el
   * estado dirty — el usuario perdería el borrador y el botón Guardar
   * desaparecería a media edición.
   */
  const loadedRef = useRef(false);
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canRead) {
      router.replace("/dashboard");
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [status, canRead, router, load]);

  const flowValues = form.watch(flow);
  // Memoizado: el `?? []` crearía una referencia nueva en cada render y haría
  // cambiar las deps de los efectos/memos que dependen de la lista.
  const fields = useMemo(() => flowValues?.fields ?? [], [flowValues?.fields]);
  const currentForm = forms?.[flow] ?? null;

  /*
   * Estos derivados se calculan en cada render, SIN `useMemo`, a propósito:
   * react-hook-form muta `dirtyFields` y `errors` en el sitio, así que su
   * identidad no cambia y un memo con esas dependencias nunca recomputaría (el
   * botón Guardar no aparecería nunca). Son O(3) y O(8): memoizarlos no compra
   * nada y sí introduce el bug.
   */
  const dirtyFlows = new Set(FORM_FLOWS.filter((candidate) => dirtyFields[candidate] !== undefined));
  const isDirty = dirtyFlows.has(flow);

  const counts = FORM_FLOWS.reduce((acc, candidate) => {
    acc[candidate] = form.getValues(candidate)?.fields.length ?? 0;
    return acc;
  }, {} as Record<FormFlow, number>);

  const configured = FORM_FLOWS.reduce((acc, candidate) => {
    acc[candidate] = forms?.[candidate].persisted === true || counts[candidate] > 0;
    return acc;
  }, {} as Record<FormFlow, boolean>);

  // Selección: siempre hay un campo elegido si hay campos. Al cambiar de flujo o
  // borrar una fila, cae en el vecino más cercano.
  useEffect(() => {
    if (fields.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey === null || !fields.some((field) => field.key === selectedKey)) {
      setSelectedKey(fields[0].key);
    }
  }, [fields, selectedKey]);

  const selectedIndex = fields.findIndex((field) => field.key === selectedKey);

  const fieldErrors = form.formState.errors[flow]?.fields;
  const invalidKeys = new Set(
    Array.isArray(fieldErrors)
      ? fields.filter((_, index) => fieldErrors[index] !== undefined).map((field) => field.key)
      : [],
  );

  const changeFlow = (next: FormFlow) => {
    setFlow(next);
    setSelectedKey(null);
    const url = new URL(window.location.href);
    url.searchParams.set("flow", next);
    window.history.replaceState(null, "", url.toString());
  };

  /** Aviso al recargar/cerrar con cambios pendientes (el sidebar no se puede interceptar). */
  useEffect(() => {
    if (dirtyFlows.size === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyFlows.size]);

  /**
   * Alta de campo. Con `preset` (elegido del catálogo) llega con label, tipo y
   * una indicación de partida; sin él es un dato personalizado en blanco.
   */
  const handleAdd = (preset?: RecommendedField) => {
    const created = newEditableField(preset);
    form.setValue(`${flow}.fields`, [...fields, created], { shouldDirty: true });
    setSelectedKey(created.key);
  };

  const handleMove = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= fields.length) return;
    const moved = fields[from];
    form.setValue(`${flow}.fields`, arrayMove(fields, from, to), { shouldDirty: true });
    setAnnouncement(
      `${moved.label.trim() === "" ? "El dato sin nombre" : moved.label} pasó a la posición ${
        to + 1
      } de ${fields.length}.`,
    );
  };

  const handleRemove = (index: number) => {
    const removed = fields[index];
    const next = fields.filter((_, position) => position !== index);
    const fallback = next[Math.min(index, next.length - 1)];

    const apply = () => {
      form.setValue(`${flow}.fields`, next, { shouldDirty: true });
      setSelectedKey(fallback?.key ?? null);
    };

    // Quitar un campo YA GUARDADO deja de recoger el dato: se confirma. Los
    // valores ya capturados se conservan (no hay FK a la definición).
    if (removed.persisted) {
      showModal({
        title: "Vas a dejar de pedir este dato",
        description: `Tu agente ya no pedirá ni guardará “${removed.label}”. Lo que ya recogiste en pedidos y contactos se conserva.`,
        actions: [
          { label: "Volver", variant: "outline", asClose: true, id: "field-remove-cancel" },
          {
            label: "Quitar el dato",
            variant: "destructive",
            asClose: true,
            id: "field-remove-confirm",
            onClick: apply,
          },
        ],
        className: "sm:max-w-md",
      });
      return;
    }
    apply();
  };

  const handleSave = async () => {
    const values = form.getValues(flow);
    form.clearErrors(flow);

    const issues = flowIssues(values, flow);
    if (issues.length > 0) {
      for (const issue of issues) {
        form.setError(issue.path as Path<FormsValues>, { type: "validate", message: issue.message });
      }
      // Lleva al usuario al primer campo culpable en lugar de un toast a ciegas.
      const firstIndex = Number(issues[0].path.split(".")[2]);
      if (Number.isInteger(firstIndex) && fields[firstIndex] !== undefined) {
        setSelectedKey(fields[firstIndex].key);
      }
      showAlert({ tone: "error", title: "Revisa los datos marcados", open: true });
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertForm(flow, toUpsertDto(values));
      const persisted: FlowForm = { ...saved, persisted: true };
      setForms((prev) => (prev === null ? prev : { ...prev, [flow]: persisted }));
      // resetField y NO reset: resetear todo el formulario marcaría como limpios
      // los borradores sin guardar de los otros dos flujos.
      form.resetField(flow, { defaultValue: fromDto(persisted) });
      showAlert({ tone: "success", title: "Listo, tu agente ya pide estos datos", open: true });
    } catch (err) {
      // El borrador se conserva intacto: jamás se descarta lo que el usuario escribió.
      if (!applyIssuesFromServer(err)) {
        showAlert({ tone: "error", title: errorMessage(err, "No pudimos guardar"), open: true });
      }
    } finally {
      setSaving(false);
    }
  };

  /** El 400 del pipe del backend es red de seguridad ante drift del schema. */
  const applyIssuesFromServer = (err: unknown): boolean => {
    if (!isHttpError(err) || !err.is("validation/failed")) return false;
    let applied = false;
    for (const issue of err.validationIssues) {
      const path = issue.path?.map(String).join(".");
      if (path === undefined || path === "") continue;
      form.setError(`${flow}.${path}` as Path<FormsValues>, {
        type: "server",
        message: issue.message,
      });
      applied = true;
    }
    if (applied) showAlert({ tone: "error", title: "Revisa los datos marcados", open: true });
    return applied;
  };

  const handleDiscard = () => {
    if (currentForm === null) return;
    showModal({
      title: "¿Descartar los cambios?",
      description: "Volverás a la última versión guardada.",
      actions: [
        { label: "Seguir editando", variant: "outline", asClose: true, id: "discard-cancel" },
        {
          label: "Descartar",
          variant: "destructive",
          asClose: true,
          id: "discard-confirm",
          onClick: () => {
            form.resetField(flow, { defaultValue: fromDto(currentForm) });
            setSelectedKey(null);
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  const handleDelete = () => {
    showModal({
      title: `¿Eliminar los ${FLOW_LABELS[flow].toLowerCase()}?`,
      description: `Tu agente dejará de pedir estos ${fields.length} datos y podrá cerrar sin ellos. Los datos ya recogidos se conservan. Si solo quieres pausarlo un rato, no hace falta eliminarlo.`,
      actions: [
        { label: "Volver", variant: "outline", asClose: true, id: "form-delete-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: true,
          id: "form-delete-confirm",
          onClick: () => {
            void (async () => {
              try {
                await deleteForm(flow);
              } catch (err) {
                // 404 = ya no existía (otra pestaña lo borró): converge, no es error.
                if (!isHttpError(err) || !err.is("forms/not_found")) {
                  showAlert({ tone: "error", title: errorMessage(err, "No pudimos eliminarlo"), open: true });
                  return;
                }
              }
              const draft: FlowForm = { flow, fields: [], is_active: true, persisted: false };
              setForms((prev) => (prev === null ? prev : { ...prev, [flow]: draft }));
              form.resetField(flow, { defaultValue: fromDto(draft) });
              setSelectedKey(null);
              showAlert({ tone: "success", title: "Formulario eliminado", open: true });
            })();
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  if (loadError !== null) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-background p-6 text-center">
        <AlertCircle className="mx-auto size-6 text-destructive" aria-hidden />
        <p className="text-sm">{errorMessage(loadError, "No pudimos cargar los formularios de captura.")}</p>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (forms === null) return <FormsEditorSkeleton />;

  const detailPanel =
    selectedIndex >= 0 ? (
      readOnly ? (
        <FieldReadOnlyPanel field={fields[selectedIndex]} />
      ) : (
        /*
         * `key` por campo, NO por índice: fuerza un remount al cambiar de
         * selección. Los inputs vienen de `register`, así que son NO
         * controlados: su valor lo escribe RHF en el nodo DOM al registrarse. Sin
         * remount, React reutiliza esos nodos para un campo registrado con otro
         * nombre y el valor pintado se queda clavado en el del campo anterior
         * (se notaba al pasar de un `select` —que añade el bloque de opciones y
         * cambia la forma del árbol— a un campo de texto, y con un `ai_prompt`
         * que se arrastraba a un campo que lo tenía vacío).
         */
        <FieldDetailPanel
          key={fields[selectedIndex].key}
          form={form}
          flow={flow}
          index={selectedIndex}
          onRemove={() => handleRemove(selectedIndex)}
        />
      )
    ) : null;

  return (
    <div className="space-y-6">
      <FlowTabs
        flow={flow}
        onFlowChange={changeFlow}
        counts={counts}
        dirtyFlows={dirtyFlows}
        configured={configured}
      />

      {readOnly && (
        <StatusAlert
          tone="info"
          dismissible={false}
          compact
          title="Solo lectura"
          description="Pídele a un administrador el permiso para configurar estos datos."
        />
      )}

      <FlowToolbar
        form={form}
        flow={flow}
        persisted={currentForm?.persisted === true}
        readOnly={readOnly}
        onDelete={handleDelete}
        onPreview={() => setPreviewOpen(true)}
      />

      <InheritedFieldsNotice
        flow={flow}
        inheritedFields={form.getValues("contact_registration").fields}
        ownRequiredCount={fields.filter((field) => field.required).length}
        onGoToContactFlow={() => changeFlow("contact_registration")}
      />

      {fields.length === 0 ? (
        <FlowEmptyState flow={flow} readOnly={readOnly} onAdd={handleAdd} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <FieldMasterList
            fields={fields}
            selectedKey={selectedKey}
            invalidKeys={invalidKeys}
            readOnly={readOnly}
            onSelect={setSelectedKey}
            onMove={handleMove}
            onAdd={handleAdd}
          />

          {/* Debajo de lg el detalle se abre en sheet: mismo estado, dos presentaciones. */}
          {isMobile ? (
            <DetailSheet
              open={selectedKey !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedKey(null);
              }}
              id={selectedKey ?? ""}
              title={fields[selectedIndex]?.label.trim() || "Dato"}
              size="lg"
            >
              {detailPanel}
            </DetailSheet>
          ) : (
            <div className="rounded-2xl border border-border bg-background p-4 md:p-6" aria-busy={saving}>
              {detailPanel}
            </div>
          )}
        </div>
      )}

      {isDirty && !readOnly && (
        <DirtyActionBar
          saving={saving}
          onSave={() => void handleSave()}
          onDiscard={handleDiscard}
          onPreview={() => setPreviewOpen(true)}
        />
      )}

      {/*
        La preview corre sobre el BORRADOR (sin guardar) y, para `order_intake`,
        sobre los campos EFECTIVOS: los del cliente concatenados delante, que es
        lo que de verdad exige `create_order.tool.ts`.
      */}
      <ConversationPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        flow={flow}
        fields={effectiveFields(flow, {
          contact_registration: form.getValues("contact_registration").fields,
          order_intake: form.getValues("order_intake").fields,
          appointment_booking: form.getValues("appointment_booking").fields,
        })}
      />

      {/* Los botones de flecha no anuncian nada por sí solos. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
