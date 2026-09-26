import { render, screen } from "@testing-library/react";
import { z } from "zod";

import { DynamicForm } from "@/shared/components/features/dynamic-form";

const schema = z.object({ name: z.string() });

function renderWith(bare: boolean | undefined) {
  return render(
    <DynamicForm
      schema={schema}
      defaultValues={{ name: "" }}
      fields={[]}
      onSubmit={jest.fn()}
      actions={{
        ...(bare === undefined ? {} : { bare }),
        render: () => <footer aria-label="Barra">barra</footer>,
      }}
    />,
  );
}

/**
 * QA R8-H1: la barra «Cambios sin guardar» es `sticky` y necesita al `<form>`
 * como padre; dentro del envoltorio de su misma altura no tiene recorrido.
 * jsdom no calcula sticky: se prueba la estructura, la QA prueba el pegado.
 */
describe("DynamicForm · actions.render con `bare`", () => {
  it("con `bare` lo que devuelve render es hijo DIRECTO del form", async () => {
    renderWith(true);
    expect(
      (await screen.findByRole("contentinfo", { name: "Barra" })).parentElement
        ?.tagName,
    ).toBe("FORM");
  });

  it("sin `bare` sigue envuelto como antes: los demás formularios no cambian", async () => {
    renderWith(undefined);
    const parent = (await screen.findByRole("contentinfo", { name: "Barra" }))
      .parentElement;
    expect(parent?.tagName).toBe("DIV");
    expect(parent).toHaveClass("flex", "items-center", "gap-2");
  });
});
