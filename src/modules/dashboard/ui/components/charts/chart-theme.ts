/**
 * Tema de gráficos del dashboard. Recharts no lee tokens CSS por sí solo:
 * exponemos los colores de la paleta de dataviz (orden fijo brand → violet →
 * amber → info → success, DESIGN-SYSTEM §2.4) como `var(--color-*)` para que
 * respeten light/dark automáticamente. Nunca colores crudos en los charts.
 */
export const CHART_COLORS = {
  brand: "var(--color-brand)",
  violet: "var(--color-accent-violet)",
  amber: "var(--color-accent-amber)",
  info: "var(--color-info)",
  success: "var(--color-success)",
} as const;

/** Serie de dataviz en el orden canónico. */
export const DATAVIZ_SEQUENCE = [
  CHART_COLORS.brand,
  CHART_COLORS.violet,
  CHART_COLORS.amber,
  CHART_COLORS.info,
  CHART_COLORS.success,
] as const;

export const AXIS_COLOR = "var(--color-muted-foreground)";
export const GRID_COLOR = "var(--color-border)";

/** Estilo del tooltip de Recharts alineado a superficies flotantes (glass). */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-float)",
    fontSize: "0.75rem",
    color: "var(--color-popover-foreground)",
  },
  labelStyle: { color: "var(--color-muted-foreground)", marginBottom: 2 },
  itemStyle: { color: "var(--color-popover-foreground)" },
} as const;
