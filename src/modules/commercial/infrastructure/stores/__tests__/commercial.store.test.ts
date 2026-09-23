const mockGet = jest.fn<Promise<unknown>, [string, unknown?, { signal?: AbortSignal }?]>();
const mockPut = jest.fn<Promise<unknown>, [string, unknown?]>();
const mockPost = jest.fn<Promise<unknown>, [string, unknown?]>();
jest.mock("@/core/services/http", () => ({
  http: {
    get: (path: string, params?: unknown, options?: { signal?: AbortSignal }) => mockGet(path, params, options),
    put: (path: string, body?: unknown) => mockPut(path, body),
    post: (path: string, body?: unknown) => mockPost(path, body),
  },
}));

import { HttpError } from "@/core/api/problem";
import type { CommercialGoalDTO, CommercialProposalDTO, GoalResponseDTO } from "@/modules/commercial/domain/commercial";
import { resetCommercialStore, useCommercialStore } from "../commercial.store";

const goal: CommercialGoalDTO = {
  id: "g1",
  period_kind: "month",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  currency: "COP",
  target_revenue_cents: 3_000_000_000,
  declared_avg_ticket_cents: null,
  declared_close_rate_pct: null,
  declared_last_month_revenue_cents: null,
  declared_max_attempts: null,
  declared_decision_days: null,
  source: "owner",
  created_at: "2026-09-01T13:00:00Z",
  updated_at: "2026-09-01T13:00:00Z",
};

const withGoal: GoalResponseDTO = {
  goal,
  seed: {
    last_month_revenue_cents: 2_210_000_000,
    last_month_sales: 31,
    last_month_avg_ticket_cents: 71_300_000,
    suggested_target_cents: 2_540_000_000,
    source: "history",
    niche_label: "clínicas estéticas",
  },
};

/** Responde según la ruta, para que las tres peticiones de `load` se distingan. */
function serve(routes: Record<string, unknown>): void {
  mockGet.mockImplementation((path) => {
    const hit = routes[path];
    if (hit instanceof Error) return Promise.reject(hit);
    if (hit === undefined) return Promise.reject(new Error(`sin ruta ${path}`));
    return Promise.resolve(hit);
  });
}

beforeEach(() => {
  resetCommercialStore();
  mockGet.mockReset();
  mockPut.mockReset();
  mockPost.mockReset();
});

