"use client";

import { useId, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SegmentedControl } from "@/shared/components/ui/segmented";
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
  segmentFilterChips,
  type SegmentFilters,
  type TagDTO,
} from "@/modules/crm/domain/segment";

const ANY = "__any__";
const SCORE_STEPS = [25, 50, 75] as const;

type DealChoice = "any" | "yes" | "no";
const DEAL_ITEMS = [
  { value: "any", label: "Cualquiera" },
  { value: "yes", label: "Con abierta" },
  { value: "no", label: "Sin abierta" },
] as const satisfies readonly { value: DealChoice; label: string }[];

const STAGE_OPTIONS = CONTACT_STAGE_ORDER.map((stage) => ({
  label: CONTACT_STAGE_LABELS[stage],
  value: stage,
}));
const SOURCE_OPTIONS = (Object.keys(CONTACT_SOURCE_LABELS) as ContactSource[]).map((source) => ({
  label: CONTACT_SOURCE_LABELS[source],
  value: source,
}));

/** Un día `YYYY-MM-DD` del input nativo ↔ el ISO que guarda el DSL. */
const day = (iso: string | undefined) => iso?.slice(0, 10) ?? "";
const iso = (value: string) => (value ? new Date(value).toISOString() : undefined);

/**
 * Constructor del DSL de audiencia: las ONCE claves que acepta el zod del
 * backend, ni una más (una clave extraña devuelve 400).
 *
 * Vive en `crm` porque el DSL es suyo — lo consumen los segmentos guardados del
 * CRM y las campañas de marketing. Es un componente CONTROLADO y sin acciones:
 * no sabe guardar, no sabe de nombres ni de botones. Quien lo monta decide qué
 * hacer con los filtros; así el mismo builder sirve para crear un segmento y
 * para armar la audiencia de una campaña sin duplicar una línea.
 *
 * Las once claves van en tres bloques que se leen como una pregunta cada uno
 * —QUIÉN (etapa, fuente, etiquetas), PERFIL (ciudad, score, oportunidad) y
 * CUÁNDO (creación, última actividad)—, con cada control a `h-9` y la rejilla
 * por `@container`: el panel de segmentos mide 26 rem y el paso de campañas
 * más de 40, y ninguno de los dos debe desbordar. `q` no tiene control (es la
 * búsqueda libre de la lista) y se conserva tal cual venga en `value`.
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
  const tagOptions = useMemo(() => tags.map((tag) => ({ label: tag.name, value: tag.id })), [tags]);
  const id = (suffix: string) => `${idPrefix}-${suffix}`;
  const chips = segmentFilterChips(compactSegmentFilters(value), tags);
  const deal: DealChoice = value.has_open_deal === undefined ? "any" : value.has_open_deal ? "yes" : "no";

  return (
    <div className="@container flex min-w-0 flex-col gap-5">
      <Block title="Quién">
        <FieldRow label="Etapas" htmlFor={id("stages")}>
          <MultiSelect
            id={id("stages")}
            aria-label="Etapas"
            options={STAGE_OPTIONS}
            defaultValue={value.lifecycle_stage ?? []}
            disabled={disabled}
            onValueChange={(values) => patch({ lifecycle_stage: values as ContactLifecycleStage[] })}
            placeholder="Cualquier etapa"
          />
        </FieldRow>
        <FieldRow label="Fuentes" htmlFor={id("sources")}>
          <MultiSelect
            id={id("sources")}
            aria-label="Fuentes"
            options={SOURCE_OPTIONS}
            defaultValue={value.source ?? []}
            disabled={disabled}
            onValueChange={(values) => patch({ source: values as ContactSource[] })}
            placeholder="Cualquier fuente"
          />
        </FieldRow>
        {tagOptions.length > 0 && (
          <>
            <FieldRow label="Con alguna etiqueta" htmlFor={id("tags-any")}>
              <MultiSelect
                id={id("tags-any")}
                aria-label="Con alguna etiqueta"
                options={tagOptions}
                defaultValue={value.tag_ids?.any ?? []}
                disabled={disabled}
                onValueChange={(values) => patch({ tag_ids: { ...value.tag_ids, any: values } })}
                placeholder="Cualquier etiqueta"
              />
            </FieldRow>
            <FieldRow label="Con todas estas etiquetas" htmlFor={id("tags-all")}>
              <MultiSelect
                id={id("tags-all")}
                aria-label="Con todas estas etiquetas"
                options={tagOptions}
                defaultValue={value.tag_ids?.all ?? []}
                disabled={disabled}
                onValueChange={(values) => patch({ tag_ids: { ...value.tag_ids, all: values } })}
                placeholder="Ninguna obligatoria"
              />
            </FieldRow>
          </>
        )}
      </Block>

      <Block title="Perfil">
        <div className="grid gap-3 @min-[28rem]:grid-cols-2">
          <FieldRow label="Ciudad" htmlFor={id("city")}>
            <Input
              id={id("city")}
              value={value.city ?? ""}
              disabled={disabled}
              onChange={(e) => patch({ city: e.target.value || undefined })}
              placeholder="Bogotá"
            />
          </FieldRow>
          <FieldRow label="Score mínimo">
            <Select
              value={value.min_score !== undefined ? String(value.min_score) : ANY}
              disabled={disabled}
              onValueChange={(v: string) => patch({ min_score: v === ANY ? undefined : Number(v) })}
            >
              <SelectTrigger className="w-full" aria-label="Score mínimo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Cualquiera</SelectItem>
                {SCORE_STEPS.map((step) => (
                  <SelectItem key={step} value={String(step)}>
                    Al menos {step}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
        <FieldRow label="Oportunidad">
          <SegmentedControl<DealChoice>
            label="Oportunidad abierta"
            value={deal}
            items={disabled ? DEAL_ITEMS.map((item) => ({ ...item, disabled: true })) : DEAL_ITEMS}
            surface="inline"
            size="sm"
            className="w-full [&>button]:flex-1"
            onValueChange={(next) => {
              if (disabled) return;
              patch({ has_open_deal: next === "any" ? undefined : next === "yes" });
            }}
          />
        </FieldRow>
      </Block>

      <Block title="Cuándo">
        <FieldRow label="Creados entre">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <Input
              id={id("after")}
              type="date"
              aria-label="Creados desde"
              value={day(value.created_after)}
              max={day(value.created_before) || undefined}
              disabled={disabled}
              onChange={(e) => patch({ created_after: iso(e.target.value) })}
            />
            <span className="text-xs text-muted-foreground">y</span>
            <Input
              id={id("before")}
              type="date"
              aria-label="Creados hasta"
              value={day(value.created_before)}
              min={day(value.created_after) || undefined}
              disabled={disabled}
              onChange={(e) => patch({ created_before: iso(e.target.value) })}
            />
          </div>
        </FieldRow>
        <FieldRow
          label="Sin actividad desde"
          htmlFor={id("cold")}
          hint="Contactos fríos: sin ninguna actividad desde esa fecha."
        >
          <Input
            id={id("cold")}
            type="date"
            value={day(value.last_activity_before)}
            disabled={disabled}
            onChange={(e) => patch({ last_activity_before: iso(e.target.value) })}
          />
        </FieldRow>
      </Block>

      {/* Resumen en palabras de persona, con los mismos chips que la ficha del
          segmento: leer once campos sueltos no dice a quién se le va a escribir. */}
      <div className="flex flex-col gap-2 rounded-2xl bg-muted p-3" aria-live="polite">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          Entran los contactos con
        </span>
        <div className="flex flex-wrap gap-1.5">
          {chips.length === 0 ? (
            <span className="inline-flex h-6.5 items-center rounded-full border border-border bg-card px-2.5 text-xs text-muted-foreground">
              Todos los contactos
            </span>
          ) : (
            chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex h-6.5 max-w-full min-w-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-xs"
                title={`${chip.label}: ${chip.value}`}
              >
                <span className="shrink-0 text-muted-foreground">{chip.label}</span>
                <span className="truncate font-medium">{chip.value}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** `div role="group"` y no `fieldset`: un fieldset con `display:flex` no
 *  deja alinear su `legend` con el resto en todos los navegadores. */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3 border-t border-border pt-4">
      <span id={headingId} className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <span className="text-[11.5px] leading-snug text-muted-foreground">{hint}</span>}
    </div>
  );
}
