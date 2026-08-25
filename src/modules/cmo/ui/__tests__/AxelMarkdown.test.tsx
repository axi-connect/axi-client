import { render, screen } from "@testing-library/react";

import { AxelMarkdown } from "../components/AxelMarkdown";

/**
 * Que el árbol llegue a elementos REALES.
 *
 * El parser tiene su propia suite; lo que se comprueba aquí es lo que el parser
 * no puede: que una lista sea una lista de verdad (y no párrafos con guiones),
 * que el código no se interprete, y que no aparezca HTML por ninguna vía.
 */
describe("AxelMarkdown", () => {
  it("las viñetas son una lista nativa, no párrafos con guiones", () => {
    const { container } = render(<AxelMarkdown text={"- uno\n- dos"} />);
    const list = container.querySelector("ul");
    expect(list?.querySelectorAll("li")).toHaveLength(2);
    // Nativa: la viñeta la pinta el navegador, así que el texto del punto no la
    // lleva dentro y se puede leer y buscar tal cual.
    expect(screen.getByText("uno").tagName).toBe("LI");
  });

  it("la lista numerada arranca donde la escribió el modelo", () => {
    const { container } = render(<AxelMarkdown text={"3. tres\n4. cuatro"} />);
    expect(container.querySelector("ol")?.getAttribute("start")).toBe("3");
  });

  it("la negrita es <strong> y el código es <code>, con su tipografía", () => {
    const { container } = render(<AxelMarkdown text="Van **$18.420.000** en `pos_web`" />);
    expect(container.querySelector("strong")?.textContent).toBe("$18.420.000");
    const code = container.querySelector("code");
    expect(code?.textContent).toBe("pos_web");
    expect(code?.className).toContain("font-mono");
  });

  it("una etiqueta escrita por el modelo se ve como TEXTO, nunca se ejecuta", () => {
    const { container } = render(
      <AxelMarkdown text="<img src=x onerror=alert(1)> y <b>negrita</b>" />,
    );
    // Ni una etiqueta creada: el parser devuelve datos y React los escapa.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("el salto de línea del modelo se conserva", () => {
    const { container } = render(<AxelMarkdown text={"Marcela — 92\nDiana — 88"} />);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("el cursor solo aparece cuando se está escribiendo, y en el último bloque", () => {
    const { container: quiet } = render(<AxelMarkdown text="listo" />);
    expect(quiet.querySelectorAll(".animate-pulse")).toHaveLength(0);

    const { container: live } = render(<AxelMarkdown text={"## Título\nescribiendo"} caret />);
    const carets = live.querySelectorAll(".animate-pulse");
    expect(carets).toHaveLength(1);
    expect(carets[0]?.parentElement?.textContent).toContain("escribiendo");
  });

  it("texto vacío con cursor no revienta: es el primer delta del turno", () => {
    const { container } = render(<AxelMarkdown text="" caret />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });
});
