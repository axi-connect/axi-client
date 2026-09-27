import { cleanup, render, screen, within } from "@testing-library/react";
import { KeyResultGrid } from "../KeyResultGrid";
import { pace, plan } from "../../__tests__/fixtures";

afterEach(cleanup);

const href = (key: string) => `/comercial/resultados/${key}`;
const itemOf = (label: RegExp) => screen.getByText(label).closest("a") as HTMLElement;

describe("KeyResultGrid («Lo que hace falta»)", () => {
  it("cada resultado abre su detalle, en el orden del plan", () => {
    render(<KeyResultGrid pace={pace} plan={plan} detailHref={href} />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/comercial/resultados/sales",
      "/comercial/resultados/quotes",
      "/comercial/resultados/contacted",
      "/comercial/resultados/calls",
    ]);
    expect(screen.getByRole("heading", { name: "Lo que hace falta" })).toBeInTheDocument();
    expect(screen.getByText(/Objetivo: vender \$ 30\.000\.000 en septiembre/)).toBeInTheDocument();
  });

  it("camino recorrido, ritmo, procedencia y el estado de cada uno; behind y at_risk dicen lo mismo", () => {
    render(<KeyResultGrid pace={pace} plan={plan} detailHref={href} />);
    const sales = itemOf(/ventas cerradas/i);
    expect(sales).toHaveTextContent("27 de 43 · faltan 16");
    expect(sales).toHaveTextContent("Ritmo 1,35 al día · esperado 1,65");
    expect(within(sales).getByText("Ritmo bajo")).toBeInTheDocument();
    expect(within(sales).getByText(/Mix sugerido: 45 % Limpieza facial · 30 % Toxina · 25 % Otros/)).toBeInTheDocument();
    expect(within(itemOf(/^contactados$/i)).getByText("Al ritmo")).toBeInTheDocument();
    const calls = itemOf(/llamadas hechas/i);
    expect(within(calls).getByText("Ritmo bajo")).toBeInTheDocument();
    expect(within(calls).getByText("supuesto para clínicas estéticas")).toBeInTheDocument();
    expect(within(calls).getByText("Contestadas 79 de 120")).toBeInTheDocument();
  });

  it("aprendiendo: sin ritmo, sin píldoras y sin marca de hoy; solo la procedencia", () => {
    render(<KeyResultGrid pace={pace} plan={plan} learning detailHref={href} />);
    expect(screen.queryByText(/Ritmo 1,35/)).toBeNull();
    expect(screen.queryByText("Ritmo bajo")).toBeNull();
    expect(screen.queryByText("dónde deberías ir hoy")).toBeNull();
    expect(screen.getByText("Aún sin historia para medir el ritmo.")).toBeInTheDocument();
  });

  it("cifras extremas: 70.000 conversaciones no se parten ni se salen", () => {
    const leads = { ...pace.key_results[0], key: "leads" as const, actual: 70_000, target: 69_999 };
    render(<KeyResultGrid pace={{ ...pace, key_results: [leads] }} plan={plan} detailHref={href} />);
    expect(screen.getByText("70.000")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("de 69.999 · 1 por delante")).toHaveClass("whitespace-nowrap");
  });
});
