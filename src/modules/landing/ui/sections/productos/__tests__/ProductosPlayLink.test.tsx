import { fireEvent, render, screen } from "@testing-library/react";

import { PRODUCTOS_ANCHORS, PRODUCTOS_HERO } from "@/modules/landing/ui/content/productos.content";
import { ProductosPlayLink } from "../ProductosPlayLink";

/** «Jugar ahora» recorre el scroll hasta el juego para que se vea bajar el teléfono. */
function stage(reduced: boolean) {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: reduced, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as unknown as typeof window.matchMedia;
  document.body.innerHTML = "";
  const scroller = document.createElement("div");
  scroller.setAttribute("data-app-scroll", "");
  const game = document.createElement("section");
  game.id = PRODUCTOS_ANCHORS.game;
  scroller.appendChild(game);
  document.body.appendChild(scroller);
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  game.getBoundingClientRect = () => ({ top: 900 - scroller.scrollTop }) as DOMRect;
  return scroller;
}

test("recorre el scroll hasta el juego, sin saltar, y deja el hash en #agente", () => {
  jest.useFakeTimers();
  const scroller = stage(false);
  render(<ProductosPlayLink />, { container: document.body.appendChild(document.createElement("div")) });
  const link = screen.getByRole("link", { name: PRODUCTOS_HERO.play.label });
  const prevented = !fireEvent.click(link);
  expect(prevented).toBe(true);
  jest.advanceTimersByTime(800);
  expect(scroller.scrollTop).toBeGreaterThan(0);
  expect(scroller.scrollTop).toBeLessThan(900);
  jest.advanceTimersByTime(1200);
  expect(scroller.scrollTop).toBe(900);
  expect(window.location.hash).toBe(`#${PRODUCTOS_ANCHORS.game}`);
  jest.useRealTimers();
});

test("con movimiento reducido es el enlace de siempre", () => {
  stage(true);
  render(<ProductosPlayLink />, { container: document.body.appendChild(document.createElement("div")) });
  const link = screen.getByRole("link", { name: PRODUCTOS_HERO.play.label });
  expect(fireEvent.click(link)).toBe(true);
  expect(link).toHaveAttribute("href", `#${PRODUCTOS_ANCHORS.game}`);
});
