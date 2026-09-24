"use client";

/**
 * Editor de criterios de éxito (custom field del form de escenario): filas
 * con select de kind AGRUPADO por familia (Resultado · Herramientas · Estilo
 * y seguridad · Rendimiento y costo) + campos condicionales por kind, y
 * validación VIVA con los mismos mensajes que bloquean el submit
 * (`validateCriteriaSet`, espejo del backend). Los criterios `unknown` se
 * muestran bloqueados con aviso de que se excluirán al guardar.
 */
import { Plus, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AGENT_TOOL_NAMES,
  CRITERION_FAMILIES,
  CRITERION_KINDS,
  criterionLabel,
  MAX_CRITERIA,
  SENT_MEDIA_KINDS,
  SENT_MEDIA_LABELS,
  STAGE_KIND_LABELS,
  STAGE_KINDS,
  validateCriteriaSet,
  type AgentToolName,
  type SentMediaKind,
  type StageKind,
  type SuccessCriterion,
} from "../../../../domain/quality";

type CriteriaEditorProps = {
  value: SuccessCriterion[];
  onChange: (next: SuccessCriterion[]) => void;
  disabled?: boolean;
};

type KnownKind = (typeof CRITERION_KINDS)[number]["value"];

/** Criterio recién elegido en el select: campos requeridos en blanco (la validación viva guía). */
function blankCriterion(kind: KnownKind): SuccessCriterion {
  switch (kind) {
    case "reply_contains":
    case "reply_not_contains":
      return { kind, pattern: "" };
    case "max_reply_ms":
      return { kind, threshold_ms: 5000 };
    case "contact_field_captured":
      return { kind, field: "phone" };
    case "media_sent":
      return { kind, media: "image", min: 1 };
    case "recognition_matched":
      return { kind, sku: "", max_rank: 1 };
    case "intent_detected":
      return { kind, intention_code: "" };
    case "turns_to_outcome":
      return { kind, max: 6, outcome: "order" };
    case "tool_called":
      return { kind, name: "catalog_lookup", min: 1 };
    case "tool_not_called":
      return { kind, name: "apply_promotion" };
    case "max_greetings":
      return { kind, max: 1 };
    case "max_llm_calls_per_turn":
      return { kind, n: 4 };
    case "max_cost_usd":
      return { kind, usd: 0.5 };
    default:
      return { kind };
  }
}

const NONE = "__none__";

