import { CRM_AI_MISSING_FAILED } from "../copy";
import {
  approvalLines,
  approvedOnPhrase,
  approvedThisPeriod,
  commercialProposalHref,
  expiryPhrase,
  isCommercialProposal,
  outreachDetailText,
  proposalHeadline,
  readOutreach,
  readOutreachDetail,
  startDatePhrase,
  startPhrase,
} from "../proposals";
import { proposal } from "../../ui/__tests__/fixtures";

describe("proposalHeadline", () => {
  it("dice las ventas estimadas y qué parte del atraso cubre, con la cuenta aparte", () => {
    expect(proposalHeadline(proposal)).toEqual({
      primary: "+2 ventas estimadas · cubre el 20 % de lo que falta para volver al ritmo",
      basis: "12 × 50 % × 35 % = 2",
    });
  });

  it("en singular con una venta y sin cobertura si no viene", () => {
    expect(proposalHeadline({ ...proposal, estimated_sales: 1, covers_pct: null }).primary).toBe("+1 venta estimada");
  });

  it("sin cifras del método (o con cero) pinta el texto del servidor tal cual", () => {
    expect(proposalHeadline({ ...proposal, estimated_sales: null }).primary).toBe(proposal.headline);
    expect(proposalHeadline({ ...proposal, estimated_sales: 0 }).primary).toBe(proposal.headline);
  });
});

describe("readOutreach", () => {
  it("lee el lote: contactos, canal, ritmo y arranque = creación + desplazamiento", () => {
    const [plan] = readOutreach(proposal.artifacts, proposal.created_at);
    expect(plan).toMatchObject({ type: "agent_task_bulk_spec", contacts: 12, channel: "message", perHour: 12, agentId: null });
    expect(plan.startsAt?.toISOString()).toBe("2026-09-24T14:00:00.000Z");
  });

  it("descarta lo que no sabe pintar en vez de romper", () => {
    expect(readOutreach([null, "x", { type: "campaign" }, { type: "agent_task_bulk_spec" }], proposal.created_at)).toEqual([
      expect.objectContaining({ type: "agent_task_bulk_spec", contacts: 0, channel: null }),
    ]);
  });
});

describe("startPhrase", () => {
  const now = new Date(2026, 8, 23, 18, 0);
  it("hoy, mañana, otro día o ya", () => {
    expect(startPhrase(new Date(2026, 8, 23, 20, 30), now)).toBe("hoy a las 20:30");
    expect(startPhrase(new Date(2026, 8, 24, 9, 0), now)).toBe("mañana a las 9:00");
    expect(startPhrase(new Date(2026, 8, 28, 9, 0), now)).toBe("el lunes 28 a las 9:00");
    expect(startPhrase(new Date(2026, 8, 23, 9, 0), now)).toBe("desde ahora");
  });
});

