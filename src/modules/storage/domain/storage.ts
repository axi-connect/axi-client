import type { Schemas } from "@/core/api/types";

/**
 * Dominio del almacenamiento del tenant (T1 · Mi empresa › Almacenamiento).
 * TypeScript puro: formato es-CO de bytes, agrupación por origen, los cuadros
 * del glifo «Tu disco» y las frases de la vista. Mockup aprobado:
 * `docs/design/mockups/storage-control/build.py` (`view_tenant_self`, `drive`,
 * `_cell_bg`); plan visual `docs/plans/storage_control_ui.md`.
 *
 * Voz: se dice lo que QUEDA y qué hacer, nunca «has consumido el 92 %».
 */

export type StorageSummaryDTO = Schemas["TenantStorageSummaryDto"];
export type StorageState = StorageSummaryDTO["state"];
export type StorageCategory = StorageSummaryDTO["by_category"][number];
export type StorageCategoryOrigin = StorageCategory["origin"];

/** La pestaña de Mi empresa. La declara este slice: la usan la nav y el aviso de «Ver espacio». */
export const STORAGE_SETTINGS_PATH = "/settings/company/almacenamiento";
/** Permiso del servidor para leer `GET /storage/summary` (solo owner/admin). */
export const STORAGE_READ_PERMISSION = "storage:read";

// ------------------------------------------------------------------ bytes

const KIB = 1024;
export const GIB = KIB ** 3;
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
export type ByteUnit = (typeof UNITS)[number];

// Un decimal como mucho: «12,6 GB», pero «15 GB» (no «15,0»), como el mockup.
const decimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/**
 * Cifra y unidad por separado (para `BentoFigure`): «12,6» + «GB». Base 1024,
 * como el disco. B, KB y MB van enteros; GB y TB con un decimal, coma es-CO.
 * `unit` fuerza la unidad (p. ej. «0 GB libres de 15 GB»).
 */
export function splitBytes(bytes: number, unit?: ByteUnit): { value: string; unit: ByteUnit } {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  let index = unit ? UNITS.indexOf(unit) : 0;
  if (!unit) {
    while (safe >= KIB ** (index + 1) && index < UNITS.length - 1) index += 1;
  }
  const value = safe / KIB ** index;
  const chosen = UNITS[index];
  if (value === 0) return { value: "0", unit: chosen };
  const text = index >= 3 ? decimal.format(value) : integer.format(Math.round(value));
  return { value: text, unit: chosen };
}

/** «12,6 GB», «512 MB», «1,2 TB». */
export function formatStorageBytes(bytes: number, unit?: ByteUnit): string {
  const split = splitBytes(bytes, unit);
  return `${split.value} ${split.unit}`;
}

// ------------------------------------------------------------------ orígenes

/**
 * Tres orígenes para el tenant (mockup «En qué se va»): lo que mandan sus
 * clientes, lo que sube su equipo y lo que genera Axi. `system` y `platform`
 * son ambos «Axi»: al tenant no le sirve la diferencia.
 */
export type OriginGroup = "customers" | "team" | "axi";
export const ORIGIN_GROUPS: readonly OriginGroup[] = ["customers", "team", "axi"];

export const ORIGIN_GROUP_COPY: Record<OriginGroup, { short: string; title: string; hint: string; topPhrase: string }> = {
  customers: {
    short: "Clientes",
    title: "Lo que te envían tus clientes",
    hint: "Fotos, audios y videos de los chats",
    topPhrase: "lo que te envían tus clientes",
  },
  team: {
    short: "Tu equipo",
    title: "Lo que sube tu equipo",
    hint: "Catálogo, adjuntos y recursos",
    topPhrase: "lo que sube tu equipo",
  },
  axi: {
    short: "Axi",
    title: "Lo que genera Axi",
    hint: "Grabaciones, PDF y notas de voz",
    topPhrase: "lo que genera Axi",
  },
};

export function originGroupOf(origin: StorageCategoryOrigin): OriginGroup {
  if (origin === "customer") return "customers";
  if (origin === "team") return "team";
  return "axi";
}

