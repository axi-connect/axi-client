import { act, fireEvent, render, screen } from "@testing-library/react";

import { GAME, GAME_ABILITIES, GAME_MOVES } from "@/modules/landing/ui/content/productos.content";
import { ProductosGame } from "../game/ProductosGame";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- doble de prueba de next/image
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));
jest.mock("framer-motion", () => ({ useReducedMotion: () => false }));

let audios: { src: string; play: jest.Mock; pause: jest.Mock; onended: (() => void) | null }[] = [];

let islands: unknown[] = [];
let activity: { title: string; detail: string }[] = [];
const onIsland = (e: Event) => islands.push((e as CustomEvent).detail);
const onActivity = (e: Event) => activity.push((e as CustomEvent).detail);
let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;

beforeAll(() => {
  window.IntersectionObserver = jest.fn((cb) => {
    ioCallback = cb;
    return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() };
  }) as unknown as typeof IntersectionObserver;
  window.ResizeObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof ResizeObserver;
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  islands = [];
  activity = [];
  window.addEventListener("site:island", onIsland);
  window.addEventListener("film:activity", onActivity);
  jest.useFakeTimers();
  audios = [];
  window.Audio = jest.fn((src: string) => {
    const a = { src, play: jest.fn(() => Promise.resolve()), pause: jest.fn(), onended: null as (() => void) | null };
    audios.push(a);
    return a;
  }) as unknown as typeof Audio;
});
afterEach(() => {
  jest.useRealTimers();
  window.removeEventListener("site:island", onIsland);
  window.removeEventListener("film:activity", onActivity);
});

const move = (label: string) => screen.getByRole("button", { name: label });

test("una jugada descubre su habilidad: la isla del nav la anuncia y la lista la enciende", () => {
  render(<ProductosGame />);
  fireEvent.click(move(GAME_MOVES[0].label));
  expect(move(GAME_MOVES[0].label)).toBeDisabled();
  act(() => jest.advanceTimersByTime(1200));

  const foto = GAME_ABILITIES.find((a) => a.id === "foto")!;
  expect(activity).toEqual([{ title: GAME.island.discovered(foto.name), detail: foto.line }]);
  expect(screen.getByText(foto.name)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(GAME.island.count(1, GAME_ABILITIES.length));
});

test("con el juego en pantalla, la isla del nav dice «Juega a ser tu cliente · N de 7»; al salir, se suelta", () => {
  render(<ProductosGame />);
  act(() => ioCallback?.([{ isIntersecting: true }]));
  expect(islands.at(-1)).toEqual({ title: GAME.island.title, sub: GAME.island.count(0, GAME_ABILITIES.length), ring: 0 });

  fireEvent.click(move(GAME_MOVES[0].label));
  act(() => jest.advanceTimersByTime(1200));
  expect(islands.at(-1)).toEqual({ title: GAME.island.title, sub: GAME.island.count(1, GAME_ABILITIES.length), ring: 1 / GAME_ABILITIES.length });

  act(() => ioCallback?.([{ isIntersecting: false }]));
  expect(islands.at(-1)).toBeNull();
});

test("«Háblale» suena primero el cliente y, al terminar, la respuesta de Axi", async () => {
  render(<ProductosGame />);
  fireEvent.click(move("Háblale"));
  expect(audios.map((a) => a.src)).toEqual(["/assets/audio/cliente-gafas.mp3"]);

  await act(async () => audios[0].onended?.());
  act(() => jest.advanceTimersByTime(800));
  expect(audios.map((a) => a.src)).toEqual(["/assets/audio/cliente-gafas.mp3", "/assets/audio/agente-aviador.mp3"]);
});

test("las seis jugadas completan el juego y «Jugar otra vez» lo reinicia", () => {
  render(<ProductosGame />);
  for (const m of GAME_MOVES.filter((x) => x.id !== "voz")) {
    fireEvent.click(move(m.label));
    act(() => jest.advanceTimersByTime(1500));
    act(() => jest.advanceTimersByTime(3000));
  }
  fireEvent.click(move("Háblale"));
  act(() => audios[0].onended?.());
  act(() => jest.advanceTimersByTime(800));
  act(() => jest.advanceTimersByTime(3000));

  expect(screen.getByText(GAME.done.thin)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: GAME.done.replay }));
  expect(screen.queryByText(GAME.done.thin)).toBeNull();
  expect(move(GAME_MOVES[0].label)).toBeEnabled();
});

test("las notas de la demo nunca entran al chat del cliente", () => {
  render(<ProductosGame />);
  for (const m of GAME_MOVES.filter((x) => x.id !== "voz")) {
    fireEvent.click(move(m.label));
    act(() => jest.advanceTimersByTime(4500));
  }
  const log = screen.getByRole("log");
  expect(log.textContent).not.toMatch(/CRM|30 % no existe|política/);
});
