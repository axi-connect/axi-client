import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TenantVoiceDTO } from "../../../../../domain/tenant-voice";
import { TenantVoiceView } from "../TenantVoiceView";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));

const enable = jest.fn();
const setKey = jest.fn();
const removeKey = jest.fn();
let voice: TenantVoiceDTO;
jest.mock("../../../../../infrastructure/api/hooks/use-tenant-voice", () => ({
  useTenantVoiceQuery: () => ({ data: voice, isPending: false, isError: false, error: null, refetch: jest.fn() }),
  useSetTenantVoiceEnabled: () => ({ mutateAsync: enable, isPending: false }),
  useSetTenantVoiceCredential: () => ({ mutateAsync: setKey, isPending: false }),
  useRemoveTenantVoiceCredential: () => ({ mutateAsync: removeKey, isPending: false }),
}));
// La confirmación escrita tiene su propio test; aquí basta saber que se abre con lo que debe
jest.mock("../../../../components/ConfirmTyped", () => ({
  ConfirmTyped: ({ open, title, confirmText, onConfirm }: { open: boolean; title: string; confirmText: string; onConfirm: () => void }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <span>{confirmText}</span>
        <button onClick={onConfirm}>confirmar</button>
      </div>
    ) : null,
}));

const base = (): TenantVoiceDTO => ({
  ai_enabled: false,
  plan: { code: "sbs", tier: "sbs" },
  credential: { configured: false, provider: "elevenlabs" },
  usage: { used: 0, limit: null, pct_used: null, period_end: "2026-09-30T05:00:00.000Z" },
});

describe("TenantVoiceView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    voice = base();
  });

  it("apagada, plan sbs: el interruptor enciende, y la llave se puede pegar IGUAL (V5: el plan no bloquea)", async () => {
    enable.mockResolvedValueOnce(undefined);
    setKey.mockResolvedValueOnce(undefined);
    render(<TenantVoiceView tenantId="t-1" />);

    expect(screen.getByText("Desactivada")).toBeInTheDocument();
    expect(screen.getByText("SBS")).toBeInTheDocument();
    expect(screen.getByText("Usa la cuenta de axi")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /notas de voz de la empresa/i }));
    await waitFor(() => expect(enable).toHaveBeenCalledWith(true));

    const input = screen.getByLabelText(/llave de elevenlabs/i);
    expect(input).toBeEnabled();
    const save = screen.getByRole("button", { name: "Guardar" });
    expect(save).toBeDisabled(); // vacía: no hay nada que guardar
    fireEvent.change(input, { target: { value: "sk-el-tenant-key-1234567890" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(setKey).toHaveBeenCalledWith("sk-el-tenant-key-1234567890"));
    // write-only: el campo se limpia tras guardar
    await waitFor(() => expect(input).toHaveValue(""));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Llave guardada" }));
  });

  it("activa con llave y consumo: pinta la barra y quitar pasa por la confirmación escrita", async () => {
    voice = {
      ...base(),
      ai_enabled: true,
      plan: { code: "enterprise", tier: "enterprise" },
      credential: { configured: true, provider: "elevenlabs" },
      usage: { used: 178_400, limit: 300_000, pct_used: 59.5, period_end: "2026-09-30T05:00:00.000Z" },
    };
    removeKey.mockResolvedValueOnce(undefined);
    render(<TenantVoiceView tenantId="t-1" />);

    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /caracteres de voz/i })).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText(/178\.400 \/ 300\.000 caracteres · 60 %/)).toBeInTheDocument();
    expect(screen.getByText(/Configurada · elevenlabs/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /quitar llave/i }));
    const dialog = screen.getByRole("dialog", { name: /quitar la llave de elevenlabs/i });
    expect(dialog).toHaveTextContent("QUITAR");
    fireEvent.click(screen.getByRole("button", { name: "confirmar" }));
    await waitFor(() => expect(removeKey).toHaveBeenCalledTimes(1));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Llave retirada" }));
  });

  it("un error del servidor al encender se dice como error, no como éxito", async () => {
    enable.mockRejectedValueOnce(new Error("Sin permiso"));
    render(<TenantVoiceView tenantId="t-1" />);
    fireEvent.click(screen.getByRole("switch", { name: /notas de voz de la empresa/i }));
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "No se pudo cambiar el interruptor" })));
  });
});