describe("load", () => {
  it("con meta pide plan y ritmo; cada sección queda lista por su cuenta", async () => {
    serve({ "/commercial/goal": withGoal, "/commercial/plan": { status: "ready" }, "/commercial/pace": { status: "behind" } });

    await useCommercialStore.getState().load();

    const state = useCommercialStore.getState();
    expect(state.goal.status).toBe("ready");
    expect(state.plan.data).toEqual({ status: "ready" });
    expect(state.pace.data).toEqual({ status: "behind" });
    expect(mockGet).toHaveBeenCalledWith("/commercial/pace", { granularity: "day" }, undefined);
  });

  it("sin meta no pide plan ni ritmo: serían dos 404", async () => {
    serve({ "/commercial/goal": { ...withGoal, goal: null } });

    await useCommercialStore.getState().load();

    const state = useCommercialStore.getState();
    expect(state.goal.data?.goal).toBeNull();
    expect(state.plan.status).toBe("idle");
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("un fallo del ritmo no tumba el plan", async () => {
    serve({ "/commercial/goal": withGoal, "/commercial/plan": { status: "ready" }, "/commercial/pace": new Error("red") });

    await useCommercialStore.getState().load();

    const state = useCommercialStore.getState();
    expect(state.plan.status).toBe("ready");
    expect(state.pace.status).toBe("error");
    expect(state.pace.error).not.toBeNull();
  });

  it("el 403 de capacidad es un bloqueo, no un error", async () => {
    serve({
      "/commercial/goal": new HttpError({ status: 403, code: "entitlements/capability_not_granted", message: "no" }),
    });

    await useCommercialStore.getState().load();

    const state = useCommercialStore.getState();
    expect(state.blocker).toBe("no_plan");
    expect(state.goal.status).toBe("ready");
    expect(state.goal.error).toBeNull();
  });

  it("otro 403 (permiso) sí es un error con mensaje", async () => {
    serve({ "/commercial/goal": new HttpError({ status: 403, code: "rbac/permission_denied", message: "no" }) });

    await useCommercialStore.getState().load();

    expect(useCommercialStore.getState().blocker).toBeNull();
    expect(useCommercialStore.getState().goal.status).toBe("error");
  });

  it("el refetch conserva los datos: atenúa, no vacía", async () => {
    serve({ "/commercial/goal": withGoal, "/commercial/plan": { status: "ready" }, "/commercial/pace": { status: "behind" } });
    await useCommercialStore.getState().load();

    let release: (value: unknown) => void = () => {};
    mockGet.mockImplementation((path) =>
      path === "/commercial/goal"
        ? new Promise((resolve) => { release = resolve; })
        : Promise.resolve({ status: "ready" }),
    );
    const pending = useCommercialStore.getState().load();

    const during = useCommercialStore.getState();
    expect(during.goal.status).toBe("loading");
    expect(during.goal.data).toEqual(withGoal);
    expect(during.pace.data).toEqual({ status: "behind" });

    release(withGoal);
    await pending;
  });
});

describe("carrera entre cargas", () => {
  it("una respuesta vieja de goal no pisa a la nueva", async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    mockGet.mockImplementation((path) =>
      path === "/commercial/goal" ? new Promise((resolve) => { resolvers.push(resolve); }) : Promise.resolve({}),
    );
    const first = useCommercialStore.getState().load();
    const second = useCommercialStore.getState().load();
    resolvers[1]({ ...withGoal, goal: null });
    await second;
    resolvers[0](withGoal);
    await first;

    expect(useCommercialStore.getState().goal.data?.goal).toBeNull();
    // La respuesta vieja tampoco dispara plan/ritmo.
    expect(mockGet.mock.calls.filter(([path]) => path === "/commercial/pace")).toHaveLength(0);
  });

  it("guardar la meta y montar la vista a la vez: gana el ritmo más nuevo", async () => {
    serve({ "/commercial/goal": { ...withGoal, goal: null } });
    await useCommercialStore.getState().load();
    const paceResolvers: Array<(value: unknown) => void> = [];
    mockGet.mockImplementation((path) => {
      if (path === "/commercial/pace") return new Promise((resolve) => { paceResolvers.push(resolve); });
      if (path === "/commercial/goal") return Promise.resolve(withGoal);
      return Promise.resolve({});
    });
    mockPut.mockResolvedValue(goal);

    await useCommercialStore.getState().saveGoal({ target_revenue_cents: 1 }); // encola pace #1
    const reload = useCommercialStore.getState().load(); // encola pace #2
    await Promise.resolve();
    paceResolvers[1]({ status: "new" });
    paceResolvers[0]({ status: "old" });
    await reload;
    await Promise.resolve();

    expect(useCommercialStore.getState().pace.data).toEqual({ status: "new" });
  });
});

describe("previewPlan", () => {
  it("aborta la vista previa anterior al llegar la siguiente cifra", async () => {
    const signals: AbortSignal[] = [];
    mockGet.mockImplementation((_path, _params, options) => {
      signals.push(options?.signal as AbortSignal);
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });

    const first = useCommercialStore.getState().previewPlan({ target_revenue_cents: 1 });
    const second = useCommercialStore.getState().previewPlan({ target_revenue_cents: 2 });

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    await first;
    // Un aborto propio no es un error de la pantalla.
    expect(useCommercialStore.getState().preview.status).toBe("loading");

    useCommercialStore.getState().cancelPreview();
    await second;
    expect(useCommercialStore.getState().preview.status).toBe("idle");
    expect(mockGet).toHaveBeenLastCalledWith(
      "/commercial/plan/preview",
      { target_cents: 2, avg_ticket_cents: undefined, close_rate_pct: undefined },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("una respuesta tardía de una cifra vieja no pisa la nueva", async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    mockGet.mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve); }));

    const first = useCommercialStore.getState().previewPlan({ target_revenue_cents: 1 });
    const second = useCommercialStore.getState().previewPlan({ target_revenue_cents: 2 });
    resolvers[1]({ goal_target_cents: 2 });
    await second;
    resolvers[0]({ goal_target_cents: 1 });
    await first;

    expect(useCommercialStore.getState().preview.data).toEqual({ goal_target_cents: 2 });
  });
});

