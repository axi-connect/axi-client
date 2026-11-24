import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { LeadPersonDTO } from "../../../domain/person";
import { LeadPeopleSection } from "../LeadPeopleSection";

const showAlert = jest.fn();
const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));
jest.mock("../../../infrastructure/services/prospecting-service.adapter", () => ({
  confirmLeadPerson: jest.fn(),
  demoteDecisionMaker: jest.fn(),
  discardLead: jest.fn(),
  getLeadPeople: jest.fn(),
  promoteLeads: jest.fn(),
  revealLeads: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("../../../infrastructure/services/prospecting-service.adapter") as {
  confirmLeadPerson: jest.Mock;
  demoteDecisionMaker: jest.Mock;
  discardLead: jest.Mock;
  getLeadPeople: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

afterEach(cleanup);

/** Personas ficticias de un negocio de «Norte Studio». */
function person(overrides: Partial<LeadPersonDTO> = {}): LeadPersonDTO {
  return {
    id: "p-1",
    source: "rues_open",
    status: "new",
    display_name: "Mariana Restrepo Gil",
    title: "Representante legal y gerente",
    buying_role: "decides",
    decision_maker_confidence: 95,
    masked: false,
    has_email: false,
    has_phone: false,
    email: null,
    phone: null,
    in_crm: false,
    evidence: "Representante legal en el registro mercantil",
    evidence_provider: "rues",
    evidence_level: "fact",
    evidence_url: null,
    confirmed_by: "source",
    doubt: null,
    unattended: true,
    created_at: "2026-11-23T15:00:00.000Z",
    ...overrides,
  };
}

const FROM_SITE = person({
  id: "p-2",
  source: "website",
  display_name: "Andrés Pardo Salcedo",
  title: null,
  buying_role: "unknown",
  decision_maker_confidence: 30,
  evidence: "Página de testimonios",
  evidence_provider: "site_extractor",
  evidence_level: "hypothesis",
  confirmed_by: null,
  doubt: "from_site",
});

function setup(people: LeadPersonDTO[], options: { canManage?: boolean } = {}) {
  api.getLeadPeople.mockResolvedValue({ items: people });
  const onDecisionChange = jest.fn();
  render(
    <LeadPeopleSection
      leadId="l-1"
      refreshKey={0}
      searching={false}
      costs={{ email: 1, phone: 8 }}
      canManage={options.canManage ?? true}
      canPromote
      onSearch={jest.fn()}
      onDecisionChange={onDecisionChange}
    />,
  );
  return { onDecisionChange };
}

/** La pregunta que abrió «No es»: su título y sus botones, por rótulo. */
function lastQuestion() {
  const modal = showModal.mock.calls.at(-1)?.[0] as {
    title: string;
    description: string;
    actions: { label: string; onClick?: () => void; asClose?: boolean }[];
  };
  const press = (label: string) => modal.actions.find((action) => action.label === label)?.onClick?.();
  return { modal, labels: modal.actions.map((action) => action.label), press };
}

beforeEach(() => {
  showAlert.mockReset();
  showModal.mockReset();
  api.demoteDecisionMaker.mockReset().mockResolvedValue(undefined);
  api.confirmLeadPerson.mockReset().mockResolvedValue(undefined);
  api.discardLead.mockReset().mockResolvedValue(undefined);
  api.getLeadPeople.mockReset();
});

describe("LeadPeopleSection — la persona dudosa del sitio", () => {
  it("la marca «Dudosa», dice por qué en una línea y ofrece «Sí trabaja aquí» y «No es»", async () => {
    setup([person(), FROM_SITE]);

    expect(await screen.findByText("Andrés Pardo Salcedo")).toBeInTheDocument();
    expect(screen.getByText("Dudosa")).toBeInTheDocument();
    expect(screen.queryByText(/hipótesis|confianza/)).toBeNull();
    expect(screen.getByText(/Sale de su sitio web: puede ser un cliente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí trabaja aquí" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No es" })).toBeInTheDocument();
  });

  it("la del registro mercantil NO lleva la marca y conserva «Omitir» (nada de lo de antes se pierde)", async () => {
    setup([person()]);

    expect(await screen.findByText("Mariana Restrepo Gil")).toBeInTheDocument();
    expect(screen.queryByText("Dudosa")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sí trabaja aquí" })).toBeNull();
    expect(screen.getByRole("button", { name: "Omitir" })).toBeInTheDocument();
    expect(screen.getByText("Registro mercantil")).toBeInTheDocument();
    // Sin jerga interna: ni «RUES», ni «confianza 95», ni «hipótesis».
    expect(screen.queryByText("RUES")).toBeNull();
    expect(screen.queryByText(/confianza/)).toBeNull();
  });

  it("«Sí trabaja aquí» confirma que es del negocio (no que decide), recarga y avisa a la ficha", async () => {
    const { onDecisionChange } = setup([FROM_SITE]);

    fireEvent.click(await screen.findByRole("button", { name: "Sí trabaja aquí" }));

    await waitFor(() => expect(api.confirmLeadPerson).toHaveBeenCalledWith("p-2", "member"));
    await waitFor(() => expect(onDecisionChange).toHaveBeenCalledTimes(1));
    expect(api.getLeadPeople).toHaveBeenCalledTimes(2);
  });

  it("«No es» NO hace nada con un solo toque: pregunta, y no borra hasta que se contesta", async () => {
    const { onDecisionChange } = setup([FROM_SITE]);

    fireEvent.click(await screen.findByRole("button", { name: "No es" }));

    expect(api.discardLead).not.toHaveBeenCalled();
    const question = lastQuestion();
    expect(question.modal.title).toBe("¿Andrés Pardo Salcedo no trabaja aquí?");
    expect(question.labels).toEqual(["Cancelar", "No trabaja aquí"]);

    question.press("No trabaja aquí");
    await waitFor(() => expect(api.discardLead).toHaveBeenCalledWith("p-2", "No trabaja en este negocio"));
    await waitFor(() => expect(onDecisionChange).toHaveBeenCalledTimes(1));
  });

  it("si la pista figura como quien decide, la pregunta ofrece las dos salidas con rótulos humanos", async () => {
    setup([{ ...FROM_SITE, buying_role: "decides" }]);

    fireEvent.click(await screen.findByRole("button", { name: "No es" }));

    const question = lastQuestion();
    expect(question.modal.title).toBe("¿No trabaja aquí, o no es quien decide?");
    expect(question.labels).toEqual(["Cancelar", "No trabaja aquí", "No es quien decide"]);
    // Sin menú numerado.
    expect(question.labels.join(" ")).not.toMatch(/\d\./);

    question.press("No es quien decide");
    await waitFor(() => expect(api.demoteDecisionMaker).toHaveBeenCalledWith("p-2"));
    expect(api.discardLead).not.toHaveBeenCalled();
  });

  it("cancelar no toca nada", async () => {
    setup([FROM_SITE]);
    fireEvent.click(await screen.findByRole("button", { name: "No es" }));
    lastQuestion().press("Cancelar");
    expect(api.discardLead).not.toHaveBeenCalled();
    expect(api.demoteDecisionMaker).not.toHaveBeenCalled();
  });

  it("la que no tiene procedencia también se marca «Dudosa», con su motivo; pero se puede añadir al CRM como antes", async () => {
    setup([
      person({
        id: "p-3",
        display_name: "Laura Pérez Ossa",
        evidence: null,
        evidence_provider: null,
        evidence_level: "hypothesis",
        confirmed_by: null,
        doubt: "no_source",
        email: "laura@casalumbre.example",
        has_email: true,
      }),
    ]);

    expect(await screen.findByText("Dudosa")).toBeInTheDocument();
    expect(screen.getByText(/no quedó guardado de dónde salió/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí trabaja aquí" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No es" })).toBeInTheDocument();
    // La promoción no la frena: el botón sigue.
    expect(screen.getByRole("button", { name: "Añadir al CRM" })).toBeInTheDocument();
  });

  it("ya confirmada por el equipo: deja de ser dudosa y lo dice en la insignia de la fuente", async () => {
    setup([{ ...FROM_SITE, confirmed_by: "person", doubt: null }]);

    expect(await screen.findByText("· confirmada por tu equipo")).toBeInTheDocument();
    expect(screen.queryByText("Dudosa")).toBeNull();
    expect(screen.queryByText(/hipótesis/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Sí trabaja aquí" })).toBeNull();
  });

  it("si confirmar falla, lo dice y no avisa de ningún cambio", async () => {
    api.confirmLeadPerson.mockRejectedValue(new Error("sin conexión"));
    const { onDecisionChange } = setup([FROM_SITE]);

    fireEvent.click(await screen.findByRole("button", { name: "Sí trabaja aquí" }));

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "No se pudo confirmar" })),
    );
    expect(onDecisionChange).not.toHaveBeenCalled();
  });

  it("una dudosa con correo NO ofrece «Añadir al CRM» ni entra en el botón de pasar a todas", async () => {
    setup([{ ...FROM_SITE, buying_role: "decides", email: "andres@casalumbre.example", has_email: true }]);

    expect(await screen.findByText("Dudosa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Añadir al CRM" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Añadir.*al CRM/ })).toBeNull();
  });

  it("la misma, ya confirmada, sí se puede añadir", async () => {
    setup([
      {
        ...FROM_SITE,
        buying_role: "decides",
        email: "andres@casalumbre.example",
        has_email: true,
        confirmed_by: "person",
        doubt: null,
      },
    ]);

    expect(await screen.findByRole("button", { name: "Añadir al CRM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir al CRM a quien decide" })).toBeInTheDocument();
  });

  it("sin permiso de gestionar se ve la duda, pero no los botones", async () => {
    setup([FROM_SITE], { canManage: false });

    expect(await screen.findByText("Dudosa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sí trabaja aquí" })).toBeNull();
    expect(screen.queryByRole("button", { name: "No es" })).toBeNull();
  });
});
