import { render, screen } from "@testing-library/react";
import { Circle, Target } from "lucide-react";
import { AiBadge, Timeline, TimelineSkeleton, type TimelineItem } from "../Timeline";

function item(overrides: Partial<TimelineItem> & { id: string }): TimelineItem {
  return { icon: Circle, title: "Evento", ...overrides };
}

describe("Timeline", () => {
  it("no renderiza nada sin entradas", () => {
    const { container } = render(<Timeline items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza una entrada por item con sus tres líneas", () => {
    render(
      <Timeline
        items={[
          item({
            id: "a",
            icon: Target,
            title: "Pedido #1",
            description: "«dejar en portería»",
            meta: "Pedidos · hace 20 h",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByText("Pedido #1")).toBeInTheDocument();
    expect(screen.getByText("«dejar en portería»")).toBeInTheDocument();
    expect(screen.getByText("Pedidos · hace 20 h")).toBeInTheDocument();
  });

  it("omite description y meta cuando no se pasan", () => {
    render(<Timeline items={[item({ id: "a", title: "Solo título" })]} />);
    expect(screen.getByRole("listitem").querySelectorAll("p")).toHaveLength(1);
  });

  it("dibuja la línea conectora en todas las entradas salvo la última", () => {
    const { container } = render(
      <Timeline items={[item({ id: "a" }), item({ id: "b" }), item({ id: "c" })]} />,
    );
    // 3 entradas → 2 conectoras (la última no deja cabo suelto)
    expect(container.querySelectorAll("span[aria-hidden].absolute")).toHaveLength(2);
  });

  it("aplica el tono al nodo del icono", () => {
    const { container } = render(<Timeline items={[item({ id: "a", tone: "success" })]} />);
    expect(container.querySelector(".bg-success\\/12")).not.toBeNull();
  });

  it("renderiza el badge junto al título", () => {
    render(<Timeline items={[item({ id: "a", badge: <AiBadge /> })]} />);
    expect(screen.getByText("IA")).toBeInTheDocument();
  });

  it("pinta la acción a la derecha como `hover-reveal` dentro de la entrada `group`", () => {
    render(
      <Timeline
        items={[item({ id: "a", action: <button type="button">Deshacer</button> })]}
      />,
    );
    const action = screen.getByRole("button", { name: "Deshacer" });
    // `.hover-reveal` solo se esconde bajo `@media (hover: hover)` y vuelve
    // con el hover o el foco de su `.group`: en táctil queda siempre a la vista.
    expect(action.parentElement?.className).toContain("hover-reveal");
    expect(screen.getByRole("listitem").className).toContain("group");
  });

  it("sin acción no deja el hueco", () => {
    render(<Timeline items={[item({ id: "a" })]} />);
    expect(screen.getByRole("listitem").querySelector(".hover-reveal")).toBeNull();
  });
});

describe("TimelineSkeleton", () => {
  it("expone role status y el número de filas pedido", () => {
    const { container } = render(<TimelineSkeleton rows={4} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Cargando historial");
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });
});
