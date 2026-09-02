import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PlatformVoice } from "../../../../domain/voices";
import { VoiceFormSheet } from "../VoiceFormSheet";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const createMutateAsync = jest.fn();
const updateMutateAsync = jest.fn();
const previewMutateAsync = jest.fn();
jest.mock("../../../../infrastructure/api/hooks/use-voices", () => ({
  useCreateVoice: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateVoice: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useGeneratePreview: () => ({ mutateAsync: previewMutateAsync, isPending: false }),
}));

// El DetailSheet real usa portal + framer-motion; para el form basta el contenido.
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const VOICE: PlatformVoice = {
  id: "v1",
  provider: "elevenlabs",
  external_voice_id: "EXAV",
  name: "Valentina",
  description: "Cálida",
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  default_settings: { stability: 0.4, similarity_boost: 0.8, speed: 1.1 },
  preview_url: "https://s3/EXAV.ogg",
  preview_text: "Frase propia de Valentina",
  preview_generated_at: "2026-08-31T09:00:00.000Z",
  is_active: true,
  sort_order: 10,
  characters_count: 3,
  updated_at: "2026-08-31T10:00:00.000Z",
};

describe("VoiceFormSheet (§10.5)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("crear: guarda la voz y genera su muestra con la frase del form", async () => {
    createMutateAsync.mockResolvedValue({ id: "v-nueva" });
    previewMutateAsync.mockResolvedValue({ preview_url: "https://s3/nueva.ogg" });
    render(<VoiceFormSheet open onOpenChange={jest.fn()} voice={null} />);

    fireEvent.change(screen.getByLabelText("voice_id de ElevenLabs *"), {
      target: { value: "NUEVA123" },
    });
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Renata" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar voz" }));

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "elevenlabs",
          external_voice_id: "NUEVA123",
          name: "Renata",
          default_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1 },
        }),
      ),
    );
    await waitFor(() =>
      expect(previewMutateAsync).toHaveBeenCalledWith({
        id: "v-nueva",
        text: "Hola, soy tu asesor de Axi. ¿En qué te puedo ayudar hoy?",
      }),
    );
  });

  it("editar: la identidad va bloqueada y el PATCH no la lleva", async () => {
    updateMutateAsync.mockResolvedValue(undefined);
    render(<VoiceFormSheet open onOpenChange={jest.fn()} voice={VOICE} />);

    expect(screen.getByLabelText("voice_id de ElevenLabs *")).toBeDisabled();
    expect(
      screen.getAllByText("Inmutable: los characters de los tenants la referencian").length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Valentina Pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    const { body } = updateMutateAsync.mock.calls[0][0] as { body: Record<string, unknown> };
    expect(body).not.toHaveProperty("external_voice_id");
    expect(body).toMatchObject({ name: "Valentina Pro" });
    // El create y el preview NO corren en edición (la muestra es explícita)
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(previewMutateAsync).not.toHaveBeenCalled();
  });

  it("editar: trae la frase guardada y «Regenerar muestra» la manda al preview", async () => {
    previewMutateAsync.mockResolvedValue({ preview_url: "https://s3/fresca.ogg" });
    render(<VoiceFormSheet open onOpenChange={jest.fn()} voice={VOICE} />);

    const phrase = screen.getByLabelText("Frase de la muestra");
    expect(phrase).toHaveValue("Frase propia de Valentina");
    fireEvent.change(phrase, { target: { value: "Hola, soy Valentina, tu asesora." } });
    fireEvent.click(screen.getByRole("button", { name: /Regenerar muestra con esta frase/u }));

    await waitFor(() =>
      expect(previewMutateAsync).toHaveBeenCalledWith({
        id: "v1",
        text: "Hola, soy Valentina, tu asesora.",
      }),
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it("crear: si la síntesis de la muestra falla, la voz QUEDA creada", async () => {
    createMutateAsync.mockResolvedValue({ id: "v-nueva" });
    previewMutateAsync.mockRejectedValue(new Error("proveedor caído"));
    const onOpenChange = jest.fn();
    render(<VoiceFormSheet open onOpenChange={onOpenChange} voice={null} />);

    fireEvent.change(screen.getByLabelText("voice_id de ElevenLabs *"), {
      target: { value: "NUEVA123" },
    });
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Renata" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar voz" }));

    await waitFor(() => expect(previewMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
