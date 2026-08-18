import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ChannelDTO } from "@/modules/channels/domain/channel";

/**
 * El bug que este test existe para que no vuelva: en modo EDICIÓN el esquema
 * seguía exigiendo `provider_account_id` y `access_token`, que en ese modo **no
 * se pintan**. La validación fallaba, `handleSubmit` nunca corría, y como esos
 * `FormMessage` tampoco estaban montados no había ni PATCH, ni alerta, ni
 * mensaje: "Guardar cambios" parecía un botón muerto.
 *
 * Se prueba por la superficie —pulsando el botón que dispara el submit— porque
 * el fallo vivía justo ahí, entre el clic y la llamada. Un test que invocara
 * `handleSubmit` a secas habría pasado en verde con el bug dentro.
 */
const updateChannel = jest.fn();
const createChannel = jest.fn();
const showAlert = jest.fn();
const upsertChannel = jest.fn();

jest.mock("@/modules/channels/infrastructure/services/channels-service.adapter", () => ({
  updateChannel: (...args: unknown[]) => updateChannel(...args),
  createChannel: (...args: unknown[]) => createChannel(...args),
}));

jest.mock("@/modules/agents/infrastructure/services/agent-service.adapter", () => ({
  listAgents: () => Promise.resolve({ data: [{ id: "agent-1", name: "Vendedor" }] }),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector({ upsertChannel }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChannelForm = (require("../ChannelForm") as typeof import("../ChannelForm")).default;

function channel(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "WhatsApp",
    kind: "whatsapp_cloud",
    provider_account_id: "1297887983398000",
    status: "connected",
    display_phone_number: "+57 300 000 0000",
    verified_name: "Axi connect",
    waba_id: "9876543210",
    default_ai_agent_id: null,
    credentials_configured: true,
    token_last4: "aBcD",
    quality_rating: null,
    messaging_limit: null,
    last_health_check_at: null,
    token_expires_at: null,
    credentials_revoked: false,
    business_id: null,
    connection_method: "embedded_signup",
    onboarding: null,
    created_at: "2026-08-10T00:00:00.000Z",
    updated_at: "2026-08-10T00:00:00.000Z",
    ...overrides,
  } as ChannelDTO;
}

/** El host dispara el submit con requestSubmit(), igual que en producción. */
function Host({ existing }: { existing: ChannelDTO }) {
  return (
    <>
      <ChannelForm host={{ channel: existing }} />
      <button
        type="button"
        onClick={() => {
          const form = document.getElementById("channels-form");
          (form as HTMLFormElement | null)?.requestSubmit();
        }}
      >
        Guardar cambios
      </button>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ChannelForm — edición", () => {
  it("guardar un canal existente hace el PATCH aunque no haya campos de credenciales", async () => {
    const existing = channel();
    updateChannel.mockResolvedValue({ ...existing, name: "Ventas" });
    render(<Host existing={existing} />);

    fireEvent.change(screen.getByLabelText(/Nombre del canal/i), { target: { value: "Ventas" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateChannel).toHaveBeenCalledWith(existing.id, {
        name: "Ventas",
        default_ai_agent_id: null,
      });
    });
  });

  it("el canal actualizado entra al store: sin esto la cabecera del detalle se queda con el nombre viejo", async () => {
    const existing = channel();
    const updated = { ...existing, name: "Ventas" };
    updateChannel.mockResolvedValue(updated);
    render(<Host existing={existing} />);

    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => expect(upsertChannel).toHaveBeenCalledWith(updated));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("una validación que falla AVISA: nunca vuelve a quedarse en silencio", async () => {
    render(<Host existing={channel()} />);

    // Un nombre de dos letras incumple el mínimo del esquema
    fireEvent.change(screen.getByLabelText(/Nombre del canal/i), { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    });
    expect(updateChannel).not.toHaveBeenCalled();
  });
});
