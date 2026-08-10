import type { CampaignRecipientDTO, CampaignStatsDTO } from "../campaign";
import {
  campaignFunnel,
  campaignPending,
  recipientMilestone,
  recipientName,
  stagePct,
  RECIPIENT_STATUS_MAP,
} from "../campaign-funnel";
import { RECIPIENT_STATUS_LABELS } from "../enums";

function stats(over: Partial<CampaignStatsDTO> = {}): CampaignStatsDTO {
  return {
    campaign_id: "c1",
    audience_total: 1200,
    pending: 0,
    queued: 0,
    sent: 200,
    delivered: 400,
    read: 300,
    failed: 40,
    skipped: 260,
    skipped_by_reason: { opted_out: 200, outside_service_window: 60 },
    replies: 180,
    conversions: 45,
    revenue_cents: 450_000_000,
    delivery_rate: 0.745,
    reply_rate: 0.15,
    conversion_rate: 0.037,
    ...over,
  };
}

function recipient(over: Partial<CampaignRecipientDTO> = {}): CampaignRecipientDTO {
  return {
    id: "r1",
    contact: { id: "ct1", full_name: "Ana Pérez", phone: "+573000000000", email: null },
    status: "read",
    skip_reason: null,
    error_code: null,
    channel_kind: "whatsapp_cloud",
    conversation_id: "cv1",
    queued_at: "2026-08-06T12:00:00.000Z",
    sent_at: "2026-08-06T12:01:00.000Z",
    delivered_at: "2026-08-06T12:02:00.000Z",
    read_at: "2026-08-06T12:03:00.000Z",
    replied_at: null,
    converted_order_id: null,
    revenue_cents: null,
    ...over,
  };
}

describe("campaignFunnel", () => {
  it("acumula las etapas: los contadores del backend son excluyentes", () => {
    const stages = campaignFunnel(stats());
    const value = (key: string) => stages.find((s) => s.key === key)!.value;

    // 200 sent + 400 delivered + 300 read + 40 failed — `queued` queda fuera.
    expect(value("dispatched")).toBe(940);
    // Quien leyó también recibió.
    expect(value("delivered")).toBe(700);
    expect(value("audience")).toBe(1200);
    expect(value("replies")).toBe(180);
    expect(value("conversions")).toBe(45);
  });

  it("nunca crece hacia abajo, ni con cifras raras", () => {
    for (const s of [
      stats(),
      stats({ pending: 1200, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, replies: 0, conversions: 0 }),
      stats({ queued: 500, sent: 0, delivered: 0, read: 0, failed: 0 }),
    ]) {
      const [audience, dispatched, delivered] = campaignFunnel(s);
      expect(dispatched.value).toBeLessThanOrEqual(audience.value);
      expect(delivered.value).toBeLessThanOrEqual(dispatched.value);
    }
  });

  it("deja fuera lo que sigue en cola: encolado no es despachado", () => {
    const stages = campaignFunnel(stats({ queued: 260, pending: 0 }));
    expect(stages.find((s) => s.key === "dispatched")!.value).toBe(940);
    expect(campaignPending(stats({ queued: 260, pending: 100 }))).toBe(360);
  });
});

describe("stagePct", () => {
  it("redondea la caída entre etapas", () => {
    expect(stagePct(1200, 940)).toBe(78);
    expect(stagePct(940, 700)).toBe(74);
  });

  it("sin origen devuelve null, no 0 %", () => {
    // Un 0 % se leería como "se cayeron todos", que es lo contrario de
    // "todavía no hay datos".
    expect(stagePct(0, 0)).toBeNull();
    expect(stagePct(-5, 3)).toBeNull();
  });
});

describe("destinatarios", () => {
  it("muestra el hito MÁS avanzado, no el último cronológico", () => {
    expect(recipientMilestone(recipient({ replied_at: "2026-08-06T12:10:00.000Z" }))).toEqual({
      at: "2026-08-06T12:10:00.000Z",
      label: "Respondió",
    });
    expect(recipientMilestone(recipient())?.label).toBe("Leyó");
    expect(recipientMilestone(recipient({ read_at: null }))?.label).toBe("Recibió");
    expect(
      recipientMilestone(recipient({ read_at: null, delivered_at: null }))?.label,
    ).toBe("Salió");
  });

  it("un omitido no tiene hito que enseñar", () => {
    const skipped = recipient({
      status: "skipped",
      queued_at: null,
      sent_at: null,
      delivered_at: null,
      read_at: null,
    });
    expect(recipientMilestone(skipped)).toBeNull();
  });

  it("cae al teléfono cuando el contacto no tiene nombre usable", () => {
    expect(recipientName(recipient())).toBe("Ana Pérez");
    expect(
      recipientName(recipient({ contact: { id: "c", full_name: "   ", phone: "+57300", email: null } })),
    ).toBe("+57300");
    expect(
      recipientName(recipient({ contact: { id: "c", full_name: null, phone: null, email: null } })),
    ).toBe("Contacto sin nombre");
  });

  it("un fallo es rojo, nunca coral, y solo la cola es transitoria", () => {
    expect(RECIPIENT_STATUS_MAP.failed.tone).toBe("destructive");
    expect(RECIPIENT_STATUS_MAP.queued.transient).toBe(true);
    expect(RECIPIENT_STATUS_MAP.read.transient).toBeUndefined();
    // Un mismo estado no puede llamarse de dos maneras en dos pantallas.
    expect(RECIPIENT_STATUS_MAP.skipped.label).toBe(RECIPIENT_STATUS_LABELS.skipped);
  });
});
