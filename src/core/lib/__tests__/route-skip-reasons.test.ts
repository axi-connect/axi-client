import {
  isRouteSkipReason,
  lowerFirst,
  ROUTE_SKIP_REASON_LABELS,
} from "@/core/lib/route-skip-reasons";
import { DELIVERY_SKIP_LABELS } from "@/modules/documents/domain/delivery";
import { skipReasonLabel } from "@/modules/collections/domain/reminder";

/**
 * QA real de F5: «no_channel» salía en crudo en el historial de recordatorios
 * mientras la entrega de documentos lo traducía. Un solo mapa para las razones
 * de ruta, que usan los dos slices.
 */
describe("razones de ruta compartidas", () => {
  it("las cinco razones de ruta más unsupported_content tienen frase, y ningún código sale en crudo", () => {
    for (const reason of [
      "no_channel",
      "channel_not_found",
      "channel_not_connected",
      "no_contact_identity",
      "unsupported_channel_kind",
      "unsupported_content",
    ]) {
      expect(isRouteSkipReason(reason)).toBe(true);
      expect(skipReasonLabel(reason)).toBe(
        ROUTE_SKIP_REASON_LABELS[
          reason as keyof typeof ROUTE_SKIP_REASON_LABELS
        ],
      );
      expect(skipReasonLabel(reason)).not.toMatch(/_/);
    }
    // Una razón que no es de ruta sigue saliendo tal cual (el otro signo)
    expect(isRouteSkipReason("stage_not_due")).toBe(false);
    expect(skipReasonLabel("algo_nuevo")).toBe("algo_nuevo");
  });

  it("documents cuelga la misma frase tras un «·», en minúscula", () => {
    expect(DELIVERY_SKIP_LABELS.no_channel).toBe(
      lowerFirst(ROUTE_SKIP_REASON_LABELS.no_channel),
    );
    expect(DELIVERY_SKIP_LABELS.no_channel).toMatch(/^[a-z]/);
    expect(lowerFirst("El canal")).toBe("el canal");
    expect(lowerFirst("")).toBe("");
  });
});
