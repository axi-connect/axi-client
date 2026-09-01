"use client";

import { useCallback, useState } from "react";
import { Plus, X } from "lucide-react";

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
}: {
  icp: IcpDTO;
  readOnly: boolean;
  saving: boolean;
  onSave: (next: IcpDTO) => void;
}) {
  const [draft, setDraft] = useState<IcpDTO>(icp);
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
    <div>
      <h3 className="font-heading text-base font-bold">Tu cliente ideal</h3>
      <p className="text-muted-foreground mt-1 mb-4 text-xs">
        Decide qué leads te sirven. Cámbialo y todos se vuelven a puntuar — no
        consume unidades.
      </p>

      <div className="flex flex-col gap-4">
        {LISTS.map((list) => (
          <div key={list.key}>
            <label
              className="text-sm font-semibold"
              htmlFor={`icp-${list.key}`}
            >
              {list.label}
            </label>
            <p className="text-muted-foreground text-xs">{list.hint}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {draft.definition[list.key].map((term) => (
                <span
                  key={term}
                  className="border-border bg-secondary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  {term}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeTerm(list.key, term)}
                      aria-label={`Quitar ${term}`}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  )}
                </span>
              ))}
              {draft.definition[list.key].length === 0 && (
                <span className="text-muted-foreground text-xs">
                  Sin definir: este criterio no se evalúa
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="mt-2 flex gap-2">
                <Input
                  id={`icp-${list.key}`}
                  value={drafts[list.key] ?? ""}
                  placeholder={list.placeholder}
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
                  onClick={() => addTerm(list.key, drafts[list.key] ?? "")}
                >
                  <Plus className="size-4" aria-hidden />
                  Añadir
                </Button>
              </div>
            )}
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold">Cuánto pesa cada cosa</p>
          <p className="text-muted-foreground mb-2 text-xs">
            Súbele a lo que de verdad te importa. No hace falta que sumen 100.
          </p>
          {QUALITY_AXES.map((axis) => (
            <div key={axis.key} className="flex items-center gap-3 py-1.5">
              <label className="flex-1 text-sm" htmlFor={`weight-${axis.key}`}>
                {axis.label}
              </label>
              <input
                id={`weight-${axis.key}`}
                type="range"
                min={0}
                max={60}
                step={5}
                disabled={readOnly}
                value={Math.round(draft.weights[axis.key])}
                onChange={(event) =>
                  setWeight(axis.key, Number(event.target.value))
                }
                className="accent-accent-violet w-32"
              />
              <span className="w-8 text-right text-sm font-semibold tabular-nums">
                {Math.round(draft.weights[axis.key])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <Button
          className="mt-4"
          disabled={saving}
          onClick={() => onSave(draft)}
        >
          Guardar y volver a puntuar
        </Button>
      )}
    </div>
  );
}
