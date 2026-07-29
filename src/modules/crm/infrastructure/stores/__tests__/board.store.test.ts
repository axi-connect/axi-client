import type { DealDTO } from "@/modules/crm/domain/deal";
import { useBoardStore } from "../board.store";
import {
  getDeal,
  getDealStats,
  listDeals,
  moveDeal as moveDealRequest,
  winDeal,
} from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { getBoard, listPipelines } from "@/modules/crm/infrastructure/services/pipelines-service.adapter";

jest.mock("@/modules/crm/infrastructure/services/deals-service.adapter");
jest.mock("@/modules/crm/infrastructure/services/pipelines-service.adapter");

const mockedMove = moveDealRequest as jest.MockedFunction<typeof moveDealRequest>;
const mockedWin = winDeal as jest.MockedFunction<typeof winDeal>;
const mockedGetDeal = getDeal as jest.MockedFunction<typeof getDeal>;
const mockedStats = getDealStats as jest.MockedFunction<typeof getDealStats>;
const mockedListDeals = listDeals as jest.MockedFunction<typeof listDeals>;
const mockedBoard = getBoard as jest.MockedFunction<typeof getBoard>;
const mockedPipelines = listPipelines as jest.MockedFunction<typeof listPipelines>;

const STAGE_A = "stage-a";
const STAGE_B = "stage-b";
const PIPELINE = "pipeline-1";

function makeDeal(overrides: Partial<DealDTO> = {}): DealDTO {
  return {
    id: "deal-1",
    contact_id: "contact-1",
    pipeline_id: PIPELINE,
    stage_id: STAGE_A,
    title: "Plan anual",
    value_cents: 350_000_00,
    currency: "COP",
    status: "open",
    won_at: null,
    lost_at: null,
    lost_reason: null,
    owner_user_id: null,
    conversation_id: null,
    order_id: null,
    expected_close_date: null,
    stage_entered_at: "2026-07-28T10:00:00.000Z",
    notes: null,
    source: "manual",
    created_by_type: "user",
    contact: { id: "contact-1", full_name: "Carlos", phone: null, avatar_url: null },
    stage: { id: STAGE_A, name: "Nuevo", color: null, probability_pct: 10 },
    created_at: "2026-07-28T10:00:00.000Z",
    updated_at: "2026-07-28T10:00:00.000Z",
    ...overrides,
  } as DealDTO;
}

function seedBoard(deal: DealDTO) {
  useBoardStore.setState({
    pipelineId: PIPELINE,
    dealsById: { [deal.id]: deal },
    stageOrder: [STAGE_A, STAGE_B],
    columns: {
      [STAGE_A]: {
        ids: [deal.id],
        total: 1,
        total_value_cents: deal.value_cents ?? 0,
        loading: false,
        hasMore: false,
        error: null,
      },
      [STAGE_B]: {
        ids: [],
        total: 0,
        total_value_cents: 0,
        loading: false,
        hasMore: false,
        error: null,
      },
    },
    boardLoaded: true,
    realtimeVersion: 0,
    highlightId: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedStats.mockResolvedValue({} as never);
  useBoardStore.setState({
    dealsById: {},
    columns: {},
    stageOrder: [],
    pipelineId: null,
    pipelines: [],
    boardLoaded: false,
    boardError: null,
    realtimeVersion: 0,
    highlightId: null,
  });
});

describe("board.store — moveDeal optimista", () => {
  it("mueve el id entre columnas y ajusta los totales de valor", async () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedMove.mockResolvedValue({ ...deal, stage_id: STAGE_B });

    const result = await useBoardStore.getState().moveDeal(deal.id, STAGE_B);

    expect(result.ok).toBe(true);
    const { columns } = useBoardStore.getState();
    expect(columns[STAGE_A].ids).toHaveLength(0);
    expect(columns[STAGE_A].total_value_cents).toBe(0);
    expect(columns[STAGE_B].ids).toEqual([deal.id]);
    expect(columns[STAGE_B].total_value_cents).toBe(deal.value_cents);
    expect(mockedMove).toHaveBeenCalledWith(deal.id, STAGE_B);
  });

  it("revierte el estado ante un 409 y devuelve el mensaje mapeado", async () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedMove.mockRejectedValue(new Error("boom"));

    const result = await useBoardStore.getState().moveDeal(deal.id, STAGE_B);

    expect(result.ok).toBe(false);
    const { columns, dealsById } = useBoardStore.getState();
    expect(columns[STAGE_A].ids).toEqual([deal.id]);
    expect(columns[STAGE_B].ids).toHaveLength(0);
    expect(dealsById[deal.id].stage_id).toBe(STAGE_A);
  });

  it("mover a la misma etapa es un no-op sin request", async () => {
    const deal = makeDeal();
    seedBoard(deal);

    const result = await useBoardStore.getState().moveDeal(deal.id, STAGE_A);

    expect(result.ok).toBe(true);
    expect(mockedMove).not.toHaveBeenCalled();
  });
});

