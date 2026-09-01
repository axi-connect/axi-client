"use client";

import { Info } from "lucide-react";

import DetailSheet from "@/shared/components/features/detail-sheet/DetailSheet";
import { Button } from "@/shared/components/ui/button";

export type DeleteOutcome = {
  /** Cuántos se pidieron. Es el denominador del informe. */
  asked: number;
  deleted: number;
  /** Los que sobrevivieron, con su motivo tal como lo escribe el backend. */
  kept: readonly { name: string; reason: string }[];
  /** Cuántos ya no existían. NÚMERO y no lista: ver el docblock. */
  missing: number;
};

/**
 * ¿Merece abrirse el panel?
 *
 * **Solo si hay algo que explicar.** Un panel obligatorio tras borrar tres filas
 * sin novedad se aprende a cerrar sin leer, y entonces no se lee el que sí
 * importa. Cuando todo salió limpio, la vista lanza un aviso y a otra cosa.
 */
export function needsDeleteSheet(outcome: DeleteOutcome): boolean {
  return outcome.kept.length > 0 || outcome.missing > 0;
}

/**
 * Lo que no se borró, y por qué.
 *
 * Existe porque el resultado de un borrado en lote **no es un sí o un no**: unos
 * se van, otros sobreviven por ser ya contactos del CRM, y otros ya no estaban
 * cuando llegamos. Que el dueño se entere contando filas es un fallo de diseño.
 *
 * La cuenta se pinta como «N de M» porque el backend garantiza que
 * `deleted + kept.length + missing` cuadra con lo enviado: es lo que permite
 * leer el informe sin sumar a mano.
 *
 * `missing` va como número y no como lista, y no es pereza: después de un
 * borrado masivo no se puede saber cuál de los ausentes lo borramos nosotros y
 * cuál no existía, así que dar ids sería inventarse el detalle.
 */
export function DeleteResultSheet({
  open,
  onOpenChange,
  outcome,
  /** «leads» o «búsquedas»: el informe habla de lo que se borró. */
  noun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outcome: DeleteOutcome | null;
  noun: { one: string; many: string };
}) {
  if (outcome === null) return null;
  const word = outcome.deleted === 1 ? noun.one : noun.many;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      side="auto"
      size="md"
      title="Resultado"
      subtitle="Lo que no se borró, y por qué."
      renderFooter={() => (
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </div>
      )}
    >
      <div className="border-border bg-muted/55 flex items-baseline gap-2 rounded-md border px-3.5 py-3">
        <span className="text-2xl font-semibold tabular-nums">{outcome.deleted}</span>
        <span className="text-muted-foreground text-[12.5px]">
          {word} eliminados de <span className="tabular-nums">{outcome.asked}</span>
        </span>
      </div>

      {outcome.kept.length > 0 && (
        <section className="mt-5">
          <h3 className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.085em] uppercase">
            Se quedaron ({outcome.kept.length})
          </h3>
          {/* Se ELEVAN, no se tiñen: es el mismo gesto que el resto del slice, y
              además esto no es una advertencia — es una lista de hechos. */}
          <ul className="mt-2.5 flex flex-col gap-2">
            {outcome.kept.map((item) => (
              <li
                key={item.name}
                className="border-border-soft bg-background shadow-float rounded-md border px-3 py-2.5"
              >
                <p className="text-[13.5px] font-medium">{item.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[11.5px]">{item.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outcome.missing > 0 && (
        <p className="border-border-soft bg-muted/60 text-muted-foreground mt-4 flex gap-2 rounded-md border px-3 py-2.5 text-[12px] leading-relaxed">
          <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>
            <span className="tabular-nums">{outcome.missing}</span>{" "}
            {outcome.missing === 1 ? "ya no existía" : "ya no existían"} cuando llegamos. Pudo
            borrarlos otra persona, o la puerta de admisión de una búsqueda.
          </span>
        </p>
      )}
    </DetailSheet>
  );
}
