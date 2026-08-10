import type { Schemas } from "@/core/api/types";

/** Ajustes del módulo (`/marketing/settings`). */
export type MarketingSettings = Schemas["MarketingSettingsDto"];

/**
 * Rangos que acepta el backend. Se declaran aquí para que los inputs los
 * impongan ANTES de enviar: un 422 por escribir 5000 en "mensajes por día" es
 * un viaje al servidor que la UI podía haber evitado.
 */
export const SETTINGS_LIMITS = {
  attribution_window_hours: { min: 1, max: 720 },
  cooldown_hours: { min: 0, max: 720 },
  daily_cap_per_contact: { min: 1, max: 10 },
  keywords: { max: 10, maxLength: 40 },
  confirmation_body: { maxLength: 300 },
  wweb: {
    daily_cap: { min: 1, max: 1000 },
    min_interval_seconds: { min: 5, max: 600 },
    jitter_pct: { min: 0, max: 100 },
  },
} as const;

/**
 * Defaults del backend. Solo se usan como forma de partida si el GET falla —
 * el camino normal es partir SIEMPRE de lo que devuelve el servidor, porque el
 * PUT exige la sección completa y un default equivocado pisaría ajustes reales.
 */
export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  attribution_window_hours: 72,
  cooldown_hours: 24,
  daily_cap_per_contact: 1,
  exclude_human_active: true,
  opt_out: {
    keywords: ["BAJA", "STOP", "CANCELAR", "UNSUBSCRIBE", "NO MOLESTAR"],
    confirmation_body:
      "Listo, no recibirás más mensajes promocionales. Si cambias de opinión, escríbenos cuando quieras.",
  },
  wweb: { daily_cap: 150, min_interval_seconds: 30, jitter_pct: 50 },
};

/** Errores de los ajustes, por campo, para poder señalarlos donde ocurren. */
export type SettingsErrors = Partial<Record<string, string>>;

function outOfRange(value: number, range: { min: number; max: number }): boolean {
  return !Number.isInteger(value) || value < range.min || value > range.max;
}

/**
 * Valida los ajustes con las MISMAS reglas del backend. Devuelve un mapa
 * campo→mensaje: un banner genérico obligaría a buscar cuál de los ocho
 * campos está mal.
 */
export function validateMarketingSettings(settings: MarketingSettings): SettingsErrors {
  const errors: SettingsErrors = {};
  const L = SETTINGS_LIMITS;

  if (outOfRange(settings.attribution_window_hours, L.attribution_window_hours)) {
    errors.attribution_window_hours = `Entre ${L.attribution_window_hours.min} y ${L.attribution_window_hours.max} horas`;
  }
  if (outOfRange(settings.cooldown_hours, L.cooldown_hours)) {
    errors.cooldown_hours = `Entre ${L.cooldown_hours.min} y ${L.cooldown_hours.max} horas`;
  }
  if (outOfRange(settings.daily_cap_per_contact, L.daily_cap_per_contact)) {
    errors.daily_cap_per_contact = `Entre ${L.daily_cap_per_contact.min} y ${L.daily_cap_per_contact.max} mensajes`;
  }

  const keywords = settings.opt_out.keywords;
  if (keywords.length === 0) {
    // Sin ninguna palabra, un cliente no tendría forma de darse de baja
    // escribiendo: es un requisito legal, no una preferencia.
    errors.keywords = "Necesitas al menos una palabra de baja";
  } else if (keywords.length > L.keywords.max) {
    errors.keywords = `Máximo ${L.keywords.max} palabras`;
  } else if (keywords.some((k) => k.trim() === "" || k.length > L.keywords.maxLength)) {
    errors.keywords = `Cada palabra: entre 1 y ${L.keywords.maxLength} caracteres`;
  }

  const body = settings.opt_out.confirmation_body.trim();
  if (body === "") {
    errors.confirmation_body = "Escribe qué se le responde a quien pide la baja";
  } else if (body.length > L.confirmation_body.maxLength) {
    errors.confirmation_body = `Máximo ${L.confirmation_body.maxLength} caracteres`;
  }

  if (outOfRange(settings.wweb.daily_cap, L.wweb.daily_cap)) {
    errors.wweb_daily_cap = `Entre ${L.wweb.daily_cap.min} y ${L.wweb.daily_cap.max}`;
  }
  if (outOfRange(settings.wweb.min_interval_seconds, L.wweb.min_interval_seconds)) {
    errors.wweb_min_interval_seconds = `Entre ${L.wweb.min_interval_seconds.min} y ${L.wweb.min_interval_seconds.max} segundos`;
  }
  if (outOfRange(settings.wweb.jitter_pct, L.wweb.jitter_pct)) {
    errors.wweb_jitter_pct = "Entre 0 y 100";
  }

  return errors;
}

/** Normaliza las palabras de baja: mayúsculas, sin duplicados ni vacíos. */
export function normalizeKeywords(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const keyword of raw) {
    const clean = keyword.trim().toUpperCase();
    // El backend compara la keyword en mayúsculas: guardar "baja" y "BAJA"
    // como dos entradas gastaría dos de las diez plazas por lo mismo.
    if (clean !== "" && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

/**
 * Ritmo máximo de envío por canal de WhatsApp Web, en mensajes por hora, para
 * que el usuario entienda qué está configurando. El intervalo mínimo con
 * jitter promedia `interval * (1 + jitter/200)`.
 */
export function wwebMessagesPerHour(wweb: MarketingSettings["wweb"]): number {
  const averageInterval = wweb.min_interval_seconds * (1 + wweb.jitter_pct / 200);
  if (averageInterval <= 0) return 0;
  return Math.round(3600 / averageInterval);
}

/** Cuántas horas tarda en agotarse el cupo diario a ese ritmo. */
export function wwebHoursToDailyCap(wweb: MarketingSettings["wweb"]): number {
  const perHour = wwebMessagesPerHour(wweb);
  if (perHour <= 0) return 0;
  return Math.round((wweb.daily_cap / perHour) * 10) / 10;
}
