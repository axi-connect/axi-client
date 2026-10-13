/**
 * Dominio del control de almacenamiento en platform (storage_control_plan.md,
 * lienzo «Almacenamiento · control por tenant»). Tipos del contrato OpenAPI y
 * reglas de presentación puras: formato de bytes es-CO, etiquetas por
 * categoría y origen, frases de estado. Sin React.
 */
import type { Schemas } from "@/core/api/types";

export type StorageOverview = Schemas["PlatformStorageOverviewDto"];
export type StorageProviderView = StorageOverview["providers"][number];
export type StorageTenantRow = Schemas["PlatformStorageTenantsDto"]["data"][number];
export type StorageTenantsPage = Schemas["PlatformStorageTenantsDto"];
export type TenantStorage = Schemas["TenantStorageSummaryDto"];
export type StorageCategoryUsage = TenantStorage["by_category"][number];
export type StorageState = TenantStorage["state"];
export type PurgeOption = Schemas["PurgeOptionsDto"]["data"][number];
export type PurgeKind = Schemas["CreatePurgePreviewDto"]["kind"];
export type PurgeFilter = NonNullable<Schemas["CreatePurgePreviewDto"]["filter"]>;
export type PurgePreview = Schemas["PurgePreviewDto"];
export type PurgeRun = Schemas["PurgeRunDto"];
export type LargeFile = Schemas["LargeFilesDto"]["data"][number];
export type RetentionPolicies = Schemas["RetentionPoliciesDto"];
export type RetentionPolicy = RetentionPolicies["data"][number];
export type RetentionRule = RetentionPolicies["recommended"][number];
export type SetStorageQuotaBody = Schemas["SetStorageQuotaDto"];
export type StorageOrigin = "customer" | "team" | "system";
export type MimeClass = "video" | "audio" | "image" | "document";

export const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

/** «12,6 GB», «840 MB», «1,2 TB», «0 B». Coma decimal, una cifra. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units: [number, string][] = [
    [1024 ** 4, "TB"],
    [GIB, "GB"],
    [MIB, "MB"],
    [1024, "KB"],
  ];
  for (const [size, unit] of units) {
    if (bytes >= size) {
      const value = bytes / size;
      const shown = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
      return `${String(shown).replace(".", ",")} ${unit}`;
    }
  }
  return `${Math.round(bytes)} B`;
}

/** Cifra y unidad por separado para `BentoFigure`. */
export function bytesFigure(bytes: number | null | undefined): { value: string; unit: string } {
  const [value, unit] = formatBytes(bytes).split(" ");
  return { value: value ?? "0", unit: unit ?? "B" };
}

export function formatPct(pct: number | null): string {
  if (pct === null) return "—";
  return `${String(Math.round(pct * 10) / 10).replace(".", ",")} %`;
}

/** Categorías del ledger con su frase para personas y su origen (lienzo P2). */
export const CATEGORY_LABELS: Record<string, { label: string; origin: StorageOrigin }> = {
  inbound_media: { label: "Fotos, audios y videos de clientes", origin: "customer" },
  inbound_media_derived: { label: "Miniaturas de videos de clientes", origin: "customer" },
  history_import: { label: "Historial importado de WhatsApp", origin: "customer" },
  outbound_upload: { label: "Adjuntos del equipo", origin: "team" },
  quick_action_asset: { label: "Recursos de acciones rápidas", origin: "team" },
  catalog_image: { label: "Fotos del catálogo", origin: "team" },
  catalog_import_file: { label: "Archivos de importación del catálogo", origin: "team" },
  crm_import_file: { label: "Archivos de importación de contactos", origin: "team" },
  hsm_template_media: { label: "Cabeceras de plantillas", origin: "team" },
  tts_audio: { label: "Notas de voz del agente", origin: "system" },
  call_recording: { label: "Grabaciones de llamadas", origin: "system" },
  document_pdf: { label: "PDF de documentos", origin: "system" },
  other: { label: "Otros archivos", origin: "system" },
};

export const ORIGIN_LABELS: Record<StorageOrigin, { label: string; hint: string }> = {
  customer: { label: "Clientes", hint: "Fotos, audios y videos que llegan por chat" },
  team: { label: "Equipo", hint: "Catálogo, adjuntos, recursos e importaciones" },
  system: { label: "Sistema", hint: "Grabaciones, PDF y notas de voz" },
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category]?.label ?? category;
}

