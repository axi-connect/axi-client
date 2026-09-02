import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PlatformVoice } from "../../../../domain/voices";
import { VoicesView } from "../VoicesView";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock("../VoiceFormSheet", () => ({
  VoiceFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="voice-sheet" /> : null,
}));

const reorderMutateAsync = jest.fn();
const setActiveMutateAsync = jest.fn();
const previewMutateAsync = jest.fn();
let queryResult: Record<string, unknown>;
jest.mock("../../../../infrastructure/api/hooks/use-voices", () => ({
  useVoicesQuery: () => queryResult,
  useReorderVoices: () => ({ mutateAsync: reorderMutateAsync, isPending: false }),
  useSetVoiceActive: () => ({ mutateAsync: setActiveMutateAsync, isPending: false }),
  useGeneratePreview: () => ({ mutateAsync: previewMutateAsync, isPending: false }),
}));

const voice = (over: Partial<PlatformVoice>): PlatformVoice => ({
  id: "v1",
  provider: "elevenlabs",
  external_voice_id: "EXAV",
  name: "Valentina",
  description: "Cálida",
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  default_settings: {},
  preview_url: "https://s3/EXAV.ogg",
  preview_text: null,
  preview_generated_at: "2026-08-31T09:00:00.000Z",
  is_active: true,
  sort_order: 10,
  characters_count: 0,
  updated_at: "2026-08-31T08:00:00.000Z",
  ...over,
});

const VOICES: PlatformVoice[] = [
  voice({}),
  voice({ id: "v2", external_voice_id: "ErXw", name: "Antonio", characters_count: 3 }),
  voice({ id: "v3", external_voice_id: "XB0f", name: "Carlota", preview_url: null, preview_generated_at: null, is_active: false }),
];

beforeEach(() => {
  jest.clearAllMocks();
  queryResult = {
    data: { data: VOICES },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
});

describe("VoicesView (§10.5 curaduría)", () => {
  it("pinta el catálogo completo: activas, retiradas y muestra pendiente", () => {
    render(<VoicesView />);
    expect(screen.getByText("Valentina")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Muestra de Carlota pendiente" })).toBeDisabled();
    // El conteo de characters vive en la fila de su voz (0 = raya, no número)
    const antonioRow = screen.getByText("Antonio").closest("tr");
    expect(within(antonioRow as HTMLElement).getByText("3")).toBeInTheDocument();
    const valentinaRow = screen.getByText("Valentina").closest("tr");
    expect(within(valentinaRow as HTMLElement).getByText("—")).toBeInTheDocument();
  });

  it("las flechas reordenan en LOCAL y «Guardar orden» hace el replace-set completo", async () => {
    reorderMutateAsync.mockResolvedValue(undefined);
    render(<VoicesView />);

    // Sin cambios no hay barra de guardado
    expect(screen.queryByRole("button", { name: "Guardar orden" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Subir Antonio" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cambiaste el orden del selector");

    fireEvent.click(screen.getByRole("button", { name: "Guardar orden" }));
    await waitFor(() =>
      expect(reorderMutateAsync).toHaveBeenCalledWith(["v2", "v1", "v3"]),
    );
  });

  it("«Descartar» vuelve al orden del servidor sin llamar a nadie", () => {
    render(<VoicesView />);
    fireEvent.click(screen.getByRole("button", { name: "Bajar Valentina" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.queryByRole("button", { name: "Guardar orden" })).not.toBeInTheDocument();
    expect(reorderMutateAsync).not.toHaveBeenCalled();
  });

  it("los bordes van deshabilitados: la primera no sube, la última no baja", () => {
    render(<VoicesView />);
    expect(screen.getByRole("button", { name: "Subir Valentina" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar Carlota" })).toBeDisabled();
  });

  it("retirar pide confirmación con el conteo real de characters", async () => {
    setActiveMutateAsync.mockResolvedValue(undefined);
    render(<VoicesView />);

    fireEvent.click(screen.getByRole("button", { name: "Acciones de Antonio" }));
    fireEvent.click(await screen.findByText("Retirar del selector"));

    expect(await screen.findByText(/3 characters la usan hoy/u)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirar voz" }));
    await waitFor(() =>
      expect(setActiveMutateAsync).toHaveBeenCalledWith({ id: "v2", is_active: false }),
    );
  });

  it("reactivar una retirada no pide confirmación (es inocuo)", async () => {
    setActiveMutateAsync.mockResolvedValue(undefined);
    render(<VoicesView />);

    fireEvent.click(screen.getByRole("button", { name: "Acciones de Carlota" }));
    fireEvent.click(await screen.findByText("Reactivar"));
    await waitFor(() =>
      expect(setActiveMutateAsync).toHaveBeenCalledWith({ id: "v3", is_active: true }),
    );
  });

  it("«Generar muestra» de la fila llama al preview SIN text (usa la frase guardada)", async () => {
    previewMutateAsync.mockResolvedValue({ preview_url: "https://s3/fresca.ogg" });
    render(<VoicesView />);

    fireEvent.click(screen.getByRole("button", { name: "Acciones de Carlota" }));
    fireEvent.click(await screen.findByText("Generar muestra"));
    await waitFor(() => expect(previewMutateAsync).toHaveBeenCalledWith({ id: "v3" }));
  });

  it("marca la muestra desactualizada cuando la voz se editó después de generarla", () => {
    queryResult = {
      ...queryResult,
      data: {
        data: [
          voice({
            preview_generated_at: "2026-08-31T08:00:00.000Z",
            updated_at: "2026-08-31T09:00:00.000Z",
          }),
        ],
      },
    };
    render(<VoicesView />);
    expect(screen.getByLabelText("Muestra desactualizada")).toBeInTheDocument();
  });
});
