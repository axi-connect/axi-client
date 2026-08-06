import { buildVoiceDto } from "../CharacterForm";

/**
 * El `voice` que viaja al backend es un schema ESTRICTO (el catálogo curado
 * es invariante del servidor): estas reglas evitan un 400 por clave extra y
 * el borrado accidental de la voz.
 */
const values = {
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  voice_stability: 0.6,
  voice_similarity: 0.8,
  voice_speed: 1.05,
};

describe("buildVoiceDto", () => {
  it("create sin voz: no envía la clave voice en absoluto", () => {
    expect(buildVoiceDto({ ...values, voice_id: "" }, {})).toBeUndefined();
  });

  it("quitar la voz envía voice vacío (la política degrada sola a texto)", () => {
    expect(buildVoiceDto({ ...values, voice_id: "" }, { voice_id: "EXAV" })).toEqual({});
  });

  it("con voz elegida envía EXACTAMENTE las claves del schema", () => {
    const dto = buildVoiceDto(values, {});
    expect(dto).toEqual({
      provider: "elevenlabs",
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      settings: { stability: 0.6, similarity_boost: 0.8, speed: 1.05 },
    });
  });

  it("preserva model_id y settings.style existentes (el form no los edita)", () => {
    const dto = buildVoiceDto(values, {
      voice_id: "old",
      model_id: "eleven_flash_v2_5",
      settings: { style: 0.2, stability: 0.1 },
      // clave desconocida guardada por una versión anterior: NO debe viajar
      legacy_key: "x",
    });
    expect(dto).toEqual({
      provider: "elevenlabs",
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      model_id: "eleven_flash_v2_5",
      settings: { style: 0.2, stability: 0.6, similarity_boost: 0.8, speed: 1.05 },
    });
  });
});
