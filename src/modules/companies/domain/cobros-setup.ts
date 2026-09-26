import type { Schemas } from "@/core/api/types";

/**
 * La puesta en marcha de cobros (Cobros premium P1): por cada función
 * encendida, si ya está configurada, qué dice el pie de su ficha y a dónde
 * lleva. Puro: lo alimentan las lecturas de ajustes que ya existen, y cada
 * regla dice solo lo que esas lecturas saben — nada se supone configurado por
 * defecto si el dato no lo muestra.
 */
export type CollectionsSetupDTO = Schemas["CollectionsSettingsDto"];
export type FxSetupDTO = Schemas["FxSettingsDto"];
export type DocumentsSetupDTO = Schemas["DocumentsSettingsDto"];

export type SetupFeatureCode =
  "payment_plans" | "collections" | "fx_quotes" | "documents";

export interface FeatureSetup {
  code: SetupFeatureCode;
  /** El paso, como se nombra en la isla («Plan de pagos»). */
  step: string;
  /** `null` = no se pudo leer: la ficha lo dice y la isla no la cuenta. */
  configured: boolean | null;
  /** El pie de la ficha: lo configurado, lo que falta o por qué no se sabe. */
  foot: string;
  /** Lo que falta, dicho como el título de la isla («Faltan los recordatorios»). */
  missing: string;
  href: string;
  /** El enlace del pie: «Ver en …» si está lista, «Configurar» si no. */
  linkLabel: string;
  cta: string;
  /** Qué pasa mientras falte: el porqué de la isla. */
  consequence: string;
}

export interface SetupSources {
  collections: CollectionsSetupDTO | null | "error";
  fx: FxSetupDTO | null | "error";
  documents: DocumentsSetupDTO | null | "error";
}

const UNREADABLE = "No pudimos leer cómo está configurada";

function pct(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

function paymentPlans(source: SetupSources["collections"]): FeatureSetup {
  const base = {
    code: "payment_plans" as const,
    step: "Plan de pagos",
    missing: "Falta el plan de pagos",
    href: "/settings/payments/plan",
    cta: "Configurar el plan de pagos",
    consequence: "Sin él, los pedidos no tienen anticipo ni cuotas.",
  };
  if (source === "error" || source === null) {
    return {
      ...base,
      configured: null,
      foot: UNREADABLE,
      linkLabel: "Ver en Plan de pagos",
    };
  }
  const balance =
    source.installments_strategy === "single_balance"
      ? `saldo ${String(source.final_due_days_before_service)} días antes`
      : `${source.installments_count === 1 ? "1 cuota" : `${String(source.installments_count)} cuotas`} y saldo ${String(source.final_due_days_before_service)} días antes`;
  return {
    ...base,
    configured: true,
    foot: `Anticipo ${pct(source.deposit_pct)} % · ${balance}`,
    linkLabel: "Ver en Plan de pagos",
  };
}

function reminders(source: SetupSources["collections"]): FeatureSetup {
  const base = {
    code: "collections" as const,
    step: "Recordatorios",
    missing: "Faltan los recordatorios",
    href: "/settings/payments/recordatorios",
    cta: "Configurar recordatorios",
    consequence: "Mientras falte, la Cartera no le escribe a nadie.",
  };
  if (source === "error" || source === null) {
    return {
      ...base,
      configured: null,
      foot: UNREADABLE,
      linkLabel: "Configurar",
    };
  }
  const days =
    source.reminder_days_before.length + source.overdue_reminder_days.length;
  const anyText = Object.values(source.templates).some(
    (template) => template.enabled,
  );
  const anyChannel =
    source.reminder_channels.whatsapp || source.reminder_channels.email;
  if (days === 0)
    return {
      ...base,
      configured: false,
      foot: "Los recordatorios aún no tienen cadencia",
      linkLabel: "Configurar",
    };
  if (!anyText)
    return {
      ...base,
      configured: false,
      foot: "Todos los textos están apagados",
      linkLabel: "Configurar",
    };
  if (!anyChannel)
    return {
      ...base,
      configured: false,
      foot: "No hay canal para enviarlos",
      linkLabel: "Configurar",
    };
  return {
    ...base,
    configured: true,
    foot:
      days === 1
        ? "Un aviso por cuota"
        : `${String(days)} avisos por cuota como mucho`,
    linkLabel: "Ver en Recordatorios",
  };
}

function fxQuotes(source: SetupSources["fx"]): FeatureSetup {
  const base = {
    code: "fx_quotes" as const,
    step: "Moneda y TRM",
    missing: "Falta la moneda",
    href: "/settings/payments/moneda",
    cta: "Configurar la moneda",
    consequence: "Sin ella, el agente no cotiza en pesos.",
  };
  if (source === "error" || source === null) {
    return {
      ...base,
      configured: null,
      foot: UNREADABLE,
      linkLabel: "Ver en Moneda y TRM",
    };
  }
  const how =
    source.manual_rate !== null
      ? "tasa manual"
      : `TRM + ${pct(source.spread_bps / 100)} %`;
  return {
    ...base,
    configured: true,
    foot: `Cobras en ${source.settlement_currency} · ${how}`,
    linkLabel: "Ver en Moneda y TRM",
  };
}

function documents(source: SetupSources["documents"]): FeatureSetup {
  const base = {
    code: "documents" as const,
    step: "Documentos",
    missing: "Falta el emisor de los documentos",
    href: "/settings/company/documentos",
    cta: "Completar el emisor",
    consequence: "Sin ella, los PDF salen sin quién los emite.",
  };
  if (source === "error" || source === null) {
    return {
      ...base,
      configured: null,
      foot: UNREADABLE,
      linkLabel: "Ver en Documentos",
    };
  }
  // Sin razón social el PDF sale sin quién lo emite: es lo único que falta de verdad.
  const legal = source.issuer.legal_name?.trim() ?? "";
  if (legal === "") {
    return {
      ...base,
      configured: false,
      foot: "Falta la razón social del emisor",
      linkLabel: "Configurar",
    };
  }
  return {
    ...base,
    configured: true,
    foot: `Emite ${legal}`,
    linkLabel: "Ver en Documentos",
  };
}

const BUILDERS: Record<
  SetupFeatureCode,
  (sources: SetupSources) => FeatureSetup
> = {
  payment_plans: (s) => paymentPlans(s.collections),
  collections: (s) => reminders(s.collections),
  fx_quotes: (s) => fxQuotes(s.fx),
  documents: (s) => documents(s.documents),
};

export function isSetupFeature(code: string): code is SetupFeatureCode {
  return code in BUILDERS;
}

export function featureSetup(
  code: SetupFeatureCode,
  sources: SetupSources,
): FeatureSetup {
  return BUILDERS[code](sources);
}

export interface SetupSummary {
  /** Las funciones encendidas, en el orden del catálogo. */
  steps: FeatureSetup[];
  ready: number;
  /** La primera que falta: el título y el CTA de la isla. `null` si no falta nada conocido. */
  next: FeatureSetup | null;
}

export function setupSummary(
  activeCodes: readonly string[],
  sources: SetupSources,
): SetupSummary {
  const steps = activeCodes
    .filter(isSetupFeature)
    .map((code) => featureSetup(code, sources));
  return {
    steps,
    ready: steps.filter((step) => step.configured === true).length,
    next: steps.find((step) => step.configured === false) ?? null,
  };
}