describe("readOutreachDetail y approvalLines", () => {
  it("parte el parcial del servidor", () => {
    expect(readOutreachDetail("36 programados · 2 omitidos: 2 baja comercial")).toEqual({ created: 36, skipped: 2, reasons: "2 baja comercial" });
    expect(readOutreachDetail("10 programados")).toEqual({ created: 10, skipped: 0, reasons: null });
    expect(readOutreachDetail("otra cosa")).toBeNull();
  });

  it("resultado parcial en contactos y cuándo; lo fallido aparte", () => {
    const plans = readOutreach(proposal.artifacts, proposal.created_at);
    const lines = approvalLines(
      {
        applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "36 programados · 2 omitidos: 2 baja comercial" }],
        failed: [{ type: "campaign", label: "Campaña", reason: "la plantilla sigue en revisión" }],
      },
      plans,
      new Date("2026-09-23T23:30:00.000Z"),
    );
    expect(lines[0].title).toMatch(/^Listo\. 36 contactos entran en seguimiento (mañana|hoy) a las \d+:00\.$/);
    expect(lines[0].detail).toBe("2 quedaron fuera (2 baja comercial).");
    expect(lines[1]).toEqual({ tone: "warn", title: "No se pudo: Campaña.", detail: "la plantilla sigue en revisión" });
  });

  it("sin crm_ai el artefacto fallido explica el plan, no el mensaje técnico (Y2)", () => {
    const [line] = approvalLines(
      {
        applied: [],
        failed: [
          { type: "agent_task_bulk_spec", label: "Lote", reason: "Tu plan no incluye el agente de seguimiento del CRM (crm_ai)" },
        ],
      },
      [],
    );
    expect(line).toEqual({ tone: "warn", title: "No se pudo: Lote.", detail: CRM_AI_MISSING_FAILED });
    expect(line.detail).not.toMatch(/crm_ai/);
  });

  it("«1 omitidos» se lee en singular; 2 o más, en plural (Q11)", () => {
    expect(readOutreachDetail("20 programados · 1 omitidos: 1 baja comercial")).toEqual({ created: 20, skipped: 1, reasons: "1 baja comercial" });
    expect(readOutreachDetail("1 programado · 1 omitido: 1 baja comercial")).toEqual({ created: 1, skipped: 1, reasons: "1 baja comercial" });
    const [line] = approvalLines(
      { applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "20 programados · 1 omitidos: 1 baja comercial" }], failed: [] },
      [],
    );
    expect(line.detail).toBe("1 quedó fuera (1 baja comercial).");
    expect(outreachDetailText("1 programados · 1 omitidos, y 3 inscritos")).toBe("1 programado · 1 omitido, y 3 inscritos");
    expect(outreachDetailText("20 programados · 2 omitidos")).toBe("20 programados · 2 omitidos");
    expect(outreachDetailText("11 omitidos")).toBe("11 omitidos");
    // Lo que no se entiende se pinta crudo, pero con la concordancia bien.
    expect(approvalLines({ applied: [{ type: "x", id: null, label: "Algo", detail: "1 omitidos por el horario" }], failed: [] }, [])[0].detail).toBe(
      "1 omitido por el horario",
    );
  });

  it("un detalle que no se entiende se pinta crudo", () => {
    expect(approvalLines({ applied: [{ type: "x", id: null, label: "Algo", detail: "raro" }], failed: [] }, [])).toEqual([
      { tone: "ok", title: "Listo. Algo.", detail: "raro" },
    ]);
  });
});

describe("helpers", () => {
  it("href, origen, vencimiento y aprobadas del periodo", () => {
    expect(commercialProposalHref("a b")).toBe("/comercial/acciones/a%20b");
    expect(isCommercialProposal({ source: "commercial" })).toBe(true);
    expect(isCommercialProposal({ source: "chat" })).toBe(false);
    const now = new Date(2026, 8, 23, 12);
    expect(expiryPhrase(null, now)).toBeNull();
    expect(expiryPhrase(new Date(2026, 8, 24, 12).toISOString(), now)).toBe("Vence mañana");
    expect(expiryPhrase(new Date(2026, 8, 26, 12).toISOString(), now)).toBe("Vence el sábado");
    expect(expiryPhrase(new Date(2026, 8, 20).toISOString(), now)).toBe("Venció");
    const rows = [
      { ...proposal, id: "a", status: "approved" as const, decided_at: "2026-09-10T00:00:00Z" },
      { ...proposal, id: "b", status: "approved" as const, decided_at: "2026-08-30T00:00:00Z" },
    ];
    expect(approvedThisPeriod(rows, "2026-09-01").map((row) => row.id)).toEqual(["a"]);
  });
});

describe("aprobadas en pasado (C6)", () => {
  it("approvedOnPhrase dice la fecha en pasado y tolera lo ilegible", () => {
    expect(approvedOnPhrase(new Date(2026, 8, 22, 10).toISOString())).toBe("Se aprobó el 22 de septiembre");
    expect(approvedOnPhrase(null)).toBe("Se aprobó");
    expect(approvedOnPhrase("no es fecha")).toBe("Se aprobó");
  });

  it("startDatePhrase da la fecha aunque ya haya pasado (startPhrase diría «desde ahora»)", () => {
    expect(startDatePhrase(new Date(2026, 8, 21, 9, 0))).toBe("el lunes 21 a las 9:00");
  });
});