describe("saveGoal", () => {
  it("guarda, deja la meta lista y recarga plan y ritmo", async () => {
    serve({ "/commercial/goal": { ...withGoal, goal: null } });
    await useCommercialStore.getState().load();
    mockPut.mockResolvedValue(goal);
    serve({ "/commercial/plan": { status: "ready" }, "/commercial/pace": { status: "on_track" } });

    const saved = await useCommercialStore.getState().saveGoal({ target_revenue_cents: 3_000_000_000 });
    await Promise.resolve();
    await Promise.resolve();

    expect(saved).toEqual(goal);
    expect(mockPut).toHaveBeenCalledWith("/commercial/goal", { target_revenue_cents: 3_000_000_000 });
    const state = useCommercialStore.getState();
    expect(state.goal.data?.goal).toEqual(goal);
    expect(state.goal.data?.seed?.source).toBe("history");
    expect(state.saving).toBe(false);
    expect(mockGet).toHaveBeenCalledWith("/commercial/plan", undefined, undefined);
  });

  it("si falla, lanza al llamador y no toca la meta", async () => {
    mockPut.mockRejectedValue(new Error("validación"));
    await expect(useCommercialStore.getState().saveGoal({ target_revenue_cents: 0 })).rejects.toThrow("validación");
    expect(useCommercialStore.getState().goal.status).toBe("idle");
    expect(useCommercialStore.getState().saving).toBe(false);
  });
});

function proposalRow(id: string, patch: Partial<CommercialProposalDTO> = {}): CommercialProposalDTO {
  return {
    id,
    kind: "goal_pace",
    status: "pending",
    title: `Propuesta ${id}`,
    headline: null,
    rationale: "Motivo.",
    evidence: [],
    risks: [],
    artifacts: [],
    source: "commercial",
    expires_at: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-09-20T12:00:00.000Z",
    target_key_result: "sales",
    estimated_sales: 2,
    covers_pct: 20,
    basis: null,
    ...patch,
  };
}

/** `/commercial/proposals` responde según `?status=`; el resto, por ruta. */
function serveProposals(byStatus: Record<string, CommercialProposalDTO[] | Promise<unknown>>, routes: Record<string, unknown> = {}): void {
  mockGet.mockImplementation((path, params) => {
    if (path === "/commercial/proposals") {
      const status = (params as { status: string }).status;
      const hit = byStatus[status];
      return hit instanceof Promise ? hit : Promise.resolve({ data: hit ?? [] });
    }
    const hit = routes[path];
    return hit === undefined ? Promise.reject(new Error(`sin ruta ${path}`)) : Promise.resolve(hit);
  });
}

