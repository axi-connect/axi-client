import type { PlatformVoice } from "../../../../domain/voices";
import {
  DEFAULT_SAMPLE_PHRASE,
  defaultVoiceFormValues,
  toCreateVoiceDTO,
  toUpdateVoiceDTO,
  voiceFormSchema,
  voiceToFormValues,
} from "../voice-form.config";

const VOICE: PlatformVoice = {
  id: "v1",
  provider: "elevenlabs",
  external_voice_id: "EXAV",
  name: "Valentina",
  description: "Cálida",
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  default_settings: { stability: 0.4, similarity_boost: 0.8, speed: 1.1, style: 0.2 },
  preview_url: "https://s3/EXAV.ogg",
  preview_text: "Frase propia",
  preview_generated_at: "2026-08-31T09:00:00.000Z",
  is_active: true,
  sort_order: 10,
  characters_count: 3,
  updated_at: "2026-08-31T10:00:00.000Z",
};

describe("voice-form.config (§10.5)", () => {
  it("voiceToFormValues aplana settings y trae la frase guardada de la voz", () => {
    const values = voiceToFormValues(VOICE);
    expect(values).toMatchObject({
      external_voice_id: "EXAV",
      stability: 0.4,
      similarity_boost: 0.8,
      speed: 1.1,
      sample_phrase: "Frase propia",
    });
  });

  it("sin frase guardada cae a la frase de marca", () => {
    expect(voiceToFormValues({ ...VOICE, preview_text: null }).sample_phrase).toBe(
      DEFAULT_SAMPLE_PHRASE,
    );
  });

  it("toCreateVoiceDTO re-anida settings y normaliza vacíos a null", () => {
    expect(
      toCreateVoiceDTO({
        ...defaultVoiceFormValues,
        external_voice_id: "  NUEVA  ",
        name: "Renata",
        description: "",
        gender: "none",
        accent: "",
      }),
    ).toEqual({
      provider: "elevenlabs",
      external_voice_id: "NUEVA",
      name: "Renata",
      description: null,
      gender: null,
      accent: null,
      default_model_id: "eleven_flash_v2_5",
      default_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1 },
    });
  });

  it("toUpdateVoiceDTO NO lleva identidad y PRESERVA el style curado", () => {
    const dto = toUpdateVoiceDTO({ ...voiceToFormValues(VOICE), stability: 0.6 }, VOICE);
    expect(dto).not.toHaveProperty("external_voice_id");
    expect(dto).not.toHaveProperty("provider");
    // Enviar default_settings reemplaza el JSON completo: sin esto el style
    // guardado se borraría en silencio
    expect(dto.default_settings).toEqual({
      stability: 0.6,
      similarity_boost: 0.8,
      speed: 1.1,
      style: 0.2,
    });
  });

  it("el schema corta los rangos del proveedor y la frase vacía", () => {
    expect(voiceFormSchema.safeParse({ ...defaultVoiceFormValues, speed: 2.5 }).success).toBe(false);
    expect(voiceFormSchema.safeParse({ ...defaultVoiceFormValues, stability: -0.1 }).success).toBe(
      false,
    );
    expect(
      voiceFormSchema.safeParse({
        ...defaultVoiceFormValues,
        external_voice_id: "EXAV",
        name: "Voz",
        sample_phrase: "  ",
      }).success,
    ).toBe(false);
  });
});
