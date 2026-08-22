import { render, screen, within } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import type { UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelChat } from "../components/AxelChat";

/**
 * Lo que se prueba aquí es DÓNDE aterriza la propuesta que Axel arma dentro de
 * la conversación. No es una preferencia estética: la tarjeta se pintaba al
 * principio del hilo, así que con veinte mensajes de charla el dueño no la veía
 * — y es lo único que hay que decidir.
 */

const mockState = {
  thread: { id: "t1", messages: [] as UiMessage[], thinking: false },
  settled: {} as Record<string, ProposalDTO | null>,
  resolveSettled: jest.fn(),
  ask: jest.fn(),
  retryLast: jest.fn(),
  newThread: jest.fn(),
};

jest.mock("@/modules/cmo/infrastructure/stores/cmo.store", () => ({
  useCmoStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

function message(over: Partial<UiMessage>): UiMessage {
  return {
    id: "m1",
    role: "axel",
    body: "Listo: te dejé armada y apagada la recuperación de carritos.",
    created_at: "2026-08-22T14:00:00.000Z",
    tool_calls: null,
    proposal_id: null,
    ...over,
  };
}

function proposal(over: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: "prop-1",
    kind: "recovery",
    status: "pending",
    source: "chat",
    title: "Persigue los 22 carritos con urgencia real",
    headline: "$8.129.000 en juego",
    rationale: "Hay 22 carritos abiertos y ninguna regla que los persiga.",
    evidence: [],
    risks: [],
    artifacts: [],
    expires_at: "2026-08-25T14:00:00.000Z",
    created_at: "2026-08-22T14:00:00.000Z",
    ...over,
  } as ProposalDTO;
}

function view(
  over: {
    messages?: UiMessage[];
    proposals?: ProposalDTO[];
    settled?: Record<string, ProposalDTO | null>;
  } = {},
) {
  mockState.thread = { id: "t1", messages: over.messages ?? [], thinking: false };
  mockState.settled = over.settled ?? {};
  return render(
    <AxelChat
      ownerName="Owner"
      briefing={null}
      briefingLoading={false}
      briefingHour={16}
      proposals={over.proposals ?? []}
      blocked={null}
      canManage
    />,
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("la propuesta que nace en la conversación", () => {
  it("se pinta DESPUÉS del mensaje que la anuncia, no al principio del hilo", () => {
    const { container } = view({
      messages: [
        message({ id: "local-1", role: "owner", body: "Ármame algo", proposal_id: null }),
        message({ id: "local-2", proposal_id: "prop-1" }),
      ],
      proposals: [proposal()],
    });

    const card = screen.getByRole("article");
    expect(within(card).getByText("Persigue los 22 carritos con urgencia real")).toBeInTheDocument();

    // El orden en el DOM es el orden de lectura: primero el mensaje, luego la
    // tarjeta. `compareDocumentPosition` lo comprueba sin depender del layout.
    const bubble = screen.getByText(/te dejé armada y apagada/);
    expect(bubble.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Y no se repite arriba: una sola tarjeta en toda la pantalla.
    expect(container.querySelectorAll("article")).toHaveLength(1);
  });

  it("recién llegada se anuncia con el cometa; rehidratada del historial, no", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [proposal()],
    });
    expect(screen.getByRole("article").className).toContain("axel-comet-card--new");

    view({
      // Un id de servidor significa que el mensaje viene del transcript: la
      // propuesta ya se anunció en su momento y volver a hacerlo sería ruido.
      messages: [message({ id: "9f1b0c22-0000-4000-8000-000000000000", proposal_id: "prop-1" })],
      proposals: [proposal()],
    });
    expect(screen.getAllByRole("article")[1]?.className).not.toContain("axel-comet-card--new");
  });

  it("una vez decidida se queda en el hilo, con su estado y sin pedir decisión", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      // El tablero solo lista lo que falta decidir: la aprobada llega por `settled`.
      proposals: [],
      settled: { "prop-1": proposal({ status: "approved" }) },
    });

    const card = screen.getByRole("article");
    expect(within(card).getByText("Aprobada")).toBeInTheDocument();
    expect(within(card).getByText("Ver qué quedó")).toBeInTheDocument();
    expect(within(card).queryByText("Revisar")).not.toBeInTheDocument();
    // Baja de tono: el violeta queda para lo que sí falta decidir.
    expect(card.className).toContain("bg-secondary/40");
    expect(card.className).not.toContain("axel-comet-card--new");
  });

  it("la que ya no está no deja tarjeta ni la vuelve a pedir", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [],
      settled: { "prop-1": null },
    });

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(mockState.resolveSettled).not.toHaveBeenCalled();
  });

  it("pide la que falta una sola vez", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [],
      settled: {},
    });

    expect(mockState.resolveSettled).toHaveBeenCalledTimes(1);
    expect(mockState.resolveSettled).toHaveBeenCalledWith("prop-1");
  });

  it("la del informe del día sigue arriba: no nació de ningún mensaje", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: null })],
      proposals: [proposal({ id: "prop-9", source: "briefing" })],
    });

    const card = screen.getByRole("article");
    const bubble = screen.getByText(/te dejé armada y apagada/);
    expect(card.compareDocumentPosition(bubble) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
