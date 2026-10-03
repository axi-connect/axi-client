import { fireEvent, render, screen } from "@testing-library/react";

import { FormStep } from "../FormStep";

describe("FormStep", () => {
  it("la cabecera es un solo botón que abre y cierra el panel que controla", () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <FormStep number={1} title="Datos básicos" summary="Camiseta" state="pending" open={false} onToggle={onToggle}>
        <label>
          Nombre
          <input defaultValue="Camiseta" />
        </label>
      </FormStep>,
    );
    const button = screen.getByRole("button", { name: /Datos básicos/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <FormStep number={1} title="Datos básicos" summary="Camiseta" state="pending" open onToggle={onToggle}>
        <label>
          Nombre
          <input defaultValue="Camiseta" />
        </label>
      </FormStep>,
    );
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
  });

  it("plegado conserva el contenido (oculto, no desmontado): lo escrito sigue ahí al volver a abrir", () => {
    const view = (open: boolean) => (
      <FormStep number={2} title="Precio" summary="$ 10.000" state="done" open={open} onToggle={() => undefined}>
        <input aria-label="Monto" />
      </FormStep>
    );
    const { rerender } = render(view(true));
    const input = screen.getByLabelText("Monto");
    fireEvent.change(input, { target: { value: "12000" } });

    rerender(view(false));
    expect(input).toBeInTheDocument();
    expect(input).not.toBeVisible();
    expect(input.closest("[hidden]")).not.toBeNull();

    rerender(view(true));
    expect(screen.getByLabelText("Monto")).toBe(input);
    expect(input).toHaveValue("12000");
  });

  it("`card`: abierto dice el subtítulo; plegado, el resumen (con el texto entero en `title`)", () => {
    const { rerender } = render(
      <FormStep number={3} title="Clasificación" subtitle="Dónde vive" summary="Ropa · Camisetas" state="done" open onToggle={() => undefined}>
        <p>campos</p>
      </FormStep>,
    );
    expect(screen.getByRole("region", { name: "Clasificación" })).toBeInTheDocument();
    expect(screen.getByText("Dónde vive")).toBeInTheDocument();
    expect(screen.queryByText("Ropa · Camisetas")).not.toBeInTheDocument();

    rerender(
      <FormStep number={3} title="Clasificación" subtitle="Dónde vive" summary="Ropa · Camisetas" state="done" open={false} onToggle={() => undefined}>
        <p>campos</p>
      </FormStep>,
    );
    expect(screen.getByText("Ropa · Camisetas")).toHaveAttribute("title", "Ropa · Camisetas");
    expect(screen.queryByText("Dónde vive")).not.toBeInTheDocument();
  });

  it("`divided`: el resumen siempre a la vista y, con error, «Hay algo que corregir» en su lugar", () => {
    const { rerender } = render(
      <FormStep variant="divided" number={4} title="Cabecera, pie y botones" summary="Opcional" state="pending" open onToggle={() => undefined}>
        <p>campos</p>
      </FormStep>,
    );
    expect(screen.getByRole("button", { name: /Cabecera, pie y botones/ })).toHaveTextContent("Opcional");

    rerender(
      <FormStep variant="divided" number={4} title="Cabecera, pie y botones" summary="Solo botón" state="error" open={false} onToggle={() => undefined}>
        <p>campos</p>
      </FormStep>,
    );
    const button = screen.getByRole("button", { name: /Cabecera, pie y botones/ });
    expect(button).toHaveTextContent("Hay algo que corregir");
    expect(button).not.toHaveTextContent("Solo botón");
    // El error conserva el número, con el tinte destructivo.
    expect(button.querySelector("[data-state]")).toHaveAttribute("data-state", "error");
    expect(button.querySelector("[data-state]")).toHaveTextContent("4");
  });

  it("`edit`: cerrada dice su resumen y «Editar»; abierta, «Listo»; el panel lleva el id `${id}-${number}`", () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <FormStep variant="edit" id="paso" number={2} title="La oferta" summary="Plan Pro" state="done" open={false} onToggle={onToggle}>
        <p>campos</p>
      </FormStep>,
    );
    const button = screen.getByRole("button", { name: /La oferta/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "paso-2");
    expect(screen.getByText("Plan Pro")).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("campos")).not.toBeVisible();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <FormStep variant="edit" id="paso" number={2} title="La oferta" summary="Plan Pro" state="done" open onToggle={onToggle}>
        <p>campos</p>
      </FormStep>,
    );
    expect(document.getElementById("paso-2")).toHaveTextContent("campos");
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.queryByText("Plan Pro")).not.toBeInTheDocument();
    // Hecho pero abierto: vuelve al número con el anillo de marca.
    expect(button.querySelector("[data-state]")).toHaveAttribute("data-state", "current");
  });

  it("bloqueado lleva «!» y lo dice al lector; `chevron` no dice «Editar»; `unmountWhenClosed` desmonta al plegar", () => {
    render(
      <FormStep
        variant="chevron"
        id="p"
        number={1}
        title="Dónde busca"
        summary="—"
        state="blocked"
        open={false}
        onToggle={() => undefined}
        blockedHint="tiene algo por corregir"
        unmountWhenClosed
      >
        <p>campos</p>
      </FormStep>,
    );
    expect(screen.getByRole("button", { name: /Dónde busca \(tiene algo por corregir\)/ })).toBeInTheDocument();
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("campos")).not.toBeInTheDocument();
  });
});
