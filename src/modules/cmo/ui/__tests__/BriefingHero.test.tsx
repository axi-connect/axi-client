import { render, screen } from "@testing-library/react";

import type { BriefingDTO } from "@/modules/cmo/domain/cmo";
import type { GoalChip } from "@/modules/commercial/public";
import { BriefingHero } from "../components/BriefingHero";

// El chip sale del slice comercial (autosuficiente); aquí se fija su valor.
let mockChip: GoalChip | null = null;
jest.mock("@/modules/commercial/public", () => ({ useGoalChip: () => mockChip }));

const briefing: BriefingDTO = {
  id: "b1",
  date_local: "2026-09-23",
  summary: "Ayer vendiste $ 2,1 M; el martes rinde más.",
  highlights: [],
  proposal_ids: [],
  created_at: "2026-09-23T13:00:00.000Z",
};

function renderHero(overrides: Partial<Parameters<typeof BriefingHero>[0]> = {}) {
  return render(
    <BriefingHero
      briefing={briefing}
      loading={false}
      error={null}
      onRetry={jest.fn()}
      briefingHour={7}
      ownerName="Ana"
      proposalCount={2}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  mockChip = null;
});

describe("BriefingHero · chip de la meta (F7)", () => {
  it("con meta pinta «Meta · N %» y enlaza a la ruta del mes", () => {
    mockChip = { pct: 41, href: "/comercial" };
    renderHero();
    const chip = screen.getByRole("link", { name: /Meta/ });
    expect(chip).toHaveTextContent("Meta · 41 %");
    expect(chip).toHaveAttribute("href", "/comercial");
  });

  it("sin meta (el hook devuelve null) no pinta el chip", () => {
    renderHero();
    expect(screen.queryByRole("link", { name: /Meta/ })).toBeNull();
    expect(screen.getByText(/por decidir/)).toBeInTheDocument();
  });

  it("sin briefing (primer contacto) no pinta el chip aunque haya meta", () => {
    mockChip = { pct: 41, href: "/comercial" };
    renderHero({ briefing: null });
    expect(screen.queryByRole("link", { name: /Meta/ })).toBeNull();
  });
});
