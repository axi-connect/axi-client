import {
  isTransientSkipReason,
  skipReasonBreakdown,
  skipReasonLabel,
  SKIP_REASON_LABELS,
} from "../skip-reasons";

describe("skipReasonLabel", () => {
  it("traduce los motivos conocidos del backend", () => {
    expect(skipReasonLabel("opted_out")).toBe("El contacto pidió no recibir promociones");
    expect(skipReasonLabel("wweb_throttle_exhausted")).toBe(
      "El canal de WhatsApp Web no tuvo cupo (límite anti-bloqueo)",
    );
  });

  it("devuelve el literal crudo si el backend añade un motivo nuevo", () => {
    // Debe VERSE raro para que lo mapeemos, no verse bien por accidente.
    expect(skipReasonLabel("motivo_inventado")).toBe("motivo_inventado");
  });

  it("no deja hueco cuando el motivo viene vacío", () => {
    expect(skipReasonLabel(null)).toBe("Sin motivo registrado");
    expect(skipReasonLabel(undefined)).toBe("Sin motivo registrado");
    expect(skipReasonLabel("")).toBe("Sin motivo registrado");
  });

  it("cubre las tres familias de motivos del backend", () => {
    // Ruta (conversations) · notificador · dispatch de marketing.
    for (const reason of [
      "no_channel",
      "channel_not_connected",
      "unsupported_channel_kind",
      "no_contact_identity",
      "outside_service_window",
      "company_suspended",
      "limit_exceeded",
      "unsupported_content",
      "opted_out",
      "campaign_cancelled",
      "invalid_content",
      "template_not_approved",
      "human_active",
      "promotion_inactive",
    ]) {
      expect(SKIP_REASON_LABELS[reason]).toBeDefined();
    }
  });
});

describe("motivos transitorios", () => {
  it("cooldown y cupo diario no son descartes definitivos", () => {
    expect(isTransientSkipReason("cooldown")).toBe(true);
    expect(isTransientSkipReason("daily_cap_reached")).toBe(true);
    expect(isTransientSkipReason("opted_out")).toBe(false);
    expect(isTransientSkipReason(null)).toBe(false);
  });
});

describe("skipReasonBreakdown", () => {
  it("ordena de mayor a menor y traduce", () => {
    expect(
      skipReasonBreakdown({ outside_service_window: 60, opted_out: 200 }),
    ).toEqual([
      { reason: "opted_out", label: SKIP_REASON_LABELS.opted_out, count: 200 },
      {
        reason: "outside_service_window",
        label: SKIP_REASON_LABELS.outside_service_window,
        count: 60,
      },
    ]);
  });

  it("excluye los transitorios: no son contactos perdidos", () => {
    const rows = skipReasonBreakdown({ opted_out: 5, cooldown: 90, daily_cap_reached: 40 });
    expect(rows.map((r) => r.reason)).toEqual(["opted_out"]);
  });

  it("descarta los ceros y tolera la ausencia de desglose", () => {
    expect(skipReasonBreakdown({ opted_out: 0 })).toEqual([]);
    expect(skipReasonBreakdown(undefined)).toEqual([]);
  });

  it("desempata de forma estable para que la lista no baile entre refrescos", () => {
    const rows = skipReasonBreakdown({ no_channel: 7, opted_out: 7 });
    expect(rows.map((r) => r.reason)).toEqual(["no_channel", "opted_out"]);
  });
});
