"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { BentoTile } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import {
  QUALITY_AXES,
  type IcpDTO,
  type QualityAxisKey,
} from "../../domain/lead";

type ListKey = "categories" | "cities" | "keywords" | "exclude_keywords";

const LISTS: {
  key: ListKey;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "categories",
    label: "Sectores",
    hint: "A qué se dedican los negocios que te compran",
    placeholder: "Restaurantes",
  },
  {
    key: "cities",
    label: "Ciudades",
    hint: "Dónde puedes atender",
    placeholder: "Bogotá",
  },
  {
    key: "keywords",
    label: "Señales buenas",
    hint: "Palabras que, si aparecen, suman",
    placeholder: "varias sedes",
  },
  {
    key: "exclude_keywords",
    label: "Descartar si mencionan",
    hint: "Un veto: por bien que puntúen en lo demás",
    placeholder: "comidas rápidas",
  },
];

/**
 * El cliente ideal, editable.
 *
 * Sin criterios NO se penaliza a nadie: el eje de Ajuste queda sin medir y sale
 * del denominador. Por eso los campos nacen vacíos en vez de con ejemplos
 * precargados — inventarle sectores al tenant haría que sus leads puntuaran
 * contra un criterio que nadie eligió.
 *
 * Los pesos no exigen sumar 100: el backend los re-escala. Pedirle aritmética a
 * alguien que está moviendo unos deslizadores es justo lo que esta pantalla
 * existe para evitar.
 */
export function IcpEditor({
  icp,
  readOnly,
  saving,
  onSave,
  aside,
}: {
  icp: IcpDTO;
  readOnly: boolean;
  saving: boolean;
  onSave: (next: IcpDTO) => void;
  /** Lo que va bajo los pesos, en la columna derecha (qué se verifica hoy). */
  aside?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<IcpDTO>(icp);
  // Guardado (o recargado) desde fuera: el borrador vuelve a ser lo guardado.
  useEffect(() => setDraft(icp), [icp]);
  const dirty =
    JSON.stringify({ definition: draft.definition, weights: draft.weights }) !==
    JSON.stringify({ definition: icp.definition, weights: icp.weights });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const addTerm = useCallback((key: ListKey, value: string) => {
    const term = value.trim();
    if (term.length === 0) return;
    setDraft((previous) => {
      const current = previous.definition[key];
      if (current.includes(term)) return previous;
      return {
        ...previous,
        definition: { ...previous.definition, [key]: [...current, term] },
      };
    });
    setDrafts((previous) => ({ ...previous, [key]: "" }));
  }, []);

  const removeTerm = useCallback((key: ListKey, term: string) => {
    setDraft((previous) => ({
      ...previous,
      definition: {
        ...previous.definition,
        [key]: previous.definition[key].filter((item) => item !== term),
      },
    }));
  }, []);

  const setWeight = useCallback((axis: QualityAxisKey, value: number) => {
    setDraft((previous) => ({
      ...previous,
      weights: { ...previous.weights, [axis]: value },
    }));
  }, []);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start [&>*]:min-w-0">
        <BentoTile label="Tu cliente ideal">
          <p className="text-sm text-pretty">
            Decide qué leads te sirven. Cámbialo y todos se vuelven a puntuar — no consume unidades.
          </p>
          <div className="divide-border divide-y">
            {LISTS.map((list) => (
              <div key={list.key} className="flex flex-col gap-2 py-4 last:pb-1">
                <div className="flex flex-col gap-0.5">
                  <label className="text-sm font-semibold" htmlFor={`icp-${list.key}`}>
                    {list.label}
                  </label>
                  <p className="text-muted-foreground text-xs">{list.hint}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {draft.definition[list.key].map((term) => (
                    <span
                      key={term}
                      className={`bg-muted inline-flex h-8 items-center gap-0.5 rounded-full text-[13px] font-medium ${readOnly ? "px-3" : "pr-1 pl-3"}`}
                    >
                      {term}
                      {!readOnly && (
                        // 24 px: el objetivo mínimo (§10). Antes era una «x» de 12 px.
                        <button
                          type="button"
                          onClick={() => removeTerm(list.key, term)}
                          aria-label={`Quitar ${term}`}
                          className="text-muted-foreground hover:bg-background hover:text-destructive grid size-6 place-items-center rounded-full transition-colors"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </span>
                  ))}
                  {draft.definition[list.key].length === 0 && (
                    <span className="text-muted-foreground text-xs italic">
                      Sin definir: este criterio no se evalúa
                    </span>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      id={`icp-${list.key}`}
                      value={drafts[list.key] ?? ""}
                      placeholder={list.placeholder}
                      className="rounded-full"
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [list.key]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        addTerm(list.key, drafts[list.key] ?? "");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => addTerm(list.key, drafts[list.key] ?? "")}
                    >
                      <Plus className="size-4" aria-hidden />
                      Añadir
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </BentoTile>

        <div className="flex min-w-0 flex-col gap-4">
          <BentoTile label="Cuánto pesa cada cosa">
            <p className="text-sm text-pretty">Súbele a lo que de verdad te importa. No hace falta que sumen 100.</p>
            <div className="divide-border divide-y">
              {QUALITY_AXES.map((axis) => (
                <div key={axis.key} className="flex flex-col gap-1.5 py-3 last:pb-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <label className="text-sm font-medium" htmlFor={`weight-${axis.key}`}>
                      {axis.label} <span className="text-muted-foreground font-normal">— {axis.question}</span>
                    </label>
                    <span className="font-heading text-base font-bold tabular-nums">
                      {Math.round(draft.weights[axis.key])}
                    </span>
                  </div>
                  <input
                    id={`weight-${axis.key}`}
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    disabled={readOnly}
                    value={Math.round(draft.weights[axis.key])}
                    onChange={(event) => setWeight(axis.key, Number(event.target.value))}
                    className="accent-accent-violet h-6 w-full cursor-pointer disabled:cursor-default"
                  />
                </div>
              ))}
            </div>
          </BentoTile>
          {aside}
        </div>
      </div>

      {/* La barra de guardar en tinta, solo con cambios (§9.5.1): sin cambios no hay nada que guardar. */}
      {!readOnly && dirty && (
        <Island
          as="footer"
          material="ink"
          role="region"
          aria-label="Guardar el cliente ideal"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3 sm:rounded-full sm:py-2.5 sm:pr-2.5"
        >
          <p className="text-sm text-pretty">
            <span className="font-semibold">Cambios sin guardar</span>
            <span className="text-muted-foreground"> · tus leads se vuelven a puntuar, sin consumir unidades</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="glass" disabled={saving} onClick={() => setDraft(icp)}>
              Descartar
            </Button>
            <Button variant="contrast" className="rounded-full" disabled={saving} onClick={() => onSave(draft)}>
              {saving ? "Guardando…" : "Guardar y volver a puntuar"}
            </Button>
          </div>
        </Island>
      )}
    </>
  );
}
