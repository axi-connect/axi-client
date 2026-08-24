"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * Pastilla de navegación: el recetario visual ÚNICO de todas las pestañas y
 * segmentados del panel (DESIGN-SYSTEM §9.3).
 *
 * Antes había tres lenguajes para la misma idea —subrayado en las navegaciones
 * de sección, rectángulo gris en los `Tabs` de Radix y pill coral en once
 * copias de un `SegmentedToggle` a mano—. Aquí vive el aspecto; la **semántica
 * la elige cada familia**, que no es lo mismo:
 *
 * | Familia | Qué es | Componente |
 * |---|---|---|
 * | Navegación de sección | cambia de ruta | `NavTabs` (`layout/nav-tabs.tsx`) |
 * | Pestañas con panel | cambia de vista en la misma página | `Tabs variant="pill"` |
 * | Filtros y conmutadores | elige entre opciones, sin panel | `SegmentedControl` |
 *
 * El activo NO es coral sólido: es `bg-accent` (coral al 14 %) con la etiqueta
 * en `accent-foreground` y el icono en `text-brand`. Razón dura: blanco sobre
 * `--axi-brand` da ~3.1:1 y **no pasa AA** para texto pequeño, y estas etiquetas
 * miden 12–13px. Además es el mismo tratamiento del ítem activo del sidebar
 * (§9.2), así que el producto entero navega con un solo lenguaje.
 */

/* ─────────────────────────── Recetario de clases ─────────────────────────── */

export const segmentedListVariants = cva(
  // `overflow-x-auto` + scrollbar oculta: cuando no cabe, la barra scrollea
  // dentro de sí misma. El body de la vista nunca scrollea en horizontal (§4.2).
  "relative flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  {
    variants: {
      size: { default: "p-1", sm: "p-0.5" },
      surface: {
        /** Barra de cabecera: se lee como un control por encima del contenido. */
        raised: "border-border bg-card border shadow-[var(--shadow-float)]",
        /** Dentro de una card: sin sombra, para no elevar dos veces. */
        inline: "border-border bg-secondary/60 border",
      },
    },
    defaultVariants: { size: "default", surface: "raised" },
  },
);

export const segmentedItemVariants = cva(
  [
    "relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full",
    "font-medium whitespace-nowrap no-underline outline-none transition-colors duration-200",
    "text-muted-foreground hover:text-foreground",
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "disabled:pointer-events-none disabled:opacity-50",
    // El activo se marca de tres formas distintas según la familia: Radix pone
    // `data-state`, la navegación por ruta pone `aria-current`, y el segmentado
    // pone `data-active`. Las tres pintan igual.
    "data-[state=active]:text-accent-foreground data-[active=true]:text-accent-foreground aria-[current=page]:text-accent-foreground",
    "[&_svg]:shrink-0 [&_svg]:transition-colors",
    "data-[state=active]:[&_svg]:text-brand data-[active=true]:[&_svg]:text-brand aria-[current=page]:[&_svg]:text-brand",
  ],
  {
    variants: {
      size: {
        default: "h-9 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export type SegmentedSize = NonNullable<VariantProps<typeof segmentedItemVariants>["size"]>;

/**
 * Modo de etiqueta (decisión D3 del plan).
 * - `always`: siempre visibles.
 * - `active`: solo la del ítem activo; el resto queda como icono.
 * - `auto`: `active` por debajo de `md` y `always` a partir de ahí.
 */
export type SegmentedLabels = "always" | "active" | "auto";

/* ────────────────────────── La pastilla que se mueve ────────────────────── */

/**
 * Coloca la pastilla sobre el ítem activo y la mantiene ahí.
 *
 * Observa el **DOM**, no el estado de React, y por eso sirve para las tres
 * familias sin que ninguna tenga que duplicar cuál es su ítem activo: los
 * `Tabs` de Radix marcan `data-state="active"`, la navegación por ruta marca
 * `aria-current="page"` y el segmentado marca `data-active="true"`.
 *
 * Solo se animan `transform` y `width` (compositor), y la animación se anula con
 * `prefers-reduced-motion` desde CSS — no hace falta JS para eso.
 */
const ACTIVE_SELECTOR =
  '[data-state="active"],[data-active="true"],[aria-current="page"]';

function useActivePill(
  listRef: React.RefObject<HTMLElement | null>,
  pillRef: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    // La geometría se escribe DIRECTAMENTE en el nodo, no en estado de React:
    // la pastilla es decorativa, así que medir no debe re-renderizar la barra
    // entera (y un `setState` desde un observer asíncrono además obliga a
    // envolver cada test en `act`).
    const measure = () => {
      const active = list.querySelector<HTMLElement>(ACTIVE_SELECTOR);
      if (!active) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.opacity = "1";
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
    };

    measure();

    // `attributes`: el cambio de ítem activo llega como cambio de atributo, no
    // como re-render de este componente (Radix lo escribe directamente).
    const mutations = new MutationObserver(measure);
    mutations.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state", "data-active", "aria-current", "class"],
    });

    // El ancho de los ítems cambia al revelar etiquetas, al cambiar el viewport
    // y cuando terminan de cargar las webfonts (Poppins mide distinto que el
    // fallback: sin esto la pastilla queda corrida en el primer paint).
    const resize = new ResizeObserver(measure);
    resize.observe(list);
    Array.from(list.children).forEach((child) => resize.observe(child));

    list.addEventListener("scroll", measure, { passive: true });
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      mutations.disconnect();
      resize.disconnect();
      list.removeEventListener("scroll", measure);
    };
  }, [listRef, pillRef]);
}

