import { cleanup, render, screen } from "@testing-library/react";
import { RouteHero } from "../RouteHero";
import { learningPace, pace, plan } from "../../__tests__/fixtures";

jest.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  animate: () => ({ stop: () => {} }),
}));

afterEach(cleanup);

describe("RouteHero", () => {
  it("la línea se describe entera: recorrido, esperado y proyección", () => {
    render(<RouteHero pace={pace} plan={plan} />);
    expect(screen.getByRole("img", { name: "Ruta del mes: 63 % recorrido, 77 % esperado a hoy, proyección 82 %" })).toBeInTheDocument();
    expect(screen.getByText("cierre ≈ $ 24,6 M · 82 %")).toBeInTheDocument();
    expect(screen.getByText("Para llegar faltan $ 11,1 M: 3 ventas al día en los 6 días hábiles que quedan.")).toBeInTheDocument();
    expect(screen.getByText("Atrasado")).toBeInTheDocument();
  });

  it("aprendiendo: sin marcador, sin proyección y con su frase", () => {
    render(<RouteHero pace={learningPace} plan={plan} />);
    expect(screen.getByRole("img", { name: "Ruta del mes: 5 % recorrido" })).toBeInTheDocument();
    expect(screen.queryByText(/cierre ≈/)).toBeNull();
    expect(screen.queryByText("hoy")).toBeNull();
    expect(screen.getByText("Estamos aprendiendo tu ritmo. En 5 días tendrás proyección y acciones.")).toBeInTheDocument();
    expect(screen.getByText("Aprendiendo tu ritmo")).toBeInTheDocument();
  });

  it("cada línea trae su propio gradiente: dos rutas en la misma página no se pisan", () => {
    const { container } = render(
      <>
        <RouteHero pace={pace} plan={plan} />
        <RouteHero pace={pace} plan={plan} />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((node) => node.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`[stroke="url(#${id})"]`)).not.toBeNull();
    }
  });
});
