"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { fade } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { DetailSheet } from "@/shared/components/features/detail-sheet";

import { CountSteps } from "./controls/CountSteps";
import { DateRow } from "./controls/DateRow";
import { IconCards } from "./controls/IconCards";
import { PillGroup } from "./controls/PillGroup";
import { StepsRow } from "./controls/StepsRow";
import { SwitchRow } from "./controls/SwitchRow";
import { TextRow } from "./controls/TextRow";
import {
  clearAll,
  countActive,
  type FilterDef,
  type FilterSchema,
  type FilterValues,
} from "./filter-schema";

/**
 * La hoja de filtros de un listado. Los filtros son DATOS, no código.
 *
 * `shared/` no puede importar de `modules/` (arquitectura §3.3, regla 7), así
 * que esta hoja no conoce ni un estado, ni un origen, ni una etiqueta: recibe
 * un `FilterSchema` y el consumidor aporta las opciones. Mismo principio que
 * `DynamicForm`, y el destino es que absorba `ContactFilters`, `ProductFilters`
 * y los `Select` sueltos de cartera y admin (ver `README.md`).
 *
 * **Va sobre `DetailSheet` y no sobre `sheet.tsx`**, y el motivo es concreto:
 * `SheetFooter` es `mt-auto` dentro de un cuerpo que no es flex, así que el
 * botón «Ver 41 leads» se va con el scroll — fatal justo en este diseño.
 * `DetailSheet` trae el pie fijo (`renderFooter`), el `useBodyScrollLock` con
 * recuento de referencias, `LAYERS.detailSheet` (60) —que es por lo que los
 * `Select` de dentro (flotantes, 70) pintan por encima y no por detrás—, un
 * cuerpo `min-h-0 flex-1 overflow-y-auto` sin `calc(100svh - cabecera)`, y
 * `side="auto"`, que por debajo de 768px lo convierte en hoja inferior gratis.
 *
 * **Borrador contra aplicado**: la hoja edita una copia sembrada de `value` en
 * cada apertura y solo `onApply` la publica. Cerrar con Escape, con la X o por
 * fuera DESCARTA el borrador, sin preguntar — un diálogo de confirmación para
 * un filtro que no se ha aplicado no protege nada.
 *
 * **El contador no lo calcula la hoja**, que no sabe nada del servidor: emite
 * `onDraftChange` y el consumidor responde con `resultCount`. Con
 * `resultCount === null` el botón dice «Ver resultados» en vez de inventarse un
 * número, y mientras hay una cuenta en vuelo el botón **sigue habilitado**:
 * deshabilitarlo por un conteo de fondo hace que la pantalla parezca rota.
 */

export type FilterPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: FilterSchema;
  /** Lo APLICADO. Siembra el borrador en cada apertura. */
  value: FilterValues;
  /** Publica el borrador. Es lo único que cambia el listado. */
  onApply: (values: FilterValues) => void;
  /** Cada edición del borrador. Quien lo escucha debouncea y responde `resultCount`. */
  onDraftChange?: (draft: FilterValues) => void;
  /**
   * Cuántos resultados daría el borrador.
   * - `undefined`: no se cuenta — el botón dice «Aplicar filtros».
   * - `null`: se está contando o no se pudo — el botón dice «Ver resultados».
   */
  resultCount?: number | null;
  /** Sustantivo del recuento: `{ one: "lead", many: "leads" }` → «Ver 41 leads». */
  countNoun?: { one: string; many: string };
  title?: string;
  subtitle?: string;
  className?: string;
};

/**
 * El aviso de un filtro. Aparece SOLO al elegir, y pegado a su control: un
 * aviso en la cabecera del panel se lee como advertencia general y nadie lo
 * relaciona con la casilla que acaba de tocar.
 */
function FilterCaution({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.p
      initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fade.fast}
      className="border-warning/25 bg-warning/8 text-foreground flex items-start gap-2 rounded-md border p-2 text-xs leading-snug"
    >
      <TriangleAlert aria-hidden="true" className="text-warning mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </motion.p>
  );
}

