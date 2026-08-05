"use client";

/**
 * Sheet de escenario en tres modos: crear · editar · ver (solo lectura).
 * Los `is_system` SIEMPRE entran en modo ver (el PATCH daría 403
 * `quality/scenario_immutable`) con "Clonar" como única salida de edición.
 * 409 `quality/scenario_code_taken` → error inline en `code`, sin cerrar.
 */
import { useMemo } from "react";
import { Copy, Lock } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createCustomField,
  createInputField,
  DynamicForm,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import { parseSuccessCriteria, type Scenario, type SuccessCriterion } from "../../../../domain/quality";
import {
  useCreateScenario,
  useUpdateScenario,
} from "../../../../infrastructure/api/hooks/use-quality-scenarios";
import { StatusBadge } from "../../../components/StatusBadge";
import { CriteriaEditor } from "./CriteriaEditor";
import { CriteriaList } from "./CriteriaList";
import {
  defaultScenarioFormValues,
  scenarioFormSchema,
  scenarioToFormValues,
  toCreateScenarioDTO,
  toUpdateScenarioDTO,
  type ScenarioFormValues,
} from "./scenario-form.config";

export type ScenarioSheetMode = "create" | "edit" | "view";

type ScenarioFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ScenarioSheetMode;
  /** Escenario a editar/ver; null solo en modo crear. */
  scenario: Scenario | null;
  /** Abre el diálogo de clonado (footer del modo ver). */
  onClone?: (scenario: Scenario) => void;
};

