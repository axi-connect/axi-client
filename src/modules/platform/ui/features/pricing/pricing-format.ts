/**
 * Formato de valores del pricing IA — único punto del patrón (tabla, drawer).
 * Costos en USD/MTok con hasta 6 decimales (tarifas de modelos pequeños);
 * margen como multiplicador `×1.30`.
 */
const USD_PER_MTOK = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const MARGIN = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdPerMtok(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return USD_PER_MTOK.format(value);
}

export function formatMargin(multiplier: number): string {
  if (!Number.isFinite(multiplier)) return "—";
  return `×${MARGIN.format(multiplier)}`;
}

/** Date input (`YYYY-MM-DD`) → ISO UTC de medianoche (wire del backend). */
export function dateInputToIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

/** ISO del backend → valor de un input date (`YYYY-MM-DD`). */
export function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
