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
  resumeColdWhatsapp: jest.fn(),
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
  resumeColdWhatsapp: jest.Mock;
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
  cold: { daily_cap: { whatsapp_cloud: 20, sms: 20 } },
};
const GUARD: View["cold_guard"] = {
  whatsapp_pause: null,
  whatsapp_last_quality: null,
  whatsapp_resumed: null,
  activated: {},
};
const VIEW: View = {
  policy: POLICY,
  defaults: POLICY,
  floor: FLOOR,
  pending_legal_review: ["ley_2300_b2b", "corporate_data_as_consent"],
  cold_guard: GUARD,
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

  it("activar WhatsApp en frío controlado enseña riesgo y frenos, y guarda la política COMPLETA con el tope", async () => {
    const group = screen.getByRole("radiogroup", { name: "Modo de WhatsApp · plantilla" });
    expect(within(group).queryByRole("radio", { name: "A cualquier lead" })).not.toBeInTheDocument();
    fireEvent.click(within(group).getByRole("radio", { name: "Frío controlado" }));

    expect(screen.getByText("Riesgo alto para tu número")).toBeInTheDocument();
    expect(screen.getByText(/Activaste WhatsApp · plantilla en frío controlado/)).toBeInTheDocument();
    expect(screen.getByText("Frenos del frío controlado")).toBeInTheDocument();
    expect(screen.getByText("Solo celulares: nunca fijos")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mensajes en frío al día"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar política" }));
    await waitFor(() => expect(api.putOutreachPolicy).toHaveBeenCalledTimes(1));
    const sent = api.putOutreachPolicy.mock.calls[0][0] as OutreachPolicy;
    expect(sent.channels.whatsapp_cloud.mode).toBe("cold_controlled");
    expect(sent.cold).toEqual({ daily_cap: { whatsapp_cloud: 12, sms: 20 } });
    // Las claves que no se tocaron viajan igual (el PUT reemplaza la sección)
    expect(sent.channels.whatsapp_web).toEqual(POLICY.channels.whatsapp_web);
    expect(sent.hours).toEqual(FLOOR);
  });

  it("abrir la llamada a cualquier lead sigue igual", () => {
    const group = screen.getByRole("radiogroup", { name: "Modo de Llamada de la agente" });
    expect(within(group).getByRole("radio", { name: "A cualquier lead" })).toBeInTheDocument();
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

it("WhatsApp en frío pausado: dice por qué y se reanuda a mano sin perder lo que se edita", async () => {
  const paused: View = {
    ...VIEW,
    policy: {
      ...POLICY,
      channels: { ...POLICY.channels, whatsapp_cloud: { enabled: true, mode: "cold_controlled", daily_cap: 1 } },
    },
    cold_guard: {
      ...GUARD,
      whatsapp_pause: { paused_at: "2026-11-20T15:00:00.000Z", reason: "quality_yellow" },
      activated: { whatsapp_cloud: { at: "2026-11-19T15:00:00.000Z", by: "u-1" } },
    },
  };
  api.getOutreachPolicy.mockResolvedValueOnce(paused).mockResolvedValueOnce({ ...paused, cold_guard: GUARD });
  api.resumeColdWhatsapp.mockResolvedValue({ resumed: true });
  render(<OutreachPolicyView />);
  expect(await screen.findByText(/en frío está en pausa/)).toBeInTheDocument();
  expect(screen.getByText(/la calidad del número bajó a amarilla/)).toBeInTheDocument();
  expect(screen.getByText(/lo activaron el 19 de nov/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
  await waitFor(() => expect(api.resumeColdWhatsapp).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByText(/en frío está en pausa/)).not.toBeInTheDocument());
  expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "WhatsApp en frío reanudado" }));
});
