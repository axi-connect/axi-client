"use client";

import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

import {
  ADMISSION_DATA_FIELDS,
  REQUIRABLE_LABELS,
  REQUIRABLE_ORDER,
  SCORE_STEPS,
  type RequirableField,
} from "../../domain/criteria";
import {
  admissionChips,
  admissionSentence,
  hasAdmission,
  RECORD_CEILINGS,
  type AdmissionDTO,
} from "../../domain/search";

const ANY = "any";

/**
 * Criterios de admisión de la búsqueda, plegados bajo el origen.
 *
 * **El pliegue no esconde el estado.** Cerrado, el trigger lleva los chips de lo
 * que se va a exigir: un filtro activo invisible es la forma más rápida de que
 * alguien no entienda por qué su búsqueda trajo cuatro leads. Es la misma
 * doctrina que los filtros del CRM ya aplican con sus chips removibles.
 *
 * Los avisos aparecen SOLOS al elegir, no escondidos en un tooltip: son la
 * diferencia entre una búsqueda vacía que se entiende y una que parece un fallo.
 */
export function AdvancedSearchOptions({
  value,
  limit,
  categoryLabel,
  verifierAvailable,
  freeSource,
  webSource = false,
  open,
  onOpenChange,
  onChange,
}: {
  value: AdmissionDTO;
  limit: number;
  categoryLabel: string;
  /** ¿Hay un verificador de pago encendido? Sin él, «solo verificados» admite cero. */
  verifierAvailable: boolean;
  freeSource: boolean;
  /**
   * ¿La fuente es un buscador web?
   *
   * Entonces exigir «tiene web» no filtra a nadie: todo resultado de un buscador
   * ES un dominio, por construcción. Un criterio que no puede rechazar a nadie
   * ocupa sitio y hace creer que la búsqueda está más apretada de lo que está.
   */
  webSource?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: AdmissionDTO) => void;
}) {
  const active = hasAdmission(value);
  const chips = admissionChips(value);
  const requirable = webSource
    ? REQUIRABLE_ORDER.filter((field) => field !== "website")
    : REQUIRABLE_ORDER;
  const required = value.require ?? [];

  const patch = (next: Partial<AdmissionDTO>) => onChange({ ...value, ...next });

  const toggleField = (field: RequirableField) => {
    const has = required.includes(field);
    patch({
      require: has ? required.filter((item) => item !== field) : [...required, field],
    });
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={open ? "advanced" : ""}
      onValueChange={(next) => onOpenChange(next === "advanced")}
      className={cn(
        "rounded-md border px-3 transition-colors",
        active ? "border-accent-violet/40 bg-accent-violet/5" : "border-border",
      )}
    >
      <AccordionItem value="advanced" className="border-b-0">
        <AccordionTrigger className="py-2.5 text-sm hover:no-underline">
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <SlidersHorizontal
              aria-hidden="true"
              className={cn("mt-0.5 size-4 shrink-0", active && "text-accent-violet")}
            />
            <span className="min-w-0">
              <span className="block font-semibold">Opciones avanzadas</span>
              {chips.length === 0 ? (
                <span className="text-muted-foreground block text-xs font-normal">
                  Exige calidad, datos o redes
                </span>
              ) : (
                <span className="mt-1 flex flex-wrap gap-1">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="border-accent-violet/30 bg-accent-violet/12 text-accent-violet rounded-full border px-2 py-px text-[11px] font-medium"
                    >
                      {chip}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </span>
        </AccordionTrigger>

        <AccordionContent className="space-y-4 pb-4">
          <div className="border-border/60 border-t pt-3.5">
            <label className="text-sm font-semibold" htmlFor="adm-score">
              Calidad mínima
            </label>
            <p className="text-muted-foreground text-xs">
              El índice de 0 a 100 que ves en la bandeja
            </p>
            <Select
              value={value.min_score == null ? ANY : String(value.min_score)}
              onValueChange={(next) =>
                patch({ min_score: next === ANY ? null : Number(next) })
              }
            >
              <SelectTrigger id="adm-score" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORE_STEPS.map((step) => (
                  <SelectItem
                    key={step.value ?? ANY}
                    value={step.value == null ? ANY : String(step.value)}
                  >
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="text-sm font-semibold">Datos mínimos</span>
            <p className="text-muted-foreground text-xs">
              De cinco: teléfono, correo, sitio, dirección y redes
            </p>
            <div
              role="radiogroup"
              aria-label="Datos mínimos"
              className="bg-secondary mt-1.5 flex gap-0.5 rounded-md p-0.5"
            >
              {[null, 1, 2, 3, 4, 5].map((amount) => {
                const selected = value.min_data == null ? amount === null : value.min_data === amount;
                return (
                  <button
                    key={amount ?? ANY}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => patch({ min_data: amount })}
                    className={cn(
                      "flex-1 rounded-sm py-1 text-xs tabular-nums transition-colors",
                      selected
                        ? "bg-background text-accent-violet font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {amount ?? "Ninguno"}
                  </button>
                );
              })}
            </div>
            {value.min_data === ADMISSION_DATA_FIELDS && freeSource && (
              <Caution>
                <b>En OpenStreetMap casi ningún negocio trae los cinco.</b> Es probable que la
                búsqueda no llene tu cupo y pare en el techo. Baja a 3 si quieres volumen.
              </Caution>
            )}
          </div>

          <div>
            <span className="text-sm font-semibold">Y obligatoriamente</span>
            <p className="text-muted-foreground text-xs">
              {value.min_data == null
                ? "Los datos que no pueden faltar"
                : "Cuentan dentro de los de arriba"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {requirable.map((field) => {
                const on = required.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleField(field)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on
                        ? "border-accent-violet/40 bg-accent-violet/12 text-accent-violet font-semibold"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {REQUIRABLE_LABELS[field]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-border/60 border-t pt-3.5">
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    !verifierAvailable && "text-muted-foreground",
                  )}
                >
                  Solo verificados
                </span>
                <p className="text-muted-foreground text-xs">
                  Correo o teléfono confirmados de verdad, no solo con buena forma
                </p>
              </span>
              <Switch
                className="mt-0.5"
                checked={value.verified_only === true}
                disabled={!verifierAvailable}
                onCheckedChange={(next) => patch({ verified_only: next })}
                aria-label="Solo verificados"
              />
            </div>
            {!verifierAvailable && (
              <Caution>
                <b>Necesita un verificador de pago conectado.</b> Con las fuentes gratis nadie
                llega a «verificado», así que activarlo dejaría la bandeja en cero y la búsqueda
                parecería rota.
              </Caution>
            )}
          </div>

          {/* El techo aparece solo cuando el tope cuenta admitidos: es justo
              cuando las dos cifras dejan de ser la misma. */}
          {active && (
            <div>
              <label className="text-sm font-semibold" htmlFor="adm-ceiling">
                Techo de gasto
              </label>
              <p className="text-muted-foreground text-xs">
                Para si se pasa de aquí, cumplan o no
              </p>
              <Select
                value={value.max_records == null ? ANY : String(value.max_records)}
                onValueChange={(next) =>
                  patch({ max_records: next === ANY ? null : Number(next) })
                }
              >
                <SelectTrigger id="adm-ceiling" className="mt-1 w-full">
                  <SelectValue placeholder="Sin techo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Sin techo</SelectItem>
                  {RECORD_CEILINGS.map((ceiling) => (
                    <SelectItem key={ceiling} value={String(ceiling)}>
                      Hasta {ceiling.toLocaleString("es-CO")} registros
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="border-accent-violet/20 bg-accent-violet/8 rounded-md border px-3 py-2.5 text-xs leading-relaxed">
            {admissionSentence(value, limit, categoryLabel)}
          </p>

          {active && !freeSource && (
            <Caution>
              <b>Filtrar no abarata.</b> Se paga por cada registro que la fuente devuelve; el
              filtro decide qué entra a tu bandeja, no qué te cobran.
            </Caution>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Aviso al pie de un control. Ámbar: no es un error, es una consecuencia. */
function Caution({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-warning/40 bg-warning/8 text-muted-foreground mt-2 rounded-md border-l-2 px-3 py-2 text-xs leading-relaxed">
      {children}
    </p>
  );
}
