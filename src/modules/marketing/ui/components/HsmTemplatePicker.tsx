"use client";

import { CircleDollarSign } from "lucide-react";
import { Callout } from "@/shared/components/ui/callout";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { bulkOpeningCost, formatUsd } from "../../domain/template-cost";
import { renderHsmPreview } from "../../domain/hsm-preview";
import { countTemplateVariables, type HsmTemplateDTO } from "../../domain/template-catalog";
import {
  choiceOf,
  hsmPreviewValue,
  HSM_PARAM_CHOICES,
  HSM_STATIC_PREFIX,
  resizeHsmMapping,
  staticTextOf,
  type HsmParamEntry,
} from "../../domain/hsm-params";

/**
 * Elegir una plantilla de Meta aprobada y decir qué va en cada hueco.
 *
 * Nace compartido a propósito: hoy el selector de plantilla está reescrito a
 * mano en cuatro pantallas (la tabla de plantillas, el seguimiento masivo, el
 * formulario de seguimiento y el asistente de campañas), y la idea es que las
 * demás converjan aquí. Por eso no sabe nada de campañas: recibe la lista ya
 * filtrada y devuelve el id y el mapeo.
 *
 * El mapeo va PEGADO al selector y no detrás de un «avanzado»: sin parámetros,
 * Meta rechaza el envío entero, así que no es un ajuste fino sino parte de
 * elegir la plantilla.
 */
export function HsmTemplatePicker({
  templates,
  value,
  onChange,
  mapping,
  onMappingChange,
  sample,
  recipients,
  emptyLabel = "Sin plantilla",
}: {
  templates: readonly HsmTemplateDTO[];
  value: string | null;
  onChange: (templateId: string | null) => void;
  mapping: readonly HsmParamEntry[];
  onMappingChange: (mapping: HsmParamEntry[]) => void;
  /** Con qué se pinta la vista previa: un destinatario de ejemplo. */
  sample: { first_name: string; full_name: string; company_name: string };
  /** A cuántos puede llegar, para el tope de coste. `null` = todavía no se sabe. */
  recipients: number | null;
  emptyLabel?: string;
}) {
  const selected = templates.find((template) => template.id === value) ?? null;
  const slots = selected === null ? 0 : countTemplateVariables(selected.body);
  const cost = selected === null || recipients === null ? null : bulkOpeningCost(recipients, selected.category);

  function pick(next: string) {
    if (next === NONE) {
      onChange(null);
      onMappingChange([]);
      return;
    }
    const template = templates.find((row) => row.id === next);
    onChange(next);
    // Al cambiar de plantilla el mapeo se re-encaja: se conserva lo que el
    // operador ya decidió para los huecos que siguen existiendo.
    onMappingChange(resizeHsmMapping(mapping, template === undefined ? 0 : countTemplateVariables(template.body)));
  }

  function patchEntry(index: number, source: string) {
    onMappingChange(
      mapping.map((entry) => (entry.index === index ? { ...entry, source } : entry)),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Select value={value ?? NONE} onValueChange={pick}>
        <SelectTrigger aria-label="Plantilla de Meta aprobada">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{emptyLabel}</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name} · {template.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected !== null && slots > 0 && (
        <div className="overflow-clip rounded-lg border border-border">
          <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Qué va en cada hueco
          </p>
          {mapping.map((entry) => {
            const choice = choiceOf(entry.source);
            return (
              <div
                key={entry.index}
                className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2 last:border-b-0"
              >
                <span className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {`{{${entry.index}}}`}
                </span>
                <Select
                  value={choice ?? HSM_STATIC_PREFIX}
                  onValueChange={(next) =>
                    patchEntry(
                      entry.index,
                      next === HSM_STATIC_PREFIX ? `${HSM_STATIC_PREFIX}${staticTextOf(entry.source)}` : next,
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-auto min-w-44" aria-label={`Qué va en la variable ${String(entry.index)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HSM_PARAM_CHOICES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {choice === HSM_STATIC_PREFIX && (
                  <Input
                    className="h-8 min-w-36 flex-1"
                    aria-label={`Texto fijo de la variable ${String(entry.index)}`}
                    placeholder="lo que va escrito ahí"
                    value={staticTextOf(entry.source)}
                    onChange={(event) =>
                      patchEntry(entry.index, `${HSM_STATIC_PREFIX}${event.target.value}`)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected !== null && (
        <div className="rounded-lg border border-border/60 bg-foreground/[0.03] p-3.5">
          <div className="max-w-[34ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
            {renderHsmPreview(selected.body, (index) => {
              const entry = mapping.find((row) => row.index === index);
              return entry === undefined ? null : hsmPreviewValue(entry.source, sample);
            }).map((segment, position) => (
              <span
                key={position}
                className={segment.variable ? "rounded bg-primary/15 px-1 font-medium" : undefined}
              >
                {segment.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {cost !== null && (
        <Callout tone={cost.category === "marketing" ? "warn" : "info"} icon={CircleDollarSign}>
          Solo se cobra la que Meta entregue. Como mucho, {recipients} × {formatUsd(cost.unit_usd, 4)}{" "}
          ≈ <strong>{formatUsd(cost.total_usd)}</strong>
          {cost.category === "marketing" && (
            <>
              {" "}
              — es una plantilla de <strong>marketing</strong>, unas 25 veces más cara que una
              utility.
            </>
          )}
        </Callout>
      )}
    </div>
  );
}

/** `Select` de shadcn no admite `value=""`: el «sin plantilla» necesita centinela. */
const NONE = "__none__";
