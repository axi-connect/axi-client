/**
 * El muro «Así suena un negocio con Axi», recuperado del /productos original
 * con sus ajustes de honestidad: dice que es de ejemplo, solo WhatsApp y nada
 * de tallas (el cierre con variantes sigue abierto).
 */
import { render, screen } from "@testing-library/react";

import { WALL } from "@/modules/landing/ui/content/productos.content";
import { ProductosWall } from "../ProductosWall";

const messages = WALL.columns.flat();

test("pinta cada mensaje (con la copia del bucle oculta) bajo su título y la marca de ejemplo", () => {
  const { container } = render(<ProductosWall />);
  expect(container.querySelector(`section#${WALL.anchor}`)).not.toBeNull();
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(`${WALL.strong} ${WALL.thin}`);
  expect(screen.getByText(WALL.sample)).toBeInTheDocument();
  expect(container.querySelectorAll(".pj-wall-card")).toHaveLength(messages.length * 2);
  // La segunda copia del marquee no se lee dos veces.
  expect(container.querySelectorAll('[aria-hidden="true"] .pj-wall-card')).toHaveLength(messages.length);
});

test("honestidad: cliente y agente se alternan en negocios de ejemplo, sin tallas ni promesas de canal", () => {
  expect(messages.some((m) => m.from === "agent")).toBe(true);
  expect(messages.some((m) => m.from === "customer")).toBe(true);
  expect(WALL.channel).toBe("WhatsApp");
  const texto = [WALL.eyebrow, WALL.lead, ...messages.map((m) => m.text)].join(" ");
  expect(texto).not.toMatch(/en vivo|datos reales|instagram|messenger|talla|tarjeta|guía/i);
});
