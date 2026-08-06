import { fireEvent, render, screen } from "@testing-library/react";
import type { AiVoiceDTO } from "@/modules/agents/domain/voice";
import { VoiceSelector } from "../VoiceSelector";

const voice = (over: Partial<AiVoiceDTO>): AiVoiceDTO => ({
  id: "v1",
  provider: "elevenlabs",
  external_voice_id: "EXAV",
  name: "Valentina",
  description: "Cálida y cercana",
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  default_settings: {},
  preview_url: "https://storage.example/preview.ogg",
  sort_order: 1,
  ...over,
});

const VOICES: AiVoiceDTO[] = [
  voice({}),
  voice({ id: "v2", external_voice_id: "ErXw", name: "Antonio", gender: "male", preview_url: null }),
];

describe("VoiceSelector", () => {
  it("cerrado muestra la voz elegida; sin voz, el placeholder de solo texto", () => {
    const { rerender } = render(<VoiceSelector voices={VOICES} value="" onChange={jest.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Sin voz — responde solo texto");
    rerender(<VoiceSelector voices={VOICES} value="EXAV" onChange={jest.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Valentina");
  });

  it("abre el catálogo, selecciona por click y cierra", () => {
    const onChange = jest.fn();
    render(<VoiceSelector voices={VOICES} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Antonio"));
    expect(onChange).toHaveBeenCalledWith("ErXw");
  });

  it("escuchar una muestra NO selecciona la voz", () => {
    const onChange = jest.fn();
    render(<VoiceSelector voices={VOICES} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("button", { name: /Escuchar muestra de Valentina/u }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("voz sin muestra: botón deshabilitado con explicación, jamás oculto", () => {
    render(<VoiceSelector voices={VOICES} value="" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("combobox"));
    const pending = screen.getByRole("button", { name: /Muestra de Antonio pendiente/u });
    expect(pending).toBeDisabled();
  });

  it("una voz guardada que salió del catálogo se muestra como no disponible", () => {
    render(<VoiceSelector voices={VOICES} value="retired-id" onChange={jest.fn()} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("retired-id (ya no disponible)");
  });

  it("deshabilitado no abre el catálogo (empresa con la voz apagada)", () => {
    render(<VoiceSelector voices={VOICES} value="" onChange={jest.fn()} disabled />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
  });
});
