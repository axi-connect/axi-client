import { ACTION_GROUPS } from "../audit";
import {
  ALERT_RULE_LABELS,
  AUDIT_ACTION_LABELS,
  humanLabel,
  PLAN_TIER_LABELS,
  PROVIDER_CAPABILITY_LABELS,
  TENANT_ROLE_LABELS,
  TENANT_STATUS_LABELS,
  TENANT_STATUS_PLURAL_LABELS,
  timeZoneLabel,
} from "../labels";
import { CAPABILITY_LABELS } from "../prospecting-providers";

describe("diccionario de rótulos humanos", () => {
  it("un código conocido se lee como persona y conserva el código para el title", () => {
    expect(humanLabel(AUDIT_ACTION_LABELS, "platform.tenant_created")).toEqual({
      label: "Creó la empresa",
      code: "platform.tenant_created",
      known: true,
    });
    expect(humanLabel(PLAN_TIER_LABELS, "sbs").label).toBe("Base compartida");
    expect(humanLabel(TENANT_ROLE_LABELS, "owner").label).toBe("Dueño");
    expect(humanLabel(TENANT_STATUS_LABELS, "trial").label).toBe("En prueba");
  });

  it("un código desconocido se muestra tal cual y marcado: nunca se inventa", () => {
    expect(humanLabel(AUDIT_ACTION_LABELS, "platform.algo_nuevo")).toEqual({
      label: "platform.algo_nuevo",
      code: "platform.algo_nuevo",
      known: false,
    });
    expect(humanLabel(AUDIT_ACTION_LABELS, null)).toEqual({ label: "", code: "", known: false });
    // Lo heredado de Object no cuenta como conocido.
    expect(humanLabel(AUDIT_ACTION_LABELS, "toString").known).toBe(false);
  });

  it("todas las acciones que ofrece el filtro de Auditoría tienen nombre", () => {
    const missing = ACTION_GROUPS.flatMap((group) => group.actions).filter((action) => !(action in AUDIT_ACTION_LABELS));
    expect(missing).toEqual([]);
  });

  it("find_people tiene rótulo y la vitrina no pierde ninguno de los que ya tenía", () => {
    expect(PROVIDER_CAPABILITY_LABELS.find_people).toBe("Encuentra a quién decide");
    for (const [code, label] of Object.entries(CAPABILITY_LABELS)) {
      expect(PROVIDER_CAPABILITY_LABELS[code]).toBe(label);
    }
  });

  it("las siete reglas de anomalía del servidor tienen nombre", () => {
    expect(Object.keys(ALERT_RULE_LABELS).sort()).toEqual(
      [
        "ai_failures_spike",
        "escalation_rate",
        "latency_p95",
        "low_score_streak",
        "hallucination_detected",
        "tool_unproductive_streak",
        "catalog_denial_rate",
      ].sort(),
    );
  });

  it("la zona horaria se lee por su país, con el IANA en el código", () => {
    expect(timeZoneLabel("America/Bogota")).toEqual({ label: "Hora de Colombia", code: "America/Bogota", known: true });
    expect(timeZoneLabel("America/Argentina/Buenos_Aires").label).toBe("Hora de Argentina");
    expect(timeZoneLabel("Asia/Tokyo")).toEqual({ label: "Hora de Tokyo", code: "Asia/Tokyo", known: false });
    expect(timeZoneLabel("UTC")).toEqual({ label: "UTC", code: "UTC", known: false });
    expect(timeZoneLabel(null).label).toBe("");
  });

  it("los filtros de empresas usan el mismo vocabulario que la píldora (nada de «Trial»)", () => {
    expect(Object.keys(TENANT_STATUS_PLURAL_LABELS).sort()).toEqual(Object.keys(TENANT_STATUS_LABELS).sort());
    expect(TENANT_STATUS_PLURAL_LABELS.trial).toBe(TENANT_STATUS_LABELS.trial);
    expect(Object.values({ ...TENANT_STATUS_LABELS, ...TENANT_STATUS_PLURAL_LABELS }).join(" ")).not.toMatch(/Trial/);
  });
});
