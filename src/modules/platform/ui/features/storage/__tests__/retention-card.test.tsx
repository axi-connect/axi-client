import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RetentionCard } from "../RetentionCard";

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));

const mockReplace = jest.fn();
const mockPreview = jest.fn();
const RECOMMENDED = [
  { kind: "conversation_media", filter: { origin: "customer", mime_classes: ["video"] }, max_age_days: 180 },
  { kind: "call_recordings", filter: {}, max_age_days: 90 },
];

jest.mock("../../../../infrastructure/api/hooks/use-storage", () => ({
  useRetentionPolicies: () => ({ isPending: false, isError: false, data: { data: [], recommended: RECOMMENDED } }),
  useReplaceRetention: () => ({ mutateAsync: mockReplace, isPending: false }),
  usePurgePreview: () => ({ mutateAsync: mockPreview }),
}));

describe("Retención automática (C-6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockResolvedValue(undefined);
    mockPreview.mockResolvedValue({ files: 3, bytes: 1024 ** 3, confirm_phrase: "ELIMINAR axi-demo" });
  });

  it("«Usar la recomendada» no guarda nada hasta confirmar con la cifra de esta noche y la frase", async () => {
    render(<RetentionCard tenantId="c1" canEdit />);
    fireEvent.click(screen.getByRole("button", { name: /Usar la recomendada/ }));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(await screen.findByText(/Esta noche se borrarían hasta/)).toHaveTextContent("2 GB");
    expect(mockPreview).toHaveBeenCalledWith({
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["video"], older_than_days: 180 },
    });

    const confirm = screen.getByRole("button", { name: "Encender retención" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Para confirmar/), { target: { value: "ELIMINAR axi-demo" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockReplace.mock.calls[0][0]).toHaveLength(2);
  });

  it("billing_ops (sin edición) no ve cómo encender ni agregar reglas", () => {
    render(<RetentionCard tenantId="c1" canEdit={false} />);
    expect(screen.queryByRole("button", { name: /Usar la recomendada/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Agregar regla/ })).toBeNull();
  });
});
