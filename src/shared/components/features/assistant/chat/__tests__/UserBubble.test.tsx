import { fireEvent, render, screen } from "@testing-library/react";

import { UserBubble } from "../UserBubble";

describe("la burbuja del humano", () => {
  it("pinta el texto literal, con sus saltos de línea", () => {
    render(<UserBubble body={"Primera\nSegunda"} />);
    const bubble = screen.getByText(/Primera/);
    expect(bubble).toHaveClass("whitespace-pre-wrap");
    expect(bubble.textContent).toBe("Primera\nSegunda");
  });

  it("pendiente se atenúa; fallida conserva el texto y ofrece reintentar", () => {
    const onRetry = jest.fn();
    const { rerender } = render(<UserBubble body="Hola" pending />);
    expect(screen.getByText("Hola")).toHaveClass("opacity-60");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<UserBubble body="Hola" failed="No salió." onRetry={onRetry} retryLabel="Reintentar" />);
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.getByText("No salió.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lo dictado lleva el pie «Dictado»; lo tecleado, nada", () => {
    const { rerender } = render(<UserBubble body="Hola" voice />);
    expect(screen.getByText("Dictado")).toBeInTheDocument();
    rerender(<UserBubble body="Hola" />);
    expect(screen.queryByText("Dictado")).not.toBeInTheDocument();
  });

  it("solo los mensajes nuevos de la sesión entran animados", () => {
    const { container, rerender } = render(<UserBubble body="Hola" fresh />);
    expect(container.firstElementChild).toHaveClass("assistant-rise");
    rerender(<UserBubble body="Hola" />);
    expect(container.firstElementChild).not.toHaveClass("assistant-rise");
  });
});