describe("propuestas", () => {
  it("pendientes primero y detrás solo las aprobadas del mes de la meta", async () => {
    useCommercialStore.setState({ goal: { status: "ready", data: withGoal, error: null } });
    serveProposals({
      pending: [proposalRow("p1")],
      approved: [
        proposalRow("a1", { status: "approved", decided_at: "2026-09-16T15:00:00.000Z" }),
        proposalRow("a0", { status: "approved", decided_at: "2026-08-28T15:00:00.000Z" }),
      ],
    });

    await useCommercialStore.getState().loadProposals();

    expect(useCommercialStore.getState().proposals.data?.map((row) => row.id)).toEqual(["p1", "a1"]);
    expect(mockGet).toHaveBeenCalledWith("/commercial/proposals", { status: "pending" }, undefined);
    expect(mockGet).toHaveBeenCalledWith("/commercial/proposals", { status: "approved" }, undefined);
  });

  it("una carga vieja no pisa a la nueva (número de secuencia)", async () => {
    let releaseOld: (value: unknown) => void = () => {};
    const old = new Promise((resolve) => {
      releaseOld = resolve;
    });
    serveProposals({ pending: old, approved: [] });
    const first = useCommercialStore.getState().loadProposals();
    serveProposals({ pending: [proposalRow("new")], approved: [] });
    await useCommercialStore.getState().loadProposals();
    releaseOld({ data: [proposalRow("old")] });
    await first;

    expect(useCommercialStore.getState().proposals.data?.map((row) => row.id)).toEqual(["new"]);
  });

  it("aprobar guarda el resultado, marca la fila y recarga plan y ritmo", async () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: withGoal, error: null },
      proposals: { status: "ready", data: [proposalRow("p1")], error: null },
    });
    const result = { applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "10 programados" }], failed: [] };
    mockPost.mockResolvedValue(result);
    serveProposals({}, { "/commercial/plan": { status: "ready" }, "/commercial/pace": { status: "on_track" } });

    await expect(useCommercialStore.getState().approveProposal("p1")).resolves.toEqual(result);

    const state = useCommercialStore.getState();
    expect(mockPost).toHaveBeenCalledWith("/commercial/proposals/p1/approve", undefined);
    expect(state.approvals.p1).toEqual(result);
    expect(state.proposals.data?.[0].status).toBe("approved");
    await Promise.resolve();
    expect(mockGet).toHaveBeenCalledWith("/commercial/pace", { granularity: "day" }, undefined);
  });

  it("una carga que salió antes de aprobar no resucita la fila pendiente", async () => {
    useCommercialStore.setState({ goal: { status: "ready", data: withGoal, error: null } });
    let release: (value: unknown) => void = () => {};
    serveProposals(
      { pending: new Promise((resolve) => { release = resolve; }), approved: [] },
      { "/commercial/plan": {}, "/commercial/pace": {} },
    );
    const loading = useCommercialStore.getState().loadProposals();
    mockPost.mockResolvedValue({ applied: [], failed: [] });
    await useCommercialStore.getState().approveProposal("p1");
    release({ data: [proposalRow("p1")] });
    await loading;

    const state = useCommercialStore.getState();
    expect(state.proposals.status).toBe("ready");
    expect(state.proposals.data?.[0].status).toBe("approved");
  });

  it("rechazar manda el motivo y saca la fila de la lista", async () => {
    useCommercialStore.setState({ proposals: { status: "ready", data: [proposalRow("p1"), proposalRow("p2")], error: null } });
    mockPost.mockResolvedValue({ directive_created: false });

    await useCommercialStore.getState().rejectProposal("p1", "Es pronto para volver a escribirles.");

    expect(mockPost).toHaveBeenCalledWith("/commercial/proposals/p1/reject", { reason: "Es pronto para volver a escribirles." });
    expect(useCommercialStore.getState().proposals.data?.map((row) => row.id)).toEqual(["p2"]);
  });

  it("aprobar que falla lanza al llamador y no toca la lista", async () => {
    useCommercialStore.setState({ proposals: { status: "ready", data: [proposalRow("p1")], error: null } });
    mockPost.mockRejectedValue(new HttpError({ status: 409, code: "cmo/proposal_already_decided", message: "Ya se decidió" }));

    await expect(useCommercialStore.getState().approveProposal("p1")).rejects.toThrow("Ya se decidió");
    expect(useCommercialStore.getState().proposals.data?.[0].status).toBe("pending");
    expect(useCommercialStore.getState().approvals.p1).toBeUndefined();
  });
});
