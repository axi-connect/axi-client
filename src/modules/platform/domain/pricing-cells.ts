/**
 * Aritmética del catálogo de dos ejes, en TypeScript puro (plan de alineación
 * comercial 2026-09-05, D1 y G7).
 *
 *   celda = tarifa_paquete + tarifa_tramo
 *
 * El servidor GUARDA celdas (una fila por plan, tramo, intervalo y vigencia,
 * porque la factura apunta a una fila y Fundadores congela un precio) pero el
 * panel EDITA componentes: 3 tarifas de paquete y 6 de tramo. Este módulo
 * deriva las celdas de los componentes, reconstruye los componentes desde las
 * celdas publicadas y corre la verja estructural que la publicación exige.
 *
 * El margen NO se calcula aquí: llega con la consola de margen (Tanda C), que
 * lee el costo real de `usage_event`. Inventarlo en el cliente con constantes
 * sería repetir el error del `margin_multiplier`.
 */

export type CellInterval = "monthly" | "annual";

/** Meses facturados en el anual: doce de servicio, once cobrados (D2). */
export const ANNUAL_MONTHS_BILLED = 11;

export type TierComponent = {
  code: string;
  conversations: number;
  label: string;
  /** Tarifa del tramo en centavos; null = tramo sin tarifa (no se deriva). */
  feeCents: number | null;
  isActive: boolean;
};

export type PackageComponent = {
  planId: string;
  slug: string;
  name: string;
  /** Tarifa del paquete en centavos. */
  feeCents: number;
};

export type CellOverride = {
  amountCents: number;
  reason: string;
};

export type DerivedCell = {
  planId: string;
  planSlug: string;
  tierCode: string;
  interval: CellInterval;
  /** Precio de LISTA de la celda, en centavos. */
  amountCents: number;
  /** Suma pura paquete + tramo (mensual), antes de cualquier anulación. */
  derivedCents: number;
  overrideReason: string | null;
};

export const overrideKey = (planSlug: string, tierCode: string): string =>
  `${planSlug}|${tierCode}`;

/** Precio mensual de lista de una celda: la suma, salvo anulación con motivo. */
export function cellMonthlyCents(
  pkg: PackageComponent,
  tier: TierComponent,
  overrides: Readonly<Record<string, CellOverride>>,
): number | null {
  if (tier.feeCents === null) return null;
  const override = overrides[overrideKey(pkg.slug, tier.code)];
  return override?.amountCents ?? pkg.feeCents + tier.feeCents;
}

/** Las celdas de paquete: paquetes × tramos activos con tarifa × 2 intervalos. */
export function deriveCells(
  packages: readonly PackageComponent[],
  tiers: readonly TierComponent[],
  overrides: Readonly<Record<string, CellOverride>> = {},
): DerivedCell[] {
  const cells: DerivedCell[] = [];
  for (const pkg of packages) {
    for (const tier of tiers) {
      if (!tier.isActive || tier.feeCents === null) continue;
      const monthly = cellMonthlyCents(pkg, tier, overrides);
      if (monthly === null) continue;
      const override = overrides[overrideKey(pkg.slug, tier.code)] ?? null;
      const base = {
        planId: pkg.planId,
        planSlug: pkg.slug,
        tierCode: tier.code,
        derivedCents: pkg.feeCents + tier.feeCents,
        overrideReason: override?.reason ?? null,
      };
      cells.push({ ...base, interval: "monthly", amountCents: monthly });
      cells.push({
        ...base,
        interval: "annual",
        amountCents: monthly * ANNUAL_MONTHS_BILLED,
      });
    }
  }
  return cells;
}

/**
 * Reconstruye la tarifa de paquete desde una celda publicada y la tarifa de
 * su tramo: `paquete = celda − tramo`. Con las tarifas de tramo persistidas,
 * cualquier celda mensual del paquete basta y todas dan el mismo número —
 * salvo una anulada, que por eso se salta.
 */
export function inferPackageFee(
  cells: readonly {
    plan_id: string;
    interval: CellInterval;
    amount_cents: number;
    volume_tier: { code: string } | null;
    override_reason: string | null;
  }[],
  planId: string,
  tiers: readonly TierComponent[],
): number | null {
  const tierFee = new Map(tiers.map((tier) => [tier.code, tier.feeCents] as const));
  for (const cell of cells) {
    if (cell.plan_id !== planId || cell.interval !== "monthly") continue;
    if (cell.volume_tier === null || cell.override_reason !== null) continue;
    const fee = tierFee.get(cell.volume_tier.code);
    if (fee === null || fee === undefined) continue;
    return cell.amount_cents - fee;
  }
  return null;
}

export type GateCheck = {
  key: "additivity" | "rounding" | "monotonic" | "decreasing" | "margin";
  label: string;
  detail: string;
  ok: boolean | null;
  /** Cifra corta a la derecha del renglón. */
  value: string;
};