export function SegmentedPill({
  listRef,
  size = "default",
}: {
  listRef: React.RefObject<HTMLElement | null>;
  size?: SegmentedSize;
}) {
  const pillRef = React.useRef<HTMLSpanElement>(null);
  useActivePill(listRef, pillRef);

  return (
    <span
      ref={pillRef}
      aria-hidden="true"
      data-slot="segmented-pill"
      className={cn(
        "bg-accent pointer-events-none absolute z-0 rounded-full opacity-0",
        "transition-[transform,width,opacity] duration-300 ease-out motion-reduce:transition-none",
        size === "sm" ? "top-0.5 bottom-0.5" : "top-1 bottom-1",
      )}
    />
  );
}

/* ──────────────────────── Contenido de un ítem ──────────────────────── */

/** Etiqueta con revelado. Nunca se saca del DOM: el lector la sigue leyendo. */
export function SegmentedLabel({
  children,
  labels = "always",
  active = false,
}: {
  children: React.ReactNode;
  labels?: SegmentedLabels;
  active?: boolean;
}) {
  const hidden = !active && labels !== "always";
  return (
    <span
      className={cn(
        "inline-block overflow-hidden transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none",
        hidden ? "max-w-0 opacity-0" : "max-w-[14rem] opacity-100",
        // `auto` = colapsada solo por debajo de md.
        hidden && labels === "auto" && "md:max-w-[14rem] md:opacity-100",
      )}
    >
      {children}
    </span>
  );
}

/** Contador de la derecha. Tabular para que no baile al cambiar de cifra. */
export function SegmentedCount({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[0.6875rem] tabular-nums transition-colors",
        active
          ? "bg-brand/20 text-accent-foreground"
          : "bg-foreground/8 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────── SegmentedControl ─────────────────────────── */

export type SegmentedItem<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: LucideIcon;
  /** Contador a la derecha; `null`/`undefined` no pinta nada. */
  count?: number | string | null;
  disabled?: boolean;
};

/**
 * Filtros y conmutadores de vista: eligen entre opciones y **no tienen panel**.
 *
 * Por eso son un `radiogroup` con `aria-checked` y tabindex móvil, no pestañas.
 * Las once copias que sustituye declaraban `role="tab"` sin `tabpanel`: para un
 * lector de pantalla eso anuncia una pestaña cuyo contenido no existe.
 */
export function SegmentedControl<TValue extends string>({
  value,
  onValueChange,
  items,
  label,
  size = "default",
  surface = "raised",
  labels = "always",
  className,
}: {
  value: TValue;
  onValueChange: (value: TValue) => void;
  items: readonly SegmentedItem<TValue>[];
  /** Nombre del grupo para el lector de pantalla. Obligatorio. */
  label: string;
  size?: SegmentedSize;
  surface?: "raised" | "inline";
  labels?: SegmentedLabels;
  className?: string;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, step: number) => {
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);
    if (enabled.length === 0) return;
    const position = enabled.findIndex(({ index }) => index === from);
    const next = enabled[(position + step + enabled.length) % enabled.length];
    itemRefs.current[next.index]?.focus();
    onValueChange(next.item.value);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      move(index, step);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const target = event.key === "Home" ? items[0] : items[items.length - 1];
      if (!target.disabled) onValueChange(target.value);
    }
  };

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      data-slot="segmented-control"
      className={cn(segmentedListVariants({ size, surface }), className)}
    >
      <SegmentedPill listRef={listRef} size={size} />

      {items.map((item, index) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            disabled={item.disabled}
            // Roving tabindex: el grupo entero es UNA parada de tabulación y las
            // flechas recorren las opciones (patrón ARIA de radiogroup).
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={segmentedItemVariants({ size })}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            <SegmentedLabel labels={Icon ? labels : "always"} active={active}>
              {item.label}
            </SegmentedLabel>
            {item.count !== null && item.count !== undefined ? (
              <SegmentedCount active={active}>{item.count}</SegmentedCount>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
