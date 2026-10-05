import { useCmoStore } from "../cmo.store";

/**
 * island-live F4: el titular del informe y el nombre de cada propuesta llegaban
 * por socket y se tiraban. Ahora quedan como novedades para la isla.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  listProposals: jest.fn(() => Promise.resolve([])),
  getLatestBriefing: jest.fn(() => Promise.resolve(null)),
}));

const briefing = (id: string, proposals_created = 3) => ({
  company_id: "c1",
  briefing_id: id,
  date_local: "2026-10-05",
  proposals_created,
  headline: "La semana cerró mejor que la anterior.",
});

const proposal = (id: string, source: "briefing" | "signal" | "chat" = "signal") => ({
  company_id: "c1",
  proposal_id: id,
  kind: "campaign",
  title: "Subir el presupuesto del fin de semana",
  source,
  expires_at: null,
});

beforeEach(() => {
  useCmoStore.setState({ news: [], unseen: 0 });
});

describe("cmo.store — novedades para la isla", () => {
  it("el informe deja su novedad con cuántas propuestas trae; sin propuestas, su titular", () => {
    useCmoStore.getState().onBriefingReady(briefing("b1"));
    useCmoStore.getState().noteBriefingReady(briefing("b2", 0));
    expect(useCmoStore.getState().news).toEqual([
      { id: "briefing-b1", kind: "briefing", title: "Llegó tu informe de hoy", body: "3 propuestas por decidir", proposal_id: null },
      {
        id: "briefing-b2",
        kind: "briefing",
        title: "Llegó tu informe de hoy",
        body: "La semana cerró mejor que la anterior.",
        proposal_id: null,
      },
    ]);
  });

  it("una propuesta nueva se anota con su nombre; la nacida en el chat no (ya se ve en el hilo)", () => {
    useCmoStore.getState().onProposalCreated(proposal("p1"));
    useCmoStore.getState().onProposalCreated(proposal("p2", "chat"));
    expect(useCmoStore.getState().news.map((item) => item.id)).toEqual(["proposal-p1"]);
    expect(useCmoStore.getState().news[0]?.body).toBe("Subir el presupuesto del fin de semana");
    // El contador del tablero sigue contando las dos.
    expect(useCmoStore.getState().unseen).toBe(2);
  });

  it("un evento reentregado tras reconectar no cuenta dos veces, y hay tope", () => {
    for (let index = 0; index < 8; index += 1) useCmoStore.getState().noteProposalCreated(proposal(`p${String(index)}`));
    useCmoStore.getState().noteProposalCreated(proposal("p7"));
    expect(useCmoStore.getState().news).toHaveLength(5);
    expect(useCmoStore.getState().news.at(-1)?.id).toBe("proposal-p7");
  });

  it("la isla la toma y sale de la lista; tomar lo que no está no cambia nada", () => {
    useCmoStore.getState().noteProposalCreated(proposal("p1"));
    useCmoStore.getState().takeNews("proposal-p1");
    expect(useCmoStore.getState().news).toEqual([]);
    const before = useCmoStore.getState().news;
    useCmoStore.getState().takeNews("nada");
    expect(useCmoStore.getState().news).toBe(before);
  });
});