const MICRO_LABEL = "text-xs font-medium tracking-wide text-muted-foreground uppercase";

/** Agrupa por sección conservando el orden declarado. Lo sin sección va primero. */
function groupBySection(schema: FilterSchema) {
  const sections = schema.sections ?? [];
  const known = new Set(sections.map((section) => section.id));

  const loose = schema.filters.filter((def) => !def.section || !known.has(def.section));
  const grouped = sections
    .map((section) => ({
      section,
      filters: schema.filters.filter((def) => def.section === section.id),
    }))
    .filter((group) => group.filters.length > 0);

  return { loose, grouped };
}

export function FilterPanel({
  open,
  onOpenChange,
  schema,
  value,
  onApply,
  onDraftChange,
  resultCount,
  countNoun = { one: "resultado", many: "resultados" },
  title = "Filtros",
  subtitle,
  className,
}: FilterPanelProps) {
  const [draft, setDraft] = React.useState<FilterValues>(value);

  // Siembra DURANTE el render, no en un efecto: con el efecto la hoja pinta un
  // frame con el borrador de la sesión anterior, y en un panel que se abre y se
  // cierra todo el día eso se ve.
  const [seededFor, setSeededFor] = React.useState(open);
  if (open !== seededFor) {
    setSeededFor(open);
    if (open) setDraft(value);
  }

  // El callback va por ref para que su identidad no dispare la emisión: quien
  // llama pasa lambdas inline, y con `onDraftChange` en las deps cada render
  // del padre pediría un conteo nuevo.
  const onDraftChangeRef = React.useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  React.useEffect(() => {
    if (!open) return;
    onDraftChangeRef.current?.(draft);
  }, [open, draft]);

  const setField = (key: string, next: FilterValues[string]) => {
    setDraft((current) => {
      const updated = { ...current };
      if (next === undefined) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  };

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const activeCount = countActive(schema, draft);
  const { loose, grouped } = groupBySection(schema);

  const applyLabel =
    resultCount === undefined
      ? "Aplicar filtros"
      : resultCount === null
        ? "Ver resultados"
        : `Ver ${resultCount} ${resultCount === 1 ? countNoun.one : countNoun.many}`;

  const renderControl = (def: FilterDef) => {
    const current = draft[def.key];
    const caution = def.caution?.(current);

    if (def.kind === "switch") {
      return (
        <SwitchRow
          key={def.key}
          id={`filter-${def.key}`}
          label={def.label}
          description={def.description}
          checked={current === true}
          disabled={def.disabled}
          onChange={(next) => setField(def.key, next ? true : undefined)}
          caution={caution ? <FilterCaution>{caution}</FilterCaution> : undefined}
        />
      );
    }

    return (
      <div key={def.key} className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className={MICRO_LABEL}>{def.label}</span>
          {def.description ? (
            <p className="text-muted-foreground text-xs leading-snug">{def.description}</p>
          ) : null}
        </div>

        {renderInput(def)}
        {caution ? <FilterCaution>{caution}</FilterCaution> : null}
      </div>
    );
  };

  const renderInput = (def: FilterDef) => {
    const current = draft[def.key];

    switch (def.kind) {
      case "multi": {
        const values = Array.isArray(current) ? current : current ? [String(current)] : [];
        const Control = def.layout === "cards" ? IconCards : PillGroup;
        return (
          <Control
            mode="multi"
            label={def.label}
            options={def.options}
            value={values}
            disabled={def.disabled}
            onChange={(next) => setField(def.key, next.length > 0 ? next : undefined)}
          />
        );
      }

      case "single": {
        const Control = def.layout === "cards" ? IconCards : PillGroup;
        return (
          <Control
            mode="single"
            label={def.label}
            options={def.options}
            disabled={def.disabled}
            value={current === undefined ? undefined : String(current)}
            onChange={(next) => setField(def.key, next)}
          />
        );
      }

      case "flags": {
        const values = Array.isArray(current) ? current : current ? [String(current)] : [];
        const labels = def.modeLabels ?? { all: "Todos", any: "Al menos uno" };
        const modeKey = def.modeKey;
        return (
          <div className="flex flex-col gap-2">
            <PillGroup
              mode="multi"
              label={def.label}
              options={def.options}
              value={values}
              disabled={def.disabled}
              onChange={(next) => setField(def.key, next.length > 0 ? next : undefined)}
            />
            {/* El conmutador todos/alguno cuelga del CONJUNTO de datos marcados
                (D3), no de cada opción: colgarlo de una lo repetiría seis veces
                para decir siempre lo mismo. Sin `modeKey` no se pinta y el
                filtro es un AND — que es lo que espera quien no lo declaró. */}
            {modeKey ? (
              <SegmentedControl
                size="sm"
                surface="inline"
                // Elevación y no relleno de color: dentro de un panel de
                // filtros el coral se reserva para el botón que aplica.
                treatment="lift"
                label={`${def.label}: cómo se combinan`}
                value={draft[modeKey] === "any" ? "any" : "all"}
                items={[
                  { value: "all", label: labels.all },
                  { value: "any", label: labels.any },
                ]}
                // `all` es el DEFAULT, así que se guarda como ausencia: un
                // `require_mode=all` explícito en la URL dice lo mismo que no
                // decir nada y ensucia el estado compartido.
                onValueChange={(next) => setField(modeKey, next === "any" ? "any" : undefined)}
              />
            ) : null}
          </div>
        );
      }

      case "steps":
        return (
          <StepsRow
            label={def.label}
            options={def.options}
            disabled={def.disabled}
            value={typeof current === "boolean" || Array.isArray(current) ? undefined : current}
            onChange={(next) => setField(def.key, next)}
          />
        );

      case "count":
        return (
          <CountSteps
            label={def.label}
            max={def.max}
            noneLabel={def.noneLabel}
            value={current === undefined ? undefined : Number(current)}
            onChange={(next) => setField(def.key, next)}
          />
        );

      case "text":
        return (
          <TextRow
            label={def.label}
            placeholder={def.placeholder}
            disabled={def.disabled}
            value={typeof current === "string" ? current : ""}
            onChange={(next) => setField(def.key, next.length > 0 ? next : undefined)}
          />
        );

      case "date": {
        const range: [string, string] = Array.isArray(current)
          ? [current[0] ?? "", current[1] ?? ""]
          : [typeof current === "string" ? current : "", ""];
        return (
          <DateRow
            label={def.label}
            mode={def.mode}
            value={range}
            disabled={def.disabled}
            onChange={([after, before]) =>
              setField(def.key, after || before ? [after, before] : undefined)
            }
          />
        );
      }

      case "switch":
        // Lo pinta `renderControl`: el interruptor lleva su etiqueta dentro.
        return null;
    }
  };

  return (
    <DetailSheet
      open={open}
      size="lg"
      side="auto"
      title={title}
      subtitle={subtitle}
      className={className}
      onOpenChange={onOpenChange}
      renderFooter={() => (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDraft(clearAll(schema, draft))}
            disabled={activeCount === 0}
          >
            Limpiar
          </Button>
          {/* Nunca deshabilitado por un conteo en vuelo: el botón que no
              responde se lee como pantalla rota, no como «espera». */}
          <Button type="button" onClick={apply} className="min-w-[10rem]">
            {applyLabel}
          </Button>
        </div>
      )}
    >
      <div className="flex flex-col gap-6">
        {loose.length > 0 ? (
          <div className="flex flex-col gap-5">{loose.map(renderControl)}</div>
        ) : null}

        {grouped.map(({ section, filters }) => (
          <section key={section.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h4 className="text-foreground text-sm font-semibold">{section.title}</h4>
              {section.description ? (
                <p className="text-muted-foreground text-xs leading-snug">{section.description}</p>
              ) : null}
            </div>
            <div className={cn("flex flex-col gap-5")}>{filters.map(renderControl)}</div>
          </section>
        ))}
      </div>
    </DetailSheet>
  );
}
