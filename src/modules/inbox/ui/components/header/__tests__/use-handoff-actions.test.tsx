import { render, screen, waitFor } from "@testing-library/react";
import type { ConversationDTO } from "@/modules/inbox/domain/inbox";
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket";
import { useHandoffActions } from "../use-handoff-actions";

const showAlert = jest.fn();
let permissions = ["conversations:claim"];

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (p: string) => permissions.includes(p) }),
}));

function conversation(overrides: Partial<ConversationDTO> = {}): ConversationDTO {
  return {
    id: "conv-1",
    status: "open",
    mode: "ai_active",
    priority: "normal",
    contact: { id: "c1", full_name: "Cristian", phone: null, avatar_url: null },
    channel: { id: "ch1", name: "WhatsApp", kind: "whatsapp_cloud" },
    ...overrides,
  } as ConversationDTO;
}

function commandsMock(ack: unknown = { ok: true, data: {} }): InboxCommands {
  return {
    claim: jest.fn().mockResolvedValue(ack),
    takeover: jest.fn().mockResolvedValue(ack),
    returnToAi: jest.fn().mockResolvedValue(ack),
    close: jest.fn().mockResolvedValue(ack),
  } as unknown as InboxCommands;
}

/** Sonda que expone el resultado del hook como texto inspeccionable. */
function Probe({
  conversation: conv,
  commands,
}: {
  conversation: ConversationDTO;
  commands: InboxCommands;
}) {
  const { primary, secondary, dialogs } = useHandoffActions(conv, commands);
  return (
    <>
      <span data-testid="primary">{primary?.id ?? "none"}</span>
      <span data-testid="secondary">{secondary.map((a) => a.id).join(",") || "none"}</span>
      <button onClick={() => primary?.onSelect()}>run-primary</button>
      {dialogs}
    </>
  );
}

beforeEach(() => {
  permissions = ["conversations:claim"];
  showAlert.mockReset();
});

describe("useHandoffActions", () => {
  it("human_queued → Atender como acción destacada, sin secundarias", () => {
    render(<Probe conversation={conversation({ mode: "human_queued" })} commands={commandsMock()} />);
    expect(screen.getByTestId("primary")).toHaveTextContent("claim");
    expect(screen.getByTestId("secondary")).toHaveTextContent("none");
  });

  it("ai_active → Intervenir", () => {
    render(<Probe conversation={conversation({ mode: "ai_active" })} commands={commandsMock()} />);
    expect(screen.getByTestId("primary")).toHaveTextContent("takeover");
  });

  it("human_active → Cerrar destacada y Devolver a la IA al desborde", () => {
    render(<Probe conversation={conversation({ mode: "human_active" })} commands={commandsMock()} />);
    expect(screen.getByTestId("primary")).toHaveTextContent("close");
    expect(screen.getByTestId("secondary")).toHaveTextContent("return_to_ai");
  });

  it("sin permiso conversations:claim no ofrece ninguna acción", () => {
    permissions = [];
    render(<Probe conversation={conversation({ mode: "human_queued" })} commands={commandsMock()} />);
    expect(screen.getByTestId("primary")).toHaveTextContent("none");
    expect(screen.getByTestId("secondary")).toHaveTextContent("none");
  });

  it.each(["resolved", "closed", "snoozed"] as const)(
    "status %s no ofrece acciones (la máquina de estados es terminal)",
    (status) => {
      render(<Probe conversation={conversation({ status })} commands={commandsMock()} />);
      expect(screen.getByTestId("primary")).toHaveTextContent("none");
    },
  );

  it("avisa en éxito con auto-cierre", async () => {
    const commands = commandsMock({ ok: true, data: {} });
    render(<Probe conversation={conversation({ mode: "human_queued" })} commands={commands} />);

    screen.getByText("run-primary").click();

    await waitFor(() => expect(commands.claim).toHaveBeenCalledWith("conv-1"));
    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert.mock.calls[0][0]).toMatchObject({ tone: "success", autoCloseMs: 3000 });
  });

  it("traduce handoff_conflict a un mensaje legible, no al texto crudo del ack", async () => {
    const commands = commandsMock({
      ok: false,
      error: { code: "conversations/handoff_conflict", message: "raw backend text" },
    });
    render(<Probe conversation={conversation({ mode: "ai_active" })} commands={commands} />);

    screen.getByText("run-primary").click();

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    const alert = showAlert.mock.calls[0][0] as { tone: string; title: string };
    expect(alert.tone).toBe("error");
    expect(alert.title).not.toBe("raw backend text");
  });

  it("otros errores muestran el mensaje del ack", async () => {
    const commands = commandsMock({
      ok: false,
      error: { code: "rbac/permission_denied", message: "No autorizado" },
    });
    render(<Probe conversation={conversation({ mode: "ai_active" })} commands={commands} />);

    screen.getByText("run-primary").click();

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert.mock.calls[0][0]).toMatchObject({ tone: "error", title: "No autorizado" });
  });
});
