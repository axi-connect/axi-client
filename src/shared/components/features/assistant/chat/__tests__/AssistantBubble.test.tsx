import { fireEvent, render, screen } from "@testing-library/react";
import { Flame } from "lucide-react";

import { AssistantBubble } from "../AssistantBubble";
import { AssistantMark } from "../AssistantMark";
import { StarterPills } from "../StarterPills";
import { SystemNote } from "../SystemNote";

describe("AssistantBubble", () => {
  it("lleva la firma del asistente, el cuerpo en markdown y lo que cuelga de él", () => {
    render(
      <AssistantBubble name="Alba" body="Hola **Isabel**" sourcesCount={2}>
        <p>colgado</p>
      </AssistantBubble>,
    );
    expect(screen.getByText("Alba")).toBeInTheDocument();
    expect(screen.getByText("Isabel").tagName).toBe("STRONG");
    expect(screen.getByText("2 fuentes")).toBeInTheDocument();
    expect(screen.getByText("colgado")).toBeInTheDocument();
  });

  it("con cuerpo vacío no pinta el renderer (la pregunta es el mensaje)", () => {
    const { container } = render(<AssistantBubble name="Axel" body="" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("escribiendo marca aria-busy, dice «escribiendo…» y no lleva aria-live", () => {
    const { container } = render(<AssistantBubble name="Axel" body="Hola" streaming />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(container.firstElementChild).not.toHaveAttribute("aria-live");
    expect(screen.getByText("escribiendo…")).toBeInTheDocument();
  });
});

describe("AssistantMark y SystemNote", () => {
  it("la firma es el signo decorativo más el nombre", () => {
    const { container } = render(<AssistantMark name="Axel" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Axel")).toBeInTheDocument();
  });

  it("la nota de sistema no lleva la identidad del asistente", () => {
    const { container } = render(<SystemNote>Sesión reanudada</SystemNote>);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("Sesión reanudada")).toBeInTheDocument();
  });
});

describe("StarterPills", () => {
  const starters = [{ icon: Flame, label: "Calientes", prompt: "¿Quiénes son mis clientes más calientes?" }];

  it("cada píldora anuncia el prompt completo y lo envía tal cual", () => {
    const onPick = jest.fn();
    render(<StarterPills starters={starters} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "¿Quiénes son mis clientes más calientes?" }));
    expect(onPick).toHaveBeenCalledWith("¿Quiénes son mis clientes más calientes?");
    expect(screen.getByText("Calientes")).toBeInTheDocument();
  });

  it("deshabilitadas no envían", () => {
    const onPick = jest.fn();
    render(<StarterPills starters={starters} onPick={onPick} disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onPick).not.toHaveBeenCalled();
  });
});
