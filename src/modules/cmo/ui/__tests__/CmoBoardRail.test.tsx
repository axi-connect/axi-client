import { render, screen } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { CmoBoardRail } from "../components/CmoBoardRail";

/**
 * El rail se quedaba SIN scroll y recortaba las propuestas: su scroller era
 * `flex flex-col` y la `<section>` de propuestas, hija directa, es contenedor de
 * scroll por su `overflow-hidden`. El tamaño mínimo automático de un contenedor
 * de scroll es 0 (CSS Box Sizing), así que flex la aplastaba a la altura
 * disponible y el `overflow-hidden` recortaba las tarjetas de más — el scroller
 * nunca desbordaba, luego nunca aparecía barra. jsdom no calcula layout, así que
 * lo que se blinda es la estructura que lo provoca. Ver DESIGN-SYSTEM §4.2.
 */

function proposal(id: string): ProposalDTO {
  return {
    id,
    kind: "recovery",
    status: "pending",
    source: "chat",
    title: `Propuesta ${id}`,
    headline: "$1.000.000 en juego",
    rationale: "Motivo.",
    evidence: [],
    risks: [],
    artifacts: [],
    expires_at: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-08-22T14:00:00.000Z",
  } as ProposalDTO;
}

function renderRail(count: number) {
  return render(
    <CmoBoardRail
      proposals={Array.from({ length: count }, (_, i) => proposal(`prop-${i}`))}
      briefing={null}
      loading={false}
      briefingLoading={false}
      briefingError={null}
      onRetryBriefing={jest.fn()}
      error={null}
      onRetry={jest.fn()}
    />,
  );
}

describe("CmoBoardRail", () => {
  it("con propuestas de sobra, el scroller es de bloque: ningún hijo puede aplastar la lista", () => {
    const { container } = renderRail(12);

    const scrollers = container.querySelectorAll("[class*='overflow-y-auto']");
    // Un solo scroll por área (§4.2): el del rail.
    expect(scrollers).toHaveLength(1);

    const scroller = scrollers[0];
    // De BLOQUE: `flex-1` sí (es propiedad del ítem, y la necesita), pero ni
    // `display:flex` ni `flex-col`. Si vuelve a ser un scroller flex, la sección
    // de propuestas —contenedor de scroll— se encoge a 0 y recorta.
    const classes = scroller.className.split(/\s+/);
    expect(classes).not.toContain("flex");
    expect(classes).not.toContain("flex-col");
    expect(scroller).toHaveClass("min-h-0", "flex-1", "space-y-3");

    // Y las doce llegan al DOM: lo que faltaba era poder alcanzarlas.
    expect(screen.getAllByRole("link", { name: /Propuesta prop-/ })).toHaveLength(12);
  });

  it("«La lectura de Axel» queda fuera del scroller, anclada al pie", () => {
    const { container } = renderRail(12);

    const scroller = container.querySelector("[class*='overflow-y-auto']");
    const lectura = screen.getByRole("heading", { name: /la lectura de axel/i });

    expect(scroller?.contains(lectura)).toBe(false);
    expect(lectura.closest("div.flex-none")).not.toBeNull();
  });
});
