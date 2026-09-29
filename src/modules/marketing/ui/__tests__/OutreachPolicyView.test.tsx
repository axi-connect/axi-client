import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { OutreachPolicy, OutreachPolicyView as View } from "@/modules/marketing/domain/outreach-policy";
import { OutreachPolicyView } from "../OutreachPolicyView";

/**
 * Lo que no puede vivir en el dominio: la pantalla parte del GET y reenvía la
 * política COMPLETA; no ofrece guardar sin haber cargado; abrir WhatsApp a
 * cualquier lead enseña el riesgo antes de guardar; y un horario fuera del
 * criterio no llega al servidor.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/marketing/infrastructure/services/outreach-policy-service.adapter", () => ({
  getOutreachPolicy: jest.fn(),
  putOutreachPolicy: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/opt-outs-service.adapter", () => ({
  listOptOuts: jest.fn(() => Promise.resolve({ data: [], meta: { total: 31, page: 1, page_size: 1 } })),
}));
jest.mock("@/modules/channels/public", () => ({
  ChannelKindIcon: () => null,
  listChannels: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: "ch1", name: "Ventas Medellín", kind: "whatsapp_cloud", status: "connected", quality_rating: "GREEN" },
      ],
    }),
  ),
  readQualityRating: (value: string | null) =>
    value === "GREEN" ? { label: "Alta", tone: "good", hint: "" } : { label: "Sin datos", tone: "neutral", hint: "" },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/outreach-policy-service.adapter") as {
  getOutreachPolicy: jest.Mock;
  putOutreachPolicy: jest.Mock;
};

const FLOOR = { weekdays: { start: "07:00", end: "19:00" }, saturday: { start: "08:00", end: "15:00" } };
const POLICY: OutreachPolicy = {
  version: 1,
  channels: {
    email: { enabled: true, mode: "any_lead", daily_cap: 1 },
    call: { enabled: true, mode: "any_lead", daily_cap: 1 },
    sms: { enabled: true, mode: "opt_in_only", daily_cap: 1 },
    whatsapp_cloud: { enabled: true, mode: "opt_in_only", daily_cap: 1 },
    whatsapp_web: { enabled: true, mode: "any_lead", daily_cap: 1 },
    instagram_dm: { enabled: true, mode: "if_wrote", daily_cap: 1 },
    facebook_messenger: { enabled: true, mode: "if_wrote", daily_cap: 1 },
    manual: { enabled: true, mode: "any_lead", daily_cap: 1 },
  },
  hours: FLOOR,
};
const VIEW: View = {
  policy: POLICY,
  defaults: POLICY,
  floor: FLOOR,
  pending_legal_review: ["ley_2300_b2b", "corporate_data_as_consent"],
};

beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

describe("política cargada", () => {
  beforeEach(async () => {
    api.getOutreachPolicy.mockResolvedValue(VIEW);
    api.putOutreachPolicy.mockImplementation((policy: OutreachPolicy) => Promise.resolve({ ...VIEW, policy }));
    render(<OutreachPolicyView />);
    await screen.findByText("Canales para iniciar el contacto");
  });

  it("pinta los canales vivos (sin WhatsApp web) y no ofrece guardar sin cambios", () => {
    expect(screen.getByText("WhatsApp · plantilla")).toBeInTheDocument();
    expect(screen.queryByText(/celular vinculado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar política" })).not.toBeInTheDocument();
  });

  it("dice el criterio como prudente, no como exigencia de la ley", () => {
    expect(screen.getByText(/Criterio prudente adoptado/)).toBeInTheDocument();
    expect(screen.queryByText(/la ley exige/i)).not.toBeInTheDocument();
  });

  it("enseña las bajas y la calidad del número", async () => {
    expect(await screen.findByText(/31 contactos pidieron no recibir más/)).toBeInTheDocument();
    expect(await screen.findByText("Ventas Medellín")).toBeInTheDocument();
  });

  it("abrir WhatsApp a cualquier lead avisa el riesgo y guarda la política COMPLETA", async () => {
    const group = screen.getByRole("radiogroup", { name: "Modo de WhatsApp · plantilla" });
    fireEvent.click(within(group).getByRole("radio", { name: "A cualquier lead" }));

    expect(screen.getByText("Riesgo alto para tu número")).toBeInTheDocument();
    expect(screen.getByText(/Abriste WhatsApp · plantilla a cualquier lead/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar política" }));
    await waitFor(() => expect(api.putOutreachPolicy).toHaveBeenCalledTimes(1));
    const sent = api.putOutreachPolicy.mock.calls[0][0] as OutreachPolicy;
    expect(sent.channels.whatsapp_cloud.mode).toBe("any_lead");
    // Las claves que no se tocaron viajan igual (el PUT reemplaza la sección)
    expect(sent.channels.whatsapp_web).toEqual(POLICY.channels.whatsapp_web);
    expect(sent.hours).toEqual(FLOOR);
  });

  it("un horario que abre más que el criterio no llega al servidor", async () => {
    fireEvent.change(screen.getByLabelText("Desde", { selector: "#op-weekdays-start" }), {
      target: { value: "06:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar política" }));
    expect(await screen.findByText(/Entre 7:00 y 19:00/)).toBeInTheDocument();
    expect(api.putOutreachPolicy).not.toHaveBeenCalled();
  });

  it("descartar vuelve a lo guardado", () => {
    fireEvent.click(screen.getByRole("switch", { name: /Correo: activo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.getByRole("switch", { name: /Correo: activo/ })).toBeChecked();
  });
});

it("si el GET falla no ofrece guardar: dice el error con reintento", async () => {
  api.getOutreachPolicy.mockRejectedValue(new Error("down"));
  render(<OutreachPolicyView />);
  expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  expect(screen.queryByText("Canales para iniciar el contacto")).not.toBeInTheDocument();
});
