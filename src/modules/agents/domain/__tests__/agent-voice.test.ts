import { buildVoiceDto, voiceFormValues } from "../agent-voice";

/**
 * El `voice` que viaja al backend es un schema ESTRICTO (el catálogo curado
 * es invariante del servidor): estas reglas evitan un 400 por clave extra y
 * el borrado accidental de la voz. Antes vivían en el character.
 */
const values = {
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  stability: 0.6,
  similarity_boost: 0.8,
  speed: 1.05,
};

describe("buildVoiceDto", () => {
  it("sin voz antes ni ahora: no envía la clave voice en absoluto", () => {
    expect(buildVoiceDto({ ...values, voice_id: "" }, null)).toBeUndefined();
  });

  it("quitar la voz envía voice vacío (la política degrada sola a texto)", () => {
    expect(buildVoiceDto({ ...values, voice_id: "" }, { provider: "elevenlabs", voice_id: "EXAV" })).toEqual({});
  });

  it("con voz elegida envía EXACTAMENTE las claves del schema", () => {
    expect(buildVoiceDto(values, null)).toEqual({
      provider: "elevenlabs",
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      settings: { stability: 0.6, similarity_boost: 0.8, speed: 1.05 },
    });
  });

  it("preserva model_id y settings.style existentes (el form no los edita)", () => {
    expect(
      buildVoiceDto(values, {
        provider: "elevenlabs",
        voice_id: "old",
        model_id: "eleven_flash_v2_5",
        settings: { style: 0.2, stability: 0.1 },
      }),
    ).toEqual({
      provider: "elevenlabs",
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      model_id: "eleven_flash_v2_5",
      settings: { style: 0.2, stability: 0.6, similarity_boost: 0.8, speed: 1.05 },
    });
  });
});

describe("voiceFormValues", () => {
  it("rellena con los defaults lo que el agente no fijó", () => {
    expect(voiceFormValues(null)).toEqual({ voice_id: "", stability: 0.5, similarity_boost: 0.75, speed: 1 });
    expect(voiceFormValues({ provider: "elevenlabs", voice_id: "v1", settings: { speed: 0.9 } })).toEqual({
      voice_id: "v1",
      stability: 0.5,
      similarity_boost: 0.75,
      speed: 0.9,
    });
  });
});
