import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AgentTaskSettings } from "@/modules/crm/domain/agent-task-settings";
import { AgentTaskSettingsView } from "../AgentTaskSettingsView";

let permitted = true;
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => permitted, status: "authenticated" }),
}));

const showAlert = jest.fn();
const showModal = jest.fn();
const closeModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal }),
}));

jest.mock("@/modules/crm/infrastructure/services/agent-task-settings-service.adapter", () => ({
  getAgentTaskSettings: jest.fn(),
  putAgentTaskSettings: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/crm/infrastructure/services/agent-task-settings-service.adapter") as {
  getAgentTaskSettings: jest.Mock;
  putAgentTaskSettings: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function settings(over: Partial<AgentTaskSettings> = {}): AgentTaskSettings {
  return {
    enabled: true,
    daily_cap: 200,
    quiet_start_hour: 20,
    quiet_end_hour: 8,
    max_attempts: 8,
    max_defer_hours: 72,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  permitted = true;
  api.getAgentTaskSettings.mockResolvedValue(settings());
  api.putAgentTaskSettings.mockImplementation((next: AgentTaskSettings) => Promise.resolve(next));
});
afterEach(cleanup);

describe("estado apagado", () => {
  it("nombra las dos consecuencias reales, no solo que está apagado", async () => {
    api.getAgentTaskSettings.mockResolvedValue(settings({ enabled: false }));
    render(<AgentTaskSettingsView />);

    expect(await screen.findByRole("button", { name: /encender/i })).toBeInTheDocument();
    // Una sola frase con las dos consecuencias: el tope diario también habla
    // de "en espera", así que se asierta la del interruptor por entero.
    expect(
      screen.getByText(/quedan en espera y se reanudan al encender.*nadie puede crear tareas nuevas/i),
    ).toBeInTheDocument();
    // La letra pequeña honesta: el apagado no aborta un turno en vuelo.
    expect(screen.getByText(/no detiene un mensaje que ya se esté enviando/i)).toBeInTheDocument();
  });

  it("encender pide confirmación: reanuda mensajes a clientes reales", async () => {
    api.getAgentTaskSettings.mockResolvedValue(settings({ enabled: false }));
    render(<AgentTaskSettingsView />);

    fireEvent.click(await screen.findByRole("button", { name: /encender/i }));

    expect(showModal).toHaveBeenCalled();
    // Apagar es la dirección segura, así que no hay confirmación de por medio.
    expect(api.putAgentTaskSettings).not.toHaveBeenCalled();
  });
});

describe("el interruptor con el formulario sucio", () => {
  it("apaga con los valores GUARDADOS, nunca con el borrador a medio teclear", async () => {
    render(<AgentTaskSettingsView />);
    const capInput = await screen.findByLabelText(/máximo de tareas ejecutadas por día/i);

    fireEvent.change(capInput, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /apagar/i }));

    await waitFor(() => {
      expect(api.putAgentTaskSettings).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, daily_cap: 200 }) as never,
      );
    });
  });

  it("y conserva el borrador en pantalla, avisándolo", async () => {
    render(<AgentTaskSettingsView />);
    const capInput = await screen.findByLabelText(/máximo de tareas ejecutadas por día/i);

    fireEvent.change(capInput, { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /apagar/i }));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/sin guardar/i) }) as never,
      );
    });
    expect(capInput).toHaveValue(7);
  });
});

describe("horario silencioso", () => {
  it("el cruce de medianoche se explica, no se marca como error", async () => {
    render(<AgentTaskSettingsView />);

    expect(await screen.findByText(/del día siguiente/i)).toBeInTheDocument();
    expect(screen.getByText(/12 horas en silencio/i)).toBeInTheDocument();
  });

  it("igualar las dos horas dice SIN silencio, no 24 h", async () => {
    render(<AgentTaskSettingsView />);
    const start = await screen.findByLabelText(/hora de inicio del silencio/i);

    fireEvent.change(start, { target: { value: "8" } });

    expect(screen.getByText(/sin horario silencioso/i)).toBeInTheDocument();
  });
});

describe("permisos", () => {
  it("sin crm:automate no se ofrece ni guardar ni apagar", async () => {
    permitted = false;
    render(<AgentTaskSettingsView />);

    await screen.findByRole("heading", { name: /horario silencioso/i });
    expect(screen.queryByRole("button", { name: /apagar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar configuración/i })).not.toBeInTheDocument();
  });
});
