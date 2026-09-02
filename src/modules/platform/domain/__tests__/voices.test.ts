import { moveVoice, voiceGenderLabel, voicePreviewStale } from "../voices";
import type { PlatformVoice } from "../voices";

const VOICE: PlatformVoice = {
  id: "v1",
  provider: "elevenlabs",
  external_voice_id: "EXAV",
  name: "Valentina",
  description: null,
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  default_settings: {},
  preview_url: null,
  preview_text: null,
  preview_generated_at: null,
  is_active: true,
  sort_order: 10,
  characters_count: 0,
  updated_at: "2026-08-31T10:00:00.000Z",
};

describe("moveVoice (única implementación del invariante de orden)", () => {
  const IDS = ["a", "b", "c"];

  it("sube y baja un puesto", () => {
    expect(moveVoice(IDS, 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveVoice(IDS, 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("en los bordes devuelve el MISMO orden (doble click rápido no corrompe)", () => {
    expect(moveVoice(IDS, 0, "up")).toEqual(IDS);
    expect(moveVoice(IDS, 2, "down")).toEqual(IDS);
    expect(moveVoice(IDS, 5, "up")).toEqual(IDS);
  });

  it("no muta el array de entrada", () => {
    const input = ["a", "b"];
    moveVoice(input, 0, "down");
    expect(input).toEqual(["a", "b"]);
  });
});

describe("voicePreviewStale", () => {
  it("sin muestra generada no hay desactualización que avisar", () => {
    expect(voicePreviewStale(VOICE)).toBe(false);
  });

  it("editada DESPUÉS de la muestra → desactualizada; antes → vigente", () => {
    expect(
      voicePreviewStale({
        ...VOICE,
        preview_generated_at: "2026-08-31T09:00:00.000Z",
        updated_at: "2026-08-31T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      voicePreviewStale({
        ...VOICE,
        preview_generated_at: "2026-08-31T11:00:00.000Z",
        updated_at: "2026-08-31T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("voiceGenderLabel", () => {
  it("traduce los conocidos y deja pasar lo demás sin ocultarlo", () => {
    expect(voiceGenderLabel("female")).toBe("Femenina");
    expect(voiceGenderLabel("male")).toBe("Masculina");
    expect(voiceGenderLabel("neutral")).toBe("neutral");
    expect(voiceGenderLabel(null)).toBeNull();
  });
});