/** Copia sin la clave opcional (los DTOs no aceptan `undefined` explícito). */
function omit<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy: Partial<T> = { ...value };
  delete copy[key];
  return copy as Omit<T, K>;
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return value === "" || Number.isNaN(parsed) ? fallback : parsed;
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
                    onValueChange={(kind) => updateAt(index, blankCriterion(kind as KnownKind))}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full sm:w-64" aria-label={`Tipo del criterio ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITERION_FAMILIES.map((family) => (
                        <SelectGroup key={family}>
                          <SelectLabel>{family}</SelectLabel>
                          {CRITERION_KINDS.filter((kind) => kind.family === family).map((kind) => (
                            <SelectItem key={kind.value} value={kind.value}>
                              {kind.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {!disabled && <RemoveButton index={index} onRemove={removeAt} />}
                </div>

                <p className="text-xs text-muted-foreground">
                  {CRITERION_KINDS.find((kind) => kind.value === criterion.kind)?.description}
                </p>

                <CriterionFields
                  criterion={criterion}
                  index={index}
                  disabled={disabled}
                  onChange={(next) => updateAt(index, next)}
                />
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

/** Campos condicionales por kind. Un kind sin parámetros no pinta nada. */
function CriterionFields({
  criterion,
  index,
  disabled,
  onChange,
}: {
  criterion: Exclude<SuccessCriterion, { kind: "unknown" }>;
  index: number;
  disabled: boolean;
  onChange: (next: SuccessCriterion) => void;
}) {
  const n = index + 1;
  switch (criterion.kind) {
    case "order_created":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="number"
            min={1}
            value={criterion.min_items ?? ""}
            onChange={(e) =>
              onChange({ ...criterion, min_items: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="Mín. unidades (opcional)"
            aria-label={`Mínimo de unidades del criterio ${n}`}
            disabled={disabled}
          />
          <Input
            value={criterion.product_codes?.join(", ") ?? ""}
            onChange={(e) =>
              onChange({
                ...criterion,
                product_codes: e.target.value
                  ? e.target.value.split(",").map((code) => code.trim()).filter(Boolean)
                  : undefined,
              })
            }
            placeholder="Productos esperados, separados por coma (opcional)"
            aria-label={`Productos esperados del criterio ${n}`}
            disabled={disabled}
          />
        </div>
      );
    case "reply_contains":
    case "reply_not_contains":
      return (
        <Input
          value={criterion.pattern}
          onChange={(e) => onChange({ ...criterion, pattern: e.target.value })}
          placeholder="Expresión regular (se evalúa con /i), máx. 120"
          aria-label={`Patrón del criterio ${n}`}
          className="font-mono text-xs"
          disabled={disabled}
        />
      );
    case "max_reply_ms":
      return (
        <Input
          type="number"
          min={1}
          value={criterion.threshold_ms}
          onChange={(e) => onChange({ ...criterion, threshold_ms: numberOr(e.target.value, 0) })}
          placeholder="Umbral en ms"
          aria-label={`Umbral de latencia del criterio ${n}`}
          className="sm:w-48"
          disabled={disabled}
        />
      );
    case "contact_field_captured":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={criterion.field}
            onChange={(e) => onChange({ ...criterion, field: e.target.value.trim() })}
            placeholder="Campo: phone, email, full_name, city o un campo personalizado"
            aria-label={`Campo del contacto del criterio ${n}`}
            className="font-mono text-xs"
            disabled={disabled}
          />
          <Input
            value={criterion.pattern ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? { ...criterion, pattern: e.target.value } : omit(criterion, "pattern"))
            }
            placeholder="Formato esperado, regex (opcional), p.ej. ^\\+57"
            aria-label={`Formato del campo del criterio ${n}`}
            className="font-mono text-xs"
            disabled={disabled}
          />
        </div>
      );
    case "deal_stage_kind":
      return (
        <Select
          value={criterion.kind_expected ?? NONE}
          onValueChange={(stage) =>
            onChange(stage === NONE ? omit(criterion, "kind_expected") : { ...criterion, kind_expected: stage as StageKind })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label={`Tipo de etapa del criterio ${n}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Cualquier etapa</SelectItem>
            {STAGE_KINDS.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {STAGE_KIND_LABELS[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "media_sent":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={criterion.media}
            onValueChange={(media) => onChange({ ...criterion, media: media as SentMediaKind })}
            disabled={disabled}
          >
            <SelectTrigger aria-label={`Tipo de medio del criterio ${n}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SENT_MEDIA_KINDS.map((media) => (
                <SelectItem key={media} value={media}>
                  {SENT_MEDIA_LABELS[media]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={20}
            value={criterion.min}
            onChange={(e) => onChange({ ...criterion, min: numberOr(e.target.value, 0) })}
            placeholder="Mínimo"
            aria-label={`Mínimo de medios del criterio ${n}`}
            disabled={disabled}
          />
        </div>
      );
    case "delivery_set":
      return (
        <Select
          value={criterion.method ?? NONE}
          onValueChange={(method) =>
            onChange(method === NONE ? omit(criterion, "method") : { ...criterion, method: method as "shipping" | "pickup" })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label={`Forma de entrega del criterio ${n}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Cualquier forma</SelectItem>
            <SelectItem value="shipping">Envío</SelectItem>
            <SelectItem value="pickup">Recogida en tienda</SelectItem>
          </SelectContent>
        </Select>
      );
    case "promotion_applied":
      return (
        <Input
          value={criterion.code ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? { ...criterion, code: e.target.value.trim() } : omit(criterion, "code"))
          }
          placeholder="Código del cupón o nombre de la promoción (opcional)"
          aria-label={`Código de la promoción del criterio ${n}`}
          className="sm:w-80"
          disabled={disabled}
        />
      );
    case "recognition_matched":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={criterion.sku}
            onChange={(e) => onChange({ ...criterion, sku: e.target.value.trim() })}
            placeholder="SKU esperado"
            aria-label={`SKU esperado del criterio ${n}`}
            className="font-mono text-xs"
            disabled={disabled}
          />
          <Input
            type="number"
            min={1}
            max={5}
            value={criterion.max_rank}
            onChange={(e) => onChange({ ...criterion, max_rank: numberOr(e.target.value, 0) })}
            placeholder="Top-k (1–5)"
            aria-label={`Top-k del reconocimiento del criterio ${n}`}
            disabled={disabled}
          />
        </div>
      );
    case "intent_detected":
      return (
        <Input
          value={criterion.intention_code}
          onChange={(e) => onChange({ ...criterion, intention_code: e.target.value.trim() })}
          placeholder="Código de la intención (p.ej. sales)"
          aria-label={`Código de intención del criterio ${n}`}
          className="font-mono text-xs sm:w-80"
          disabled={disabled}
        />
      );
    case "turns_to_outcome":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={criterion.outcome}
            onValueChange={(outcome) => onChange({ ...criterion, outcome: outcome as "order" | "appointment" })}
            disabled={disabled}
          >
            <SelectTrigger aria-label={`Desenlace del criterio ${n}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">Pedido</SelectItem>
              <SelectItem value="appointment">Cita</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={30}
            value={criterion.max}
            onChange={(e) => onChange({ ...criterion, max: numberOr(e.target.value, 0) })}
            placeholder="Turnos máximos del cliente"
            aria-label={`Turnos máximos del criterio ${n}`}
            disabled={disabled}
          />
        </div>
      );
    case "tool_called":
    case "tool_not_called":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={criterion.name}
            onValueChange={(name) => onChange({ ...criterion, name: name as AgentToolName })}
            disabled={disabled}
          >
            <SelectTrigger aria-label={`Herramienta del criterio ${n}`} className="font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TOOL_NAMES.map((name) => (
                <SelectItem key={name} value={name} className="font-mono text-xs">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {criterion.kind === "tool_called" && (
            <Input
              type="number"
              min={1}
              max={50}
              value={criterion.min}
              onChange={(e) => onChange({ ...criterion, min: numberOr(e.target.value, 0) })}
              placeholder="Mínimo de veces"
              aria-label={`Mínimo de llamadas del criterio ${n}`}
              disabled={disabled}
            />
          )}
        </div>
      );
    case "max_greetings":
      return (
        <Input
          type="number"
          min={0}
          max={5}
          value={criterion.max}
          onChange={(e) => onChange({ ...criterion, max: numberOr(e.target.value, 0) })}
          placeholder="Saludos máximos"
          aria-label={`Saludos máximos del criterio ${n}`}
          className="sm:w-48"
          disabled={disabled}
        />
      );
    case "max_llm_calls_per_turn":
      return (
        <Input
          type="number"
          min={1}
          max={20}
          value={criterion.n}
          onChange={(e) => onChange({ ...criterion, n: numberOr(e.target.value, 0) })}
          placeholder="Llamadas por turno"
          aria-label={`Llamadas LLM máximas del criterio ${n}`}
          className="sm:w-48"
          disabled={disabled}
        />
      );
    case "max_cost_usd":
      return (
        <Input
          type="number"
          min={0.01}
          max={50}
          step={0.01}
          value={criterion.usd}
          onChange={(e) => onChange({ ...criterion, usd: numberOr(e.target.value, 0) })}
          placeholder="USD"
          aria-label={`Costo máximo del criterio ${n}`}
          className="sm:w-48"
          disabled={disabled}
        />
      );
    default:
      return null;
  }
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
