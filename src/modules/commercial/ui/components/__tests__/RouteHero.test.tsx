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
    expect(screen.getByText("Ritmo bajo")).toBeInTheDocument();
  });

  it("aprendiendo: sin marcador, sin proyección y con su frase", () => {
    render(<RouteHero pace={learningPace} plan={plan} />);
    expect(screen.getByRole("img", { name: "Ruta del mes: 5 % recorrido" })).toBeInTheDocument();
    expect(screen.queryByText(/cierre ≈/)).toBeNull();
    expect(screen.queryByText("hoy")).toBeNull();
    expect(screen.getByText("Estamos aprendiendo tu ritmo. En 5 días tendrás proyección y acciones.")).toBeInTheDocument();
    expect(screen.getByText("Aprendiendo tu ritmo")).toBeInTheDocument();
  });

  it("una meta cumplida gana aunque falten datos", () => {
    render(<RouteHero pace={{ ...learningPace, status: "achieved", actual_revenue_cents: 3_100_000_000, business_days_left: 4 }} plan={plan} />);
    expect(screen.getByText("Cumplida")).toBeInTheDocument();
    expect(screen.getByText("Meta cumplida con 4 días de sobra. Lo que venga ahora es camino extra.")).toBeInTheDocument();
  });

  it("con meta 0 no hay Infinity ni NaN en pantalla", () => {
    const { container } = render(<RouteHero pace={{ ...pace, target_revenue_cents: 0, projected_revenue_cents: 100 }} plan={plan} />);
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
    expect(screen.getByRole("img", { name: "Ruta del mes: 0 % recorrido, 77 % esperado a hoy" })).toBeInTheDocument();
  });

  it("una proyección por encima de la meta se etiqueta con su porcentaje real y la línea se acota", () => {
    render(<RouteHero pace={{ ...pace, actual_revenue_cents: 2_677_000_000, projected_revenue_cents: 3_480_000_000, status: "ahead" }} plan={plan} />);
    expect(screen.getByText("cierre ≈ $ 34,8 M · 116 %")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ruta del mes: 89 % recorrido, 77 % esperado a hoy, proyección 116 %" })).toBeInTheDocument();
  });

  it("la bandera es HTML: no hay un path con «%» dentro de d", () => {
    const { container } = render(<RouteHero pace={pace} plan={plan} />);
    for (const path of Array.from(container.querySelectorAll("path"))) {
      expect(path.getAttribute("d")).not.toContain("%");
    }
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
