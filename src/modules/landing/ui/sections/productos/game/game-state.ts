import {
  GAME,
  GAME_ABILITIES,
  GAME_MOVES,
  type GameAbilityId,
  type GameMessage,
  type GameMoveId,
} from "@/modules/landing/ui/content/productos.content";

/**
 * Estado del juego de `/productos` (#agente), sin React ni tiempos: el
 * componente decide CUÁNDO llega la respuesta; aquí solo QUÉ cambia. Así cada
 * regla se prueba sin temporizadores.
 */
export interface GameEntry {
  /** Clave estable para React: jugada + posición. */
  key: string;
  message: GameMessage;
}

export interface GameState {
  log: readonly GameEntry[];
  used: readonly GameMoveId[];
  got: readonly GameAbilityId[];
  /** Jugada cuya respuesta está «escribiendo…». */
  pending: GameMoveId | null;
}

const GREETING: GameEntry = { key: "greeting", message: { kind: "text", from: "agent", text: GAME.greeting } };

export const initialGame: GameState = { log: [GREETING], used: [], got: [], pending: null };

export const TOTAL_ABILITIES = GAME_ABILITIES.length;

const moveById = (id: GameMoveId) => {
  const move = GAME_MOVES.find((m) => m.id === id);
  if (!move) throw new Error(`Jugada desconocida: ${id}`);
  return move;
};

const entries = (id: string, messages: readonly GameMessage[], from: number): GameEntry[] =>
  messages.map((message, i) => ({ key: `${id}-${from + i}`, message }));

/** El visitante hace una jugada: entra lo que escribe y queda esperando la respuesta. */
export function play(state: GameState, id: GameMoveId): GameState {
  if (state.used.includes(id) || state.pending) return state;
  const move = moveById(id);
  return { ...state, log: [...state.log, ...entries(id, move.customer, 0)], used: [...state.used, id], pending: id };
}

/** Llega la respuesta de la jugada pendiente y se descubre su habilidad. */
export function reply(state: GameState): GameState {
  if (!state.pending) return state;
  const move = moveById(state.pending);
  const got = state.got.includes(move.id) ? state.got : [...state.got, move.id];
  return { ...state, log: [...state.log, ...entries(move.id, move.reply, move.customer.length)], got, pending: null };
}

/** El CRM se descubre solo, tras `GAME.crmAfterMoves` jugadas respondidas. */
export function crmDue(state: GameState): boolean {
  const answered = state.got.filter((g) => g !== "crm").length;
  return answered >= GAME.crmAfterMoves && !state.got.includes("crm");
}

export function unlockCrm(state: GameState): GameState {
  return crmDue(state) ? { ...state, got: [...state.got, "crm"] } : state;
}

export const isDone = (state: GameState) => state.got.length >= TOTAL_ABILITIES;

/** El evento con el que el router de hash resalta una jugada (#reconocimiento). */
export const GAME_HINT_EVENT = "productos:move";
