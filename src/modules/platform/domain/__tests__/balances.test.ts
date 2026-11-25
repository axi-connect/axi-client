import {
  alertHeadline,
  balanceStateKey,
  balanceText,
  dateInputToIso,
  endSentence,
  formatDay,
  formatRunway,
  formatUsd,
  isoToDateInput,
  lastSignal,
  lastSignalParts,
  parseAmount,
  spendText,
  type ProviderBalance,
} from "../balances";
import { platformState } from "../platform-states";

const row = (extra: Partial<ProviderBalance> = {}): ProviderBalance => ({
  id: "twilio",
  name: "Twilio",
  use: "Llamadas",
  impact: "las llamadas no se pueden hacer",
  level: "ok",
  probe: "twilio",
  measurable: true,
  balance_usd: 40,
  balance_source: "exact",
  runway_days: 40,
  spend_7d_usd: 7,
  spend_breakdown: [],
  last_success_at: null,
  checked_at: null,
  check_error: null,
  loaded_amount_usd: null,
  loaded_at: null,
  thresholds: { warn_days: 7, warn_usd: 10, critical_days: 2, critical_usd: 3 },
  incident: null,
  ...extra,
});

const incident = (kind: "no_funds" | "auth_invalid") => ({
  id: "i-1",
  kind,
  since: "2026-11-24T14:45:00Z",
  last_seen_at: "2026-11-24T16:28:00Z",
  failure_count: 18,
  sample: null,
  notified_at: null,
  next_reminder_at: null,
});

describe("saldos de proveedores (dominio)", () => {
  it("el estado: el incidente manda sobre el saldo, y cada clave tiene su rótulo en español", () => {
    expect(balanceStateKey(row({ level: "critical", incident: incident("no_funds") }))).toBe("no_funds");
    expect(balanceStateKey(row({ level: "critical", incident: incident("auth_invalid") }))).toBe("auth_invalid");
    expect(balanceStateKey(row({ level: "critical" }))).toBe("balance_critical");
    expect(balanceStateKey(row({ level: "warning" }))).toBe("balance_low");
    expect(balanceStateKey(row({ level: "unknown" }))).toBe("balance_unknown");
    expect(balanceStateKey(row())).toBe("balance_ok");
    expect(
      ["no_funds", "auth_invalid", "balance_critical", "balance_low", "balance_ok", "balance_unknown"].map(
        (key) => platformState(key).label,
      ),
    ).toEqual(["Sin saldo", "Llave inválida", "Crítico", "Bajo", "Bien", "Sin dato"]);
  });

  it("el saldo se dice según de dónde sale", () => {
    expect(balanceText(row())).toEqual({ value: "US$ 40,00", note: "exacto" });
    expect(balanceText(row({ balance_source: "estimated", balance_usd: 21.75 }))).toEqual({
      value: "US$ 21,75",
      note: "cargado − gastado",
    });
    expect(balanceText(row({ measurable: false }))).toEqual({ value: "—", note: "sin consulta de saldo" });
    expect(balanceText(row({ probe: "openai_admin", balance_usd: null }))).toEqual({
      value: "—",
      note: "registra una recarga",
    });
  });

  it("dinero y días", () => {
    expect(formatUsd(1234.5)).toBe("US$ 1.234,50");
    expect(formatRunway(null)).toBe("—");
    expect(formatRunway(0)).toBe("0 días");
    expect(formatRunway(0.4)).toBe("menos de 1 día");
    expect(formatRunway(1.2)).toBe("1 día");
    expect(formatRunway(6.05)).toBe("6 días");
  });

  it("la última señal: el rechazo si hay incidente; si no, cuándo respondió bien", () => {
    const now = new Date("2026-11-24T20:00:00Z");
    expect(lastSignal(row({ incident: incident("no_funds") }), now)).toMatch(/^Rechaza: sin saldo · /);
    expect(lastSignal(row({ check_error: "OpenAI respondió 401" }), now)).toBe(
      "No se pudo leer el saldo · OpenAI respondió 401",
    );
    expect(lastSignal(row({ last_success_at: "2026-11-24T16:12:00Z" }), now)).toMatch(/^Respondió bien · /);
    expect(lastSignal(row(), now)).toBe("Sin actividad reciente");
  });

  it("revisión visual: sin «a. m..», fecha de recarga corta, señal en dos partes y gasto no medido como «—»", () => {
    expect(endSentence("desde las 9:45 a. m.")).toBe("desde las 9:45 a. m.");
    expect(endSentence("sin saldo")).toBe("sin saldo.");
    const item = { provider: "openai", name: "OpenAI", impact: "x", level: "critical" as const, reason: "no_funds" as const, since: "2026-11-24T14:45:00Z", balance_usd: null };
    expect(alertHeadline(item)).not.toMatch(/\.\.$/);
    expect(formatDay("2026-11-10T17:00:00Z")).toBe("10 nov");
    const now = new Date("2026-11-24T20:00:00Z");
    expect(lastSignalParts(row({ last_success_at: "2026-11-24T16:12:00Z" }), now).what).toBe("Respondió bien");
    expect(lastSignalParts(row(), now)).toEqual({ what: "Sin actividad reciente", when: null });
    expect(spendText(row({ measurable: false, spend_7d_usd: 0 }))).toBe("—");
    expect(spendText(row({ measurable: false, spend_7d_usd: 0.42 }))).toBe("US$ 0,42");
    expect(spendText(row({ spend_7d_usd: 0 }))).toBe("US$ 0,00");
  });

  it("la frase de la franja", () => {
    const base = { provider: "openai", name: "OpenAI", impact: "x", level: "critical" as const, since: null, balance_usd: null };
    expect(alertHeadline({ ...base, reason: "no_funds" })).toBe("OpenAI se quedó sin saldo.");
    expect(alertHeadline({ ...base, reason: "auth_invalid" })).toBe("OpenAI rechaza la llave de Axi.");
    expect(alertHeadline({ ...base, reason: "low_balance", balance_usd: 2 })).toBe(
      "El saldo de OpenAI está en crítico: US$ 2,00.",
    );
    expect(alertHeadline({ ...base, reason: "low_balance", level: "warning", balance_usd: 8 })).toBe(
      "El saldo de OpenAI está bajo: US$ 8,00.",
    );
  });

  it("montos escritos a mano y fechas sin saltos de huso", () => {
    expect(parseAmount("50")).toBe(50);
    expect(parseAmount("50,5")).toBe(50.5);
    expect(parseAmount("1.234,50")).toBe(1234.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("cincuenta")).toBeUndefined();
    expect(parseAmount("-3")).toBeUndefined();
    expect(dateInputToIso("2026-11-24")).toBe("2026-11-24T12:00:00.000-05:00");
    expect(dateInputToIso("24/11/2026")).toBeNull();
    expect(isoToDateInput("2026-11-24T12:00:00.000-05:00")).toBe("2026-11-24");
    // Las 11 p. m. de Bogotá siguen siendo el mismo día aunque en UTC ya sea mañana
    expect(isoToDateInput("2026-11-25T04:00:00Z")).toBe("2026-11-24");
    expect(isoToDateInput(null)).toBe("");
  });
});
