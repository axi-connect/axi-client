"use client";

import { useId } from "react";
import { Search } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { OptionsInput } from "@/shared/components/features/options-input/OptionsInput";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  activePeopleFilters,
  canSearchPeople,
  EMPTY_PEOPLE_FILTERS,
  SENIORITY_OPTIONS,
  SIZE_OPTIONS,
  type PeopleFilters as Filters,
} from "../../domain/people-filters";
import type { DiscoveryCategoryDTO } from "../../domain/search";

const ANY_CATEGORY = "__any__";

/**
 * Los filtros de Personas (tablero 5, columna izquierda).
 *
 * Solo lo que Apollo puede filtrar de verdad ANTES de buscar, más «Celular
 * directo», que filtra la página que se ve (Apollo no lo sabe antes de
 * revelar). Sin «Instagram activo» ni «Reseñas no contestan»: ninguna fuente lo
 * da, y un filtro que no filtra es una promesa falsa.
 */
export function PeopleFilters({
  value,
  onChange,
  onSearch,
  categories,
  searching,
  disabled,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  onSearch: () => void;
  categories: readonly DiscoveryCategoryDTO[];
  searching: boolean;
  disabled: boolean;
}) {
  const titlesId = useId();
  const cityId = useId();
  const set = <K extends keyof Filters>(key: K, next: Filters[K]) => onChange({ ...value, [key]: next });
  const toggle = (key: "seniorities" | "sizes", option: string) =>
    set(
      key,
      value[key].includes(option) ? value[key].filter((entry) => entry !== option) : [...value[key], option],
    );

  return (
    <form
      aria-label="Filtros de personas"
      className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-3xl border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSearchPeople(value)) onSearch();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold tracking-tight">Filtros</h2>
        {activePeopleFilters(value) > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-6 items-center text-xs underline-offset-4 hover:underline"
            onClick={() => onChange(EMPTY_PEOPLE_FILTERS)}
          >
            Limpiar
          </button>
        )}
      </div>

      <Section title="Cargo">
        <label htmlFor={titlesId} className="sr-only">
          Cargo
        </label>
        <OptionsInput
          inputId={titlesId}
          ariaLabel="Añadir un cargo"
          value={value.titles}
          onChange={(titles) => set("titles", titles)}
          max={15}
          maxLength={80}
          disabled={disabled}
        />
        <label className="flex min-h-6 items-center gap-2 text-sm">
          <Checkbox
            checked={value.includeSimilar}
            onChange={(event) => set("includeSimilar", event.target.checked)}
            disabled={disabled}
          />
          Incluir cargos parecidos
        </label>
      </Section>

      <Section title="Jerarquía">
        <ToggleChips
          label="Jerarquía"
          options={SENIORITY_OPTIONS}
          selected={value.seniorities}
          onToggle={(option) => toggle("seniorities", option)}
          disabled={disabled}
        />
      </Section>

      <Section title="Industria">
        <Select
          value={value.categoryId ?? ANY_CATEGORY}
          onValueChange={(next) => set("categoryId", next === ANY_CATEGORY ? null : next)}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Industria" className="w-full">
            <SelectValue placeholder="Cualquiera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CATEGORY}>Cualquiera</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label}
                {category.ciiu.length > 0 && (
                  <span className="text-muted-foreground font-mono text-xs"> · {category.ciiu.join(", ")}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="Ubicación de la empresa">
        <label htmlFor={cityId} className="sr-only">
          Ciudad
        </label>
        <Input
          id={cityId}
          value={value.city}
          onChange={(event) => set("city", event.target.value)}
          placeholder="Medellín"
          maxLength={80}
          disabled={disabled}
        />
      </Section>

      <Section title="Tamaño">
        <ToggleChips
          label="Tamaño de la empresa"
          options={SIZE_OPTIONS}
          selected={value.sizes}
          onToggle={(option) => toggle("sizes", option)}
          disabled={disabled}
        />
      </Section>

      <Section title="Tiene">
        <CheckRow
          label="Correo verificado"
          checked={value.emailVerified}
          onChange={(checked) => set("emailVerified", checked)}
          disabled={disabled}
        />
        <CheckRow
          label="Celular directo"
          hint="en esta página"
          checked={value.directPhone}
          onChange={(checked) => set("directPhone", checked)}
          disabled={disabled}
        />
      </Section>

      <Section title="Señales">
        <CheckRow
          label="Vacante de ventas o atención"
          checked={value.hiring}
          onChange={(checked) => set("hiring", checked)}
          disabled={disabled}
        />
      </Section>

      <Button type="submit" className="rounded-full" disabled={disabled || searching || !canSearchPeople(value)}>
        <Search aria-hidden className="size-4" />
        {searching ? "Buscando…" : "Buscar"}
      </Button>
      {!canSearchPeople(value) && !disabled && (
        <p className="text-muted-foreground -mt-2 text-xs text-pretty">
          Escribe al menos un cargo o elige una jerarquía.
        </p>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border flex min-w-0 flex-col gap-2 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="float-left mb-1 w-full text-xs font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Varias opciones a la vez, cada una un interruptor (§9.3: no es una pestaña). */
function ToggleChips({
  label,
  options,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(option.value)}
            className={cn(
              "focus-visible:ring-ring inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
              on
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex min-h-6 items-center gap-2 text-sm">
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span>
        {label}
        {hint !== undefined && <span className="text-muted-foreground text-xs"> · {hint}</span>}
      </span>
    </label>
  );
}
