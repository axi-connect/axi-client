import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { LeadPersonDTO } from "../../../domain/person";
import { LeadPeopleSection } from "../LeadPeopleSection";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("../../../infrastructure/services/prospecting-service.adapter", () => ({
  confirmLeadPerson: jest.fn(),
  discardLead: jest.fn(),
  getLeadPeople: jest.fn(),
  promoteLeads: jest.fn(),
  revealLeads: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("../../../infrastructure/services/prospecting-service.adapter") as {
  confirmLeadPerson: jest.Mock;
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

beforeEach(() => {
  showAlert.mockReset();
  api.confirmLeadPerson.mockReset().mockResolvedValue(undefined);
  api.discardLead.mockReset().mockResolvedValue(undefined);
  api.getLeadPeople.mockReset();
});

describe("LeadPeopleSection — la persona dudosa del sitio", () => {
  it("la marca «Dudosa», dice por qué en una línea y ofrece «Sí trabaja aquí» y «No es»", async () => {
    setup([person(), FROM_SITE]);

    expect(await screen.findByText("Andrés Pardo Salcedo")).toBeInTheDocument();
    expect(screen.getByText("Dudosa")).toBeInTheDocument();
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
    expect(screen.getByText("RUES")).toBeInTheDocument();
    expect(screen.getByText(/confianza 95/)).toBeInTheDocument();
  });

  it("«Sí trabaja aquí» confirma que es del negocio (no que decide), recarga y avisa a la ficha", async () => {
    const { onDecisionChange } = setup([FROM_SITE]);

    fireEvent.click(await screen.findByRole("button", { name: "Sí trabaja aquí" }));

    await waitFor(() => expect(api.confirmLeadPerson).toHaveBeenCalledWith("p-2", "member"));
    await waitFor(() => expect(onDecisionChange).toHaveBeenCalledTimes(1));
    expect(api.getLeadPeople).toHaveBeenCalledTimes(2);
  });

  it("«No es» la descarta con su motivo y avisa a la ficha", async () => {
    const { onDecisionChange } = setup([FROM_SITE]);

    fireEvent.click(await screen.findByRole("button", { name: "No es" }));

    await waitFor(() => expect(api.discardLead).toHaveBeenCalledWith("p-2", "No es de este negocio"));
    await waitFor(() => expect(onDecisionChange).toHaveBeenCalledTimes(1));
  });

  it("ya confirmada por el equipo: deja de ser dudosa y lo dice en la insignia de la fuente", async () => {
    setup([{ ...FROM_SITE, confirmed_by: "person", doubt: null }]);

    expect(await screen.findByText("· confirmada por tu equipo")).toBeInTheDocument();
    expect(screen.queryByText("Dudosa")).toBeNull();
    expect(screen.queryByText("· hipótesis")).toBeNull();
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
