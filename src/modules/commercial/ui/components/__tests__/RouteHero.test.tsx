import { cleanup, render, screen } from "@testing-library/react";
import { RouteHero } from "../RouteHero";
import { learningPace, pace, plan } from "../../__tests__/fixtures";

jest.mock("framer-motion", () => ({
  useReducedMotion: () => true,
  animate: () => ({ stop: () => {} }),
}));

afterEach(cleanup);

/** La frase lleva su parte accionable en negrita: se busca por el texto entero del párrafo. */
const sentence = (text: string) => (_: string, element: Element | null) => element?.tagName === "P" && element.textContent === text;

describe("RouteHero", () => {
  it("la línea se describe entera y con cifras: recorrido, esperado y proyección", () => {
    render(<RouteHero pace={pace} plan={plan} />);
    expect(screen.getByRole("img", { name: /^Ruta\sdel\smes:\s\$\s18,9\sM\sde\s\$\s30\.000\.000,\s63\s%\srecorrido,\s77\s%\sesperado\sa\shoy,\sproyección\s\$\s24,6\sM\s·\s82\s%$/ })).toBeInTheDocument();
    expect(screen.getByText(sentence("Para llegar faltan $ 11,1 M: 3 ventas al día en los 6 días hábiles que quedan."))).toBeInTheDocument();
    expect(screen.getByText("3 ventas al día").tagName).toBe("B");
    expect(screen.getByText("Ritmo bajo")).toBeInTheDocument();
    expect(screen.getByText("Hoy · mié 23")).toBeInTheDocument();
    expect(screen.getByText("Meta · $ 30 M")).toBeInTheDocument();
  });

  it("la franja: faltan en ventas y dinero, quedan hasta el último día hábil, dónde deberías ir y a dónde llegas", () => {
    render(<RouteHero pace={pace} plan={plan} />);
    const figure = (label: string) => screen.getByText(label).closest("dl");
    expect(figure("Faltan")).toHaveTextContent("Faltan16 ventas$ 11,1 M");
    expect(figure("Quedan")).toHaveTextContent("Quedan6 días hábileshasta el miércoles 30");
    expect(figure("A hoy deberías llevar")).toHaveTextContent("$ 23,1 M$ 4,1 M por debajo");
    expect(figure("Si sigues así")).toHaveTextContent("≈ $ 24,6 M82 % de la meta");
  });

  it("aprendiendo: sin marca de hoy, sin proyección, solo Faltan y Quedan, y los dos hitos del método", () => {
    render(<RouteHero pace={learningPace} plan={plan} />);
    expect(screen.getByRole("img", { name: /^Ruta\sdel\smes:\s\$\s1,4\sM\sde\s\$\s30\.000\.000,\s5\s%\srecorrido$/ })).toBeInTheDocument();
    expect(screen.queryByText(/^Hoy ·/)).toBeNull();
    expect(screen.queryByText("A hoy deberías llevar")).toBeNull();
    expect(screen.queryByText("Si sigues así")).toBeNull();
    expect(screen.getByText("Estamos aprendiendo tu ritmo. En 5 días tendrás proyección y acciones.")).toBeInTheDocument();
    expect(screen.getByText(/Llevas 1 día hábil de datos; con 3 empezamos a proyectar/)).toBeInTheDocument();
    expect(screen.getByText("Aprendiendo tu ritmo")).toBeInTheDocument();
  });

  it("una meta cumplida gana aunque falten datos, y la franja dice cuánto va por encima", () => {
    render(<RouteHero pace={{ ...learningPace, status: "achieved", actual_revenue_cents: 3_100_000_000, business_days_left: 4 }} plan={plan} />);
    expect(screen.getByText("Cumplida")).toBeInTheDocument();
    expect(screen.getByText(sentence("Meta cumplida con 4 días de sobra. Lo que venga ahora es camino extra."))).toBeInTheDocument();
    expect(screen.getByText("Por encima de la meta").closest("dl")).toHaveTextContent("$ 1 M");
  });

  it("el último día hábil: «Quedan · Hoy»", () => {
    render(<RouteHero pace={{ ...pace, business_days_left: 0 }} plan={plan} />);
    expect(screen.getByText("Quedan").closest("dl")).toHaveTextContent("QuedanHoyes el último día hábil");
  });

  it("con meta 0 no hay Infinity ni NaN en pantalla", () => {
    const { container } = render(<RouteHero pace={{ ...pace, target_revenue_cents: 0, projected_revenue_cents: 100 }} plan={plan} />);
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
    expect(screen.getByRole("img", { name: /^Ruta\sdel\smes:\s\$\s18,9\sM\sde\s\$\s0,\s0\s%\srecorrido,\s77\s%\sesperado\sa\shoy$/ })).toBeInTheDocument();
  });

  it("una proyección por encima de la meta se dice con su porcentaje real y la línea se acota", () => {
    render(<RouteHero pace={{ ...pace, actual_revenue_cents: 2_677_000_000, projected_revenue_cents: 3_480_000_000, status: "ahead" }} plan={plan} />);
    expect(screen.getByText("Si sigues así").closest("dl")).toHaveTextContent("≈ $ 34,8 M116 % de la meta");
    expect(screen.getByText("A hoy deberías llevar").closest("dl")).toHaveTextContent("$ 3,7 M por encima");
    expect(screen.getByRole("img", { name: /^Ruta\sdel\smes:\s\$\s26,8\sM\sde\s\$\s30\.000\.000,\s89\s%\srecorrido,\s77\s%\sesperado\sa\shoy,\sproyección\s\$\s34,8\sM\s·\s116\s%$/ })).toBeInTheDocument();
  });

  it("cifras extremas: una meta de miles de millones no rompe la franja ni la cifra grande", () => {
    const { container } = render(
      <RouteHero
        pace={{ ...pace, target_revenue_cents: 99_900_000_000_00, actual_revenue_cents: 12_345_678_900_00, expected_revenue_cents: 50_000_000_000_00, projected_revenue_cents: 60_000_000_000_00 }}
        plan={plan}
      />,
    );
    expect(container.textContent).not.toMatch(/Infinity|NaN|undefined/);
    // Las cifras no se parten (el detalle de debajo sí puede).
    const values = Array.from(container.querySelectorAll("dd.font-heading"));
    expect(values).toHaveLength(4);
    for (const node of values) expect(node.className).toMatch(/whitespace-nowrap/);
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
