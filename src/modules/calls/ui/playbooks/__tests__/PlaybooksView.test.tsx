import { act, fireEvent, render, screen } from "@testing-library/react";

import type { PlaybookView } from "@/modules/calls/domain/playbooks";
import { PlaybooksView } from "../PlaybooksView";

const listPlaybooks = jest.fn();
const proposePlaybooks = jest.fn();
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  listPlaybooks: (...args: unknown[]) => listPlaybooks(...args),
  proposePlaybooks: (...args: unknown[]) => proposePlaybooks(...args),
  savePlaybook: jest.fn(),
  resetPlaybook: jest.fn(),
  applyPlaybookProposal: jest.fn(),
  discardPlaybookProposal: jest.fn(),
  previewPlaybookOpening: jest.fn(),
}));
const showAlert = jest.fn();
const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));

const stage = (key: string, label: string) => ({
  key,
  label,
  goal: `Objetivo de ${label}.`,
  advance_when: "Responde.",
  must: [],
  never: [],
});

function view(call_type: PlaybookView["call_type"], label: string): PlaybookView {
  return {
    call_type,
    label,
    enabled: true,
    customized: false,
    base_version: 1,
    playbook: {
      call_type,
      label,
      version: 1,
      opening_guidance: "Saluda.",
      stages: [stage("apertura", "Apertura"), stage("retomar", "Retomar el tema"), stage("cierre", "Cierre")],
    },
    proposal: null,
    proposed_at: null,
    updated_at: null,
  };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("PlaybooksView · cambios sin guardar (A2/B6)", () => {
  beforeEach(() => {
    showModal.mockReset();
    proposePlaybooks.mockReset();
    listPlaybooks.mockResolvedValue([view("sales_followup", "Venta"), view("followup", "Seguimiento")]);
    proposePlaybooks.mockResolvedValue({ results: [{ call_type: "sales_followup", status: "unchanged" }] });
  });

  async function renderDirty() {
    render(<PlaybooksView />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Abrir «Retomar el tema»" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "Pregunta si ya decidió." } });
  }

  it("B6: con cambios sin guardar, «Proponer con Alba» no pregunta y el borrador se queda", async () => {
    await renderDirty();
    expect(screen.getByText("Alba propone sobre lo guardado; tus cambios siguen aquí.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proponer con Alba" }));
    await flush();
    expect(showModal).not.toHaveBeenCalled();
    expect(proposePlaybooks).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Objetivo/)).toHaveValue("Pregunta si ya decidió.");
  });

  it("A2: cambiar de tipo con cambios sin guardar pide confirmar", async () => {
    await renderDirty();
    fireEvent.click(screen.getByRole("button", { name: /Seguimiento/ }));
    expect(showModal).toHaveBeenCalledWith(expect.objectContaining({ title: "Tienes cambios sin guardar" }));
  });

  it("sin cambios no hay línea de aviso", async () => {
    render(<PlaybooksView />);
    await flush();
    expect(screen.queryByText(/tus cambios siguen aquí/)).toBeNull();
  });
});