export function ScenarioFormSheet({ open, onOpenChange, mode, scenario, onClone }: ScenarioFormSheetProps) {
  const { showAlert } = useAlert();
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario();

  const isEditing = mode === "edit" && scenario !== null;
  const isViewing = mode === "view" && scenario !== null;

  // `DynamicForm` hace `form.reset()` cuando cambia la IDENTIDAD de este
  // objeto: construirlo en cada render descartaría lo que el usuario lleve
  // escrito (criterios incluidos) ante cualquier re-render del sheet — un
  // refetch de la lista, un cambio de `isPending`. Solo un escenario distinto,
  // o una versión más reciente del mismo, debe repoblar el formulario.
  const defaultValues: ScenarioFormValues = useMemo(
    () => (scenario !== null ? scenarioToFormValues(scenario) : defaultScenarioFormValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario?.id, scenario?.updated_at],
  );

  const fields: FieldConfig<ScenarioFormValues>[] = [
    createInputField<ScenarioFormValues>("code", {
      label: "Código *",
      placeholder: "buyer_multi_product",
      autoComplete: "off",
      description: isEditing ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3" />
          Inmutable tras la creación
        </span>
      ) : (
        "Minúsculas, números y guion bajo (ej. buyer_multi_product)."
      ),
      inputProps: { disabled: isEditing, className: "font-mono" },
    }),
    createInputField<ScenarioFormValues>("name", {
      label: "Nombre *",
      placeholder: "Comprador multiproducto",
      autoComplete: "off",
    }),
    createInputField<ScenarioFormValues>("max_turns", {
      label: "Turnos máximos",
      inputKind: "number",
      description: "1–30 · corta la simulación si el objetivo no se cumple antes.",
      inputProps: { min: 1, max: 30 },
    }),
    createInputField<ScenarioFormValues>("tags", {
      label: "Etiquetas",
      placeholder: "ventas, retención",
      description: "Separadas por coma (máx. 10).",
    }),
    createInputField<ScenarioFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Qué valida este escenario…",
      colSpan: { base: 1, md: 2 },
    }),
    createInputField<ScenarioFormValues>("persona", {
      label: "Persona (cliente simulado) *",
      inputKind: "textarea",
      placeholder: "Eres un cliente impaciente que quiere comprar 5 productos distintos…",
      description: "System prompt del cliente simulado que conversará con el agente.",
      colSpan: { base: 1, md: 2 },
      inputProps: { rows: 5 },
    }),
    createInputField<ScenarioFormValues>("goal", {
      label: "Objetivo *",
      inputKind: "textarea",
      placeholder: "Concretar la compra de al menos 5 unidades…",
      description: "En lenguaje natural: cuándo se considera cumplida la conversación.",
      colSpan: { base: 1, md: 2 },
      inputProps: { rows: 3 },
    }),
    createCustomField<ScenarioFormValues>(
      "success_criteria",
      ({ value, setValue }) => (
        <CriteriaEditor
          value={(value as SuccessCriterion[]) ?? []}
          onChange={(next) => setValue("success_criteria", next)}
        />
      ),
      {
        label: "Criterios de éxito *",
        description: "El case aprueba solo si TODOS los criterios pasan (1–20).",
        colSpan: { base: 1, md: 2 },
      },
    ),
  ];

  async function onSubmit(values: ScenarioFormValues, form: UseFormReturn<ScenarioFormValues>) {
    try {
      if (isEditing) {
        await updateScenario.mutateAsync({ id: scenario.id, body: toUpdateScenarioDTO(values) });
      } else {
        await createScenario.mutateAsync(toCreateScenarioDTO(values));
      }
      showAlert({
        tone: "success",
        title: isEditing ? "Escenario actualizado" : "Escenario creado",
        description: `${values.name} quedó ${isEditing ? "al día" : "disponible para suites y ejecuciones"}.`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      if (isHttpError(error) && error.is("quality/scenario_code_taken")) {
        form.setError("code", { message: "Este código ya existe." });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar el escenario", description: errorMessage(error) });
    }
  }

  const pending = createScenario.isPending || updateScenario.isPending;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === "create"
          ? "Nuevo escenario"
          : `${isViewing ? "Escenario" : "Editar escenario"} · ${scenario?.name ?? ""}`
      }
      subtitle={
        mode === "create"
          ? "El código no podrá cambiarse después."
          : isViewing && scenario?.is_system
            ? "Escenario de fábrica: solo lectura. Clónalo para adaptarlo."
            : undefined
      }
      size="xl"
    >
      <div className="p-4">
        {isViewing ? (
          <ScenarioReadView scenario={scenario} onClone={onClone} />
        ) : (
          <DynamicForm<ScenarioFormValues>
            schema={scenarioFormSchema}
            defaultValues={defaultValues}
            fields={fields}
            onSubmit={onSubmit}
            actions={{
              render: ({ submitting }) => (
                <div className="flex w-full items-center justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting || pending}>
                    {pending ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              ),
            }}
          />
        )}
      </div>
    </DetailSheet>
  );
}

function ReadBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-sm font-semibold">{label}</h3>
      {children}
    </section>
  );
}

function ScenarioReadView({
  scenario,
  onClone,
}: {
  scenario: Scenario;
  onClone?: (scenario: Scenario) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{scenario.code}</span>
        <StatusBadge status={scenario.status} />
        {scenario.is_system && (
          <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
            Sistema
          </Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">Máx. {scenario.max_turns} turnos</span>
      </div>

      {scenario.description && <p className="text-sm text-muted-foreground">{scenario.description}</p>}

      <ReadBlock label="Persona (cliente simulado)">
        <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{scenario.persona}</p>
      </ReadBlock>

      <ReadBlock label="Objetivo">
        <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{scenario.goal}</p>
      </ReadBlock>

      <ReadBlock label="Criterios de éxito">
        <CriteriaList criteria={parseSuccessCriteria(scenario.success_criteria)} />
      </ReadBlock>

      {scenario.tags.length > 0 && (
        <ReadBlock label="Etiquetas">
          <div className="flex flex-wrap gap-1.5">
            {scenario.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="border-border text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        </ReadBlock>
      )}

      {onClone && (
        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={() => onClone(scenario)}>
            <Copy aria-hidden="true" />
            Clonar escenario
          </Button>
        </div>
      )}
    </div>
  );
}
