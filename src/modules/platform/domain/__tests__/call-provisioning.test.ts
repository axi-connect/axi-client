import { CALL_NUMBER_KIND_LABELS, toCallNumberRow } from "../call-provisioning";
import type { CallNumber } from "../call-provisioning";

const BASE: CallNumber = {
  id: "n1",
  provider_account_id: "acc1",
  account_label: "Twilio prod",
  company_id: "c1",
  company_name: "Axi Demo",
  phone_number: "+573180139091",
  provider_sid: "PNcaller",
  country_code: "CO",
  status: "active",
  kind: "caller_id",
  default_ai_agent_id: null,
  default_ai_agent_name: null,
  inbound_enabled: false,
  monthly_cost_cents: 0,
  assigned_at: "2026-09-03T18:00:00.000Z",
  created_at: "2026-09-03T17:00:00.000Z",
};

describe("toCallNumberRow (identificador de llamada, Fase 1)", () => {
  it("conserva el kind en la fila plana: la tabla y el assign deciden por él", () => {
    expect(toCallNumberRow(BASE).kind).toBe("caller_id");
    expect(toCallNumberRow({ ...BASE, kind: "twilio" }).kind).toBe("twilio");
  });

  it("las etiquetas distinguen el número que contesta del que solo se muestra", () => {
    expect(CALL_NUMBER_KIND_LABELS).toEqual({
      twilio: "Número Twilio",
      caller_id: "Identificador",
    });
  });
});
