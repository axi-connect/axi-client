"use client";

/**
 * Editor de criterios de éxito (custom field del form de escenario): filas
 * con select de kind + campos condicionales, y validación VIVA con los
 * mismos mensajes que bloquean el submit (`validateCriteriaSet`, espejo del
 * backend). Los criterios `unknown` se muestran bloqueados con aviso de que
 * se excluirán al guardar.
 */
import { Plus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  CRITERION_KINDS,
  criterionLabel,
  MAX_CRITERIA,
  validateCriteriaSet,
  type SuccessCriterion,
} from "../../../../domain/quality";

type CriteriaEditorProps = {
  value: SuccessCriterion[];
  onChange: (next: SuccessCriterion[]) => void;
  disabled?: boolean;
};

/** Criterio recién elegido en el select: campos requeridos en blanco (la validación viva guía). */
function blankCriterion(kind: (typeof CRITERION_KINDS)[number]["value"]): SuccessCriterion {
  switch (kind) {
    case "reply_contains":
    case "reply_not_contains":
      return { kind, pattern: "" };
    case "max_reply_ms":
      return { kind, threshold_ms: 5000 };
    default:
      return { kind };
  }
}

export function CriteriaEditor({ value, onChange, disabled = false }: CriteriaEditorProps) {
  const issues = validateCriteriaSet(value);

  function updateAt(index: number, next: SuccessCriterion) {
    onChange(value.map((criterion, i) => (i === index ? next : criterion)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((criterion, index) => (
          <li
            key={index}
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"
          >
            {criterion.kind === "unknown" ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-warning">
                  <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                  {criterionLabel(criterion)} — se excluirá al guardar
                </span>
                {!disabled && (
                  <RemoveButton index={index} onRemove={removeAt} />
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Select
                    value={criterion.kind}
                    onValueChange={(kind) =>
                      updateAt(index, blankCriterion(kind as (typeof CRITERION_KINDS)[number]["value"]))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full sm:w-64" aria-label={`Tipo del criterio ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITERION_KINDS.map((kind) => (
                        <SelectItem key={kind.value} value={kind.value}>
                          {kind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!disabled && <RemoveButton index={index} onRemove={removeAt} />}
                </div>

                <p className="text-xs text-muted-foreground">
                  {CRITERION_KINDS.find((kind) => kind.value === criterion.kind)?.description}
                </p>

                {criterion.kind === "order_created" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={1}
                      value={criterion.min_items ?? ""}
                      onChange={(e) =>
                        updateAt(index, {
                          ...criterion,
                          min_items: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="Mín. unidades (opcional)"
                      aria-label={`Mínimo de unidades del criterio ${index + 1}`}
                      disabled={disabled}
                    />
                    <Input
                      value={criterion.product_codes?.join(", ") ?? ""}
                      onChange={(e) =>
                        updateAt(index, {
                          ...criterion,
                          product_codes: e.target.value
                            ? e.target.value.split(",").map((code) => code.trim()).filter(Boolean)
                            : undefined,
                        })
                      }
                      placeholder="Productos esperados, separados por coma (opcional)"
                      aria-label={`Productos esperados del criterio ${index + 1}`}
                      disabled={disabled}
                    />
                  </div>
                )}

                {(criterion.kind === "reply_contains" || criterion.kind === "reply_not_contains") && (
                  <Input
                    value={criterion.pattern}
                    onChange={(e) => updateAt(index, { ...criterion, pattern: e.target.value })}
                    placeholder="Expresión regular (se evalúa con /i), máx. 120"
                    aria-label={`Patrón del criterio ${index + 1}`}
                    className="font-mono text-xs"
                    disabled={disabled}
                  />
                )}

                {criterion.kind === "max_reply_ms" && (
                  <Input
                    type="number"
                    min={1}
                    value={criterion.threshold_ms}
                    onChange={(e) =>
                      updateAt(index, { ...criterion, threshold_ms: Number(e.target.value) })
                    }
                    placeholder="Umbral en ms"
                    aria-label={`Umbral de latencia del criterio ${index + 1}`}
                    className="sm:w-48"
                    disabled={disabled}
                  />
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, blankCriterion("order_created")])}
          disabled={value.length >= MAX_CRITERIA}
        >
          <Plus aria-hidden="true" />
          Añadir criterio
        </Button>
      )}

      {issues.length > 0 && (
        <ul className="space-y-1 text-xs text-destructive" role="alert">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RemoveButton({ index, onRemove }: { index: number; onRemove: (index: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(index)}
      aria-label={`Quitar criterio ${index + 1}`}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
    >
      <X aria-hidden="true" className="size-4" />
    </button>
  );
}
