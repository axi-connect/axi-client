import { render, screen } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { ProposalCard } from "../components/ProposalCard";

function proposal(patch: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: "p1",
    kind: "recovery",
    status: "pending",
    source: "chat",
    title: "Recuperar carritos",
    headline: "$1.000.000 en juego",
    rationale: "Motivo.",
    evidence: [],
    risks: [],
    artifacts: [],
    expires_at: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-09-22T14:00:00.000Z",
    ...patch,
  };
}

describe("ProposalCard", () => {
  it("la de Axel enlaza a su detalle en /cmo", () => {
    render(<ProposalCard proposal={proposal()} />);
    expect(screen.getByRole("link", { name: /Revisar/ })).toHaveAttribute("href", "/cmo/proposals/p1");
  });

  it("la del método comercial se decide en /comercial, con su tipo nombrado", () => {
    render(<ProposalCard proposal={proposal({ kind: "goal_pace", source: "commercial" })} />);
    expect(screen.getByRole("link", { name: /Revisar/ })).toHaveAttribute("href", "/comercial/acciones/p1");
    expect(screen.getByText("Ritmo de la meta")).toBeInTheDocument();
  });

  it("también en el rail compacto, y un href explícito manda", () => {
    const { rerender } = render(<ProposalCard proposal={proposal({ kind: "goal_pace", source: "commercial" })} compact />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/comercial/acciones/p1");
    rerender(<ProposalCard proposal={proposal()} href="/otra" compact />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/otra");
  });
});
