/**
 * Las cifras del mapa de la meta (escena «Crecer»), CALCULADAS y no escritas.
 *
 * El mapa del producto (`commercial`, RouteMap) coloca cada marca como fracción
 * de la meta. La película hace lo mismo con cifras de ejemplo, y las deriva de
 * cuatro supuestos por nicho para que nunca se contradigan: si vas en el 63 %
 * de $ 30 M, vas en $ 18,9 M y te faltan $ 11,1 M, y con un ticket de
 * $ 925.000 eso son 2 ventas al día en 6 días hábiles. Un número suelto que
 * no cuadra con los demás es justo lo que la voz del progreso prohíbe
 * (DESIGN.md §7.1, regla 4).
 */

export type RouteAssumptions = {
  /** La meta del mes, en pesos. */
  goal: number;
  /** Ticket promedio «según tu historia», en pesos. */
  ticket: number;
  /** Días hábiles que quedan. */
  businessDaysLeft: number;
  /** Cómo se llama una venta en ese negocio («ventas», «pedidos», «citas»). */
  unitPlural: string;
};

export type RouteScenario = {
  goal: number;
  /** Fracción recorrida («Vas aquí»). */
  done: number;
  /** Fracción en la que deberías ir hoy («Deberías ir en»). */
  expected: number;
  /** Llegada proyectada si sigues al ritmo de hoy. */
  projected: number;
  /** Llegada proyectada si tomas la ruta que propone Axi. */
  projectedWithRoute: number;
  reached: number;
  remaining: number;
  /** Cuánto vas por debajo de donde deberías ir (tramo lento). */
  behind: number;
  perDay: number;
  unitPlural: string;
  ticket: number;
  businessDaysLeft: number;
};

/** Las fracciones son las del storyboard aprobado: 63 % recorrido, 82 % → 91 % de llegada. */
export const ROUTE_FRACTIONS = { done: 0.63, expected: 0.717, projected: 0.82, projectedWithRoute: 0.91 } as const;

export function routeScenario(a: RouteAssumptions): RouteScenario {
  const reached = a.goal * ROUTE_FRACTIONS.done;
  const remaining = a.goal - reached;
  return {
    goal: a.goal,
    ...ROUTE_FRACTIONS,
    reached,
    remaining,
    behind: a.goal * (ROUTE_FRACTIONS.expected - ROUTE_FRACTIONS.done),
    perDay: Math.ceil(remaining / a.businessDaysLeft / a.ticket),
    unitPlural: a.unitPlural,
    ticket: a.ticket,
    businessDaysLeft: a.businessDaysLeft,
  };
}

/**
 * Pesos en millones con una cifra decimal y coma, como el producto:
 * 18_900_000 → «$ 18,9 M». Por debajo de un millón, en miles: «$ 925.000».
 */
export function formatMillions(value: number): string {
  if (value < 1_000_000) return "$ " + Math.round(value).toLocaleString("es-CO");
  const m = Math.round(value / 100_000) / 10;
  return "$ " + m.toLocaleString("es-CO", { minimumFractionDigits: m % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 }) + " M";
}

/** Pesos completos: 30_000_000 → «$ 30.000.000». */
export function formatPesos(value: number): string {
  return "$ " + Math.round(value).toLocaleString("es-CO");
}

/** Porcentaje entero: 0.63 → «63 %». */
export function formatPercent(fraction: number): string {
  return Math.round(fraction * 100) + " %";
}