export type OriginTotal = { group: OriginGroup; bytes: number; objects: number };

/** Suma las categorías por los tres orígenes, siempre en el mismo orden (también los vacíos). */
export function groupByOrigin(categories: readonly StorageCategory[]): OriginTotal[] {
  const totals = new Map<OriginGroup, OriginTotal>(
    ORIGIN_GROUPS.map((group) => [group, { group, bytes: 0, objects: 0 }]),
  );
  for (const category of categories) {
    const total = totals.get(originGroupOf(category.origin));
    if (!total) continue;
    total.bytes += Math.max(0, category.bytes);
    total.objects += Math.max(0, category.objects);
  }
  return ORIGIN_GROUPS.map((group) => totals.get(group) as OriginTotal);
}

// ------------------------------------------------------------------ estado

export type StorageTone = "success" | "warning" | "destructive" | "neutral";

/** Estado de la ficha: el color va en el punto de la píldora, nunca en el texto. */
export const STATE_PILL: Record<StorageState, { tone: StorageTone; label: string; led: string }> = {
  ok: { tone: "success", label: "Con espacio", led: "Con espacio" },
  warning: { tone: "warning", label: "Cerca del límite", led: "Cerca del límite" },
  full: { tone: "destructive", label: "Lleno", led: "Lleno" },
  unlimited: { tone: "neutral", label: "Sin cuota", led: "Sin límite" },
};

export function hasQuota(summary: Pick<StorageSummaryDTO, "quota_bytes">): summary is { quota_bytes: number } {
  return summary.quota_bytes !== null && summary.quota_bytes > 0;
}

export function freeBytes(summary: Pick<StorageSummaryDTO, "quota_bytes" | "used_bytes">): number | null {
  if (summary.quota_bytes === null) return null;
  return Math.max(0, summary.quota_bytes - summary.used_bytes);
}

/** Porcentaje usado (0…∞) para el medidor; `null` sin cuota. */
export function usedPct(summary: Pick<StorageSummaryDTO, "quota_bytes" | "used_bytes" | "pct_used">): number | null {
  if (summary.pct_used !== null) return summary.pct_used;
  if (summary.quota_bytes === null || summary.quota_bytes <= 0) return null;
  return (summary.used_bytes / summary.quota_bytes) * 100;
}

/** De dónde sale la cuota: «Incluido en tu plan Crecimiento» / «Ampliado por soporte». */
export function quotaProvenance(summary: Pick<StorageSummaryDTO, "quota_source" | "plan_name">): string | null {
  if (summary.quota_source === "override") return "Ampliado por soporte";
  if (summary.quota_source === "plan") {
    return summary.plan_name ? `Incluido en tu plan ${summary.plan_name}` : "Incluido en tu plan";
  }
  return null;
}

// ------------------------------------------------------------------ «Tu disco»

/**
 * Tamaño de un cuadro del glifo. El aprobado es 1 GB por cuadro con 15 GB; con
 * cuotas grandes o pequeñas se sube o baja por esta escalera para que el disco
 * tenga como mucho `MAX_CELLS` cuadros (150 GB → 10 GB por cuadro).
 */
const CELL_LADDER_GB = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
export const MAX_CELLS = 20;

export function cellUnitBytes(capacityBytes: number): number {
  const capacityGb = Math.max(0, capacityBytes) / GIB;
  for (const step of CELL_LADDER_GB) {
    if (Math.ceil(capacityGb / step) <= MAX_CELLS) return step * GIB;
  }
  return CELL_LADDER_GB[CELL_LADDER_GB.length - 1] * GIB;
}

/** Un tramo de color dentro de un cuadro, en % de su ancho. */
export type CellStop = { group: OriginGroup; from: number; to: number };
/** `null` = cuadro libre (punteado). */
export type DriveCell = CellStop[] | null;

