import { render, screen } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { CmoBoardRail } from "../components/CmoBoardRail";

/**
 * El rail se quedaba SIN scroll y recortaba las propuestas: su scroller era
 * `flex flex-col` y la `<section>` de propuestas, hija directa, es contenedor de
 * scroll por su `overflow-hidden`. El tamaño mínimo automático de un contenedor
 * de scroll es 0 (CSS Box Sizing), así que flex la aplastaba a la altura
 * disponible y el `overflow-hidden` recortaba las tarjetas de más. jsdom no
 * calcula layout, así que lo que se blinda es la estructura que lo provoca. Ver
 * DESIGN-SYSTEM §4.2. Y desde el rediseño minimalista el rail es SOLO la
 * bandeja: sin resumen del informe ni enlace a ajustes.
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
      loading={false}
      error={null}
      onRetry={jest.fn()}
    />,
  );
}

describe("CmoBoardRail", () => {
  it("con propuestas de sobra, el scroller es de bloque: ningún hijo puede aplastar la lista", () => {
    const { container } = renderRail(12);

    const scrollers = container.querySelectorAll("[class*='overflow-y-auto']");
    expect(scrollers).toHaveLength(1);

    const scroller = scrollers[0];
    const classes = scroller.className.split(/\s+/);
    expect(classes).not.toContain("flex");
    expect(classes).not.toContain("flex-col");
    expect(scroller).toHaveClass("min-h-0", "flex-1", "space-y-3");

    expect(screen.getAllByRole("link", { name: /Propuesta prop-/ })).toHaveLength(12);
    expect(screen.getByRole("heading", { name: "Por decidir" })).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
  });

  it("solo la bandeja: el informe y los ajustes ya no viven aquí", () => {
    renderRail(2);

    expect(screen.queryByRole("heading", { name: /la lectura de axel/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /directrices y ajustes/i })).toBeNull();
  });

  it("sin pendientes dice «Estás al día.» y nada más", () => {
    renderRail(0);

    expect(screen.getByText("Estás al día.")).toBeVisible();
    expect(screen.queryByText(/Cuando Axel encuentre algo/)).toBeNull();
  });
});
