import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { PlaybookView } from "@/modules/calls/domain/playbooks";
import { PlaybookEditor } from "../PlaybookEditor";

const savePlaybook = jest.fn();
const applyPlaybookProposal = jest.fn();
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  savePlaybook: (...args: unknown[]) => savePlaybook(...args),
  resetPlaybook: jest.fn(),
  applyPlaybookProposal: (...args: unknown[]) => applyPlaybookProposal(...args),
  discardPlaybookProposal: jest.fn(),
  previewPlaybookOpening: jest.fn(),
}));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));

const stage = (key: string, label: string) => ({
  key,
  label,
  goal: `Objetivo de ${label}.`,
  advance_when: "Responde.",
  must: [],
  never: [],
});

function view(overrides: Partial<PlaybookView> = {}): PlaybookView {
  return {
    call_type: "followup",
    label: "Seguimiento",
    enabled: true,
    customized: false,
    base_version: 1,
    playbook: {
      call_type: "followup",
      label: "Seguimiento",
      version: 1,
      opening_guidance: "Retoma el tema pendiente.",
      stages: [stage("apertura", "Apertura"), stage("retomar", "Retomar el tema"), stage("cierre", "Cierre")],
    },
    proposal: null,
    proposed_at: null,
    updated_at: null,
    ...overrides,
  };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("PlaybookEditor (plan de modos §5)", () => {
  beforeEach(() => {
    savePlaybook.mockReset();
    applyPlaybookProposal.mockReset();
  });

  it("sin cambios no hay barra de guardar; al editar aparece y guarda el marco completo", async () => {
    const onSaved = jest.fn();
    savePlaybook.mockResolvedValue(view({ customized: true }));
    render(<PlaybookEditor view={view()} canManage onSaved={onSaved} />);
    expect(screen.queryByRole("contentinfo", { name: "Cambios sin guardar" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir «Retomar el tema»" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "Pregunta si ya decidió." } });
    const dock = screen.getByRole("contentinfo", { name: "Cambios sin guardar" });
    fireEvent.click(within(dock).getByRole("button", { name: "Guardar marco" }));
    await flush();

    expect(savePlaybook).toHaveBeenCalledWith(
      "followup",
      expect.objectContaining({
        enabled: true,
        stages: expect.arrayContaining([expect.objectContaining({ key: "retomar", goal: "Pregunta si ya decidió." })]),
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("un marco inválido no se guarda: la barra dice por qué", () => {
    render(<PlaybookEditor view={view()} canManage onSaved={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir «Retomar el tema»" }));
    fireEvent.change(screen.getByLabelText(/Nombre de la etapa/), { target: { value: "" } });
    const dock = screen.getByRole("contentinfo", { name: "Cambios sin guardar" });
    expect(within(dock).getByText(/necesita un nombre/)).toBeInTheDocument();
    const save = within(dock).getByRole("button", { name: "Guardar marco" });
    // aria-disabled (sigue enfocable y explica por qué): el clic no guarda.
    expect(save).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(save);
    expect(savePlaybook).not.toHaveBeenCalled();
  });

  it("la apertura y el cierre no se mueven ni se quitan", () => {
    render(<PlaybookEditor view={view()} canManage onSaved={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Subir «Apertura»" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bajar «Cierre»" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir «Cierre»" }));
    expect(screen.queryByRole("button", { name: "Quitar esta etapa" })).toBeNull();
  });

  it("con propuesta de Alba: dice qué cambia y «Aplicar» la aplica", async () => {
    const proposal = { ...view().playbook, opening_guidance: "Saluda con calidez." };
    applyPlaybookProposal.mockResolvedValue(view());
    render(<PlaybookEditor view={view({ proposal })} canManage onSaved={jest.fn()} />);
    expect(screen.getByText(/Alba propone ajustar este marco/)).toBeInTheDocument();
    expect(screen.getByText(/Cambia la apertura/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await flush();
    expect(applyPlaybookProposal).toHaveBeenCalledWith("followup");
  });

  it("sin calls:manage es de solo lectura: ni barra, ni añadir, ni vista previa", () => {
    render(<PlaybookEditor view={view()} canManage={false} onSaved={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Añadir una etapa/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ver cómo abriría/ })).toBeNull();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("A2: una recarga de la vista (p. ej. tras «Proponer con Alba») no pisa un borrador sin guardar", () => {
    const onDirtyChange = jest.fn();
    const { rerender } = render(
      <PlaybookEditor view={view()} canManage onSaved={jest.fn()} onDirtyChange={onDirtyChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir «Retomar el tema»" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "Pregunta si ya decidió." } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    rerender(<PlaybookEditor view={view({ proposed_at: "2026-09-29T10:00:00Z" })} canManage onSaved={jest.fn()} onDirtyChange={onDirtyChange} />);
    expect(screen.getByLabelText(/Objetivo/)).toHaveValue("Pregunta si ya decidió.");
    expect(screen.getByRole("contentinfo", { name: "Cambios sin guardar" })).toBeInTheDocument();
  });

  it("A2: sin cambios, la vista nueva del servidor sí se adopta", () => {
    const { rerender } = render(<PlaybookEditor view={view()} canManage onSaved={jest.fn()} />);
    const next = view();
    next.playbook.opening_guidance = "Apertura nueva del servidor.";
    rerender(<PlaybookEditor view={next} canManage onSaved={jest.fn()} />);
    expect(screen.getByLabelText(/Cómo abre la llamada/)).toHaveValue("Apertura nueva del servidor.");
    expect(screen.queryByRole("contentinfo", { name: "Cambios sin guardar" })).toBeNull();
  });

  it("M2: con el borrador inválido no se pide la vista previa y se dice por qué", () => {
    render(<PlaybookEditor view={view()} canManage onSaved={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir «Retomar el tema»" }));
    fireEvent.change(screen.getByLabelText(/Objetivo/), { target: { value: "" } });
    const island = screen.getByRole("region", { name: "Así abriría" });
    expect(within(island).getByRole("button", { name: /cómo abriría/ })).toBeDisabled();
    expect(within(island).getByText(/Corrige el marco para ver cómo abriría/)).toBeInTheDocument();
  });
});