export type DriveModel = {
  cells: DriveCell[];
  unitBytes: number;
  /** «15 GB» con cuota; «Sin tope» sin ella. */
  caption: string;
  /** «Cada cuadro es 1 GB». */
  unitCaption: string;
};

/**
 * Espejo de `_cell_bg` del mockup: los orígenes se apilan en orden (clientes,
 * equipo, Axi) sobre una tira de cuadros; cada cuadro guarda los tramos que
 * caen dentro de él. Un cuadro sin nada es libre.
 */
export function cellStops(index: number, segments: readonly { group: OriginGroup; size: number }[]): DriveCell {
  const stops: CellStop[] = [];
  let start = 0;
  for (const segment of segments) {
    const a = Math.max(start, index);
    const b = Math.min(start + segment.size, index + 1);
    if (b > a) stops.push({ group: segment.group, from: (a - index) * 100, to: (b - index) * 100 });
    start += segment.size;
  }
  return stops.length === 0 ? null : stops;
}

export function driveModel(summary: Pick<StorageSummaryDTO, "quota_bytes" | "used_bytes" | "by_category">): DriveModel {
  const quota = hasQuota(summary) ? summary.quota_bytes : null;
  const totals = groupByOrigin(summary.by_category);
  const used = Math.max(summary.used_bytes, totals.reduce((sum, total) => sum + total.bytes, 0));
  const capacity = quota ?? Math.max(used, 1);
  const unitBytes = cellUnitBytes(capacity);
  const count = Math.max(1, Math.ceil(capacity / unitBytes));
  // Lo que pasa de la cuota (el margen de gracia) no cabe en el disco: se recorta.
  const segments = totals
    .filter((total) => total.bytes > 0)
    .map((total) => ({ group: total.group, size: total.bytes / unitBytes }));
  const cells = Array.from({ length: count }, (_, index) => cellStops(index, segments));
  return {
    cells,
    unitBytes,
    caption: quota !== null ? formatStorageBytes(quota) : "Sin tope",
    unitCaption: `Cada cuadro es ${formatStorageBytes(unitBytes)}`,
  };
}

// ------------------------------------------------------------------ frases

/** «unos 3 meses», «unas 2 semanas», «unos 5 días». */
export function durationPhrase(days: number): string {
  if (!Number.isFinite(days) || days < 1) return "menos de un día";
  if (days < 2) return "un día";
  if (days < 14) return `unos ${Math.round(days)} días`;
  if (days < 60) return `unas ${Math.round(days / 7)} semanas`;
  if (days < 730) {
    const months = Math.round(days / 30);
    return months <= 1 ? "un mes" : `unos ${months} meses`;
  }
  return "más de dos años";
}

const MONTH_LONG = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

/** «ene», sin punto. */
export function shortMonth(date: Date): string {
  return MONTH_SHORT.format(date).replace(".", "");
}

/** «hacia enero» (o «hacia enero de 2028» si no es el año que viene o este). */
export function monthPhrase(target: Date, now: Date): string {
  const month = MONTH_LONG.format(target);
  const years = target.getUTCFullYear() - now.getUTCFullYear();
  return years <= 1 ? month : `${month} de ${target.getUTCFullYear()}`;
}

