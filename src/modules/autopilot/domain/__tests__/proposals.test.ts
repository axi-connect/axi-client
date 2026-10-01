import { changeRows, proposalRoutineId, rejectReason, type PilotProposalDTO } from "../proposals";

const base = {
  id: "p1",
  kind: "autopilot_tuning",
  status: "pending",
  title: "t",
  headline: null,
  rationale: "r",
  evidence: [],
  risks: [],
  source: "autopilot",
  expires_at: null,
  decided_at: null,
  reject_reason: null,
  created_at: "2026-09-30T12:00:00.000Z",
};

const proposal = (patches: unknown[]): PilotProposalDTO =>
  ({ ...base, artifacts: [{ type: "autopilot_routine_patch", id: "r1", label: "x", spec: { patches } }] }) as unknown as PilotProposalDTO;

describe("«Axi propone» — qué cambia", () => {
  it("la franja: solo lo que cambia, con las horas en palabras", () => {
    const rows = changeRows(
      proposal([
        {
          routine_id: "r1",
          before: { schedule: { times: ["09:00", "15:00"], leads_per_run: 20, timezone: "America/Bogota" }, budget: { per_run: 100, per_month: 2000 } },
          after: { schedule: { times: ["15:00"], leads_per_run: 40, timezone: "America/Bogota" }, budget: { per_run: 200, per_month: 2000 } },
        },
      ]),
      new Map(),
    );
    expect(rows).toEqual([
      { label: "Horario", before: "09:00 y 15:00", after: "15:00" },
      { label: "Cuentas por turno", before: "20", after: "40" },
      { label: "Tope por salida", before: "100 créditos", after: "200 créditos" },
    ]);
  });

  it("mover el tope entre dos pilotos nombra a cada uno", () => {
    const rows = changeRows(
      proposal([
        { routine_id: "r1", before: { budget: { per_run: 100, per_month: 1000 } }, after: { budget: { per_run: 100, per_month: 1250 } } },
        { routine_id: "r2", before: { budget: { per_run: 100, per_month: 1000 } }, after: { budget: { per_run: 100, per_month: 750 } } },
      ]),
      new Map([["r1", "Clínicas"], ["r2", "Dermatólogos"]]),
    );
    expect(rows).toEqual([
      { label: "Tope del mes · Clínicas", before: "1.000 créditos", after: "1.250 créditos" },
      { label: "Tope del mes · Dermatólogos", before: "1.000 créditos", after: "750 créditos" },
    ]);
  });

  it("un artefacto mal formado no pinta nada; «Ver el piloto» va al primero", () => {
    expect(changeRows(proposal([{ routine_id: 3 }]), new Map())).toEqual([]);
    expect(proposalRoutineId(proposal([{ routine_id: "r9", before: {}, after: {} }]))).toBe("r9");
    expect(proposalRoutineId({ ...base, artifacts: [] } as unknown as PilotProposalDTO)).toBeNull();
  });

  it("el motivo de «Ahora no»: vacío no viaja, corto se corrige", () => {
    expect(rejectReason("  ")).toEqual({});
    expect(rejectReason("no").error).toBeDefined();
    expect(rejectReason("mi equipo no alcanza a esa hora")).toEqual({ reason: "mi equipo no alcanza a esa hora" });
  });
});
