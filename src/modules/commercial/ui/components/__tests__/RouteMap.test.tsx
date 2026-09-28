import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RouteMap } from "../RouteMap";
import { learningPace, pace, plan, proposal } from "../../__tests__/fixtures";

afterEach(cleanup);

const base = {
  pace,
  plan,
  lead: "Meta del mes: $ 30.000.000 · la pusiste tú el 1 sep",
  canManage: true,
  proposals: [proposal],
  canApprove: true,
  readOnlyMessage: null,
};

describe("RouteMap · el mapa", () => {
  it("dice dónde vas, dónde deberías ir, a dónde llegas y la meta, en el mapa y en su etiqueta", () => {
    render(<RouteMap {...base} />);
    expect(screen.getByRole("img", { name: /^Ruta del mes: vas en \$ 18,9 M, el 63 % del camino; deberías ir en \$ 23,1 M; 82 % · Si sigues así llegas a \$ 24,6 M; Meta · .*30\.000\.000, 30 sep$/ })).toBeInTheDocument();
    expect(screen.getByText("Vas aquí")).toBeInTheDocument();
    expect(screen.getByText("Deberías ir en $ 23,1 M")).toBeInTheDocument();
    expect(screen.getByText(/Tramo lento · vas \$ 4,1 M por debajo/)).toBeInTheDocument();
    expect(screen.getByText("82 % · Si sigues así llegas a $ 24,6 M")).toBeInTheDocument();
    expect(screen.getByText("30 sep")).toBeInTheDocument();
  });

  it("aprendiendo: sin tramo lento, sin llegada ni indicaciones; el aviso de los dos hitos", () => {
    render(<RouteMap {...base} pace={learningPace} />);
    expect(screen.queryByText(/Deberías ir en/)).toBeNull();
    expect(screen.queryByText(/Tramo lento/)).toBeNull();
    expect(screen.queryByText("Indicaciones de hoy")).toBeNull();
    expect(screen.getByText("sin proyección todavía")).toBeInTheDocument();
    expect(screen.getByText(/Llevas 1 día hábil de datos/)).toBeInTheDocument();
  });

  it("con la meta cumplida la llegada lo dice", () => {
    render(<RouteMap {...base} pace={{ ...pace, status: "achieved", actual_revenue_cents: 3_100_000_000 }} proposals={[]} />);
    expect(screen.getByText("Llegaste a la meta. Lo que venga ahora es camino extra.")).toBeInTheDocument();
    expect(screen.getByText("103 %")).toBeInTheDocument();
  });
});

describe("RouteMap · el panel de navegación", () => {
  it("el destino con «Cambiar» (solo con manage), el ritmo y las indicaciones de hoy", () => {
    const { rerender } = render(<RouteMap {...base} />);
    const panel = within(screen.getByRole("region", { name: "Navegación de la ruta" }));
    expect(panel.getByText(/Vender .*30\.000\.000/)).toBeInTheDocument();
    expect(panel.getByRole("link", { name: "Cambiar meta" })).toHaveAttribute("href", "/comercial/meta");
    expect(panel.getByText("Ritmo bajo")).toBeInTheDocument();
    expect(panel.getByText("3 ventas al día").tagName).toBe("B");
    expect(panel.getByRole("list")).toHaveTextContent("Cierra 3 ventas hoy");
    rerender(<RouteMap {...base} canManage={false} />);
    expect(screen.queryByRole("link", { name: "Cambiar meta" })).toBeNull();
  });

  it("elegir una ruta la previsualiza y «Tomar esta ruta» la aprueba", () => {
    const onApprove = jest.fn().mockResolvedValue(undefined);
    render(<RouteMap {...base} onApprove={onApprove} />);
    const panel = within(screen.getByRole("region", { name: "Navegación de la ruta" }));
    expect(panel.queryByRole("button", { name: /Tomar esta ruta/ })).toBeNull();
    fireEvent.click(panel.getByRole("radio", { name: /Retomar 12 cotizaciones/ }));
    expect(screen.getByText("87 % · Con esta ruta llegas a $ 26 M")).toBeInTheDocument();
    expect(screen.getByText(/Con esta ruta la llegada sube a 87 %/)).toBeInTheDocument();
    fireEvent.click(panel.getByRole("button", { name: /Tomar esta ruta/ }));
    expect(onApprove).toHaveBeenCalledWith(proposal.id);
  });

  it("cargando, error con reintento y sin rutas según el ritmo", () => {
    const onRetry = jest.fn();
    const { rerender } = render(<RouteMap {...base} proposals={undefined} />);
    expect(screen.getByRole("status", { name: "Cargando las rutas" })).toBeInTheDocument();
    rerender(<RouteMap {...base} proposals={undefined} proposalsError="Se cayó la conexión" onRetryProposals={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<RouteMap {...base} proposals={[]} />);
    expect(screen.getByText(/Axi está buscando qué puede acelerar la ruta/)).toBeInTheDocument();
  });
});
