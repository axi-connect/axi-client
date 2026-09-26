import type { AuraMode, LiveCallPulse } from "@/modules/calls/domain/live-call";

type PhraseSegment = { seq: number; role: "caller" | "agent" | "system"; text: string };

export type StagePhrase = {
  role: "caller" | "agent" | "system";
  text: string;
  /** Atenuada: lo último que se dijo mientras otro habla o el agente piensa. */
  dim: boolean;
  /** Ritmo del revelado: el agente al paso de su voz; el cliente, rápido — su
   * texto llega cuando ya terminó de hablar. */
  msPerWord: number;
};

const AGENT_MS_PER_WORD = 250;
const CALLER_MS_PER_WORD = 70;

/**
 * La frase del escenario en vivo (canvas, tablero 3). El borrador del agente
 * (su texto mientras suena) manda; si no hay, la última frase del transcript.
 * Se atenúa cuando ya no es de quien tiene la palabra.
 */
export function stagePhrase(
  segments: readonly PhraseSegment[],
  pulse: LiveCallPulse,
  mode: AuraMode,
): StagePhrase | null {
  const draft = pulse.draft;
  if (draft !== null) {
    return { role: "agent", text: draft.text, dim: mode === "caller", msPerWord: AGENT_MS_PER_WORD };
  }
  const last = segments.reduce<PhraseSegment | null>(
    (latest, segment) => (latest === null || segment.seq > latest.seq ? segment : latest),
    null,
  );
  if (last === null) return null;
  const dim =
    mode === "thinking" ||
    (mode === "caller" && last.role !== "caller") ||
    (mode === "agent" && last.role !== "agent");
  return {
    role: last.role,
    text: last.text,
    dim,
    msPerWord: last.role === "caller" ? CALLER_MS_PER_WORD : AGENT_MS_PER_WORD,
  };
}

/** El primer nombre para «Habla Laura»; sin nombre, «el cliente». */
export function speakerFirstName(name: string | null | undefined, fallback: string): string {
  const first = name?.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? fallback : first;
}

/** Quién tiene la palabra, en texto (el aura es decorativa). */
export function whoLabel(
  mode: AuraMode,
  names: { agent: string; caller: string },
  ringing: boolean,
): string {
  if (ringing) return "Llamando…";
  switch (mode) {
    case "agent":
      return `Habla ${names.agent}`;
    case "caller":
      return `Habla ${names.caller}`;
    case "thinking":
      return `${names.agent} está pensando…`;
    case "listening":
      return "Escuchando";
    case "idle":
      return "En silencio";
  }
}
