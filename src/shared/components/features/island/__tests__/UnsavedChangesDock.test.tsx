import { fireEvent, render, screen } from "@testing-library/react";

import { UnsavedChangesDock } from "@/shared/components/features/island/UnsavedChangesDock";

function inForm(ui: React.ReactNode, onSubmit = jest.fn(), onReset = jest.fn()) {
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onReset={(event) => {
        event.preventDefault();
        onReset();
      }}
    >
      {ui}
    </form>,
  );
  return { onSubmit, onReset };
}

describe("UnsavedChangesDock (la barra de tinta de «Cambios sin guardar»)", () => {
  it("sin cambios no existe; con cambios aparece en tinta y guarda o descarta el formulario", () => {
    const { rerender } = render(<UnsavedChangesDock dirty={false} submitting={false} invalid={false} />);
    expect(screen.queryByRole("contentinfo", { name: "Cambios sin guardar" })).toBeNull();
    rerender(<UnsavedChangesDock dirty submitting={false} invalid={false} />);
    expect(screen.getByRole("contentinfo", { name: "Cambios sin guardar" })).toHaveClass("island-ink");
  });

  it("guardar envía y descartar resetea: la barra no necesita callbacks", () => {
    const { onSubmit, onReset } = inForm(<UnsavedChangesDock dirty submitting={false} invalid={false} detail="Tipo de negocio" />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("con campos inválidos NO envía y dice por qué", () => {
    const { onSubmit } = inForm(<UnsavedChangesDock dirty submitting={false} invalid />);
    const save = screen.getByRole("button", { name: "Guardar cambios" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Revisa los campos marcados antes de guardar.");
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
