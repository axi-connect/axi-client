"use client";

import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MultiSelect } from "@/shared/components/features/multi-select";
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_ORDER,
  type ContactLifecycleStage,
  type ContactSource,
} from "@/modules/crm/domain/enums";
import {
  compactSegmentFilters,
  describeSegmentFilters,
  type SegmentFilters,
  type TagDTO,
} from "@/modules/crm/domain/segment";

const ANY = "__any__";
const SCORE_STEPS = [25, 50, 75] as const;

/**
 * Constructor del DSL de audiencia: las ONCE claves que acepta el zod del
 * backend, ni una más (una clave extraña devuelve 400).
 *
 * Vive en `crm` porque el DSL es suyo — lo consumen los segmentos guardados del
 * CRM y las campañas de marketing. Es un componente CONTROLADO y sin acciones:
 * no sabe guardar, no sabe de nombres ni de botones. Quien lo monta decide qué
 * hacer con los filtros; así el mismo builder sirve para crear un segmento y
 * para armar la audiencia de una campaña sin duplicar una línea.
 */
export function AudienceFilterBuilder({
  value,
  onChange,
  tags,
  idPrefix = "audience",
  disabled,
}: {
  value: SegmentFilters;
  onChange: (filters: SegmentFilters) => void;
  tags: TagDTO[];
  /** Prefijo de los `id` para que dos builders en la misma página no colisionen. */
  idPrefix?: string;
  disabled?: boolean;
}) {
  const patch = (partial: Partial<SegmentFilters>) => onChange({ ...value, ...partial });
  const tagOptions = tags.map((tag) => ({ label: tag.name, value: tag.id }));
  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Etapas</span>
          <MultiSelect
            options={CONTACT_STAGE_ORDER.map((stage) => ({
              label: CONTACT_STAGE_LABELS[stage],
              value: stage,
            }))}
            defaultValue={value.lifecycle_stage ?? []}
            disabled={disabled}
            onValueChange={(values) =>
              patch({ lifecycle_stage: values as ContactLifecycleStage[] })
            }
            placeholder="Cualquier etapa"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Fuentes</span>
          <MultiSelect
            options={(Object.keys(CONTACT_SOURCE_LABELS) as ContactSource[]).map((source) => ({
              label: CONTACT_SOURCE_LABELS[source],
              value: source,
            }))}
            defaultValue={value.source ?? []}
            disabled={disabled}
            onValueChange={(values) => patch({ source: values as ContactSource[] })}
            placeholder="Cualquier fuente"
          />
        </div>

        {tagOptions.length > 0 && (
          <>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Con ALGUNA de estas etiquetas
              </span>
              <MultiSelect
                options={tagOptions}
                defaultValue={value.tag_ids?.any ?? []}
                disabled={disabled}
                onValueChange={(values) => patch({ tag_ids: { ...value.tag_ids, any: values } })}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Con TODAS estas etiquetas
              </span>
              <MultiSelect
                options={tagOptions}
                defaultValue={value.tag_ids?.all ?? []}
                disabled={disabled}
                onValueChange={(values) => patch({ tag_ids: { ...value.tag_ids, all: values } })}
                placeholder="—"
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor={id("city")} className="text-xs font-medium text-muted-foreground">
            Ciudad
          </label>
          <Input
            id={id("city")}
            value={value.city ?? ""}
            disabled={disabled}
            onChange={(e) => patch({ city: e.target.value || undefined })}
            placeholder="Bogotá"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Score mínimo</span>
          <Select
            value={value.min_score !== undefined ? String(value.min_score) : ANY}
            disabled={disabled}
            onValueChange={(v: string) =>
              patch({ min_score: v === ANY ? undefined : Number(v) })
            }
          >
            <SelectTrigger className="h-9 w-full" aria-label="Score mínimo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Cualquiera</SelectItem>
              {SCORE_STEPS.map((step) => (
                <SelectItem key={step} value={String(step)}>
                  ≥ {step}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Oportunidad abierta</span>
          <Select
            value={value.has_open_deal === undefined ? ANY : value.has_open_deal ? "yes" : "no"}
            disabled={disabled}
            onValueChange={(v: string) =>
              patch({ has_open_deal: v === ANY ? undefined : v === "yes" })
            }
          >
            <SelectTrigger className="h-9 w-full" aria-label="Oportunidad abierta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Indiferente</SelectItem>
              <SelectItem value="yes">Con oportunidad abierta</SelectItem>
              <SelectItem value="no">Sin oportunidad abierta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={id("cold")} className="text-xs font-medium text-muted-foreground">
            Sin actividad desde (contactos fríos)
          </label>
          <input
            id={id("cold")}
            type="date"
            value={value.last_activity_before?.slice(0, 10) ?? ""}
            disabled={disabled}
            onChange={(e) =>
              patch({
                last_activity_before: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={id("after")} className="text-xs font-medium text-muted-foreground">
            Creados desde
          </label>
          <input
            id={id("after")}
            type="date"
            value={value.created_after?.slice(0, 10) ?? ""}
            disabled={disabled}
            onChange={(e) =>
              patch({
                created_after: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={id("before")} className="text-xs font-medium text-muted-foreground">
            Creados hasta
          </label>
          <input
            id={id("before")}
            type="date"
            value={value.created_before?.slice(0, 10) ?? ""}
            disabled={disabled}
            onChange={(e) =>
              patch({
                created_before: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>

      {/* Resumen en lenguaje humano: leer once campos sueltos no dice a quién
          se le va a escribir; esta línea sí. */}
      <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        {describeSegmentFilters(compactSegmentFilters(value), tags)}
      </p>
    </div>
  );
}
