"use client";

import { Check, KeyRound, Megaphone, PackageCheck } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useRadioGroup } from "@/core/hooks/use-radio-group";
import { TEMPLATE_COST_CO_USD, type HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";

type Category = HsmTemplateDTO["category"];
type Purpose = Exclude<Category, "authentication">;

const PURPOSES: ReadonlyArray<{
  value: Purpose;
  label: string;
  subtitle: string;
  example: string;
  review: string;
  reviewNote: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "marketing",
    label: "Marketing",
    subtitle: "Promociones y lanzamientos",
    example: "Ya llegó la colección nueva: 20 % hasta el domingo.",
    review: "Revisión estricta",
    reviewNote: `≈ ${String(Math.round(TEMPLATE_COST_CO_USD.marketing / TEMPLATE_COST_CO_USD.utility))} × utilidad`,
    icon: Megaphone,
  },
  {
    value: "utility",
    label: "Utilidad",
    subtitle: "Algo que el cliente inició",
    example: "Tu pedido #4821 ya salió. Llega mañana entre 9 y 12.",
    review: "Revisión rápida",
    reviewNote: "suele aprobarse en minutos",
    icon: PackageCheck,
  },
];

const VALUES = PURPOSES.map((purpose) => purpose.value);

/** El precio por mensaje entregado en Colombia, como lo dice una persona: «US$ 0,02». */
function price(category: Purpose): string {
  const usd = TEMPLATE_COST_CO_USD[category];
  return `US$ ${usd.toLocaleString("es-CO", { maximumFractionDigits: 4 })}`;
}

/**
 * «¿Para qué es?» (maqueta F0 v2, punto 4): dos decisiones, no tres casillas.
 * La categoría no es un dato de la ficha: decide el costo y lo estricta que es
 * la revisión, y por eso va primero y con un ejemplo de cada una. Autenticación
 * no se crea desde aquí (Meta exige un botón de código que axi no maneja) y
 * baja a una nota en vez de ocupar una tarjeta apagada.
 */
export function PurposeCards({
  value,
  onChange,
  locked,
}: {
  value: Category;
  onChange: (next: Purpose) => void;
  /** Una aprobada no cambia de categoría: la otra tarjeta se apaga. */
  locked: boolean;
}) {
  const selected = value === "authentication" ? null : value;
  const radio = useRadioGroup(VALUES, selected, (next) => {
    if (!locked) onChange(next);
  });

  return (
    <div className="@container space-y-3">
      <div role="radiogroup" aria-label="Para qué es" className="grid gap-3 @xl:grid-cols-2">
        {PURPOSES.map((purpose) => {
          const Icon = purpose.icon;
          const checked = purpose.value === value;
          const disabled = locked && !checked;
          return (
            <button
              key={purpose.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={disabled}
              {...radio(purpose.value)}
              onClick={() => !disabled && onChange(purpose.value)}
              className={cn(
                "bg-card flex min-w-0 flex-col gap-3.5 rounded-[20px] border p-4.5 text-left transition-[border-color,box-shadow] duration-150",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                checked
                  ? "border-foreground shadow-[var(--shadow-float)] ring-1 ring-foreground"
                  : "border-border hover:border-foreground/30",
                disabled && "cursor-not-allowed opacity-50 hover:border-border",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9.5 shrink-0 place-items-center rounded-xl",
                    checked ? "bg-foreground text-background" : "bg-secondary text-foreground",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15.5px] font-semibold tracking-tight">{purpose.label}</span>
                  <span className="text-muted-foreground text-xs">{purpose.subtitle}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-auto grid size-5.5 shrink-0 place-items-center rounded-full border-[1.5px]",
                    checked ? "border-foreground bg-foreground text-background" : "border-border",
                  )}
                >
                  {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </span>
              <span className="bg-secondary rounded-xl px-3 py-2.5 text-[13px] leading-snug">
                <span className="text-muted-foreground mb-0.5 block text-[10.5px] font-semibold tracking-[0.07em] uppercase">
                  Por ejemplo
                </span>
                {purpose.example}
              </span>
              <span className="border-border/60 flex flex-col gap-1 border-t pt-3">
                <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="font-heading text-2xl font-bold tracking-tight tabular-nums">{price(purpose.value)}</span>
                  <span className="text-muted-foreground text-xs">por mensaje</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  <span className="text-foreground font-medium">{purpose.review}</span> · {purpose.reviewNote}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <KeyRound aria-hidden="true" className="size-3.5 shrink-0" />
        Las de autenticación —códigos de verificación— no se crean desde aquí.
      </p>
    </div>
  );
}