/** Suma por origen (sin lo de plataforma) y porcentaje de cada uno sobre el total. */
export function byOrigin(rows: readonly StorageCategoryUsage[]): { origin: StorageOrigin; bytes: number; pct: number }[] {
  const totals: Record<StorageOrigin, number> = { customer: 0, team: 0, system: 0 };
  for (const row of rows) {
    if (row.origin === "platform") continue;
    totals[row.origin] += row.bytes;
  }
  const sum = totals.customer + totals.team + totals.system;
  return (["customer", "team", "system"] as const).map((origin) => ({
    origin,
    bytes: totals[origin],
    pct: sum === 0 ? 0 : (totals[origin] / sum) * 100,
  }));
}

export const STATE_LABELS: Record<StorageState, { label: string; tone: "success" | "warning" | "destructive" | "neutral" }> = {
  ok: { label: "Con espacio", tone: "success" },
  warning: { label: "Cerca del límite", tone: "warning" },
  full: { label: "Lleno", tone: "destructive" },
  unlimited: { label: "Sin cuota", tone: "neutral" },
};

/** Tono del medidor: ámbar desde el 80 %, rojo al llenarse. */
export function meterTone(state: StorageState): "default" | "warning" | "destructive" {
  if (state === "full") return "destructive";
  if (state === "warning") return "warning";
  return "default";
}

/** «Unos 3 meses», «unas 2 semanas», «menos de una semana». */
export function humanDays(days: number): string {
  if (days < 7) return "menos de una semana";
  if (days < 45) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "una semana" : `unas ${String(weeks)} semanas`;
  }
  const months = Math.round(days / 30);
  if (months < 24) return months === 1 ? "un mes" : `unos ${String(months)} meses`;
  return `unos ${String(Math.round(months / 12))} años`;
}

export function quotaSourceLabel(source: TenantStorage["quota_source"], planName: string | null): string {
  if (source === "override") return "Cuota ampliada por platform";
  if (source === "plan") return planName === null ? "Cuota del plan" : `Cuota del plan ${planName}`;
  return "Sin cuota en su plan";
}

export const PURGE_KINDS: { kind: Exclude<PurgeKind, "offboarding">; title: string; description: string; icon: string }[] = [
  {
    kind: "conversation_media",
    title: "Media de chats antiguos",
    description: "Por tipo y edad. El mensaje queda con «Archivo eliminado».",
    icon: "message-square",
  },
  { kind: "trash", title: "Papelera", description: "Fotos y recursos ya borrados que siguen ocupando.", icon: "trash" },
  { kind: "large_files", title: "Archivos grandes", description: "Elige uno a uno o en lote, con su uso.", icon: "files" },
  { kind: "call_recordings", title: "Grabaciones", description: "Llamadas grabadas por antigüedad.", icon: "phone" },
  {
    kind: "imports",
    title: "Importaciones",
    description: "Archivos de catálogo y contactos ya procesados.",
    icon: "file-spreadsheet",
  },
];

export const PURGE_KIND_TITLES: Record<string, string> = {
  conversation_media: "Media de chats",
  trash: "Papelera",
  large_files: "Archivos elegidos",
  call_recordings: "Grabaciones",
  imports: "Importaciones",
  offboarding: "Baja del tenant",
};

export const AGE_OPTIONS: { days: number; label: string }[] = [
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "1 año" },
];

export const MIME_CLASS_LABELS: Record<MimeClass, string> = {
  video: "Videos",
  audio: "Audios",
  image: "Fotos",
  document: "Documentos",
};

/** Plural sencillo para las frases de la vista previa. */
export function files(n: number): string {
  return `${new Intl.NumberFormat("es-CO").format(n)} ${n === 1 ? "archivo" : "archivos"}`;
}

/** Por qué se conserva algo en la vista previa (procedencia, no regaño). */
export const KEPT_LABELS: Record<"evidence" | "in_use" | "shared", string> = {
  shared: "otro mensaje más reciente los usa",
  in_use: "siguen en uso (catálogo, recursos o plantillas)",
  evidence: "son evidencia: comprobantes de pago o documentos",
};

export function retentionRuleLabel(rule: RetentionRule): string {
  if (rule.kind === "call_recordings") return "Grabaciones de llamadas";
  if (rule.kind === "imports") return "Importaciones procesadas";
  const classes = rule.filter.mime_classes ?? [];
  const who = rule.filter.origin === "customer" ? " que envían los clientes" : rule.filter.origin === "team" ? " del equipo" : "";
  if (classes.length === 1) return `${MIME_CLASS_LABELS[classes[0] as MimeClass]}${who}`;
  return `Media de chats${who}`;
}

export function retentionAgeLabel(days: number): string {
  if (days % 365 === 0) return days === 365 ? "más de 1 año" : `más de ${String(days / 365)} años`;
  return `más de ${String(days)} días`;
}
