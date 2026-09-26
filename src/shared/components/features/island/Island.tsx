import { cn } from "@/core/lib/utils";

/**
 * La isla (DESIGN-SYSTEM §9.5.1): la superficie de lo más accionable de una
 * pantalla, en tinta o en cristal (blanco o negro). Todo su aspecto vive en
 * `globals.css` (bloque ISLAS); aquí solo se eligen las clases.
 *
 * Una isla es una SUPERFICIE CON ESQUEMA PROPIO (`.surface-dark` o
 * `.surface-light`): redefine los tokens del tema en su subárbol, así que lo
 * que va dentro se escribe con los tokens de siempre (`text-muted-foreground`,
 * `bg-muted`, `Button variant="contrast"`), sin `text-background` ni `dark:`.
 *
 * Sin estado ni efectos: sirve en Server Components y no añade nodos (el
 * brillo es una capa del fondo; el canto y el reflejo, pseudo-elementos).
 */

export type IslandMaterial = "ink" | "glass";
/** El tono del cristal. La tinta siempre es oscura. */
export type IslandTone = "light" | "dark";
/** `brand`: coral de marca. `ai`: violeta y coral, para lo que propone la IA. */
export type IslandGlow = "brand" | "ai" | "none";

export interface IslandLook {
  material?: IslandMaterial;
  tone?: IslandTone;
  glow?: IslandGlow;
}

/**
 * El aspecto por defecto de TODAS las islas del producto. Cambiarlo aquí
 * cambia Bienvenida, Calidad, Comercial y lo que venga. Una isla que tiene que
 * ser distinta lo dice en su llamada (la barra de acción: `material="ink"`).
 */
export const ISLAND_DEFAULTS = {
  material: "glass",
  tone: "light",
  glow: "brand",
} as const satisfies Required<IslandLook>;

const MATERIAL_CLASS: Record<IslandMaterial, string> = {
  ink: "island-ink",
  glass: "island-glass",
};

const GLOW_CLASS: Record<IslandGlow, string | null> = {
  brand: "island-glow-brand",
  ai: "island-glow-ai",
  none: null,
};

/**
 * Las clases de una isla. Útil cuando la isla es un elemento que ya existe
 * (un `<form>`, un `<Link>`) y no se quiere envolver.
 */
export function islandClassName({
  material = ISLAND_DEFAULTS.material,
  tone = ISLAND_DEFAULTS.tone,
  glow = ISLAND_DEFAULTS.glow,
}: IslandLook = {}): string {
  const scheme = material === "ink" || tone === "dark" ? "surface-dark" : "surface-light";
  const glowClass = GLOW_CLASS[glow];
  return glowClass === null
    ? `island ${MATERIAL_CLASS[material]} ${scheme}`
    : `island ${MATERIAL_CLASS[material]} ${scheme} ${glowClass}`;
}

type IslandElement = "div" | "section" | "aside" | "footer" | "header";

export interface IslandProps extends IslandLook, React.HTMLAttributes<HTMLElement> {
  /** La etiqueta: `section` con nombre para una región, `footer` para una barra de acción. */
  as?: IslandElement;
}

export function Island({ as: Element = "div", material, tone, glow, className, ...props }: IslandProps) {
  return <Element className={cn(islandClassName({ material, tone, glow }), className)} {...props} />;
}
