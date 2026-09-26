"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { useRadioGroup } from "@/core/hooks/use-radio-group";
import { cn } from "@/core/lib/utils";
import { useFeatures } from "@/shared/auth/features.hooks";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { NICHES, nicheByCode } from "@/modules/onboarding/public";

/**
 * Lo que va a cambiar al guardar (Cobros premium P1), antes de guardar: con el
 * tipo elegido, qué funciones se sugieren. El mapa sale de `GET /me/features`
 * (`niche_defaults`); sin él (cargando o falló) la vista previa no se pinta
 * — no se inventa qué sugiere un tipo.
 */
export function nichePreview(
  niche: string,
  nicheDefaults: Record<string, readonly string[]> | null,
  features: ReadonlyArray<{ code: string; label: string }>,
): {
  suggested: number;
  rows: Array<{ code: string; label: string; on: boolean }>;
} | null {
  if (nicheDefaults === null || features.length === 0) return null;
  const on = new Set(nicheDefaults[niche] ?? []);
  const rows = features.map((feature) => ({
    code: feature.code,
    label: feature.label,
    on: on.has(feature.code),
  }));
  return { suggested: rows.filter((row) => row.on).length, rows };
}

/**
 * El tipo de negocio como tarjetas (`radiogroup`, patrón de §9.3) y, al lado,
 * la isla «Al guardar». Controlado por el formulario de Mi empresa › General:
 * no guarda solo, lo guarda la barra de «Cambios sin guardar».
 */
export function NichePicker({
  value,
  saved,
  onChange,
  error,
}: {
  value: string;
  /** El tipo guardado: la isla dice «Así está hoy» mientras no cambie. */
  saved: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const { features, nicheDefaults } = useFeatures();
  const preview =
    value === ""
      ? null
      : nichePreview(value, nicheDefaults ?? null, features ?? []);
  const name = nicheByCode(value)?.name ?? null;
  const changed = value !== saved;
  const total = preview?.rows.length ?? 0;
  const radio = useRadioGroup(
    NICHES.map((niche) => niche.code),
    value === "" ? null : value,
    onChange,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p id="company-niche-label" className="text-sm font-medium">
            Tipo de negocio
          </p>
          <p className="text-sm text-muted-foreground">
            Define qué funciones tienen sentido para tu negocio: planes de pago,
            cobranza, moneda y documentos. Ajusta cuáles usas en{" "}
            <Link
              href="/settings/company/funciones"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Funciones
            </Link>
            .
          </p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="company-niche-label"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        >
          {NICHES.map((niche) => {
            const checked = niche.code === value;
            return (
              <button
                key={niche.code}
                type="button"
                role="radio"
                aria-checked={checked}
                {...radio(niche.code)}
                onClick={() => onChange(niche.code)}
                className={cn(
                  "flex min-h-12 items-center gap-2.5 rounded-2xl border bg-card px-3.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  checked
                    ? "border-foreground ring-1 ring-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                    checked ? "border-foreground" : "border-foreground/30",
                  )}
                >
                  {checked ? (
                    <span className="size-2 rounded-full bg-foreground" />
                  ) : null}
                </span>
                <span className="min-w-0">{niche.name}</span>
              </button>
            );
          })}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {preview !== null && name !== null ? (
        <InkIsland label="Al guardar" className="gap-4">
          <div className="flex flex-col gap-1.5">
            <Kicker>Al guardar</Kicker>
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
              {!changed
                ? "Así está hoy"
                : preview.suggested === 0
                  ? "Sin funciones de cobro"
                  : `${preview.suggested} de ${total} funciones sugeridas`}
            </p>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {preview.suggested === 0
                ? `${name} suele cobrar de contado: no se sugiere ninguna. Puedes encenderlas igual en Funciones.`
                : `Con ${name} se sugiere lo que ves abajo.`}
            </p>
          </div>
          <ul className="flex flex-col">
            {preview.rows.map((row) => (
              <li
                key={row.code}
                className="flex items-center gap-3 border-t border-border py-2.5 text-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full",
                    row.on
                      ? "bg-muted text-foreground"
                      : "border-[1.5px] border-foreground/30",
                  )}
                >
                  {row.on ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    row.on ? "font-medium" : "text-muted-foreground",
                  )}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span className="sr-only">
                  {row.on ? "se sugiere" : "no se sugiere"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
            Lo que ya encendiste o apagaste tú no cambia: el tipo de negocio
            solo sugiere.
          </p>
        </InkIsland>
      ) : null}
    </div>
  );
}