/** «Medido hace 4 min». La cifra siempre con su procedencia. */
export function measuredAgo(measuredAt: string, now: Date): string {
  const at = new Date(measuredAt).getTime();
  if (Number.isNaN(at)) return "Medido hace un momento";
  const minutes = Math.floor((now.getTime() - at) / 60_000);
  if (minutes < 1) return "Medido hace un momento";
  if (minutes < 60) return `Medido hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Medido hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Medido ayer" : `Medido hace ${days} días`;
}

/** «Según tus últimos 6 meses» / «… 30 días». */
export function windowPhrase(windowDays: number): string {
  if (windowDays >= 60) {
    const months = Math.round(windowDays / 30);
    return `Según tus últimos ${months} meses`;
  }
  return `Según tus últimos ${Math.max(1, Math.round(windowDays))} días`;
}

/** La cifra grande de «Tu espacio»: lo que queda, o lo ocupado si no hay cuota. */
export function headFigure(summary: StorageSummaryDTO): { value: string; unit: string } {
  if (!hasQuota(summary)) {
    const used = splitBytes(summary.used_bytes);
    return { value: used.value, unit: `${used.unit} ocupados` };
  }
  const free = freeBytes(summary) ?? 0;
  const quota = formatStorageBytes(summary.quota_bytes);
  const split = free > 0 ? splitBytes(free) : splitBytes(0, splitBytes(summary.quota_bytes).unit);
  return { value: split.value, unit: `${split.unit} libres de ${quota}` };
}

/**
 * La frase bajo el medidor. Partes con `strong` para que la vista ponga en
 * negrita lo que importa sin armar HTML.
 */
export type Phrase = { text: string; strong?: boolean }[];

export function headLine(summary: StorageSummaryDTO): Phrase {
  if (summary.state === "full") {
    return [
      { text: "Tu espacio está lleno. " },
      { text: "Los mensajes de tus clientes siguen llegando completos", strong: true },
      { text: "; para subir archivos nuevos, pide más espacio." },
    ];
  }
  if (!hasQuota(summary)) return [{ text: "Tu plan no tiene límite de espacio. Aquí ves en qué se va." }];
  if (summary.used_bytes <= 0) return [{ text: "Aún no hay archivos. Se mide desde el primer mensaje con foto." }];
  const free = formatStorageBytes(freeBytes(summary) ?? 0);
  const days = summary.growth.days_to_full;
  if (days !== null && days > 0) {
    return [{ text: "Te quedan " }, { text: free, strong: true }, { text: `: ${durationPhrase(days)} a tu ritmo actual.` }];
  }
  return [{ text: "Te quedan " }, { text: free, strong: true }, { text: ` de ${formatStorageBytes(summary.quota_bytes)}.` }];
}

/** Lo que más ocupa, si de verdad domina (≥ 50 %). */
export function dominantOrigin(totals: readonly OriginTotal[]): OriginGroup | null {
  const sum = totals.reduce((acc, total) => acc + total.bytes, 0);
  if (sum <= 0) return null;
  const top = [...totals].sort((a, b) => b.bytes - a.bytes)[0];
  return top && top.bytes / sum >= 0.5 ? top.group : null;
}

/**
 * «Tu ritmo»: titular y frase. `null` si no hay qué decir (sin cuota o sin
 * serie): la vista entonces no pinta la ficha.
 */
export function pacePhrases(summary: StorageSummaryDTO, now: Date): { title: string; body: string } | null {
  if (!hasQuota(summary) || summary.growth.series.length < 2) return null;
  const perMonth = summary.growth.per_month_bytes;
  const rate = perMonth !== null && perMonth > 0 ? `≈ ${formatStorageBytes(perMonth)} al mes` : null;
  const top = dominantOrigin(groupByOrigin(summary.by_category));
  const topTail = top ? ` Lo que más ocupa es ${ORIGIN_GROUP_COPY[top].topPhrase}.` : "";
  if (summary.state === "full") {
    return {
      title: "Llegaste al tope",
      body: `${rate ? `Creciste ${rate}. ` : ""}Con más espacio, tu equipo vuelve a subir archivos de inmediato.`,
    };
  }
  const days = summary.growth.days_to_full;
  if (rate === null || days === null || days <= 0) {
    return { title: "Tu espacio no está creciendo", body: `A este ritmo tu espacio alcanza sin problema.${topTail}` };
  }
  const target = new Date(now.getTime() + days * 86_400_000);
  return { title: `Llegas al tope hacia ${monthPhrase(target, now)}`, body: `Creces ${rate}.${topTail}` };
}

/** Mensaje prellenado del WhatsApp de soporte. */
export function supportMessage(companyName: string | null | undefined): string {
  const who = companyName ? ` de ${companyName}` : "";
  return `Hola, les escribo${who}. Necesitamos más espacio de almacenamiento en Axi Connect.`;
}