const endsIn900 = (cents: number): boolean => (cents / 100) % 1_000 === 900;

/**
 * La verja estructural (§6 del plan): lo que se puede comprobar sin costos.
 * El margen queda declarado como «pendiente» hasta la consola de margen:
 * un renglón gris es más honesto que un porcentaje inventado.
 */
export function runGate(
  packages: readonly PackageComponent[],
  tiers: readonly TierComponent[],
  overrides: Readonly<Record<string, CellOverride>> = {},
): GateCheck[] {
  const activeTiers = [...tiers]
    .filter((tier) => tier.isActive && tier.feeCents !== null)
    .sort((a, b) => a.conversations - b.conversations);
  const monthly = deriveCells(packages, activeTiers, overrides).filter(
    (cell) => cell.interval === "monthly",
  );

  const overridden = monthly.filter((cell) => cell.overrideReason !== null).length;
  const additive = monthly.every(
    (cell) => cell.overrideReason !== null || cell.amountCents === cell.derivedCents,
  );

  const packageRound = packages.every((pkg) => (pkg.feeCents / 100) % 1_000 === 0);
  const tierRound = activeTiers.every((tier) => (tier.feeCents as number) / 100 % 1_000 === 900);
  const cellsRound = monthly.every((cell) => endsIn900(cell.amountCents));
  const badRounding = monthly.filter((cell) => !endsIn900(cell.amountCents)).length;

  // En el orden DECLARADO de la escalera (Esencial → Crecimiento → Escala), no
  // ordenados por precio: ordenarlos primero haría la comprobación tautológica.
  let monotonic = true;
  for (const tier of activeTiers) {
    for (let i = 1; i < packages.length; i++) {
      const prev = cellMonthlyCents(packages[i - 1], tier, overrides) ?? 0;
      const curr = cellMonthlyCents(packages[i], tier, overrides) ?? 0;
      if (curr <= prev) monotonic = false;
    }
  }
  for (const pkg of packages) {
    for (let i = 1; i < activeTiers.length; i++) {
      const prev = cellMonthlyCents(pkg, activeTiers[i - 1], overrides) ?? 0;
      const curr = cellMonthlyCents(pkg, activeTiers[i], overrides) ?? 0;
      if (curr <= prev) monotonic = false;
    }
  }

  let decreasing = true;
  for (let i = 1; i < activeTiers.length; i++) {
    const prev = (activeTiers[i - 1].feeCents as number) / activeTiers[i - 1].conversations;
    const curr = (activeTiers[i].feeCents as number) / activeTiers[i].conversations;
    if (curr >= prev) decreasing = false;
  }

  return [
    {
      key: "additivity",
      label: "Aditividad",
      detail: "celda = paquete + tramo, salvo anulada con motivo (G7)",
      ok: additive,
      value: `${monthly.length - overridden}/${monthly.length}${overridden ? ` · ${overridden} anulada${overridden > 1 ? "s" : ""}` : ""}`,
    },
    {
      key: "rounding",
      label: "Redondeo .900",
      detail: "paquete en millares, tramo en .900 ⇒ toda celda en .900",
      ok: packageRound && tierRound && cellsRound,
      value: cellsRound ? `${monthly.length}/${monthly.length}` : `${badRounding} fuera de .900`,
    },
    {
      key: "monotonic",
      label: "Monotonía",
      detail: "paquete superior > inferior; tramo mayor > menor",
      ok: monotonic,
      value: monotonic ? "ok" : "rota",
    },
    {
      key: "decreasing",
      label: "Precio por conversación decreciente",
      detail: "el tramo grande cobra menos por conversación que el pequeño",
      ok: decreasing,
      value: decreasing ? "ok" : "rota",
    },
    {
      key: "margin",
      label: "Margen bruto",
      detail: "llega con la consola de margen (Tanda C), con costo real y TRM declarada",
      ok: null,
      value: "pendiente",
    },
  ];
}

/** Pesos por conversación de un tramo, para el gráfico de Tramos. */
export function perConversationCop(tier: TierComponent): number | null {
  return tier.feeCents === null ? null : tier.feeCents / 100 / tier.conversations;
}

/**
 * Precio con descuento de promoción, al .900 inferior: misma regla que
 * `promotion_math.ts` del servidor. Si divergen, el visitante ve un precio y
 * paga otro; por eso la fórmula es una sola y se prueba aquí también.
 */
export function discountedCents(
  listCents: number,
  percentBps: number,
  rounding: "none" | "floor_900",
): number {
  const listCop = listCents / 100;
  const discounted = listCop * (1 - percentBps / 10_000);
  if (rounding === "none") return Math.round(discounted) * 100;
  return Math.max(900, Math.floor((discounted - 900) / 1000) * 1000 + 900) * 100;
}
