import { agentVoicePolicy } from "../agent";
import { characterHasVoice, characterVoice } from "../character";
import type { CharacterDTO } from "../character";

/**
 * Parsers de voz del dominio (§10.5 F2): leen JSON libre de la vista con
 * tolerancia — la escritura estricta la garantiza el backend.
 */
const character = (voice: unknown): CharacterDTO =>
  ({ id: "c1", name: "Sofía", voice }) as CharacterDTO;

describe("characterVoice / characterHasVoice", () => {
  it("sin voice o con voice nulo no hay voz", () => {
    expect(characterHasVoice(character(null))).toBe(false);
    expect(characterHasVoice(character(undefined))).toBe(false);
    expect(characterHasVoice(character({}))).toBe(false);
  });

  it("voice_id vacío no cuenta como voz (la política degradaría a texto)", () => {
    expect(characterHasVoice(character({ voice_id: "" }))).toBe(false);
  });

  it("expone los ajustes tal cual vienen", () => {
    const parsed = characterVoice(
      character({ provider: "elevenlabs", voice_id: "EXAV", settings: { stability: 0.4 } }),
    );
    expect(parsed.voice_id).toBe("EXAV");
    expect(parsed.settings?.stability).toBe(0.4);
  });
});

describe("agentVoicePolicy", () => {
  it("apagada por defecto: la voz es opt-in estricto", () => {
    expect(agentVoicePolicy(null).enabled).toBe(false);
    expect(agentVoicePolicy(undefined).enabled).toBe(false);
    expect(agentVoicePolicy({}).enabled).toBe(false);
    // truthy no basta: solo `true` literal enciende
    expect(agentVoicePolicy({ enabled: 1 } as never).enabled).toBe(false);
  });

  it("expone los topes solo cuando son numéricos", () => {
    const policy = agentVoicePolicy({ enabled: true, max_per_conversation: 8, max_chars: "600" });
    expect(policy).toEqual({ enabled: true, max_per_conversation: 8 });
  });
});
