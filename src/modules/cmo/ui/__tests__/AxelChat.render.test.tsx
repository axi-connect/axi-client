import { act, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelChat } from "../components/AxelChat";

/**
 * El presupuesto de rendimiento del despacho (plan de asistentes premium, F1):
 * un fragmento del streaming repinta SOLO el borrador. Antes `AxelChat`
 * suscribía `live` entero y cada fragmento repintaba el hero, todas las
 * burbujas y las tarjetas. Se mide con el store REAL: un mock estático no
 * dispara suscripciones y daría un falso verde.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  sendMessage: jest.fn(),
  listThreads: jest.fn(),
  createThread: jest.fn(),
  getTranscript: jest.fn(),
  listProposals: jest.fn(),
  getProposal: jest.fn(),
  approveProposal: jest.fn(),
  rejectProposal: jest.fn(),
  getCmoSettings: jest.fn(),
  getLatestBriefing: jest.fn(),
}));

jest.mock("@/modules/commercial/public", () => ({
  useGoalChip: () => null,
  isCommercialProposal: () => false,
  commercialProposalHref: (id: string) => `/comercial/acciones/${id}`,
}));

// Dobles que CUENTAN renders de lo que ya está asentado en el hilo.
const userRenders = jest.fn();
const cardRenders = jest.fn();
jest.mock("@/shared/components/features/assistant", () => {
  const actual = jest.requireActual<typeof import("@/shared/components/features/assistant")>(
    "@/shared/components/features/assistant",
  );
  return {
    ...actual,
    UserBubble: (props: ComponentProps<typeof actual.UserBubble>) => {
      userRenders();
      return <actual.UserBubble {...props} />;
    },
  };
});
jest.mock("../components/ProposalCard", () => {
  const actual = jest.requireActual<typeof import("../components/ProposalCard")>("../components/ProposalCard");
  const { memo } = jest.requireActual<typeof import("react")>("react");
  return {
    ProposalCard: memo((props: ComponentProps<typeof actual.ProposalCard>) => {
      cardRenders();
      return <actual.ProposalCard {...props} />;
    }),
  };
});

function message(over: Partial<UiMessage>): UiMessage {
  return {
    id: "m1",
    role: "axel",
    body: "Listo.",
    created_at: "2026-09-28T14:00:00.000Z",
    tool_calls: null,
    proposal_id: null,
    question: null,
    ...over,
  };
}

const proposal = {
  id: "prop-1",
  kind: "recovery",
  status: "pending",
  source: "chat",
  title: "Recupera a 37 clientes",
  headline: "≈ $2,1 M",
  rationale: "Llevan 45 días sin volver.",
  evidence: [],
  risks: [],
  artifacts: [],
  expires_at: null,
  decided_at: null,
  reject_reason: null,
  created_at: "2026-09-28T14:00:00.000Z",
} as ProposalDTO;

const initial = useCmoStore.getState();

beforeEach(() => {
  userRenders.mockClear();
  cardRenders.mockClear();
  useCmoStore.setState(
    {
      ...initial,
      thread: {
        id: "t1",
        thinking: true,
        messages: [
          message({ id: "local-1", role: "owner", body: "Ármame algo" }),
          message({ id: "local-2", body: "Te dejé una recuperación.", proposal_id: "prop-1" }),
          message({ id: "local-3", role: "owner", body: "¿Y los clientes calientes?" }),
        ],
      },
      live: { turn_id: "turn-1", iteration: 0, text: "Tus", steps: [], seq: 1 },
      blocker: null,
      unseen: 0,
      settled: {},
    },
    true,
  );
});

function mount() {
  return render(
    <AxelChat
      ownerName="Marta"
      briefing={null}
      briefingLoading={false}
      briefingError={null}
      onRetryBriefing={() => undefined}
      briefingHour={8}
      proposals={[proposal]}
      blocked={null}
      canManage
    />,
  );
}

describe("AxelChat · rendimiento del streaming", () => {
  it("20 fragmentos no repintan las burbujas asentadas ni la tarjeta; el borrador sí crece", () => {
    mount();
    const usersAtMount = userRenders.mock.calls.length;
    const cardsAtMount = cardRenders.mock.calls.length;
    expect(usersAtMount).toBe(2);
    expect(cardsAtMount).toBe(1);

    act(() => {
      for (let seq = 2; seq <= 21; seq += 1) {
        const live = useCmoStore.getState().live;
        if (live === null) throw new Error("sin turno");
        useCmoStore.setState({ live: { ...live, seq, text: `${live.text} palabra` } });
      }
    });

    expect(userRenders.mock.calls.length).toBe(usersAtMount);
    expect(cardRenders.mock.calls.length).toBe(cardsAtMount);
    expect(screen.getByText(/Tus( palabra){20}/)).toBeInTheDocument();
  });
});
