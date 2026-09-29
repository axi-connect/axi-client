import { http } from "@/core/services/http";
import type { OutreachPolicy, OutreachPolicyView } from "@/modules/marketing/domain/outreach-policy";

/**
 * Política de contacto (`/contacts/outreach-policy`, P1 del piloto de
 * captación). El PUT exige la política COMPLETA: la pantalla parte siempre del
 * GET y reenvía todo. Un horario fuera del criterio prudente responde 422
 * `contacts/outreach_hours_out_of_bounds`.
 */

export function getOutreachPolicy(): Promise<OutreachPolicyView> {
  return http.get<OutreachPolicyView>("/contacts/outreach-policy");
}

export function putOutreachPolicy(policy: OutreachPolicy): Promise<OutreachPolicyView> {
  return http.put<OutreachPolicyView>("/contacts/outreach-policy", policy);
}