describe("board.store — transiciones win/lose/reopen", () => {
  it("win saca la tarjeta del board (won no es columna)", async () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedWin.mockResolvedValue({ ...deal, status: "won" });

    const result = await useBoardStore.getState().transition(deal.id, "win", {});

    expect(result.ok).toBe(true);
    const { columns, dealsById } = useBoardStore.getState();
    expect(columns[STAGE_A].ids).toHaveLength(0);
    expect(dealsById[deal.id].status).toBe("won");
  });

  it("un win fallido restaura la tarjeta en su columna", async () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedWin.mockRejectedValue(new Error("boom"));

    const result = await useBoardStore.getState().transition(deal.id, "win", {});

    expect(result.ok).toBe(false);
    const { columns, dealsById } = useBoardStore.getState();
    expect(columns[STAGE_A].ids).toEqual([deal.id]);
    expect(dealsById[deal.id].status).toBe("open");
  });
});

describe("board.store — reducers WS", () => {
  it("deal_created de otro pipeline solo suma realtimeVersion", () => {
    const deal = makeDeal();
    seedBoard(deal);

    useBoardStore.getState().onDealCreated({
      company_id: "c",
      deal_id: "deal-2",
      contact_id: "contact-2",
      pipeline_id: "otro-pipeline",
      stage_id: STAGE_A,
      title: "Otro",
      status: "open",
      value_cents: null,
      currency: "COP",
      owner_user_id: null,
      conversation_id: null,
      order_id: null,
      source: "ai_conversation",
      created_by_type: "ai_agent",
    });

    const state = useBoardStore.getState();
    expect(state.realtimeVersion).toBe(1);
    expect(state.dealsById["deal-2"]).toBeUndefined();
    expect(mockedGetDeal).not.toHaveBeenCalled();
  });

  it("deal_created del pipeline activo hidrata por REST y marca highlight", () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedGetDeal.mockResolvedValue(makeDeal({ id: "deal-2" }));

    useBoardStore.getState().onDealCreated({
      company_id: "c",
      deal_id: "deal-2",
      contact_id: "contact-2",
      pipeline_id: PIPELINE,
      stage_id: STAGE_A,
      title: "Nuevo por IA",
      status: "open",
      value_cents: null,
      currency: "COP",
      owner_user_id: null,
      conversation_id: null,
      order_id: null,
      source: "ai_conversation",
      created_by_type: "ai_agent",
    });

    expect(useBoardStore.getState().highlightId).toBe("deal-2");
    expect(mockedGetDeal).toHaveBeenCalledWith("deal-2");
  });

  it("deal_won retira la tarjeta y deja el status won (dedupe seguro)", () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedGetDeal.mockResolvedValue(deal);

    const event = {
      company_id: "c",
      deal_id: deal.id,
      contact_id: deal.contact_id,
      pipeline_id: PIPELINE,
      stage_id: STAGE_A,
      title: deal.title,
      status: "won" as const,
      value_cents: deal.value_cents,
      currency: "COP",
      owner_user_id: null,
      conversation_id: null,
      order_id: null,
      source: "manual" as const,
      created_by_type: "user" as const,
    };
    useBoardStore.getState().onDealWon(event);
    useBoardStore.getState().onDealWon(event); // repetido tras re-join

    const state = useBoardStore.getState();
    expect(state.columns[STAGE_A].ids).toHaveLength(0);
    expect(state.columns[STAGE_A].total).toBe(0);
    expect(state.dealsById[deal.id].status).toBe("won");
    expect(state.realtimeVersion).toBe(2);
  });
});

describe("board.store — init y fetchColumn", () => {
  it("init resuelve el pipeline default y carga board + stats", async () => {
    mockedPipelines.mockResolvedValue([
      { id: "p-x", name: "Otro", is_default: false, position: 1, stages: [], created_at: "", updated_at: "" },
      { id: PIPELINE, name: "Ventas", is_default: true, position: 0, stages: [], created_at: "", updated_at: "" },
    ] as never);
    mockedBoard.mockResolvedValue({ pipeline_id: PIPELINE, pipeline_name: "Ventas", columns: [] } as never);

    await useBoardStore.getState().init();

    expect(useBoardStore.getState().pipelineId).toBe(PIPELINE);
    expect(mockedBoard).toHaveBeenCalledWith(PIPELINE);
    expect(mockedStats).toHaveBeenCalled();
  });

  it("fetchColumn pagina con dedupe de ids", async () => {
    const deal = makeDeal();
    seedBoard(deal);
    mockedListDeals.mockResolvedValue({
      data: [deal, makeDeal({ id: "deal-2" })],
      meta: { total: 3, page: 2, page_size: 25 },
    } as never);

    await useBoardStore.getState().fetchColumn(STAGE_A, 2);

    const column = useBoardStore.getState().columns[STAGE_A];
    expect(column.ids).toEqual([deal.id, "deal-2"]);
    expect(column.total).toBe(3);
    expect(column.hasMore).toBe(true);
  });
});
